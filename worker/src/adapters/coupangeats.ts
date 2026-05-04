// worker/src/adapters/coupangeats.ts
// ============================================================
// 53차-1 · CoupangEatsAdapter (store.coupangeats.com)
// ── IP 차단 대응: extra_data.session_cookies 쿠키 세션 방식 우선 ──
// ── 53차: post_reply → REST API 직접 호출 (UI 자동화 제거) ──
//    POST /api/v1/merchant/reviews/reply
//    body: {storeId: Int, orderReviewId: Int, comment: String}
//    헤더: x-request-meta (btoa JSON), x-requested-with: XMLHttpRequest
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import * as nodeHttp from 'node:http'
import * as nodeTls from 'node:tls'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'
import { applyStealth } from '../lib/stealth'
import {
  warmAkamaiSession,
  humanType,
  humanClick,
  idleThinking,
  mouseJiggle,
} from '../lib/human-behavior'
import { notifyNewReviews } from '../lib/notify'

// ── Node.js 네이티브 CONNECT 터널 fetch (프록시 407 우회) ──
// page.evaluate fetch() 는 Chromium이 Proxy-Authorization 누락 → 407
// 이 함수는 http.request CONNECT → tls.connect → HTTP/1.1 직접 작성으로 우회
async function tunnelFetch(
  targetUrl: string,
  cookieStr: string,
  ph: string, pp: number, pu: string, pw: string,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; ok: boolean; body: any; errBody: string }> {
  const parsed = new URL(targetUrl)
  const proxyAuth = Buffer.from(`${pu}:${pw}`).toString('base64')

  // 1) HTTP CONNECT 터널 생성
  const rawSocket = await new Promise<any>((resolve, reject) => {
    const req = nodeHttp.request({
      hostname: ph, port: pp,
      method: 'CONNECT',
      path: `${parsed.hostname}:443`,
      headers: {
        'Host': `${parsed.hostname}:443`,
        'Proxy-Authorization': `Basic ${proxyAuth}`,
        'Proxy-Connection': 'keep-alive',
      },
      timeout: 15000,
    })
    req.on('connect', (res: any, sock: any) => {
      if (res.statusCode === 200) resolve(sock)
      else reject(new Error(`CONNECT failed: ${res.statusCode}`))
    })
    // 407 등 비-200 응답은 'response' 이벤트로 들어옴 (connect 이벤트 아님)
    req.on('response', (res: any) => {
      let body = ''
      res.on('data', (chunk: any) => { body += chunk.toString() })
      res.on('end', () => reject(new Error(`CONNECT HTTP ${res.statusCode}: ${body.slice(0, 80)}`)))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('CONNECT timeout')) })
    req.end()
  })

  // 2) TLS 핸드셰이크
  const tlsSock = nodeTls.connect({ socket: rawSocket, servername: parsed.hostname, rejectUnauthorized: false })
  await new Promise<void>((resolve, reject) => {
    tlsSock.on('secureConnect', resolve)
    tlsSock.on('error', reject)
    setTimeout(() => reject(new Error('TLS timeout')), 10000)
  })

  // 3) HTTP/1.1 요청 전송
  const path = parsed.pathname + parsed.search
  const hLines = [
    `Host: ${parsed.hostname}`,
    `Cookie: ${cookieStr}`,
    `Accept: application/json, */*`,
    `Accept-Encoding: identity`,   // gzip/deflate 비활성화 (raw socket에서 디코딩 불가)
    `Connection: close`,
    ...Object.entries(extraHeaders).map(([k, v]) => `${k}: ${v}`),
  ]
  tlsSock.write(`GET ${path} HTTP/1.1\r\n${hLines.join('\r\n')}\r\n\r\n`)

  // 4) 응답 수신 (binary buffer 유지 — UTF-8 변환은 파싱 후에)
  const chunks: Buffer[] = []
  await new Promise<void>((resolve) => {
    tlsSock.on('data', (c: Buffer) => { chunks.push(c) })
    tlsSock.on('end', resolve)
    tlsSock.on('close', resolve)
    tlsSock.on('error', () => resolve())
    setTimeout(() => { tlsSock.destroy(); resolve() }, 25000)
  })
  tlsSock.destroy()
  const rawBuf = Buffer.concat(chunks)

  // 5) HTTP 응답 파싱 (헤더는 ASCII, 바디는 별도 처리)
  const sepIdx = rawBuf.indexOf('\r\n\r\n')
  const headerStr = sepIdx >= 0 ? rawBuf.slice(0, sepIdx).toString('ascii') : rawBuf.toString('ascii')
  let bodyBuf = sepIdx >= 0 ? rawBuf.slice(sepIdx + 4) : Buffer.alloc(0)
  const statusCode = parseInt((headerStr.split('\r\n')[0] || '').split(' ')[1] || '0') || 0
  const rawHeaderSample = headerStr.slice(0, 300)

  // chunked transfer encoding 디코딩
  const isChunked = headerStr.toLowerCase().includes('transfer-encoding: chunked')
  if (isChunked && bodyBuf.length > 0) {
    try {
      const decoded: Buffer[] = []
      let pos = 0
      while (pos < bodyBuf.length) {
        const lineEnd = bodyBuf.indexOf('\r\n', pos)
        if (lineEnd < 0) break
        const chunkSizeHex = bodyBuf.slice(pos, lineEnd).toString('ascii').trim().split(';')[0]
        const chunkSize = parseInt(chunkSizeHex, 16)
        if (isNaN(chunkSize) || chunkSize === 0) break
        const dataStart = lineEnd + 2
        const dataEnd = dataStart + chunkSize
        if (dataEnd > bodyBuf.length) break
        decoded.push(bodyBuf.slice(dataStart, dataEnd))
        pos = dataEnd + 2  // skip trailing \r\n
      }
      if (decoded.length > 0) bodyBuf = Buffer.concat(decoded)
    } catch { /* chunked 디코딩 실패 시 원본 유지 */ }
  }

  const bodyStr = bodyBuf.toString('utf8')
  let body: any = null
  try { body = JSON.parse(bodyStr) } catch { body = null }
  const errBodyStr = body ? '' : (bodyStr.slice(0, 80) || rawHeaderSample.slice(0, 80) || '(empty)')
  return { status: statusCode, ok: statusCode >= 200 && statusCode < 400, body, errBody: errBodyStr }
}

const LOGIN_URL = 'https://store.coupangeats.com/merchant/login'
const REVIEWS_BASE_URL = 'https://store.coupangeats.com/merchant/management/reviews'

const DOM_SELECTORS = {
  idInput: 'input[name="loginId"], input[name="username"], input[name="email"], input[type="email"]',
  pwInput: 'input[name="password"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인"), button:has-text("로그인하기")',
  reviewCard: '[class*="ReviewItem"], [class*="review-item"], [class*="review-card"], [data-testid*="review-item"], [class*="ReviewCard"], [class*="ce-review-item"], li[class*="review"], .review-list > li, [class*="reviewList"] > li, [class*="review_item"]',
  reviewAuthor: '[class*="name"], [class*="nickname"], [class*="author"]',
  starFilled: '[class*="star"][class*="fill"], svg[class*="active"], [class*="StarActive"]',
  ratingText: '[class*="rating"], [class*="Rating"]',
  reviewContent: '[class*="content"], [class*="Content"], p[class*="body"]',
  reviewDate: 'time, [class*="date"], [class*="Date"]',
  reviewPhoto: 'img[class*="photo"], img[class*="image"], img[class*="thumbnail"]',
  ownerReply: '[class*="reply"][class*="owner"], [class*="OwnerReply"], [class*="StoreReply"]',
  replyButton: 'button:has-text("답글"), button:has-text("사장님 답글"), [class*="replyButton"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[class*="reply"]',
  replySubmit: 'button:has-text("등록"), button:has-text("저장"), button:has-text("확인")',
}

export type CoupangOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

export async function runCoupangEats(
  opts: CoupangOptions,
  action: Action,
  payload?: Record<string, unknown>,
): Promise<JobResult> {
  const { userId, browser, log } = opts

  if (action !== 'fetch_reviews' && action !== 'health_check' && action !== 'post_reply') {
    return { status: 'skipped', message: `coupangeats: action ${action} not yet supported` }
  }

  const svc = getServiceClient()
  const creds = await loadPlainCredentials(svc, userId, 'coupangeats')

  // ── 저장된 세션 쿠키 조회 (IP 차단 우회용) ──
  const savedCookies = await loadCoupangSessionCookies(svc, userId, log)
  log.info({ hasSavedCookies: !!savedCookies, cookieCount: savedCookies?.length ?? 0 }, 'coupangeats session cookie status')

  const proxyHost = process.env.PROXY_HOST
  const proxyPort = process.env.PROXY_PORT
  const proxyUser = process.env.PROXY_USER
  const proxyPass = process.env.PROXY_PASS
  const proxyProto = process.env.PROXY_PROTOCOL || 'http'
  const useProxy = !!(proxyHost && proxyPort)

  const contextOptions: any = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'sec-ch-ua': '"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
  }
  // proxy는 chromium.launch() 레벨에서 설정됨 (index.ts)
  // context 레벨에서 재설정하면 ERR_PROXY_AUTH_UNSUPPORTED 발생 → 여기서는 로그만
  if (useProxy) {
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}`, hasAuth: !!(proxyUser && proxyPass) }, 'coupangeats: using proxy (set at browser launch level)')
  }

  const context = await browser.newContext(contextOptions)

  // ── 신규: stealth helper (Canvas/WebGL/Audio fingerprint 마스킹) ──
  // Akamai _abck JS 챌린지의 추가 fingerprint 검사를 통과하기 위해 핵심 stealth init 먼저 적용
  await applyStealth(context)

  // ── 봇 감지 우회 (강화판 — 기존 inline) ──
  await context.addInitScript(() => {
    // 1) webdriver 제거
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    // 2) plugins — PluginArray 흉내 (길이·item 포함)
    const fakePlugins = ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client', 'Widevine Content Decryption Module', 'Microsoft Edge PDF Plugin']
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const arr: any = fakePlugins.map((name, i) => ({ name, filename: name.toLowerCase().replace(/ /g, '-') + '.dll', description: name, length: 1, item: () => null, namedItem: () => null, [i]: { type: 'application/x-' + i } }))
        arr.length = fakePlugins.length
        arr.item = (i: number) => arr[i]
        arr.namedItem = (n: string) => arr.find((p: any) => p.name === n) || null
        arr.refresh = () => {}
        return arr
      }
    })
    // 3) mimeTypes
    Object.defineProperty(navigator, 'mimeTypes', { get: () => ({ length: 4, item: () => null, namedItem: () => null }) })
    // 4) languages
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] })
    // 5) hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    // 6) deviceMemory
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
    // 7) Chrome 런타임 완전 위장
    ;(window as any).chrome = {
      runtime: {
        id: undefined,
        connect: () => {},
        sendMessage: () => {},
        onConnect: { addListener: () => {}, removeListener: () => {}, hasListener: () => false },
        onMessage: { addListener: () => {}, removeListener: () => {}, hasListener: () => false },
      },
      loadTimes: () => ({}),
      csi: () => ({}),
    }
    // 8) Permission API 위장
    const origQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions)
    if (origQuery) {
      ;(window.navigator.permissions as any).query = (params: any) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : origQuery(params)
    }
    // 9) outerWidth/Height
    if (!window.outerWidth) Object.defineProperty(window, 'outerWidth', { get: () => 1920 })
    if (!window.outerHeight) Object.defineProperty(window, 'outerHeight', { get: () => 1080 })
  })

  // 저장된 쿠키가 있으면 세션 복원
  if (savedCookies && savedCookies.length > 0) {
    try {
      await context.addCookies(savedCookies)
      log.info({ count: savedCookies.length }, 'coupangeats: session cookies restored')
    } catch (e: any) {
      log.warn({ err: e?.message }, 'coupangeats: failed to restore cookies')
    }
  }

  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'feedback', 'rating', 'merchant'])

  // ── 모든 요청 URL 로깅 (리뷰 API 발견용) ──
  const allRequestUrls: string[] = []
  page.on('request', (request: any) => {
    const url = request.url()
    // 정적 자산 제외
    if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.jpg')
      || url.includes('.ico') || url.includes('gtm') || url.includes('google') || url.includes('analytics')
      || url.includes('coupangcdn')) return
    allRequestUrls.push(`${request.method()} ${url}`)
  })

  // ── page.route: reviews/search 헤더 캡처 (fetchCoupangReviews 내부로 이동) ──
  // capturedNaturalHeaders는 fetchCoupangReviews 내부에서 nodeDirectApiGet과 같은 스코프로 등록됨

  // ── 네트워크 인터셉트: page 생성 직후 미리 등록 (쿠키 세션 navigation 전) ──
  // URL 필터 없이 ALL JSON 캡처 → Coupang API URL이 'review' 없어도 잡힘
  const earlyCapture: any[] = []
  const earlyCaptureUrls: string[] = []
  const allJsonUrls: string[] = []  // 디버그용: 모든 JSON URL 기록
  page.on('response', async (response: any) => {
    try {
      const url = response.url()
      const ct = response.headers()['content-type'] || ''
      if (!ct.includes('json') && !ct.includes('javascript')) return
      // 정적 자산 제외 (JS/CSS 번들)
      if (url.includes('.js') || url.includes('.css') || url.includes('gtm') || url.includes('google') || url.includes('analytics')) return
      const body = await response.json().catch(() => null)
      if (!body) return
      // 모든 JSON URL 기록 (디버그)
      allJsonUrls.push(url)
      // 리뷰 배열 감지: 배열이거나 { data: [...] } 등 다양한 형태
      const arr: any[] = Array.isArray(body) ? body
        : body?.data?.reviews || body?.reviews || body?.data || body?.content || body?.list || body?.items
          || body?.result?.reviews || body?.result || body?.payload || []
      if (!Array.isArray(arr) || arr.length === 0) return
      // 리뷰 구조 감지: rating/content/id 중 하나라도 있으면
      const firstItem = arr[0]
      const looksLikeReview = firstItem && (
        firstItem.rating != null || firstItem.starRating != null || firstItem.score != null
        || firstItem.content != null || firstItem.body != null
        || firstItem.reviewId != null || firstItem.review_id != null
        || firstItem.authorName != null || firstItem.nickname != null
      )
      if (looksLikeReview) {
        log.info({ url, count: arr.length }, 'coupangeats: early-captured review API response')
        earlyCaptureUrls.push(url)
        earlyCapture.push(...arr)
      } else {
        log.info({ url, arrLen: arr.length, sample: JSON.stringify(firstItem).slice(0, 100) }, 'coupangeats: json captured (non-review)')
      }
    } catch (_) { /* ignore */ }
  })

  try {
    // ── 쿠키 세션 → 브라우저 nav 건너뜀, 직접 node-direct API 호출 ──
    // 이유: Railway 프록시(socks5/http 불일치)로 browser nav 자체가 실패 → ERR 종류 무관하게 direct API 우선
    if (savedCookies && savedCookies.length > 0) {
      log.info({ cookieCount: savedCookies.length }, 'coupangeats: saved cookies found → skip browser nav, use direct API')
      const result = await fetchCoupangReviews(page, context, svc, creds, userId, action, payload, log, earlyCapture, earlyCaptureUrls, allRequestUrls, allJsonUrls, savedCookies)
      // 쿠키 만료(401/403) 감지 → 브라우저 재로그인 자동 폴백
      const dbg = (result as any)?.debug?.rawBodySample || ''
      const inserted = (result as any)?.data?.inserted ?? -1
      const currentUrl = (result as any)?.debug?.currentUrl || ''
      // 401 Unauthorized 또는 login 페이지 리다이렉트 = 세션 만료
      const sessionExpired = (
        dbg.includes('401') || dbg.includes('Unauthorized') ||
        currentUrl.includes('/login') ||
        (dbg.startsWith('whoami node:[') && !dbg.includes('"merchantId"') && !dbg.includes('"accountId"'))
      ) && inserted === 0
      if (!sessionExpired) {
        return result
      }

      // ── 56차 fix: 세션 만료 → form login 으로 fall-through ──
      // 기존 버그: fetchCoupangReviews(..., null) 재호출 = reviews 페이지 직행 (form login 안 거침)
      // 수정: 아래 form login flow (warming + humanType + storeId discovery) 로 흐름 떨어뜨림
      // 또한 테이블명 수정: platform_connections → platform_credentials.extra_data.session_cookies
      log.warn({ rawBodySample: dbg.slice(0, 100), currentUrl }, 'coupangeats: 세션 만료 감지 → form login 으로 fall-through (56cha)')
      try {
        const { data: existing } = await svc
          .from('platform_credentials')
          .select('extra_data')
          .eq('user_id', userId)
          .eq('platform', 'coupangeats')
          .maybeSingle()
        const cleaned: Record<string, unknown> = { ...((existing?.extra_data as Record<string, unknown>) || {}) }
        delete cleaned.session_cookies
        await svc
          .from('platform_credentials')
          .update({ extra_data: cleaned, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('platform', 'coupangeats')
        log.info('coupangeats: 만료 쿠키 DB 정리 완료 (extra_data.session_cookies 제거)')
      } catch (ce: any) {
        log.warn({ err: String(ce?.message || ce) }, 'coupangeats: 만료 쿠키 정리 실패 (계속 진행)')
      }

      // 페이지 컨텍스트 정리 → form login 코드가 새로 nav 함
      // page 는 이미 /merchant/login 으로 redirect 된 상태일 가능성 큼.
      // warmAkamaiSession 이 메인 → /login 순서로 다시 nav 하므로 OK.
      // (savedCookies 분기를 빠져나와 아래 form login 코드 실행)
    }

    // ── 폼 로그인 (쿠키 없거나 만료) ──
    // 56차: Akamai warming + humanType + humanClick + storeId auto-discovery
    // 60차: account_id 마스킹 로그 추가 (네이버/쿠팡 계정 혼동 디버깅용)
    function maskAccountId(id: string): string {
      if (!id) return ''
      const s = String(id).trim()
      if (s.length <= 2) return s
      if (s.length <= 4) return s[0] + '*'.repeat(s.length - 1)
      if (s.length <= 6) return s.slice(0, 2) + '*'.repeat(s.length - 3) + s.slice(-1)
      return s.slice(0, 2) + '*'.repeat(s.length - 4) + s.slice(-2)
    }
    log.info({
      accountIdMask: maskAccountId(creds.account_id),
      accountIdLen: creds.account_id.length,
      passwordLen: creds.password.length,
    }, 'coupangeats: 60cha — credential identity check (verify this is COUPANG ID, not naver/baemin)')
    log.info('coupangeats: attempting form login (56cha: warming + human-like)')
    let loginNavErr: string | null = null
    try {
      // ── 신규: Akamai cookie warming ──
      // 로그인 페이지 직행 = 봇 패턴. 메인 → 로그인 순서로 방문해서 _abck 갱신.
      // 각 단계에 idle thinking + mouse jiggle 으로 사람처럼 보이기.
      await warmAkamaiSession(page, log, {
        landingUrls: [
          'https://store.coupangeats.com/',
        ],
        finalUrl: LOGIN_URL,
      })
    } catch (e: any) {
      loginNavErr = String(e?.message || e)
      log.warn({ loginNavErr: loginNavErr.slice(0, 100) }, 'coupangeats: warming/login nav error (계속 진행)')
    }
    // 추가 idle (사람이 로그인 폼을 찾는 시간)
    await idleThinking(1500, 3000)

    const pwLocator = page.locator(DOM_SELECTORS.pwInput).first()
    const pwVisible = await pwLocator.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)
    if (!pwVisible) {
      await dumpPageDiagnostics(page, log, 'coupangeats-login-form-missing')
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', 'login form not found')
      return {
        status: 'failed',
        message: 'coupangeats 로그인 폼이 보이지 않아요. 잠시 후 다시 시도해주세요.',
      }
    }

    // ── 신규: 마우스 자연 이동 (입력 필드 클릭 전) ──
    await mouseJiggle(page, 2)

    const idCandidates = [
      'input[name="loginId"]',
      'input[name="username"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="아이디"]',
      'input[placeholder*="이메일"]',
      'input[placeholder*="ID"]',
      'input[placeholder*="id"]',
    ]
    let idFilled = false
    let idSelectorUsed = ''
    for (const sel of idCandidates) {
      try {
        const loc = page.locator(sel).first()
        const visible = await loc.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)
        if (visible) {
          // ── 신규: humanType (가변 딜레이 + 가끔 typo + correction) ──
          await humanType(page, sel, creds.account_id, { meanDelay: 95, stdDev: 40, typoRate: 0.03 })
          idFilled = true
          idSelectorUsed = sel
          log.info({ sel }, 'coupangeats: id input filled (human-like)')
          break
        }
      } catch { continue }
    }
    if (!idFilled) {
      await dumpPageDiagnostics(page, log, 'coupangeats-id-input-not-found')
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', 'id input not found')
      return { status: 'failed', message: 'coupangeats ID 입력 필드를 찾지 못했습니다' }
    }

    // ID 입력 후 작은 idle (탭 이동 자연스럽게)
    await idleThinking(400, 900)

    // ── 신규: PW 도 humanType ──
    await humanType(page, DOM_SELECTORS.pwInput, creds.password, { meanDelay: 110, stdDev: 45, typoRate: 0.025 })
    await idleThinking(800, 1500)

    // ── 59차: 입력값 검증 (humanType 가 정확히 입력했는지 확인) ──
    // typo rate 가 4% 라 typo correction 후에도 잘못된 글자가 남았을 수 있음.
    // submit 전에 실제 input.value 와 expected value 비교 → 불일치 시 fill() 로 강제 재입력.
    try {
      const idActual = await page.locator(idSelectorUsed).inputValue().catch(() => '')
      const pwActual = await page.locator(DOM_SELECTORS.pwInput).inputValue().catch(() => '')
      const idMatch = idActual === creds.account_id
      const pwMatch = pwActual === creds.password
      log.info({
        idMatch,
        pwMatch,
        idLenExpected: creds.account_id.length,
        idLenActual: idActual.length,
        pwLenExpected: creds.password.length,
        pwLenActual: pwActual.length,
      }, 'coupangeats: 59cha input value verification before submit')

      // 불일치 시 fill() 로 강제 재입력 (humanType 의 typo correction 버그 대비)
      if (!idMatch) {
        log.warn({ expected: creds.account_id.length, actual: idActual.length }, 'coupangeats: 59cha — ID mismatch, force fill()')
        await page.locator(idSelectorUsed).fill(creds.account_id)
        await idleThinking(300, 700)
      }
      if (!pwMatch) {
        log.warn({ expected: creds.password.length, actual: pwActual.length }, 'coupangeats: 59cha — PW mismatch, force fill()')
        await page.locator(DOM_SELECTORS.pwInput).fill(creds.password)
        await idleThinking(300, 700)
      }
    } catch (e: any) {
      log.warn({ err: e?.message?.slice(0, 100) }, 'coupangeats: 59cha — input verification failed (계속 진행)')
    }

    // ── ce-check-input 체크박스 자동 클릭 (약관동의/아이디저장) ──
    try {
      const checkbox = page.locator('input[class*="ce-check"], .ce-check-input, input[type="checkbox"]').first()
      const cbVisible = await checkbox.isVisible().catch(() => false)
      if (cbVisible) {
        const checked = await checkbox.isChecked().catch(() => false)
        if (!checked) {
          await checkbox.click({ force: true })
          log.info('coupangeats: checked checkbox before submit')
          await idleThinking(300, 700)
        }
      }
    } catch (_) { /* ignore */ }

    // ── 신규: 제출 전 마우스 자연 이동 ──
    await mouseJiggle(page, 1)

    // ── 제출 버튼 클릭 (humanClick: hover → 작은 딜레이 → click) ──
    const submitSelectors = [
      'button.merchant-submit-btn',
      'button[class*="merchant-submit"]',
      'button[type="submit"]',
      'button:has-text("로그인")',
      'button:has-text("로그인하기")',
    ]
    let submitted = false
    for (const sSel of submitSelectors) {
      try {
        const btn = page.locator(sSel).first()
        const visible = await btn.isVisible().catch(() => false)
        if (visible) {
          await humanClick(page, sSel)
          submitted = true
          log.info({ sSel }, 'coupangeats: submit button clicked (human-like)')
          break
        }
      } catch { continue }
    }
    if (!submitted) {
      await humanClick(page, DOM_SELECTORS.loginBtn)
    }
    // 56차: 로그인 후 충분히 안정화 대기
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 25000 }).catch(() => null)
    await idleThinking(2500, 4500)

    const currentUrl = page.url()
    if (currentUrl.includes('captcha')) {
      await markLoginStatus(svc, userId, 'coupangeats', 'captcha', currentUrl)
      return { status: 'failed', message: 'coupangeats captcha — 수동 로그인 필요' }
    }

    // ── 58차 fix: loginSucceeded 검사 정확화 ──
    // 기존 버그: currentUrl.includes('/merchant/') 가 truthy 면 즉시 성공 → /merchant/login 도 통과
    // 수정: URL이 /login 또는 /error 를 포함하면 무조건 실패
    // + whoami API 직접 호출로 진짜 인증 여부 검증 (URL 만으로는 불충분)
    const urlLooksLoggedIn = !currentUrl.includes('/login') && !currentUrl.includes('/error')

    // whoami 검증: 진짜 인증된 세션이면 응답에 merchantId/accountId/data 가 있음
    let whoamiCheck: any = null
    try {
      whoamiCheck = await page.evaluate(async () => {
        try {
          const r = await fetch('https://store.coupangeats.com/api/v1/merchant/whoami', { credentials: 'include' })
          if (!r.ok) return { ok: false, status: r.status, data: null }
          const j = await r.json().catch(() => null)
          return { ok: true, status: r.status, data: j }
        } catch (e: any) {
          return { ok: false, status: 0, data: null, err: String(e?.message || e) }
        }
      })
    } catch (_) { whoamiCheck = null }

    const whoamiAuthenticated = !!(
      whoamiCheck?.ok &&
      whoamiCheck?.data?.data && (
        whoamiCheck.data.data.merchantId ||
        whoamiCheck.data.data.accountId ||
        whoamiCheck.data.data.username ||
        whoamiCheck.data.data.responsibleStoreId ||
        (Array.isArray(whoamiCheck.data.data.stores) && whoamiCheck.data.data.stores.length > 0)
      )
    )
    log.info({
      urlLooksLoggedIn,
      whoamiOk: whoamiCheck?.ok,
      whoamiStatus: whoamiCheck?.status,
      whoamiHasData: !!whoamiCheck?.data?.data,
      whoamiAuthenticated,
      currentUrl: currentUrl.slice(0, 80),
    }, 'coupangeats: 58cha login check')

    const loginSucceeded = urlLooksLoggedIn && whoamiAuthenticated

    if (!loginSucceeded) {
      await dumpPageDiagnostics(page, log, 'coupangeats-login-failed')
      const { failed, reason } = await detectLoginFailure(page)

      // ── 59차: login-error-text 의 실제 텍스트 추출 ──
      // 쿠팡이츠 페이지에 표시된 에러 메시지를 정확히 캡처
      let coupangErrorText = ''
      try {
        const errorTexts = await page.evaluate(() => {
          const out: string[] = []
          const selectors = [
            '.login-error-text',
            '.login-error-label',
            '.field-error',
            '[class*="login-error"]',
            '[class*="error-message"]',
            '[class*="errorMessage"]',
          ]
          for (const sel of selectors) {
            const els = document.querySelectorAll(sel)
            els.forEach((el: Element) => {
              const t = (el.textContent || '').trim()
              if (t && t.length > 0 && t.length < 200) out.push(t)
            })
          }
          return Array.from(new Set(out))
        })
        coupangErrorText = errorTexts.join(' | ').slice(0, 300)
        if (coupangErrorText) {
          log.info({ coupangErrorText, errorCount: errorTexts.length }, 'coupangeats: 59cha — login-error-text extracted')
        } else {
          log.info('coupangeats: 59cha — no login-error-text element found')
        }
      } catch (e: any) {
        log.warn({ err: e?.message?.slice(0, 100) }, 'coupangeats: 59cha — error text extraction failed')
      }

      // 실패 사유 분류 (59차: coupangErrorText 우선 검사):
      //   - 페이지 에러 텍스트에 "비밀번호" / "아이디" 포함 = 자격증명 오류
      //   - reason 에 같은 키워드 포함 시도 자격증명 오류
      //   - 그 외 = 봇 차단 등 알 수 없는 실패
      const combinedReason = `${coupangErrorText} ${reason || ''}`
      const isCredentialsInvalid =
        combinedReason.includes('비밀번호') || combinedReason.includes('아이디') ||
        combinedReason.includes('password') || combinedReason.includes('username') ||
        combinedReason.includes('일치') || combinedReason.includes('확인')
      const isAccountLocked =
        combinedReason.includes('잠김') || combinedReason.includes('잠금') ||
        combinedReason.includes('locked') || combinedReason.includes('차단')
      const isCaptchaNeeded =
        combinedReason.includes('captcha') || combinedReason.includes('보안') ||
        combinedReason.includes('인증')

      const statusKey: 'credentials_invalid' | 'account_locked' | 'captcha' | 'failed' =
        isCredentialsInvalid ? 'credentials_invalid' :
        isAccountLocked ? 'account_locked' :
        isCaptchaNeeded ? 'captcha' :
        'failed'

      const note = (coupangErrorText || reason ||
        (currentUrl.includes('/login') ? `still_on_login_url (whoami=${whoamiCheck?.status ?? 'n/a'})` : `whoami_${whoamiCheck?.status ?? 'fail'}`)).slice(0, 80)
      await markLoginStatus(svc, userId, 'coupangeats', statusKey, note)

      const userMessage =
        isCredentialsInvalid ? '아이디 또는 비밀번호가 맞지 않아요. 다시 입력해주세요.' :
        isAccountLocked ? '계정이 잠겼어요. 쿠팡이츠 사장님에서 직접 로그인해 잠금을 해제해주세요.' :
        isCaptchaNeeded ? '봇 검증 단계에 막혔어요. 잠시 후 다시 시도해주세요.' :
        '쿠팡이츠 로그인에 실패했어요. 잠시 후 다시 시도해주세요.'

      return {
        status: 'failed',
        message: `coupangeats: ${userMessage}${coupangErrorText ? ` [페이지 에러: ${coupangErrorText.slice(0, 80)}]` : ''} (url=${currentUrl.slice(0, 60)}, whoami=${whoamiCheck?.status ?? 'n/a'})`,
        debug: {
          currentUrl,
          reason,
          coupangErrorText,
          whoamiStatus: whoamiCheck?.status,
          whoamiAuthenticated,
          urlLooksLoggedIn,
          statusKey,
        },
      }
    }

    await markLoginStatus(svc, userId, 'coupangeats', 'success')

    // 로그인 성공 시 쿠키 저장 (다음 실행 때 재활용)
    try {
      const cookies = await context.cookies()
      const relevant = cookies.filter((c) =>
        c.domain.includes('coupangeats') || c.domain.includes('coupang')
      )
      if (relevant.length > 0) {
        await saveCoupangSessionCookies(svc, userId, relevant, log)
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'coupangeats: failed to save session cookies')
    }

    // ── 신규(56차/58차): storeId auto-discovery ──
    // 사장님이 처음 연결할 때 platform_store_id 가 없거나 'pending'.
    // 58차: 이미 위에서 호출한 whoamiCheck 재사용 (중복 호출 제거).
    if (!creds.platform_store_id || creds.platform_store_id === 'pending') {
      try {
        const whoami = whoamiCheck?.data ?? null
        const discoveredId =
          whoami?.data?.responsibleStoreId ||
          whoami?.data?.storeId ||
          whoami?.data?.defaultStoreId ||
          (Array.isArray(whoami?.data?.stores) && whoami.data.stores[0]?.storeId) ||
          null
        const discoveredName =
          whoami?.data?.storeName ||
          (Array.isArray(whoami?.data?.stores) && (whoami.data.stores[0]?.name || whoami.data.stores[0]?.storeName)) ||
          null
        if (discoveredId) {
          log.info({ discoveredId, discoveredName }, 'coupangeats: 56cha — storeId auto-discovered')
          await svc
            .from('platform_credentials')
            .update({
              platform_store_id: String(discoveredId),
              platform_store_name: discoveredName || null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('platform', 'coupangeats')
          // creds 객체도 업데이트해서 fetchCoupangReviews 가 바로 사용 가능
          creds.platform_store_id = String(discoveredId)
          if (discoveredName) creds.platform_store_name = discoveredName
        } else {
          log.warn({ whoamiKeys: whoami?.data ? Object.keys(whoami.data).slice(0, 10) : null }, 'coupangeats: 56cha — storeId not in whoami')
        }
      } catch (e: any) {
        log.warn({ err: e?.message?.slice(0, 100) }, 'coupangeats: 56cha — storeId auto-discovery failed (계속 진행)')
      }
    }

    if (action === 'health_check') return { status: 'ok', message: 'coupangeats login ok' }
    return await fetchCoupangReviews(page, context, svc, creds, userId, action, payload, log, earlyCapture, earlyCaptureUrls, allRequestUrls, allJsonUrls)
  } catch (e: any) {
    log.error({ err: e?.message }, 'coupangeats error')
    return { status: 'failed', message: `coupangeats: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

async function fetchCoupangReviews(
  page: any,
  context: any,
  svc: any,
  creds: any,
  userId: string,
  action: Action,
  payload: Record<string, unknown> | undefined,
  log: Logger,
  earlyCapture: any[] = [],
  earlyCaptureUrls: string[] = [],
  allRequestUrls: string[] = [],
  allJsonUrls: string[] = [],
  directCookies: any[] | null = null,   // savedCookies 직접 전달 (proxy 차단 시 context.cookies() 대신)
): Promise<JobResult> {
  const reviewsUrl = creds.platform_store_id
    ? `${REVIEWS_BASE_URL}/${creds.platform_store_id}`
    : REVIEWS_BASE_URL

  // proxy 환경변수 (tunnelFetch fallback 용)
  const proxyHost = process.env.PROXY_HOST?.trim()
  const proxyPort = process.env.PROXY_PORT?.trim()
  const proxyUser = process.env.PROXY_USER?.trim()
  const proxyPass = process.env.PROXY_PASS?.trim()
  const useProxy = !!(proxyHost && proxyPort)

  // ── 네트워크 인터셉트: earlyCapture 배열을 그대로 사용 (같은 참조 → 리스너가 계속 push) ──
  const capturedReviews = earlyCapture       // 같은 배열 참조 (리스너 push 반영됨)
  const capturedUrls = earlyCaptureUrls      // 같은 배열 참조

  // ── reviews/search 자연 요청 헤더 캡처 (fetchCoupangReviews 내부 — nodeDirectApiGet 스코프 공유) ──
  // 날짜 범위 확장 제거: Akamai가 2일 이상 차단 → 자연 요청 그대로 통과 + 헤더만 캡처
  let capturedNaturalHeaders: Record<string, string> = {}
  let capturedNaturalUrl = ''
  try {
    await page.route('**/api/v1/merchant/**', async (route: any) => {
      try {
        const origUrl: string = route.request().url()
        const reqHeaders: Record<string, string> = route.request().headers() || {}
        if (!capturedNaturalUrl) {
          capturedNaturalUrl = origUrl
          capturedNaturalHeaders = reqHeaders
          const authHeader = reqHeaders['authorization'] || reqHeaders['Authorization'] || ''
          log.info('coupangeats: natural reviews/search CAPTURED — auth=' + authHeader.slice(0, 40) + ' url=' + origUrl.slice(0, 120))
          log.info('coupangeats: natural ALL headers: ' + JSON.stringify(reqHeaders).slice(0, 400))
        }
        // 날짜 범위 확장 제거 (기존 1년 확장이 Akamai 403 유발) — 자연 요청 그대로 통과
        await route.continue()
      } catch (_) { await route.continue() }
    })
  } catch (_) {}

  // directCookies가 있으면 브라우저가 proxy 차단으로 불능 → 페이지 조작 전체 건너뜀
  const skipBrowser = !!directCookies

  let alreadyOnReviews = false
  if (!skipBrowser) {
    try { alreadyOnReviews = page.url().includes('/review') } catch { /* browser dead */ }
  }
  log.info({ reviewsUrl, alreadyOnReviews, earlyCaptured: capturedReviews.length, skipBrowser, action }, 'coupangeats: fetchCoupangReviews entry')

  // ── 65차: post_reply fast path — sliding window 31일 fetch 완전 skip ──
  // 이유: 답글 발행 1건에 1분 fetch 비효율 + Railway SIGTERM 시 답글 못 달림
  // 흐름: pre-check (이미 답글 있음 검증) → home nav → /login redirect 검사 → bytes postCoupangEatsReply
  if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
    log.info('coupangeats: 65cha — post_reply fast path (skip sliding window)')

    // ── 66차/69차: pre-check 강화 — has_reply OR raw_snapshot.replies 검사 ──
    // 50001 외부 API 실패 미리 차단 (이미 답글 있는 review 발행 시도 방지)
    const targetIdPre = String(payload.platform_review_id)
    try {
      const { data: existing } = await svc
        .from('platform_reviews')
        .select('has_reply, reply_status, reply_content, raw_snapshot')
        .eq('user_id', userId)
        .eq('platform', 'coupangeats')
        .eq('platform_review_id', targetIdPre)
        .maybeSingle()

      const alreadyHasReply =
        existing?.has_reply === true ||
        !!existing?.reply_content ||
        (Array.isArray((existing?.raw_snapshot as any)?.replies) && (existing?.raw_snapshot as any).replies.length > 0)

      if (alreadyHasReply) {
        log.warn({ reviewId: targetIdPre }, 'coupangeats: 69cha — review already has reply, skipping post')
        // DB 의 has_reply 도 true 로 갱신 (UI 정합성)
        try {
          await svc.from('platform_reviews')
            .update({ has_reply: true })
            .eq('user_id', userId)
            .eq('platform', 'coupangeats')
            .eq('platform_review_id', targetIdPre)
        } catch (_) {}
        return {
          status: 'skipped',
          message: '이미 답글이 달려있어요. 쿠팡 페이지에서 확인해주세요.',
        }
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'coupangeats: 69cha pre-check failed (계속 진행)')
    }

    if (skipBrowser) {
      try {
        const targetStoreId = creds.platform_store_id || '738438'
        const homeUrl = `https://store.coupangeats.com/merchant/management/home/${targetStoreId}`
        // 69차: home nav timeout 30s → 15s, idle 2s → 1s (속도 최적화)
        await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.waitForTimeout(1000)
        const url = page.url()
        if (url.includes('/login') || url.includes('/error')) {
          return {
            status: 'failed',
            message: 'coupangeats: 세션 만료 — 매장 연결 다시 해주세요',
            debug: { rootUrl: url },
          }
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'coupangeats: 65cha home nav failed (계속 진행)')
      }
    }
    const targetIdFast = String(payload.platform_review_id)
    const replyTextFast = String(payload.reply_text)
    const storeIdFast = creds.platform_store_id || '738438'
    const replied = await postCoupangEatsReply(page, storeIdFast, targetIdFast, replyTextFast, log)
    if (replied.ok) {
      await updateCoupangReviewStatus(svc, userId, targetIdFast, 'submitted', { replyContent: replyTextFast })
      return { status: 'ok', message: `coupangeats: reply posted for ${targetIdFast} (fast path)` }
    }
    await updateCoupangReviewStatus(svc, userId, targetIdFast, 'failed', { error: replied.reason })
    return { status: 'failed', message: `coupangeats reply 실패: ${replied.reason}` }
  }

  // ── 리뷰 관리 페이지로 이동 (네트워크 인터셉트 + 자연 API 호출 유도) ──
  // savedCookies가 있으면(skipBrowser=true) 리뷰 페이지로 직접 탐색 시도
  // 이유: Akamai JS challenge는 실제 브라우저 탐색 시에만 실행됨 → _abck 갱신 → API 허용
  // 로그인 URL이 아닌 리뷰 URL로 바로 가면 프록시 auth 문제 없이 동작 가능
  let browserNavOk = false
  if (skipBrowser) {
    log.info({ reviewsUrl }, 'coupangeats: savedCookies — step1: nav to /merchant/management/home/{storeId} to set responsibleStoreId')
    try {
      // ── Step 1: /merchant/management/home/{storeId}로 이동 → 서버 세션에 responsibleStoreId 설정 ──
      // 이유: storeId가 URL path에 포함되어야 서버가 responsibleStoreId=storeId로 세션 설정
      //       /merchant 루트는 store 선택 UI가 없으면 responsibleStoreId=null 유지
      const targetStoreId2 = creds.platform_store_id || '738438'
      const homeUrl = `https://store.coupangeats.com/merchant/management/home/${targetStoreId2}`
      await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(4000)
      const rootUrl = page.url()
      log.info(`coupangeats: homeUrl=${homeUrl} currentUrl=${rootUrl} after home nav`)
      log.info(`coupangeats: allRequestUrls after home nav (last 20): ${allRequestUrls.slice(-20).join(' | ')}`)

      // 홈 페이지 로드 후 whoami 재확인 (인증 신호 다중 검사)
      // 61차: responsibleStoreId 만 검사하면 매장에 따라 false 가짜로 떠서 skip 됨.
      //       URL이 정상이면(/login 아님) cookies 가 유효한 거고, whoami 필드 다양화.
      let authValid = false
      let whoamiSnapshot: any = null
      try {
        const whoamiCheck = await page.evaluate(async () => {
          const r = await fetch('https://store.coupangeats.com/api/v1/merchant/whoami', { credentials: 'include' })
          return r.ok ? await r.json() : null
        })
        whoamiSnapshot = whoamiCheck
        const d = whoamiCheck?.data || null
        if (d) {
          authValid = !!(
            d.responsibleStoreId || d.storeId || d.defaultStoreId ||
            d.merchantId || d.accountId || d.username || d.userId ||
            (Array.isArray(d.stores) && d.stores.length > 0)
          )
        }
        log.info({
          authValid,
          whoamiKeys: d ? Object.keys(d).slice(0, 15) : null,
          rid: d?.responsibleStoreId ?? 'N/A',
        }, 'coupangeats: 61cha whoami after home nav')
      } catch (_) {}

      // ── 61차: 진짜 session expired 만 skip ──
      // 조건 강화: URL 이 /login 으로 redirect 됐을 때만 만료로 판정.
      // (이전 버그: whoami responsibleStoreId 단일 검사 → 매장에 따라 false → 잘못된 skip)
      if (rootUrl.includes('/login') || rootUrl.includes('/error')) {
        log.warn({ rootUrl }, 'coupangeats: 61cha — home nav → login redirect, session expired. skipping step2')
        return {
          status: 'skipped',
          message: 'coupangeats: session expired (login redirect) — skipping step2',
          data: { inserted: 0, updated: 0 },
          debug: { rawBodySample: 'session-expired:/login-redirect', currentUrl: rootUrl },
        }
      }

      // URL 은 정상인데 whoami 가 빈 응답 → 그래도 진행 (다른 API 가 작동할 수 있음)
      if (!authValid) {
        log.warn({ rootUrl, whoamiSnapshot: JSON.stringify(whoamiSnapshot).slice(0, 200) },
          'coupangeats: 61cha — whoami no auth fields but URL ok, continuing anyway')
      }

      // POST URL 로그 (어떤 POST 요청들이 발생했는지)
      const postUrls = allRequestUrls.filter((u) => u.startsWith('POST') || u.startsWith('PUT'))
      log.info(`coupangeats: POST/PUT urls so far: ${postUrls.slice(0, 10).join(' | ')}`)

      // ── Step 2: 리뷰 페이지로 이동 ──
      log.info(`coupangeats: step2 nav to reviewsUrl (allRequest before=${allRequestUrls.length})`)
      await page.goto(reviewsUrl, { waitUntil: 'domcontentloaded', timeout: 35000 })
      await page.waitForTimeout(8000)
      browserNavOk = true
      const finalUrl = page.url()
      log.info(`coupangeats: reviews page loaded url=${finalUrl} captured=${capturedReviews.length}`)
      log.info(`coupangeats: allRequestUrls after reviews nav (last 30): ${allRequestUrls.slice(-30).join(' | ')}`)
      log.info(`coupangeats: allJsonUrls: ${allJsonUrls.slice(0, 25).join(' | ')}`)
      // POST/PUT 전체 목록 (store 선택 엔드포인트 탐색)
      const postUrlsAfter = allRequestUrls.filter((u) => u.startsWith('POST') || u.startsWith('PUT'))
      log.info(`coupangeats: ALL POST/PUT urls: ${postUrlsAfter.join(' | ')}`)

      // ── Step 2a: localStorage 토큰 + window.axios 경로 탐색 ──
      try {
        const pageState = await page.evaluate(() => {
          // localStorage에서 인증 관련 키 탐색
          const lsKeys: string[] = []
          const lsTokens: Record<string, string> = {}
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i) || ''
            lsKeys.push(k)
            if (k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') ||
                k.toLowerCase().includes('store') || k.toLowerCase().includes('merchant') ||
                k.toLowerCase().includes('unify')) {
              const v = localStorage.getItem(k) || ''
              lsTokens[k] = v.slice(0, 80)
            }
          }
          // window.axios 경로 탐색
          const axiosPaths: string[] = []
          const axCandidates = ['axios', '__axios', '_axios', 'Vue', '__vue_store__', 'store', '__store']
          for (const key of axCandidates) {
            if ((window as any)[key]) axiosPaths.push(key)
          }
          // Vue store에서 storeId 탐색
          let vueStoreId: any = null
          try {
            const vueApp = (document.querySelector('#app') as any)?.__vue_app__
            const store = vueApp?.config?.globalProperties?.$store
            vueStoreId = store?.state?.merchant?.responsibleStoreId ?? store?.state?.store?.storeId ?? store?.getters?.storeId ?? null
          } catch (_) { /* ignore */ }
          return { lsKeys: lsKeys.slice(0, 30), lsTokens, axiosPaths, vueStoreId }
        })
        log.info(`coupangeats: localStorage keys: ${pageState.lsKeys.join(', ')}`)
        log.info(`coupangeats: localStorage tokens: ${JSON.stringify(pageState.lsTokens).slice(0, 300)}`)
        log.info(`coupangeats: window.axios paths: ${pageState.axiosPaths.join(', ')} | vueStoreId=${pageState.vueStoreId}`)
      } catch (pse: any) {
        log.warn({ err: pse?.message }, 'coupangeats: pageState inspect failed')
      }

      // ── Step 2b: 51차 슬라이딩 윈도우 (dateWindowTest 제거) ──
      // 핵심 발견: dateWindowTest 3번 fetch(size=5) → 200, 4번째 fetch(size=100) → 403
      // 원인: Akamai 빠른 연속 request quota 초과 or size=100이 스크래핑으로 감지됨
      // 51차 수정:
      //   1. dateWindowTest 제거 (3번 quota 낭비 없애기)
      //   2. size=5 + 페이지네이션 (자연스러운 브라우저 동작)
      //   3. fetch 간 800ms 딜레이 (rate detection 회피)
      try {
        const storeId0 = targetStoreId2
        const fmtD = (d: Date) => d.toISOString().split('T')[0]
        const statusTypes0 = ['EXPOSE', 'UNEXPOSE']
        const PAGE_SIZE = 5
        // 67차: DAYS_BACK 30 → 180 (6개월) — 답글 단 오래된 review 도 수집
        // 페이지네이션 자동 (size=5 → 답글 많은 매장도 모두 수집)
        // Akamai rate limit: 800ms delay 간격이라 6개월 = 약 4분
        const DAYS_BACK = 180

        // ── 52차: 슬라이딩 윈도우 전에 store switch (브라우저 컨텍스트) ──
        // 원인: responsibleStoreId가 서버 세션에 미설정 → reviews/search 200이지만 빈 결과
        // 해결: page.evaluate로 POST /stores/{storeId}/switch → 서버 세션 storeId 설정
        try {
          const switchRes = await page.evaluate(async (args: { url: string; storeId: number }) => {
            const r = await fetch(args.url, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ storeId: args.storeId }),
            })
            const text = await r.text()
            let body: any = null
            try { body = JSON.parse(text) } catch { body = null }
            return { status: r.status, ok: r.ok, body }
          }, { url: `https://store.coupangeats.com/api/v1/merchant/stores/${storeId0}/switch`, storeId: parseInt(storeId0, 10) })
          log.info({ status: switchRes.status, body: JSON.stringify(switchRes.body).slice(0, 100) }, 'coupangeats: 52cha browser switch result')
          await new Promise(resolve => setTimeout(resolve, 1000))  // switch 반영 대기
        } catch (swErr: any) {
          log.warn({ err: swErr?.message }, 'coupangeats: 52cha browser switch failed')
        }

        log.info('coupangeats: 52cha — sliding window start (after browser switch)')

        for (const statusType0 of statusTypes0) {
          let sessionOk = true
          for (let daysBack = 0; daysBack <= DAYS_BACK && sessionOk; daysBack++) {
            const dayEnd = new Date(); dayEnd.setDate(dayEnd.getDate() - daysBack + 1)
            const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - daysBack)
            const dateRange = `startDateTime=${fmtD(dayStart)}&exclusiveEndDateTime=${fmtD(dayEnd)}`

            // 페이지네이션: 각 날짜에서 size=5씩 수집
            let pageNum = 1
            let hasMore = true
            while (hasMore) {
              const url0 = `https://store.coupangeats.com/api/v1/merchant/reviews/search?storeId=${storeId0}&page=${pageNum}&statusType=${statusType0}&${dateRange}&size=${PAGE_SIZE}`

              // 800ms 딜레이 (Akamai rate detection 회피)
              await new Promise(resolve => setTimeout(resolve, 800))

              const res0 = await page.evaluate(async (args: { url: string }) => {
                try {
                  const r = await fetch(args.url, { credentials: 'include', headers: { 'Accept': 'application/json' } })
                  const text = await r.text()
                  let body: any = null
                  try { body = JSON.parse(text) } catch { body = null }
                  return { ok: r.ok, status: r.status, body, errBody: r.ok ? '' : text.slice(0, 200) }
                } catch (e: any) {
                  return { ok: false, status: 0, body: null, errBody: String(e?.message || e) }
                }
              }, { url: url0 })

              if (!res0.ok) {
                log.warn({ statusType: statusType0, daysBack, pageNum, status: res0.status, err: res0.errBody?.slice(0, 80) }, 'coupangeats: 51cha window failed')
                sessionOk = false
                break
              }

              const items: any[] = []
              const rawBody = res0.body
              if (Array.isArray(rawBody)) items.push(...rawBody)
              else if (Array.isArray(rawBody?.content)) items.push(...rawBody.content)
              else if (Array.isArray(rawBody?.data?.content)) items.push(...rawBody.data.content)
              else if (Array.isArray(rawBody?.data?.reviews)) items.push(...rawBody.data.reviews)
              else if (Array.isArray(rawBody?.reviews)) items.push(...rawBody.reviews)

              log.info({ statusType: statusType0, daysBack, pageNum, status: res0.status, count: items.length }, 'coupangeats: 51cha window ok')
              for (const item of items) capturedReviews.push(item)

              hasMore = items.length >= PAGE_SIZE
              pageNum++
              if (pageNum > 10) break  // 안전장치
            }
          }
        }
        log.info({ total: capturedReviews.length }, 'coupangeats: 51cha sliding window done')
      } catch (wte: any) {
        log.warn({ err: wte?.message }, 'coupangeats: 51cha sliding window error')
      }
    } catch (navErr: any) {
      log.warn({ err: navErr?.message }, 'coupangeats: savedCookies nav failed — will use node-direct only')
    }
  }

  if (!skipBrowser && !alreadyOnReviews) {
    log.info({ reviewsUrl }, 'coupangeats: navigating to reviews page for natural API capture')
    try {
      await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
        page.goto(reviewsUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
      )
      await page.waitForTimeout(4000)
      log.info({ url: page.url(), capturedSoFar: capturedReviews.length }, 'coupangeats: reviews page loaded')
    } catch (navErr: any) {
      log.warn({ err: navErr?.message }, 'coupangeats: reviews navigation failed, trying direct API')
    }
  }

  // ── 페이지 상호작용 제거 ──
  // 주의: 조회/검색 버튼 클릭 시 SPA 상태 변경 → Akamai 세션 무효화 → 이후 모든 fetch 403
  // dateWindowTest(버튼 클릭 전)에서 1d/7d/30d 모두 200 → 버튼 클릭이 세션 파괴 원인 확인
  // 따라서 상호작용 없이 직접 fetch로 진행
  if (!skipBrowser || browserNavOk) {
    try { await closeAllModals(page, log) } catch { /* browser dead — ignore */ }
  }
  log.info({ capturedSoFar: capturedReviews.length }, 'coupangeats: skipping page interactions (버튼 클릭 → Akamai 세션 파괴 방지)')

  const storeId = creds.platform_store_id || '738438'
  log.info({ storeId, naturalCaptured: capturedReviews.length }, 'coupangeats: calling review API (node-direct fetch primary, browser fallback)')

  // ── API 호출 설정 ──
  const BASE_ORIGIN = 'https://store.coupangeats.com'

  function extractArr(body: any): any[] {
    if (Array.isArray(body)) return body
    if (Array.isArray(body?.content)) return body.content
    if (Array.isArray(body?.data?.content)) return body.data.content
    if (Array.isArray(body?.data?.reviews)) return body.data.reviews
    if (Array.isArray(body?.reviews)) return body.reviews
    if (Array.isArray(body?.data?.list)) return body.data.list
    if (Array.isArray(body?.list)) return body.list
    if (Array.isArray(body?.data?.items)) return body.data.items
    if (Array.isArray(body?.items)) return body.items
    if (Array.isArray(body?.data)) return body.data
    if (Array.isArray(body?.result)) return body.result
    return []
  }

  function getTotalPages(body: any): number {
    return body?.totalPages || body?.data?.totalPages
      || body?.total_pages || body?.data?.total_pages
      || Math.ceil((body?.totalElements || body?.data?.totalElements || body?.data?.totalCount || body?.totalCount || 0) / 100)
      || 0
  }

  // ── Node.js native fetch (직접 API 호출, 브라우저/프록시 우회) ──
  // Playwright page.evaluate fetch → 407 발생 (proxy auth 미전달)
  // globalThis.fetch (Node 18+) → Cookie 헤더 직접 주입 → 프록시 없이 CoupangEats API 직접 접근
  // directCookies: proxy 차단으로 browser navigation 불가 시 savedCookies를 직접 사용
  // browserNavOk=true 면 Akamai JS가 실행되어 context에 fresh _abck가 있음 → context.cookies() 사용
  // 그렇지 않으면 directCookies 사용 (browser nav 불가 경로)
  const contextCookies = (browserNavOk || !directCookies)
    ? await context.cookies('https://store.coupangeats.com').catch(() => directCookies ?? [] as any[])
    : directCookies

  // Akamai Bot Manager 쿠키:
  // - browserNavOk=true 면 Akamai가 이미 이 세션을 검증함 → 유지 (API 요청에도 포함)
  // - browserNavOk=false 면 IP/fingerprint 불일치로 오히려 차단 → 제외
  const AKAMAI_COOKIE_PREFIXES = ['bm_', 'ak_', '_abck']
  const apiCookies = browserNavOk
    ? contextCookies   // fresh Akamai 쿠키 포함
    : contextCookies.filter((c: any) => {
        const n = c.name.toLowerCase()
        return !AKAMAI_COOKIE_PREFIXES.some(p => n.startsWith(p))
      })
  const cookieStr = apiCookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
  const cookieNames = contextCookies.map((c: any) => c.name)
  log.info({ cookieCount: contextCookies.length, apiCookieCount: apiCookies.length, cookieNames, hasCookieStr: !!cookieStr, viaDirectCookies: !!directCookies }, 'coupangeats: node-direct cookie string built (akamai cookies excluded)')

  // CSRF & Auth token extraction from cookies
  const findCookie = (names: string[]) => contextCookies.find((c: any) => names.includes(c.name))?.value || null
  const csrfToken = findCookie(['XSRF-TOKEN', 'xsrf-token', 'csrf-token', '_csrf', 'X-CSRF-TOKEN', 'csrftoken'])
  const authToken = findCookie(['access-token', 'store-access-token', 'Authorization', 'auth-token', 'jwt', 'token'])
  log.info({ csrfToken: csrfToken ? csrfToken.slice(0, 20) + '...' : null, authToken: authToken ? authToken.slice(0, 20) + '...' : null }, 'coupangeats: extracted tokens')

  async function nodeDirectApiGet(path: string): Promise<{ ok: boolean; body: any; status: number; errBody: string }> {
    const url = path.startsWith('http') ? path : `${BASE_ORIGIN}${path}`

    // ── 1순위: tunnelFetch (HTTP CONNECT 프록시 경유 — 한국 IP로 CoupangEats 접근) ──
    let tunnelErr: string | null = null
    if (useProxy && proxyHost && proxyPort && proxyUser && proxyPass) {
      try {
        // capturedNaturalHeaders가 있으면 자연 요청의 헤더 재사용 (Akamai 인증 헤더 포함)
        const naturalH: Record<string, string> = {}
        if (Object.keys(capturedNaturalHeaders).length > 0) {
          const skipKeys = new Set(['host', 'content-length', 'cookie', ':authority', ':method', ':path', ':scheme'])
          for (const [k, v] of Object.entries(capturedNaturalHeaders)) {
            if (!skipKeys.has(k.toLowerCase())) naturalH[k] = v
          }
        }
        const extraH: Record<string, string> = {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://store.coupangeats.com/merchant/management/reviews',
          'Origin': 'https://store.coupangeats.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
          ...naturalH,  // 자연 헤더 오버레이 (Authorization, x-eats-store-id 등)
        }
        if (csrfToken) { extraH['X-XSRF-TOKEN'] = csrfToken; extraH['X-CSRF-Token'] = csrfToken }
        // Authorization Bearer 제거 — Cookie 헤더가 세션 인증을 담당 (Bearer 추가 시 충돌 가능)
        // if (authToken) extraH['Authorization'] = `Bearer ${authToken}`
        const result = await tunnelFetch(
          url, cookieStr,
          proxyHost, parseInt(proxyPort, 10), proxyUser, proxyPass,
          extraH,
        )
        log.info({ url: path.slice(0, 80), status: result.status, errBody: result.errBody?.slice(0, 150), via: 'tunnelFetch' }, 'coupangeats: nodeDirectApiGet via proxy tunnel')
        // Akamai Bot Manager 차단(403 Access Denied HTML) 감지 → 직접 연결으로 폴백
        // 이유: Akamai는 IP보다 TLS 핑거프린트(JA3)로 차단 → 프록시 경유 시 Node.js JA3가 Chrome JA3와 다름
        const isAkamaiBlock = !result.ok && result.status === 403 && result.errBody?.includes('Access Denied')
        if (!isAkamaiBlock) return result
        tunnelErr = `proxy:403-AkamaiBlock`
        log.warn({ url: path.slice(0, 80) }, 'coupangeats: Akamai blocked proxy request → falling back to direct fetch')
      } catch (e: any) {
        tunnelErr = String(e?.message || e).slice(0, 150)
        log.warn({ url: path.slice(0, 80), tunnelErr }, 'coupangeats: tunnelFetch failed, falling back to globalThis.fetch')
      }
    }

    // ── 2순위: globalThis.fetch (직접 연결 — Akamai 차단 우회용 포함) ──
    try {
      const directH: Record<string, string> = {
        'Cookie': cookieStr,
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://store.coupangeats.com/merchant/management/reviews',
        'Origin': 'https://store.coupangeats.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      }
      if (authToken) directH['Authorization'] = `Bearer ${authToken}`
      if (csrfToken) { directH['X-XSRF-TOKEN'] = csrfToken; directH['X-CSRF-Token'] = csrfToken }
      const r = await (globalThis as any).fetch(url, { headers: directH })
      const status = r.status
      if (!r.ok) {
        let directErrBody = ''
        try { directErrBody = JSON.stringify(await r.json()) } catch (_) { try { directErrBody = await r.text() } catch (_) { directErrBody = '(no body)' } }
        // tunnelErr 포함 (proxy 실패 원인 노출)
        const combined = tunnelErr
          ? `tunnel[${tunnelErr.slice(0, 100)}] direct_http${status}[${directErrBody.slice(0, 80)}]`
          : `HTTP${status} ${directErrBody.slice(0, 150)}`
        return { ok: false, body: null, status, errBody: combined }
      }
      const body = await r.json().catch(() => null)
      return { ok: true, body, status, errBody: '' }
    } catch (e: any) {
      const directErr = String(e?.message || e).slice(0, 150)
      return { ok: false, body: null, status: 0, errBody: tunnelErr ? `tunnel[${tunnelErr}] direct[${directErr}]` : directErr }
    }
  }

  // ── browser page.evaluate — try Axios instance first, then fetch ──
  // Strategy: use the page's own Axios (with interceptors) if available,
  //           otherwise pass HttpOnly token to fetch via object arg
  async function browserApiGet(path: string): Promise<{ ok: boolean; body: any; status: number; errBody: string }> {
    const url = path.startsWith('http') ? path : `${BASE_ORIGIN}${path}`
    try {
      // Read unify-token via Playwright (reads HttpOnly cookies)
      let unifyToken = ''
      try {
        const allCookies = await page.context().cookies(BASE_ORIGIN)
        const uc = allCookies.find((c: any) => c.name === 'unify-token')
        unifyToken = uc?.value || ''
        log.info('coupangeats: browserApiGet unifyToken=' + (unifyToken ? 'FOUND(' + unifyToken.slice(0, 10) + '...)' : 'EMPTY'))
      } catch (_) {}

      const result: { ok: boolean; body: any; status: number; errBody: string; axiosUsed: boolean } = await page.evaluate(
        async (args: { fetchUrl: string; token: string }) => {
          // Try to use the page's existing Axios instance (has interceptors with Bearer token)
          const axiosInstance = (window as any).axios || (window as any).__axios
          if (axiosInstance) {
            try {
              const resp = await axiosInstance.get(args.fetchUrl)
              return { ok: true, body: resp.data, status: resp.status, errBody: '', axiosUsed: true }
            } catch (axErr: any) {
              const status = axErr?.response?.status || 0
              const errBody = JSON.stringify(axErr?.response?.data || axErr?.message || '').slice(0, 150)
              return { ok: false, body: null, status, errBody, axiosUsed: true }
            }
          }
          // Fallback: fetch with explicit token header
          try {
            const hdrs: Record<string, string> = {
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': 'https://store.coupangeats.com/merchant/management/reviews',
              'Origin': 'https://store.coupangeats.com',
            }
            if (args.token) hdrs['Authorization'] = 'Bearer ' + args.token
            const r = await fetch(args.fetchUrl, { credentials: 'include', headers: hdrs })
            const status = r.status
            if (!r.ok) {
              let errBody = ''
              try { errBody = JSON.stringify(await r.json()) } catch (_) { try { errBody = await r.text() } catch (_) { errBody = '(no body)' } }
              return { ok: false, body: null, status, errBody: String(errBody).slice(0, 150), axiosUsed: false }
            }
            const body = await r.json().catch(() => null)
            return { ok: true, body, status, errBody: '', axiosUsed: false }
          } catch (e: any) {
            return { ok: false, body: null, status: 0, errBody: String(e?.message || e).slice(0, 150), axiosUsed: false }
          }
        },
        { fetchUrl: url, token: unifyToken }
      )
      log.info('coupangeats: browserApiGet axiosUsed=' + result.axiosUsed + ' status=' + result.status)
      return result
    } catch (e: any) {
      return { ok: false, body: null, status: 0, errBody: String(e?.message || e).slice(0, 150) }
    }
  }

  // Akamai 차단 감지 헬퍼
  function isAkamaiBlock(res: { ok: boolean; status: number; errBody: string }): boolean {
    return !res.ok && res.status === 403 && (res.errBody?.includes('Access Denied') || res.errBody?.includes('AkamaiBlock'))
  }

  // ── apiGet: node-direct 우선, Akamai 차단 시 browserApiGet 폴백 ──
  // skipBrowser=true라도 Akamai 403 감지 시 browserApiGet 허용
  // 이유: Akamai는 TLS 핑거프린트(JA3)로 차단 → Node.js JA3 ≠ Chrome JA3
  //       page.evaluate(fetch)는 진짜 Chrome TLS로 요청 → Akamai 우회
  //       쿠키는 이미 context.addCookies()로 주입됨 → credentials:'include' 작동
  let useNodeDirect = false
  async function apiGet(path: string): Promise<{ ok: boolean; body: any; status: number; errBody: string }> {
    if (skipBrowser) {
      const res = await nodeDirectApiGet(path)
      if (!isAkamaiBlock(res)) return res
      // Akamai 차단 → browserApiGet 폴백 (Chrome TLS로 우회)
      log.info({ path: path.slice(0, 80) }, 'coupangeats: Akamai block → browserApiGet fallback (Chrome TLS)')
      return browserApiGet(path)
    }
    if (useNodeDirect) {
      const res = await nodeDirectApiGet(path)
      if (res.ok || res.status === 401 || (res.status === 403 && !isAkamaiBlock(res))) return res
      // 네트워크 오류 또는 Akamai → browser fallback
    }
    return browserApiGet(path)
  }

  const collected: any[] = []
  const seenIds = new Set<string>()
  let rawBodySample = ''
  const errors: string[] = []

  // whoami 확인 — node-direct 먼저 시도
  let merchantId: number | null = null
  try {
    log.info('coupangeats: trying node-direct whoami')
    const ndRes = await nodeDirectApiGet('/api/v1/merchant/whoami')
    if (ndRes.ok && ndRes.body) {
      useNodeDirect = true
      rawBodySample = JSON.stringify(ndRes.body).slice(0, 200)
      merchantId = ndRes.body?.data?.merchantId || ndRes.body?.merchantId || null
      log.info({ whoamiOk: true, merchantId, via: 'node-direct' }, 'coupangeats: whoami ok (node-direct)')
    } else {
      // node-direct 실패 → browserApiGet 시도 (skipBrowser=true여도 허용 — Akamai 우회 목적)
      log.warn({ status: ndRes.status, err: ndRes.errBody, skipBrowser }, 'coupangeats: node-direct whoami failed, trying browser (Chrome TLS)')
      const wRes = await browserApiGet('/api/v1/merchant/whoami')
      if (wRes.ok && wRes.body) {
        rawBodySample = JSON.stringify(wRes.body).slice(0, 200)
        merchantId = wRes.body?.data?.merchantId || wRes.body?.merchantId || null
        log.info({ whoamiOk: true, merchantId, via: 'browser' }, 'coupangeats: whoami ok (browser)')
      } else {
        rawBodySample = `whoami node:[${ndRes.errBody?.slice(0,120)}] browser:HTTP ${wRes.status}:${wRes.errBody?.slice(0,80)}`
        log.warn({ status: wRes.status, err: wRes.errBody, nodeErr: ndRes.errBody }, 'coupangeats: whoami failed (both methods)')
      }
    }
  } catch (e: any) {
    rawBodySample = `whoami exception: ${e?.message}`
    log.warn({ err: e?.message }, 'coupangeats: whoami exception')
  }

  // 스토어 목록 조회 (403 원인 진단) + 스토어 컨텍스트 설정 시도
  if (useNodeDirect && merchantId) {
    try {
      const storesRes = await nodeDirectApiGet(`/api/v1/merchant/${merchantId}/stores`)
      log.info(`coupangeats: stores=${storesRes.status} body=${JSON.stringify(storesRes.body).slice(0,200)} err=${storesRes.errBody?.slice(0,80)}`)

      // 실제 스토어 ID 추출 시도 (API에서 반환된 첫 번째 스토어)
      let realStoreId = storeId
      if (storesRes.ok && storesRes.body) {
        const storeList: any[] = storesRes.body?.data?.stores || storesRes.body?.stores || storesRes.body?.data || []
        if (Array.isArray(storeList) && storeList.length > 0) {
          const firstStore = storeList[0]
          const apiStoreId = String(firstStore?.storeId || firstStore?.id || firstStore?.store_id || '')
          if (apiStoreId && apiStoreId !== storeId) {
            log.info({ configuredStoreId: storeId, apiStoreId }, 'coupangeats: storeId mismatch — using API-returned storeId')
            realStoreId = apiStoreId
          }
          log.info(`coupangeats: first store from API: ${JSON.stringify(firstStore).slice(0,150)}`)
        }
      }

      // 48차: browserApiGet은 complex headers → Akamai 세션 파괴 → 슬라이딩 윈도우 403
      // browserWhoami 블록 제거 (세션 보호)

      // 49차: 진단 블록 내 모든 apiGet → nodeDirectApiGet으로 교체
      // apiGet은 Akamai 차단 시 browserApiGet 폴백 → complex headers → 세션 파괴
      // nodeDirectApiGet은 Node.js로만 요청 → 브라우저 세션 무영향

      // 스토어 스위치 (node-direct only — browserApiGet 폴백 없음)
      const switchGet = await nodeDirectApiGet(`/api/v1/merchant/stores/${realStoreId}/switch`)
      const switchPost = await (async () => {
        try {
          const u = `https://store.coupangeats.com/api/v1/merchant/stores/${realStoreId}/switch`
          const r = await (globalThis as any).fetch(u, {
            method: 'POST',
            headers: { 'Cookie': cookieStr, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Origin': 'https://store.coupangeats.com', 'Referer': 'https://store.coupangeats.com/merchant/management/reviews' },
            body: JSON.stringify({ storeId: parseInt(realStoreId, 10) }),
          })
          const body = await r.json().catch(() => null)
          return { status: r.status, body }
        } catch (e: any) { return { status: 0, body: null } }
      })()
      log.info(`coupangeats: switchGET=${switchGet.status} switchPOST=${switchPost.status} switchPOSTbody=${JSON.stringify(switchPost.body).slice(0,100)} realStoreId=${realStoreId}`)

      // 리뷰 API 진단 (node-direct only — browserApiGet 절대 호출 금지)
      const todayStr = new Date().toISOString().split('T')[0]
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      const diagDateRange = `startDateTime=${todayStr}&exclusiveEndDateTime=${tomorrowStr}`
      const alt1 = await nodeDirectApiGet(`/api/v1/merchant/reviews/search?storeId=${realStoreId}&page=1&${diagDateRange}&size=10`)
      log.info(`coupangeats: alt1=${alt1.status} stores=${storesRes.status} switch=${switchGet.status}`)
      rawBodySample += ` | stores:${storesRes.status} switchGET:${switchGet.status} switchPOST:${switchPost.status} alt1:${alt1.status} realStoreId:${realStoreId}`
    } catch (e: any) {
      log.warn({ err: e?.message }, 'coupangeats: stores/switch diagnostic failed')
    }
  }

  // statusType 순서: EXPOSE (공개) 우선, 이후 UNEXPOSE
  // 핵심 발견(47cha-8): browserApiGet(복잡 헤더)은 403, minimal fetch(credentials:include만)는 200
  // → dateWindowTest와 동일한 minimal fetch 사용
  const statusTypes = ['EXPOSE', 'UNEXPOSE']

  // Akamai가 2일 이상 날짜범위를 403으로 차단함 → 1일 단위 슬라이딩 윈도우 사용
  const fmtDate = (d: Date) => d.toISOString().split('T')[0]
  log.info('coupangeats: using 1-day sliding windows via minimal page.evaluate fetch (dateWindowTest 동일 방식)')

  // minimal fetch: dateWindowTest에서 200 확인된 방식 (복잡 헤더 없이 credentials:include만)
  async function minimalBrowserFetch(url: string): Promise<{ok: boolean; body: any; status: number; errBody: string}> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${BASE_ORIGIN}${url}`
      const result = await page.evaluate(async (args: { url: string }) => {
        try {
          const r = await fetch(args.url, { credentials: 'include', headers: { 'Accept': 'application/json' } })
          const text = await r.text()
          let body: any = null
          try { body = JSON.parse(text) } catch { body = null }
          return { ok: r.ok, status: r.status, body, errBody: r.ok ? '' : text.slice(0, 200) }
        } catch (e: any) {
          return { ok: false, status: 0, body: null, errBody: String(e?.message || e) }
        }
      }, { url: fullUrl })
      return result
    } catch (e: any) {
      return { ok: false, status: 0, body: null, errBody: String(e?.message || e) }
    }
  }

  for (const statusType of statusTypes) {
    let consecutiveEmpty = 0
    for (let daysBack = 0; daysBack <= 90 && collected.length < 500 && consecutiveEmpty < 30; daysBack++) {
      try {
        const dayEnd = new Date()
        dayEnd.setDate(dayEnd.getDate() - daysBack + 1)
        const dayStart = new Date()
        dayStart.setDate(dayStart.getDate() - daysBack)
        const dateRange = `startDateTime=${fmtDate(dayStart)}&exclusiveEndDateTime=${fmtDate(dayEnd)}`

        // minimal fetch (dateWindowTest 방식) — 버튼 클릭 없이 바로 호출 → 200 기대
        const url = `/api/v1/merchant/reviews/search?storeId=${storeId}&page=1&statusType=${statusType}&${dateRange}&size=100`
        const fetchResult = await minimalBrowserFetch(url)

        if (!fetchResult.ok) {
          if (daysBack === 0) {
            errors.push(`${statusType} ${fmtDate(dayStart)}: HTTP ${fetchResult.status} ${fetchResult.errBody}`)
          }
          consecutiveEmpty++
          continue
        }

        const body = fetchResult.body
        if (!body) { consecutiveEmpty++; continue }
        if (!rawBodySample) rawBodySample = JSON.stringify(body).slice(0, 600)
        const arr = extractArr(body)
        if (arr.length === 0) { consecutiveEmpty++; continue }
        consecutiveEmpty = 0
        for (const r of arr) {
          const rid = String(r.reviewId || r.id || r.review_id || r.orderId || '')
          if (rid && seenIds.has(rid)) continue
          if (rid) seenIds.add(rid)
          collected.push(r)
        }
        if (daysBack % 30 === 0) {
          log.info(`coupangeats: ${statusType} daysBack=${daysBack} day=${fmtDate(dayStart)} got=${arr.length} total=${collected.length}`)
        }
      } catch (ex: any) {
        errors.push(`${statusType} daysBack=${daysBack}: ${ex?.message || ex}`)
        consecutiveEmpty++
      }
    }
    log.info(`coupangeats: ${statusType} done collected=${collected.length}`)
  }

  const allApiReviews = collected
  log.info({
    storeId,
    count: allApiReviews.length,
    rawBodySample,
    errors,
    firstItem: allApiReviews[0] ? JSON.stringify(allApiReviews[0]).slice(0, 400) : null,
  }, 'coupangeats: API reviews collected')
  capturedReviews.push(...allApiReviews)
  capturedUrls.push(`/api/v1/merchant/reviews/search?storeId=${storeId}`)

  log.info({ capturedUrls, capturedCount: capturedReviews.length }, 'coupangeats: network capture result')

  let reviews: any[] = []
  if (capturedReviews.length > 0) {
    // ── 62차: 실제 응답 키 디버그 + 키 후보 확장 ──
    // 31개 capture 됐는데 inserted=0 = mapping 키가 실제 응답과 안 맞음
    try {
      const sample = capturedReviews[0] || {}
      const keys = Object.keys(sample).slice(0, 25)
      log.info({
        sampleKeys: keys,
        sampleSnippet: JSON.stringify(sample).slice(0, 600),
      }, 'coupangeats: 62cha — first captured review structure')
    } catch (_) {}

    reviews = capturedReviews.slice(0, 200).map((r: any, idx: number) => {
      // 평점 (다양한 키 + nested)
      const rating =
        typeof r.rating === 'number' ? Math.round(r.rating) :
        typeof r.starRating === 'number' ? Math.round(r.starRating) :
        typeof r.score === 'number' ? Math.round(r.score) :
        typeof r.star === 'number' ? Math.round(r.star) :
        typeof r.stars === 'number' ? Math.round(r.stars) :
        typeof r.reviewRating === 'number' ? Math.round(r.reviewRating) :
        typeof r.review?.rating === 'number' ? Math.round(r.review.rating) :
        null

      // ID (다양한 키)
      const reviewId = String(
        r.orderReviewId ?? r.reviewId ?? r.id ?? r.review_id ?? r.reviewSeq ??
        r.review?.id ?? r.review?.reviewId ?? r.uuid ?? `ce:${idx}`
      )

      // 작성자 (nested 포함)
      const authorName =
        r.authorName || r.nickname || r.userName || r.author ||
        r.customerName || r.writerName || r.user?.name || r.user?.nickname ||
        r.reviewer?.name || r.reviewer?.userName || r.reviewer?.nickname ||
        r.review?.authorName || r.review?.userName ||
        null

      // 본문 (nested 포함)
      const content =
        r.content || r.body || r.text || r.reviewContent ||
        r.reviewBody || r.reviewMessage || r.message || r.comment ||
        r.review?.content || r.review?.body || r.review?.text ||
        r.reviewText || r.contents ||
        null

      // 사진 (nested + 다양한 키)
      const photoSrc =
        r.images || r.photos || r.attachments || r.reviewImages ||
        r.imageUrls || r.review?.images || r.review?.photos || []
      const photos = Array.isArray(photoSrc)
        ? photoSrc.map((img: any) => typeof img === 'string' ? img : (img?.url || img?.imageUrl || img?.src || img?.path || ''))
            .filter((u: string) => u && typeof u === 'string')
        : []

      // 날짜
      const postedAt =
        r.createdAt || r.reviewedAt || r.postedAt || r.created_at ||
        r.reviewDate || r.regDate || r.writeDate || r.orderedAt ||
        r.review?.createdAt || null

      // 64차: 답글 매칭 — 쿠팡이츠 'replies' 배열 우선 + 기타 키 fallback
      let hasReply = false
      let replyContent: string | null = null

      // 1) 쿠팡이츠 표준: replies 배열 [{ comment, createdAt, ... }]
      if (Array.isArray(r.replies) && r.replies.length > 0) {
        const first = r.replies[0]
        const txt = typeof first === 'string'
          ? first
          : (first?.comment || first?.content || first?.text || first?.body || first?.replyText || '')
        if (txt) {
          hasReply = true
          replyContent = String(txt).slice(0, 2000)
        }
      }
      // 2) 다른 플랫폼 호환 (단일 객체 / 문자열)
      if (!hasReply) {
        const reply = r.ownerReply || r.reply || r.storeReply || r.merchantReply || r.review?.reply || null
        if (reply) {
          const txt = typeof reply === 'string'
            ? reply
            : (reply?.content || reply?.text || reply?.body || '')
          if (txt) {
            hasReply = true
            replyContent = String(txt).slice(0, 2000)
          }
        }
      }
      // 3) 평면 키 fallback
      if (!hasReply) {
        const flat = r.replyContent || r.ownerCommentContent || r.ownerReplyContent || null
        if (flat) {
          hasReply = true
          replyContent = String(flat).slice(0, 2000)
        }
      }

      return {
        platform_review_id: reviewId,
        author_name: authorName,
        rating,
        content,
        photos,
        posted_at: postedAt,
        has_reply: hasReply,
        reply_content: replyContent,
      }
    })

    // 정규화 결과 디버그 (필터 전)
    try {
      const withContent = reviews.filter((r: any) => r.content).length
      const withAuthor = reviews.filter((r: any) => r.author_name).length
      const withRating = reviews.filter((r: any) => r.rating !== null).length
      log.info({
        total: reviews.length,
        withContent,
        withAuthor,
        withRating,
        firstSample: reviews[0],
      }, 'coupangeats: 62cha — normalized review stats')
    } catch (_) {}
  } else {
    // ── 네트워크 캡처 실패 시 → DOM 폴백 ──
    reviews = await page.evaluate((sel: typeof DOM_SELECTORS) => {
      const cards = Array.from(document.querySelectorAll(sel.reviewCard))
      return cards.slice(0, 200).map((c, idx) => {
        const author = (c.querySelector(sel.reviewAuthor) as HTMLElement | null)?.innerText?.trim() ?? null
        const filled = c.querySelectorAll(sel.starFilled).length
        let rating: number | null = filled > 0 && filled <= 5 ? filled : null
        if (rating === null) {
          const ratingEl = c.querySelector(sel.ratingText) as HTMLElement | null
          const t = ratingEl?.innerText || ''
          const m = t.match(/(\d(?:\.\d)?)/)
          if (m) rating = Math.round(parseFloat(m[1]))
        }
        const content = (c.querySelector(sel.reviewContent) as HTMLElement | null)?.innerText?.trim() ?? null
        const dateEl = c.querySelector(sel.reviewDate) as HTMLElement | null
        const posted = dateEl?.getAttribute('datetime') || dateEl?.innerText || null
        const photos = Array.from(c.querySelectorAll(sel.reviewPhoto)).map((img) => (img as HTMLImageElement).src).filter(Boolean)
        const hasReply = !!c.querySelector(sel.ownerReply)
        const replyContent = hasReply ? (c.querySelector(sel.ownerReply) as HTMLElement | null)?.innerText?.trim() ?? null : null
        const idAttr = (c as HTMLElement).getAttribute('data-review-id') || (c as HTMLElement).getAttribute('data-id') || null
        return {
          platform_review_id: idAttr || `coupangeats:${idx}:${(content || '').slice(0, 20)}:${posted || ''}`,
          author_name: author, rating, content, photos, posted_at: posted, has_reply: hasReply, reply_content: replyContent,
        }
      })
    }, DOM_SELECTORS)

    if (!reviews || reviews.length === 0) {
      await dumpPageDiagnostics(page, log, 'coupangeats-no-review-cards')
    }
  }

  // 62차: filter 완화 — content/author_name/rating 중 하나라도 있으면 저장
  // (사진만 있는 리뷰도 있을 수 있고, 별점만 있는 리뷰도 의미 있음)
  const normalized: CollectedReview[] = reviews
    .filter((r: any) => r.content || r.author_name || r.rating !== null || (r.photos && r.photos.length > 0))
    .map((r: any) => ({ ...r, posted_at: normalizeDate(r.posted_at) }))
  log.info({
    rawCount: reviews.length,
    afterFilter: normalized.length,
  }, 'coupangeats: 62cha — filter result')

  const shopId = creds.platform_store_id || 'unknown'
  const res = await upsertReviews(svc, userId, 'coupangeats', shopId, normalized)
  log.info({ ...res }, 'coupangeats reviews upserted')

  // ── 신규(56차): 새 리뷰 알림 트리거 (Web Push + 카카오) ──
  // fetch_reviews 액션이고 신규 insert 가 1건 이상이면 알림 호출.
  // notification_log 중복 체크가 Vercel 측에서 처리됨 → 여기서는 호출만.
  if (action === 'fetch_reviews' && (res?.inserted ?? 0) > 0) {
    try {
      await notifyNewReviews(log, {
        userId,
        platform: 'coupangeats',
        reviewIds: 'all_new',
      })
    } catch (e: any) {
      log.warn({ err: e?.message?.slice(0, 100) }, 'coupangeats: notify trigger failed (non-fatal)')
    }
  }

  if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
    const targetId = String(payload.platform_review_id)
    const replyText = String(payload.reply_text)
    const replied = await postCoupangEatsReply(page, storeId, targetId, replyText, log)
    if (replied.ok) {
      await updateCoupangReviewStatus(svc, userId, targetId, 'submitted', { replyContent: replyText })
      return { status: 'ok', message: `coupangeats: reply posted for ${targetId}` }
    }
    await updateCoupangReviewStatus(svc, userId, targetId, 'failed', { error: replied.reason })
    return { status: 'failed', message: `coupangeats reply 실패: ${replied.reason}` }
  }

  return {
    status: 'ok',
    message: `coupangeats: collected ${res.total}, inserted ${res.inserted}`,
    data: res,
    debug: {
      rawBodySample: rawBodySample || '(empty)',
      apiErrors: errors,
      capturedUrls,
      capturedCount: capturedReviews.length,
      storeId,
      currentUrl: page.url(),
      allJsonUrls: allJsonUrls.slice(0, 30),
      cookieCount: contextCookies.length,
      cookieNames: cookieNames.slice(0, 30),
    },
  }
}

async function loadCoupangSessionCookies(
  svc: any,
  userId: string,
  log: Logger,
): Promise<any[] | null> {
  try {
    const { data, error } = await svc
      .from('platform_credentials')
      .select('extra_data')
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
      .maybeSingle()
    if (error || !data?.extra_data) return null
    const cookieJson = (data.extra_data as any)?.session_cookies
    if (!cookieJson) return null
    const cookies = typeof cookieJson === 'string' ? JSON.parse(cookieJson) : cookieJson
    if (!Array.isArray(cookies) || cookies.length === 0) return null
    log.info({ count: cookies.length }, 'coupangeats: loaded session cookies from DB')
    return cookies
  } catch (e: any) {
    log.warn({ err: e?.message }, 'coupangeats: loadCoupangSessionCookies failed')
    return null
  }
}

async function saveCoupangSessionCookies(
  svc: any,
  userId: string,
  cookies: any[],
  log: Logger,
): Promise<void> {
  try {
    const { data: existing } = await svc
      .from('platform_credentials')
      .select('extra_data')
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
      .maybeSingle()
    const extraData = { ...(existing?.extra_data || {}), session_cookies: cookies }
    await svc
      .from('platform_credentials')
      .update({ extra_data: extraData })
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
    log.info({ count: cookies.length }, 'coupangeats: session cookies saved to DB')
  } catch (e: any) {
    log.warn({ err: e?.message }, 'coupangeats: saveCoupangSessionCookies failed')
  }
}

// ── 53차: platform_reviews DB 상태 업데이트 헬퍼 ──
async function updateCoupangReviewStatus(
  svc: any,
  userId: string,
  platformReviewId: string,
  status: 'submitted' | 'failed',
  extra: { replyContent?: string; error?: string },
): Promise<void> {
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { reply_status: status, reply_error: null }
  if (status === 'submitted') {
    update.has_reply = true
    update.reply_submitted_at = now
    if (extra.replyContent) update.reply_content = extra.replyContent
  } else {
    update.reply_error = (extra.error || 'unknown error').slice(0, 200)
  }
  try {
    const { error } = await svc
      .from('platform_reviews')
      .update(update)
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
      .eq('platform_review_id', platformReviewId)
    if (error) console.error('[coupangeats][updateReviewStatus] supabase error:', error.message)
  } catch (e: any) {
    console.error('[coupangeats][updateReviewStatus] exception:', e?.message)
  }
}

// ── 53차: UI 자동화 → REST API 직접 호출 ──
// cURL 분석: POST https://store.coupangeats.com/api/v1/merchant/reviews/reply
// Body: { storeId: Int, orderReviewId: Int, comment: String }
// 특수 헤더: x-request-meta (btoa JSON), x-requested-with: XMLHttpRequest
// 인증: credentials:'include' → 브라우저 컨텍스트 쿠키 자동 포함 (Akamai 통과)
async function postCoupangEatsReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const storeIdInt = parseInt(storeId, 10)
  const orderReviewIdInt = parseInt(platformReviewId, 10)

  if (isNaN(storeIdInt) || isNaN(orderReviewIdInt)) {
    return { ok: false, reason: `invalid storeId(${storeId}) or orderReviewId(${platformReviewId})` }
  }

  log.info({ storeIdInt, orderReviewIdInt, textLen: replyText.length }, 'coupangeats: 63cha POST reply (multi-endpoint)')

  // 69차: 단일 endpoint + body shape (속도 최적화)
  // log 분석 결과 idx:0 만 진짜 endpoint (다른 4개는 404 또는 CloudFront 차단)
  // 4가지 body shape 시도해도 모두 50001 → body 문제 아니라 "이미 답글 있음" 케이스
  // → 1개만 시도하고 50001 시 즉시 fail (속도 최우선)
  const endpointCandidates: Array<{ url: string; body: any; method?: string }> = [
    {
      url: 'https://store.coupangeats.com/api/v1/merchant/reviews/reply',
      body: { storeId: storeIdInt, orderReviewId: orderReviewIdInt, comment: replyText },
    },
  ]

  let lastResult: any = null
  let lastReason = 'no endpoint succeeded'

  for (let i = 0; i < endpointCandidates.length; i++) {
    const ep = endpointCandidates[i]
    log.info({ idx: i, url: ep.url }, 'coupangeats: 63cha trying endpoint')

    try {
      const result = await page.evaluate(async (args: { url: string; body: string; method: string }) => {
        try {
          const meta = {
            o: 'https://store.coupangeats.com',
            ua: navigator.userAgent,
            r: 'https://store.coupangeats.com/merchant/management/reviews',
            t: Date.now(),
            sr: String(screen.width) + 'x' + String(screen.height),
            l: navigator.language || 'ko-KR',
          }
          const xRequestMeta = btoa(unescape(encodeURIComponent(JSON.stringify(meta))))

          const r = await fetch(args.url, {
            method: args.method,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json;charset=UTF-8',
              'Accept': 'application/json',
              'Accept-Language': 'ko-KR',
              'x-request-meta': xRequestMeta,
              'x-requested-with': 'XMLHttpRequest',
              'Origin': 'https://store.coupangeats.com',
              'Referer': 'https://store.coupangeats.com/merchant/management/reviews',
            },
            body: args.body,
          })
          const text = await r.text()
          let parsed: any = null
          try { parsed = JSON.parse(text) } catch {}
          return { ok: r.ok, status: r.status, text: text.slice(0, 800), parsed }
        } catch (e: any) {
          return { ok: false, status: 0, text: '', parsed: null, err: String(e?.message || e) }
        }
      }, { url: ep.url, body: JSON.stringify(ep.body), method: ep.method || 'POST' })

      lastResult = result

      // 응답 본문 전체 + parsed 모두 로깅
      log.info({
        idx: i,
        url: ep.url.slice(0, 80),
        status: result.status,
        ok: result.ok,
        text: result.text,
        parsed: result.parsed ? JSON.stringify(result.parsed).slice(0, 400) : null,
      }, 'coupangeats: 63cha endpoint response')

      // 404 = endpoint 가 존재 안 함 → 다음 후보
      if (result.status === 404) {
        lastReason = `${ep.url.split('/').slice(-2).join('/')}: 404 not found`
        continue
      }

      // 401/403 = 인증/봇 차단 — 다른 endpoint 시도해도 같음 → 즉시 종료
      if (result.status === 401) return { ok: false, reason: '세션 만료(401) — 쿠팡이츠 재연결 필요' }
      if (result.status === 403) return { ok: false, reason: `봇 차단(403): ${result.text.slice(0, 100)}` }

      // 200 OK 라도 body 검증 (silent fail 방지)
      if (result.ok) {
        const p = result.parsed
        // 쿠팡 일반 응답 패턴: { code: "SUCCESS", data: ... } 또는 { success: true }
        // FAIL 패턴: { code: "FAIL", message: "..." } 또는 { success: false, error: "..." }
        // 50001 패턴: { data: null, error: { code: "50001", message: "..." }, code: "50001" }
        const errCode = p?.error?.code || p?.code || ''
        const errMsg = p?.error?.message || p?.message || ''
        const isExplicitFail = p && (
          p.success === false ||
          (errCode && errCode !== 'SUCCESS' && errCode !== '0' && errCode !== 0) ||
          p.status === 'FAIL' ||
          p.status === 'ERROR' ||
          (p.error && typeof p.error === 'object' && p.error !== null) ||
          (errMsg && /실패|fail|error|오류|이미|중복/i.test(errMsg))
        )
        if (isExplicitFail) {
          // 66차: 에러 코드별 사용자 친화 메시지
          let userMsg = `${errCode}: ${errMsg}`
          if (errCode === '50001') {
            // 50001 = "외부 API 호출 실패" — 흔한 원인:
            //   1) 이미 답글 있음
            //   2) review 가 답글 등록 가능 상태 아님 (오래된 review 등)
            //   3) 쿠팡 시스템 일시 장애
            userMsg = '쿠팡이츠 시스템 일시 오류 또는 이미 답글이 달려있을 수 있어요. 쿠팡 페이지에서 직접 확인해주세요.'
          } else if (errCode === '40001' || errCode === '40003') {
            userMsg = '권한 없음 또는 잘못된 요청 — 매장 연결을 다시 확인해주세요.'
          } else if (errMsg.includes('이미') || errMsg.includes('중복')) {
            userMsg = '이미 답글이 달려있어요. 쿠팡 페이지에서 확인해주세요.'
          }
          lastReason = `body shape ${i+1} 실패 (code:${errCode}): ${userMsg}`
          log.warn({ idx: i, errCode, errMsg, fullBody: result.text.slice(0, 300) }, 'coupangeats: 66cha body fail — 다음 shape 시도')
          continue  // 다음 endpoint/shape 시도
        }
        // 진짜 성공
        log.info({ idx: i, url: ep.url, parsed: p }, 'coupangeats: 63cha reply success')
        return { ok: true }
      }

      // 400 또는 기타 → 다음 endpoint 시도
      lastReason = `HTTP ${result.status}: ${result.text.slice(0, 150)}`
      continue
    } catch (e: any) {
      log.warn({ idx: i, err: e?.message }, 'coupangeats: 63cha endpoint exception')
      lastReason = e?.message || 'unknown'
      continue
    }
  }

  // 모든 endpoint 실패
  log.error({ lastResult, lastReason }, 'coupangeats: 63cha all reply endpoints failed')
  return { ok: false, reason: `모든 답글 endpoint 실패. ${lastReason}` }
}

async function closeAllModals(page: any, log: Logger): Promise<void> {
  const modalSelectors = [
    '[data-testid="Dialog__CloseButton"]',
    'button.close-btn',
    'button[class*="close-btn"]',
    '.faq-popup button.close-btn',
    'button:has-text("닫기")',
    'button:has-text("확인")',
    '[class*="modal"] button[class*="close"]',
  ]
  for (let attempt = 0; attempt < 4; attempt++) {
    let closedAny = false
    for (const mSel of modalSelectors) {
      try {
        const m = page.locator(mSel).first()
        if (await m.isVisible().catch(() => false)) {
          await m.click({ force: true })
          closedAny = true
          await page.waitForTimeout(600)
          log.info({ mSel }, 'coupangeats: modal closed')
        }
      } catch { continue }
    }
    if (!closedAny) break
    await page.waitForTimeout(400)
  }
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  const m1 = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (m1) {
    const [, y, mo, d] = m1
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+09:00`
  }
  const now = new Date()
  const mDay = s.match(/(\d+)일\s*전/)
  if (mDay) {
    now.setDate(now.getDate() - parseInt(mDay[1], 10))
    return now.toISOString()
  }
  return null
}
