// worker/src/adapters/coupangeats.ts
// ============================================================
// 32차-2 · CoupangEatsAdapter (store.coupangeats.com)
// ── IP 차단 대응: extra_data.session_cookies 쿠키 세션 방식 우선 ──
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

  // ── 봇 감지 우회 (강화판) ──
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
      // 쿠키 만료(whoami 403) 감지 → 브라우저 재로그인 폴백
      const dbg = (result as any)?.debug?.rawBodySample || ''
      const inserted = (result as any)?.data?.inserted ?? -1
      // whoami 실패 감지: 403, Access Denied, 또는 JSON merchantId 없는 경우
      const whoamiFailed = dbg.startsWith('whoami node:[') && !dbg.includes('"merchantId"') && !dbg.includes('"accountId"')
      const cookieExpired = whoamiFailed && inserted === 0
      if (cookieExpired) {
        log.warn({ rawBodySample: dbg }, 'coupangeats: saved cookies expired (403), falling back to browser login')
        return await fetchCoupangReviews(page, context, svc, creds, userId, action, payload, log, earlyCapture, earlyCaptureUrls, allRequestUrls, allJsonUrls, null)
      }
      return result
    }

    // ── 폼 로그인 (쿠키 없거나 만료) ──
    log.info('coupangeats: attempting form login')
    let loginNavErr: string | null = null
    try {
      await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 45000 })
    } catch (e: any) {
      loginNavErr = String(e?.message || e)
    }
    if (loginNavErr && loginNavErr.includes('ERR_PROXY_AUTH_UNSUPPORTED')) {
      log.warn({ loginNavErr }, 'coupangeats: proxy blocks login nav — need saved cookies')
      return {
        status: 'failed',
        message: 'coupangeats: Railway proxy 차단 — /my/platforms/coupangeats/connect 에서 브라우저 쿠키를 붙여넣어 주세요',
        debug: { loginNavErr },
      }
    }
    await page.waitForTimeout(6000)

    const pwLocator = page.locator(DOM_SELECTORS.pwInput).first()
    const pwVisible = await pwLocator.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)
    if (!pwVisible) {
      await dumpPageDiagnostics(page, log, 'coupangeats-login-form-missing')
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', 'login form not found')
      return {
        status: 'failed',
        message: 'coupangeats 로그인 폼 없음 — /my/platforms/coupangeats/connect 에서 쿠키를 등록해주세요',
      }
    }

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
    for (const sel of idCandidates) {
      try {
        const loc = page.locator(sel).first()
        const visible = await loc.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)
        if (visible) {
          await loc.click()
          await loc.fill('')
          await loc.pressSequentially(creds.account_id, { delay: 60 })
          idFilled = true
          log.info({ sel }, 'coupangeats id input filled')
          break
        }
      } catch { continue }
    }
    if (!idFilled) {
      await dumpPageDiagnostics(page, log, 'coupangeats-id-input-not-found')
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', 'id input not found')
      return { status: 'failed', message: 'coupangeats ID 입력 필드를 찾지 못했습니다' }
    }
    await pwLocator.click()
    await pwLocator.fill('')
    await pwLocator.pressSequentially(creds.password, { delay: 80 })
    await page.waitForTimeout(1200)

    // ── ce-check-input 체크박스 자동 클릭 (약관동의/아이디저장) ──
    try {
      const checkbox = page.locator('input[class*="ce-check"], .ce-check-input, input[type="checkbox"]').first()
      const cbVisible = await checkbox.isVisible().catch(() => false)
      if (cbVisible) {
        const checked = await checkbox.isChecked().catch(() => false)
        if (!checked) {
          await checkbox.click({ force: true })
          log.info('coupangeats: checked checkbox before submit')
        }
      }
    } catch (_) { /* ignore */ }

    // ── 제출 버튼 클릭 (merchant-submit-btn 우선) ──
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
          await btn.click()
          submitted = true
          log.info({ sSel }, 'coupangeats: submit button clicked')
          break
        }
      } catch { continue }
    }
    if (!submitted) {
      await page.locator(DOM_SELECTORS.loginBtn).first().click()
    }
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 20000 }).catch(() => null)
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    if (currentUrl.includes('captcha')) {
      await markLoginStatus(svc, userId, 'coupangeats', 'captcha', currentUrl)
      return { status: 'failed', message: 'coupangeats captcha — 수동 로그인 필요' }
    }
    // 로그인 성공 여부: /merchant/ 페이지여야 함 (단순히 /login을 벗어난 것만으로는 불충분)
    const loginSucceeded = currentUrl.includes('/merchant/') || currentUrl.includes('/management/')
    if (!loginSucceeded) {
      await dumpPageDiagnostics(page, log, 'coupangeats-login-failed')
      const { failed, reason } = await detectLoginFailure(page)
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', reason || `blocked at ${currentUrl.slice(0, 60)}`)
      return {
        status: 'failed',
        message: 'coupangeats: Railway IP 차단으로 로그인 불가 — /my/platforms/coupangeats/connect 에서 브라우저 쿠키를 붙여넣어 주세요',
        debug: { currentUrl },
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

  // directCookies가 있으면 브라우저가 proxy 차단으로 불능 → 페이지 조작 전체 건너뜀
  const skipBrowser = !!directCookies

  let alreadyOnReviews = false
  if (!skipBrowser) {
    try { alreadyOnReviews = page.url().includes('/review') } catch { /* browser dead */ }
  }
  log.info({ reviewsUrl, alreadyOnReviews, earlyCaptured: capturedReviews.length, skipBrowser }, 'coupangeats: fetchCoupangReviews entry')

  // ── 리뷰 관리 페이지로 이동 (네트워크 인터셉트 + 자연 API 호출 유도) ──
  // savedCookies가 있으면(skipBrowser=true) 리뷰 페이지로 직접 탐색 시도
  // 이유: Akamai JS challenge는 실제 브라우저 탐색 시에만 실행됨 → _abck 갱신 → API 허용
  // 로그인 URL이 아닌 리뷰 URL로 바로 가면 프록시 auth 문제 없이 동작 가능
  let browserNavOk = false
  if (skipBrowser) {
    log.info({ reviewsUrl }, 'coupangeats: savedCookies — attempting direct nav to reviews page for Akamai challenge')
    try {
      await page.goto(reviewsUrl, { waitUntil: 'domcontentloaded', timeout: 35000 })
      await page.waitForTimeout(5000)   // Akamai JS + 자연 API 호출 대기
      browserNavOk = true
      const finalUrl = page.url()
      log.info({ url: finalUrl, capturedSoFar: capturedReviews.length }, `coupangeats: reviews page loaded url=${finalUrl} captured=${capturedReviews.length}`)
    } catch (navErr: any) {
      log.warn({ err: navErr?.message }, 'coupangeats: savedCookies reviews nav failed — will use node-direct only')
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

  // ── 페이지 상호작용으로 리뷰 API 자연 유도 (브라우저가 살아있을 때만) ──
  if (!skipBrowser || browserNavOk) {
    try { await closeAllModals(page, log) } catch { /* browser dead — ignore */ }
    // 쿠팡이츠 리뷰 페이지의 자연 API 호출 유도 (다양한 방식 시도)
    const interactionDone = await (async () => {
      // 1) 검색/조회 버튼 클릭
      const triggerSelectors = [
        'button:has-text("조회")', 'button:has-text("검색")', 'button:has-text("목록 불러오기")',
        'button:has-text("불러오기")', '[class*="SearchButton"]', '[class*="search-button"]',
        'form button[type="submit"]', '[class*="ReviewFilter"] button',
      ]
      for (const sel of triggerSelectors) {
        try {
          const btn = page.locator(sel).first()
          if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await btn.click()
            log.info({ sel }, 'coupangeats: clicked review trigger button')
            await page.waitForTimeout(2500)
            return true
          }
        } catch (_) { /* ignore */ }
      }
      // 2) 페이지에서 Enter 키 전송 (검색 폼 제출)
      try {
        await page.keyboard.press('Enter')
        await page.waitForTimeout(2000)
      } catch (_) { /* ignore */ }
      return false
    })()
    log.info({ interactionDone, capturedAfterInteraction: capturedReviews.length }, 'coupangeats: after page interaction')
    try { await page.waitForTimeout(500) } catch { /* browser dead — ignore */ }
  } else {
    log.info('coupangeats: skipBrowser=true — skipping all page interactions, going direct to node API')
  }

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
        const extraH: Record<string, string> = {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://store.coupangeats.com/merchant/management/reviews',
          'Origin': 'https://store.coupangeats.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
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

  // ── browser page.evaluate fetch (fallback) ──
  async function browserApiGet(path: string): Promise<{ ok: boolean; body: any; status: number; errBody: string }> {
    const url = path.startsWith('http') ? path : `${BASE_ORIGIN}${path}`
    try {
      const result: { ok: boolean; body: any; status: number; errBody: string } = await page.evaluate(async (fetchUrl: string) => {
        try {
          const r = await fetch(fetchUrl, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': 'https://store.coupangeats.com/merchant/management/reviews',
              'Origin': 'https://store.coupangeats.com',
            },
          })
          const status = r.status
          if (!r.ok) {
            let errBody = ''
            try { errBody = JSON.stringify(await r.json()) } catch (_) { try { errBody = await r.text() } catch (_) { errBody = '(no body)' } }
            return { ok: false, body: null, status, errBody: String(errBody).slice(0, 150) }
          }
          const body = await r.json().catch(() => null)
          return { ok: true, body, status, errBody: '' }
        } catch (e: any) {
          return { ok: false, body: null, status: 0, errBody: String(e?.message || e).slice(0, 150) }
        }
      }, url)
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
      log.info({ storesStatus: storesRes.status }, `coupangeats: stores=${storesRes.status} body=${JSON.stringify(storesRes.body).slice(0,150)} err=${storesRes.errBody?.slice(0,80)}`)
      // 다양한 스토어 스위치 endpoint 시도
      const switchGet = await apiGet(`/api/v1/merchant/stores/${storeId}/switch`)
      const switchPost = await (async () => {
        // POST switch (body에 storeId)
        try {
          const u = `https://store.coupangeats.com/api/v1/merchant/stores/${storeId}/switch`
          const r = await (globalThis as any).fetch(u, {
            method: 'POST',
            headers: { 'Cookie': cookieStr, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Origin': 'https://store.coupangeats.com', 'Referer': 'https://store.coupangeats.com/merchant/management/reviews' },
            body: JSON.stringify({ storeId: parseInt(storeId, 10) }),
          })
          const body = await r.json().catch(() => null)
          return { status: r.status, body }
        } catch (e: any) { return { status: 0, body: null } }
      })()
      log.info(`coupangeats: switchGET=${switchGet.status} switchPOST=${switchPost.status} switchPOSTbody=${JSON.stringify(switchPost.body).slice(0,100)}`)
      // 리뷰 없이도 merchantId 경로 시도
      const noStore = await apiGet(`/api/v1/merchant/reviews/search?page=1&statusType=EXPOSE&size=10`)
      const alt1 = await nodeDirectApiGet(`/api/v1/merchant/reviews/search?storeId=${storeId}&page=1&size=10`)
      log.info(`coupangeats: alt1=${alt1.status} noStore=${noStore.status} noStoreSample=${JSON.stringify(noStore.body).slice(0,80)}`)
      rawBodySample += ` | stores:${storesRes.status} switchGET:${switchGet.status} switchPOST:${switchPost.status} alt1:${alt1.status} noStore:${noStore.status}`
    } catch (e: any) {
      log.warn({ err: e?.message }, 'coupangeats: stores/switch diagnostic failed')
    }
  }

  // statusType 순서: EXPOSE (공개), UNEXPOSE (비공개), REPORTED
  const statusTypes = ['EXPOSE', 'UNEXPOSE', 'REPORTED']

  for (const statusType of statusTypes) {
    let pageNum = 1
    let hasMore = true
    let baseUrl = ''
    let pageParam = 'page'

    while (hasMore && collected.length < 500) {
      try {
        let fetchResult: { ok: boolean; body: any; status: number; errBody: string }

        if (pageNum === 1) {
          const candidates = [
            { url: `/api/v1/merchant/reviews/search?storeId=${storeId}&page=1&statusType=${statusType}&size=100`, param: 'page' },
            ...(merchantId ? [
              { url: `/api/v1/merchant/reviews/search?merchantId=${merchantId}&page=1&statusType=${statusType}&size=100`, param: 'page' },
              { url: `/api/v1/merchant/${merchantId}/reviews?page=1&statusType=${statusType}&size=100`, param: 'page' },
            ] : []),
          ]
          let found = false
          for (const c of candidates) {
            fetchResult = await apiGet(c.url)
            if (fetchResult.ok) {
              baseUrl = c.url.replace('&page=1', `&${c.param}=PAGE`)
              pageParam = c.param
              errors.push(`${statusType}: working URL ${c.url.slice(0, 80)}`)
              found = true
              break
            } else {
              errors.push(`${statusType} ${c.url.slice(0, 60)}: HTTP ${fetchResult.status} ${fetchResult.errBody}`)
            }
          }
          if (!found) { hasMore = false; break }
        } else {
          const url = baseUrl.replace(`${pageParam}=PAGE`, `${pageParam}=${pageNum}`)
          fetchResult = await apiGet(url)
          if (!fetchResult.ok) {
            errors.push(`${statusType} p${pageNum}: HTTP ${fetchResult.status} ${fetchResult.errBody}`)
            hasMore = false; break
          }
        }

        const body = fetchResult!.body
        if (!body) { hasMore = false; break }
        if (!rawBodySample) rawBodySample = JSON.stringify(body).slice(0, 600)
        const arr = extractArr(body)
        if (arr.length === 0) { hasMore = false; break }
        for (const r of arr) {
          const rid = String(r.reviewId || r.id || r.review_id || r.orderId || '')
          if (rid && seenIds.has(rid)) continue
          if (rid) seenIds.add(rid)
          collected.push(r)
        }
        const totalPages = getTotalPages(body)
        const isLast = body?.last === true || body?.data?.last === true
        if (isLast || (totalPages > 0 && pageNum >= totalPages) || arr.length < 100) {
          hasMore = false; break
        }
        pageNum++
      } catch (ex: any) {
        errors.push(`${statusType} p${pageNum}: ${ex?.message || ex}`)
        hasMore = false; break
      }
    }
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
    reviews = capturedReviews.slice(0, 200).map((r: any, idx: number) => {
      const rating = typeof r.rating === 'number' ? Math.round(r.rating)
        : typeof r.starRating === 'number' ? Math.round(r.starRating)
        : typeof r.score === 'number' ? Math.round(r.score) : null
      return {
        platform_review_id: String(r.reviewId || r.id || r.review_id || `ce:${idx}`),
        author_name: r.authorName || r.nickname || r.userName || r.author || null,
        rating,
        content: r.content || r.body || r.text || r.reviewContent || null,
        photos: (r.images || r.photos || r.attachments || []).map((img: any) => img?.url || img?.imageUrl || img).filter((u: any) => typeof u === 'string'),
        posted_at: r.createdAt || r.reviewedAt || r.postedAt || r.created_at || null,
        has_reply: !!(r.ownerReply || r.reply || r.storeReply || r.replyContent),
        reply_content: r.ownerReply?.content || r.reply?.content || r.storeReply || r.replyContent || null,
      }
    })
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

  const normalized: CollectedReview[] = reviews
    .filter((r: any) => r.content || r.author_name)
    .map((r: any) => ({ ...r, posted_at: normalizeDate(r.posted_at) }))

  const shopId = creds.platform_store_id || 'unknown'
  const res = await upsertReviews(svc, userId, 'coupangeats', shopId, normalized)
  log.info({ ...res }, 'coupangeats reviews upserted')

  if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
    const targetId = String(payload.platform_review_id)
    const replyText = String(payload.reply_text)
    const replied = await postCoupangEatsReply(page, targetId, replyText, log)
    if (replied.ok) {
      await svc
        .from('platform_reviews')
        .update({
          has_reply: true,
          reply_content: replyText,
          reply_status: 'submitted',
          reply_submitted_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('platform', 'coupangeats')
        .eq('platform_review_id', targetId)
      return { status: 'ok', message: `coupangeats: reply posted for ${targetId}` }
    }
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

async function postCoupangEatsReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const card = await page.$(`[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`)
    if (!card) return { ok: false, reason: `card not found for ${platformReviewId}` }

    const replyBtn = await card.$(DOM_SELECTORS.replyButton)
    if (!replyBtn) return { ok: false, reason: 'reply button not found' }
    await replyBtn.click()
    await page.waitForTimeout(1200)

    const textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: 'reply textarea not found' }
    await textarea.fill(replyText)
    await page.waitForTimeout(500)

    const submit = await page.$(DOM_SELECTORS.replySubmit)
    if (!submit) return { ok: false, reason: 'reply submit button not found' }
    await submit.click()
    await page.waitForTimeout(2500)

    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'coupangeats reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
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
