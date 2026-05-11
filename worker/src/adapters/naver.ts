// worker/src/adapters/naver.ts
// ============================================================
// NaverAdapter — SmartPlace 사장님 답글 자동 등록
//   · 로그인: 세션쿠키 우선, 실패 시 폼 로그인 폴백
//   · 쿠키 체크: SmartPlace 직접 이동으로 확인 (naver.com 우회)
//   · 모든 실패 경로에서 platform_reviews DB 업데이트
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, loadCookieData, markLoginStatus, classifyLoginFailure, loadExternalPlaceId } from '../lib/credentials'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import { handleNaverCaptcha, solveCaptcha } from '../lib/captcha'
import type { JobResult, Action } from '../jobs'

const NAVER_CODE_VERSION = 'v37-verify-external-placeId-replyResponse-trust-20260503'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const NEW_SMARTPLACE_BASE = 'https://new.smartplace.naver.com'

// 등록 후 GraphQL로 실제 답글 반영 확인 (false positive 방지)
async function verifyReplyByGraphQL(
  placeId: string,
  reviewId: string,
  log: Logger,
): Promise<boolean> {
  const categories = ['restaurant', 'cafe', 'place', 'hairshop', 'beautyshop']
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  for (const cat of categories) {
    try {
      const res = await fetch('https://pcmap-api.place.naver.com/graphql', {
        method: 'POST',
        headers: {
          'User-Agent': ua, 'Accept': '*/*', 'Accept-Language': 'ko-KR,ko;q=0.9',
          'Content-Type': 'application/json',
          'Origin': 'https://m.place.naver.com',
          'Referer': `https://m.place.naver.com/${cat}/${placeId}/review/visitor`,
        },
        body: JSON.stringify([{
          operationName: 'getVisitorReviews',
          variables: { input: { businessId: placeId, businessType: cat, item: '0', page: 1, size: 50, isPhotoUsed: false, includeContent: true, getReactions: true } },
          query: 'query getVisitorReviews($input: VisitorReviewsInput) { visitorReviews(input: $input) { items { id reply { body } } } }',
        }]),
        signal: AbortSignal.timeout(10000),
      })
      const j = await res.json().catch(() => null) as any
      const items = j?.[0]?.data?.visitorReviews?.items || []
      if (items.length === 0) continue
      const found = items.find((i: any) => i.id === reviewId)
      if (found?.reply?.body && String(found.reply.body).length > 0) {
        log.info({ reviewId, cat, replyLen: found.reply.body.length }, 'naver: ✅ GraphQL verify OK — 실제 답글 반영 확인')
        return true
      }
      // 카테고리 매치는 됐지만 답글 미반영 (해당 카테고리가 정답)
      log.info({ reviewId, cat, foundItem: !!found, hasReply: !!found?.reply, hasBody: !!found?.reply?.body }, 'naver: GraphQL verify — 답글 미반영')
      return false
    } catch (e: any) {
      log.warn({ cat, err: String(e?.message).slice(0, 80) }, 'naver: GraphQL verify error, try next category')
    }
  }
  return false
}

const DOM_SELECTORS = {
  idInput:   'input#id, input[name="id"], input[placeholder*="아이디"]',
  pwInput:   'input#pw, input[name="pw"], input[type="password"]',
  loginBtn:  '#log\\.login, button[type="submit"], .btn_login',
  // SmartPlace 실제 클래스 (2026-04 확인)
  // Review_container 는 전체 목록 컨테이너 → 개별 카드 선택자에서 제외
  reviewCard:    '[class*="Review_single_review"], [class*="single_review"], [class*="ReviewItem"], [class*="review_item"], [data-review-id], [class*="Review_review"], [class*="Review_item"]',
  replyButton:   '[class*="Review_btn_write"], [class*="fn-write"], button:has-text("답글 달기"), button:has-text("답글"), [class*="btn_reply"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[placeholder*="답변"], textarea[class*="reply"], textarea[class*="write"], textarea',
  replySubmit:   'button:has-text("등록"), button:has-text("완료"), button:has-text("저장"), [class*="btn_submit"]',
  ownerReply:    '[class*="OwnerReply"], [class*="owner_reply"], [class*="StoreReply"], [class*="reply_owner"], [class*="Reply_owner"], [class*="owner_comment"]',
}

export type NaverOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

// platform_reviews 상태 업데이트 헬퍼
async function updateReviewStatus(
  svc: ReturnType<typeof getServiceClient>,
  userId: string,
  platformReviewId: string,
  status: 'submitted' | 'failed',
  extra: { replyContent?: string; error?: string },
) {
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { reply_status: status, reply_error: null }
  if (status === 'submitted') {
    update.has_reply = true
    update.reply_submitted_at = now
  } else {
    update.reply_error = (extra.error || 'unknown error').slice(0, 200)
  }
  console.log('[naver][updateReviewStatus] START', { userId: userId.slice(0, 12), platformReviewId, status, error: (extra.error || '').slice(0, 80) })
  try {
    const { data, error, count } = await svc
      .from('platform_reviews')
      .update(update)
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .eq('platform_review_id', platformReviewId)
      .select('id, reply_status')
    if (error) {
      console.error('[naver][updateReviewStatus] SUPABASE ERROR:', error.message, error.code, error.details)
    } else {
      console.log('[naver][updateReviewStatus] SUCCESS rows:', JSON.stringify(data), 'count:', count)
    }
  } catch (e: any) {
    console.error('[naver][updateReviewStatus] EXCEPTION:', e?.message)
  }
}

export async function runNaver(
  opts: NaverOptions,
  action: Action,
  payload?: Record<string, unknown>,
): Promise<JobResult> {
  const { userId, browser, log } = opts

  if (action !== 'post_reply' && action !== 'health_check') {
    return { status: 'skipped', message: `naver: action ${action} — 리뷰 수집은 Vercel /api/place/reviews/fetch 사용` }
  }

  const svc = getServiceClient()

  // post_reply 필수 파라미터 먼저 검증
  const platformReviewId = action === 'post_reply' ? String(payload?.platform_review_id || '') : ''
  const replyText = action === 'post_reply' ? String(payload?.reply_text || '') : ''

  // ── 디버그 로그: 받은 payload 확인 ──────────────────────────────
  log.info({
    action,
    userId: opts.userId.slice(0, 12) + '...',
    platformReviewId: platformReviewId || '(empty)',
    replyTextLen: replyText.length,
    bizIdRaw: payload?.biz_id || '(none)',
    payloadKeys: payload ? Object.keys(payload) : [],
  }, 'naver: runNaver start')

  if (action === 'post_reply' && (!platformReviewId || !replyText)) {
    log.error({ platformReviewId, replyTextLen: replyText.length }, 'naver: MISSING REQUIRED PARAMS — no DB update possible')
    return { status: 'failed', message: 'naver post_reply: platform_review_id / reply_text 누락' }
  }

  let creds: Awaited<ReturnType<typeof loadPlainCredentials>>
  try {
    creds = await loadPlainCredentials(svc, userId, 'naver_place')
  } catch (e: any) {
    if (platformReviewId) {
      await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: `credentials: ${e?.message}` })
    }
    return { status: 'failed', message: `naver credentials: ${e?.message}` }
  }

  const bizId = payload?.biz_id
    ? String(payload.biz_id)
    : (creds.platform_store_id || opts.storeId)

  // 주거용 프록시 설정 (Railway IP 차단 우회)
  const proxyHost = process.env.PROXY_HOST
  const proxyPort = process.env.PROXY_PORT
  const proxyUser = process.env.PROXY_USER
  const proxyPass = process.env.PROXY_PASS
  const proxyProto = process.env.PROXY_PROTOCOL || 'http'
  const useProxy = !!(proxyHost && proxyPort)

  // ── v32 humanlike: viewport 미세 랜덤화 (1280±32, 900±48) ──
  // 같은 fingerprint 반복 방지 (네이버 봇 탐지 회피)
  const vw = 1248 + Math.floor(Math.random() * 64)  // 1248~1311
  const vh = 868 + Math.floor(Math.random() * 96)   // 868~963
  const contextOptions: any = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: vw, height: vh },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'sec-ch-ua': '"Google Chrome";v="127", "Chromium";v="127", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    // v32: navigator.webdriver 차단 (자동화 탐지 우회)
    bypassCSP: true,
  }
  // proxy는 chromium.launch() 레벨에서 설정됨 (index.ts)
  // context 레벨에서 재설정하면 ERR_PROXY_AUTH_UNSUPPORTED 발생 → 여기서는 로그만
  if (useProxy) {
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}`, hasAuth: !!(proxyUser && proxyPass) }, 'naver: using residential proxy (set at browser launch level)')
  } else {
    log.warn('naver: no proxy configured (PROXY_HOST/PORT missing) — Railway IP may be blocked')
  }

  const context = await browser.newContext(contextOptions)
  // 트래픽 절감 (iproyal 절약 — 이미지/CSS/추적 도메인 차단)
  const { applyTrafficSaver } = await import('../lib/trafficSaver')
  await applyTrafficSaver(context)

  // ── v32 humanlike: 브라우저 fingerprint 위장 (stealth) ──
  // 모든 page 에서 자동화 탐지 흔적 제거
  await context.addInitScript(() => {
    // navigator.webdriver = false (가장 흔한 자동화 신호)
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    // navigator.plugins / languages 정상화
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] })
    Object.defineProperty(navigator, 'plugins', {
      get: () => [{ name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }, { name: 'Native Client' }],
    })
    // chrome 객체 stub
    if (!(window as any).chrome) (window as any).chrome = { runtime: {} }
    // permissions API stub
    const origQuery = (window.navigator as any).permissions?.query
    if (origQuery) {
      ;(window.navigator as any).permissions.query = (params: any) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: 'default' } as any)
          : origQuery(params)
    }
  })

  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  // v32 humanlike helper 함수들 (이 페이지 컨텍스트 안에서만 사용)
  const humanDelay = (min = 600, max = 1400) =>
    new Promise<void>((r) => setTimeout(r, min + Math.floor(Math.random() * (max - min))))
  const jitter = async () => {
    // 사람처럼 마우스 살짝 움직임 (각도/거리 랜덤)
    try {
      const x = 200 + Math.floor(Math.random() * 800)
      const y = 200 + Math.floor(Math.random() * 500)
      await page.mouse.move(x, y, { steps: 8 + Math.floor(Math.random() * 12) }).catch(() => null)
    } catch {}
  }
  ;(page as any).__humanDelay = humanDelay
  ;(page as any).__jitter = jitter

  try {
    let loggedIn = false

    // ── 0) 프록시 alive 체크 (결제 만료 조기 감지) ─────────────────────
    if (useProxy) {
      try {
        // 가벼운 HTTP 요청으로 프록시 402/407 체크
        const proxyTestUrl = 'http://www.gstatic.com/generate_204'
        const resp = await page.request.get(proxyTestUrl, { timeout: 10000 }).catch((e2: any) => ({ status: () => 0, _err: e2?.message }))
        const status = typeof resp.status === 'function' ? resp.status() : 0
        log.info({ proxyStatus: status }, 'naver: proxy alive check')
        if (status === 402 || status === 407) {
          const msg = `naver: 프록시 이용권 만료(HTTP ${status}) — IPRoyal 결제 후 Railway PROXY_PASS 확인 필요`
          log.error('naver proxy expired: HTTP ' + status)
          if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
          return { status: 'failed', message: msg }
        }
      } catch (_) {
        // alive 체크 실패는 무시하고 계속 진행
      }
    }

    // ── 1) 항상 ID/PW 폼 로그인 (IPRoyal 프록시 경유 한국 IP)
    //    노트: 저장된 NID 쿠키는 다른 IP에서 사용 시 Naver가 강제 만료시킴
    //    → 쿠키 방식 제거, 매번 신선한 폼 로그인으로 진행
    log.info({
      hasProxy: useProxy,
      proxyHost: proxyHost || '(없음 — Railway IP 직접)',
      hasTwocaptcha: !!process.env.TWOCAPTCHA_API_KEY,
    }, 'naver: starting 2-step form login (ID → 다음 → PW → 로그인)')

    if (!loggedIn) {
      log.info('naver: form login (proxy + 2captcha)')

      if (!creds.account_id || !creds.password) {
        const msg = 'naver: ID/PW 미설정 — /my/platforms/naver_place/connect 에서 아이디·비밀번호 입력 필요'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)

      const idEl = await page.$(DOM_SELECTORS.idInput)
      if (!idEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-id-input')
        const msg = 'naver: 로그인 폼 id 입력란 없음'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      // ── 네이버 2단계 로그인: ID 입력 후 "다음" 클릭 → PW 입력 후 "로그인" 클릭
      //    (2026년 네이버 로그인 UX: #log.login 버튼이 "다음" → "로그인" 으로 바뀜)
      //    중요: ID 입력 시 fill()보다 clear+type()이 Naver JS 이벤트 처리에 안전
      // v33: 글자별 type loop 제거 (입력 깨짐 의심) — Playwright type() 한번에 + delay 변동만
      await (page as any).__jitter()
      await (page as any).__humanDelay(300, 600)
      await idEl.click({ clickCount: 3 })
      await (page as any).__humanDelay(100, 250)
      await idEl.type(creds.account_id, { delay: 70 + Math.floor(Math.random() * 50) })
      await (page as any).__humanDelay(400, 800)

      const step1BtnText = await page.$eval(
        '#log\\.login .btn_text, #log\\.login span, #log\\.login',
        (el: any) => el.textContent?.trim()
      ).catch(() => '')
      log.info({ step1BtnText, idValueLen: await idEl.evaluate((el: any) => el.value?.length ?? 0).catch(() => 0) }, 'naver: step1 before click')

      // 1단계: ID 확인 ("다음" 클릭)
      // scroll into view → click (container가 위에 있으면 클릭 miss 발생)
      await page.evaluate(() => {
        const btn = document.querySelector('#log\\.login') as HTMLElement | null
        btn?.scrollIntoView({ block: 'center' })
      }).catch(() => null)
      await page.waitForTimeout(300)
      await page.click(DOM_SELECTORS.loginBtn)

      // 다음 클릭 후: PW 필드가 visible 상태가 될 때까지 대기 (최대 8초)
      // Naver 로그인은 SPA — URL은 그대로이나 PW 필드가 hidden→visible 로 바뀜
      const pwVisible = await page.waitForSelector(
        'input[type="password"]:not([disabled]):not([hidden])',
        { state: 'visible', timeout: 8000 }
      ).then(() => true).catch(() => false)

      const urlAfterStep1 = page.url()
      const step2BtnText = await page.$eval(
        '#log\\.login .btn_text, #log\\.login span, #log\\.login',
        (el: any) => el.textContent?.trim()
      ).catch(() => '')
      log.info({ urlAfterStep1, pwVisible, step2BtnText }, 'naver: after step1 click')

      if (!pwVisible) {
        // PW 필드가 안 보이면 페이지 상태 덤프 후 상위 URL 체크로 이동
        await dumpPageDiagnostics(page, log, 'naver-no-pw-after-step1')
        // URL check: already off nidlogin.login� (보안인증 등) → 상위 URL 체크로 처리
        if (!urlAfterStep1.includes('nidlogin.login')) {
          log.warn({ urlAfterStep1 }, 'naver: navigated away after step1 — skipping PW step')
          // below url-check logic will handle it
        } else {
          // 여전히 nidlogin.login 인데 PW 없음 → bot 차단 or 네이버 CAPTCHA 삽입
          const pageText = await page.$eval('body', (el: any) => (el as HTMLElement).innerText?.slice(0, 500)).catch(() => '')
          log.warn({ pageText }, 'naver: still on nidlogin.login but no PW field — possible bot block')
        }
      }

      // 2단계: 비밀번호 입력 (visible & enabled 필드만 타겟)
      const pwEl = await page.waitForSelector(
        'input[type="password"]:not([disabled])',
        { state: 'visible', timeout: 4000 }
      ).catch(async () => {
        // fallback: any pw input
        return page.$('input#pw, input[name="pw"], input[type="password"]')
      })

      if (!pwEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-pw-input')
        const msg = 'naver: 비밀번호 입력란 없음 — ID 단계 이후 화면 전환 실패 또는 봇 차단'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      // v33: PW 입력도 한번에 type + delay 변동 (글자별 loop 제거 — 입력 깨짐 방지)
      await (page as any).__jitter()
      await (page as any).__humanDelay(250, 550)
      await pwEl.click({ clickCount: 3 })
      await (page as any).__humanDelay(100, 250)
      await pwEl.type(creds.password, { delay: 70 + Math.floor(Math.random() * 50) })
      await (page as any).__humanDelay(400, 800)

      // PW가 실제로 입력됐는지 확인
      const pwLen = await pwEl.evaluate((el: any) => (el as HTMLInputElement).value?.length ?? 0).catch(() => 0)
      log.info({ pwLen, step2BtnText }, 'naver: PW typed, about to click login')

      if (pwLen === 0) {
        log.warn('naver: PW field appears empty after type() — retrying with fill()')
        await pwEl.focus()
        await page.keyboard.type(creds.password, { delay: 80 })
        await page.waitForTimeout(300)
      }

      // 로그인 버튼 클릭
      // (CAPTCHA 탐지는 로그인 제출 이후에 수행 — Naver가 Tokyo IP에 CAPTCHA를 반응으로 삽입)
      await page.evaluate(() => {
        const btn = document.querySelector('#log\\.login') as HTMLElement | null
        btn?.scrollIntoView({ block: 'center' })
      }).catch(() => null)
      await page.click(DOM_SELECTORS.loginBtn)
      // URL이 nidlogin.login 에서 벗어날 때까지 대기
      await page.waitForURL(url => !String(url).includes('nidlogin.login'), { timeout: 20000 }).catch(() => null)
      await page.waitForTimeout(1500)

      // 37차-22: "새로운 기기 등록" 페이지 자동 통과 (v22 — DUMP + form-aware submit + skip-navigate)
      // v22 MARKER: deviceAdd-v22-dump-formAware-skip-20260502
      // 1) 페이지 전체 dump (form action, hidden inputs, 모든 button/a 텍스트)
      // 2) 우선순위: don'tSaveId / cancel / 등록안함 텍스트 → 이후 마지막 버튼 → form submit
      // 3) 클릭 후 navigation 대기, 그래도 deviceAdd 면 직접 SmartPlace 메인으로 navigate (skip)
      try {
        const pgUrl0 = page.url()
        const pageBody = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
        const isDevicePage0 = pageBody.includes('새로운 기기') || pageBody.includes('자주 사용하는 기기') ||
                              pageBody.includes('기기를 등록') || pgUrl0.includes('deviceAdd') || pgUrl0.includes('deviceConfirm')
        if (isDevicePage0) {
          // 전체 dump (정확한 selector 진단용)
          const dump = await page.evaluate(() => {
            const out: any = { buttons: [], links: [], forms: [], hiddens: [] }
            document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach((b: any) => {
              out.buttons.push({
                text: (b.innerText || b.value || b.textContent || '').trim().slice(0, 40),
                id: b.id || '', cls: (b.className || '').slice(0, 80),
                name: b.name || '', value: (b.value || '').slice(0, 40), type: b.type || '',
              })
            })
            document.querySelectorAll('a').forEach((a: any) => {
              const t = (a.innerText || '').trim()
              if (t.length > 0 && t.length < 30) out.links.push({ text: t.slice(0, 40), href: (a.href || '').slice(-80) })
            })
            document.querySelectorAll('form').forEach((f: any) => {
              out.forms.push({ id: f.id || '', action: (f.action || '').slice(-100), method: f.method || '' })
            })
            document.querySelectorAll('input[type="hidden"]').forEach((h: any) => {
              out.hiddens.push({ name: h.name || '', value: (h.value || '').slice(0, 40) })
            })
            return out
          }).catch(() => ({ buttons: [], links: [], forms: [], hiddens: [] }))
          log.info({ url: pgUrl0.slice(0, 100), dump }, 'naver: v22 deviceAdd DUMP')

          // 우선순위 매칭으로 click — 등록안함/취소/skip 후보 광범위
          const clickResult = await page.evaluate(() => {
            const all = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'))
            const candidates: Array<{ text: string; cls: string; id: string; name: string }> = []
            // 후보 수집
            for (const el of all) {
              candidates.push({
                text: ((el as any).innerText || (el as any).value || (el as any).textContent || '').trim().slice(0, 30),
                cls: ((el as any).className || '').slice(0, 80),
                id: (el as any).id || '',
                name: (el as any).name || '',
              })
            }
            // ⭐ v24 핵심 변경: "등록" 우선 클릭 (NID_AUT/NID_SES 쿠키 정상 발급 위해)
            // "등록안함"을 누르면 임시 세션만 발급 → SmartPlace owner API 권한 차단됨
            // → "등록"을 눌러 trusted device로 등록해야 사장님 권한이 정상 작동
            // 1순위: "등록" 텍스트 정확 매칭 (단, "등록안함"은 제외)
            for (const el of all) {
              const t = ((el as any).innerText || (el as any).value || (el as any).textContent || '').trim()
              // "등록"만 매칭, "등록안함"/"등록 안 함"은 제외
              if ((t === '등록' || t === 'Register' || t === 'Yes' || t === '확인' || t === '예') &&
                  !t.includes('안함') && !t.includes('안 함') && !t.includes("Don't") && !t.includes('Cancel')) {
                (el as HTMLElement).click()
                return { clicked: true, by: 'register-priority', text: t, candidates: candidates.slice(0, 30) }
              }
            }
            // 2순위: 속성으로 "register" / "yes" / "confirm" 매칭 (단, dont/cancel은 제외)
            for (const el of all) {
              const nm = ((el as any).name || '').toLowerCase()
              const id = ((el as any).id || '').toLowerCase()
              const cls = ((el as any).className || '').toLowerCase()
              const isExclude = nm.includes('dont') || nm.includes('cancel') || nm.includes('skip') ||
                                 id.includes('dont') || id.includes('cancel') || id.includes('skip') ||
                                 cls.includes('btn_cancel') || cls.includes('btn_no') || cls.includes('btn_skip')
              if (isExclude) continue
              if (nm.includes('register') || nm.includes('confirm') || nm.includes('yes') || nm.includes('save') ||
                  id.includes('register') || id.includes('confirm') || id.includes('yes') || id.includes('save') ||
                  cls.includes('btn_register') || cls.includes('btn_confirm') || cls.includes('btn_yes') || cls.includes('btn_check')) {
                (el as HTMLElement).click()
                return { clicked: true, by: 'register-attr', name: nm, id, cls, candidates: candidates.slice(0, 30) }
              }
            }
            // 3순위: form 안 첫 번째 submit (보통 "등록"이 첫 번째 = primary action)
            const forms = Array.from(document.querySelectorAll('form'))
            for (const f of forms) {
              const action = ((f as HTMLFormElement).action || '').toLowerCase()
              if (action.includes('device') || action.includes('register') || action.includes('login')) {
                const fbtns = Array.from(f.querySelectorAll('button, input[type="submit"]'))
                if (fbtns.length >= 1) {
                  // 첫 번째 버튼 = "등록" (primary action)
                  (fbtns[0] as HTMLElement).click()
                  return { clicked: true, by: 'form-first-submit', actionEnd: action.slice(-60), candidates: candidates.slice(0, 30) }
                }
              }
            }
            // 4순위 (fallback): a 태그 중 "등록" 텍스트 (이전 dump에서 anchor 였음)
            const anchors = Array.from(document.querySelectorAll('a'))
            for (const a of anchors) {
              const t = ((a as any).innerText || '').trim()
              if (t === '등록' && !t.includes('안')) {
                (a as HTMLElement).click()
                return { clicked: true, by: 'anchor-register', text: t, candidates: candidates.slice(0, 30) }
              }
            }
            return { clicked: false, candidates: candidates.slice(0, 30) }
          }).catch((e: any) => ({ clicked: false, err: e?.message, candidates: [] }))
          log.info({ clickResult }, 'naver: v22 deviceAdd click 시도 결과')

          // navigation 대기
          if (clickResult.clicked) {
            await Promise.race([
              page.waitForURL(u => !String(u).includes('deviceAdd') && !String(u).includes('deviceConfirm'), { timeout: 12000 }).catch(() => null),
              page.waitForTimeout(5000),
            ])
          } else {
            await page.waitForTimeout(2500)
          }

          // 여전히 deviceAdd → SmartPlace 직접 이동 (NID_AUT 쿠키가 셋된 상태면 통과)
          const stillUrl = page.url()
          log.info({ stillUrl: stillUrl.slice(0, 100) }, 'naver: v22 deviceAdd post-click URL')
          if (stillUrl.includes('deviceAdd') || stillUrl.includes('deviceConfirm')) {
            log.warn('naver: v22 여전히 deviceAdd → SmartPlace 직접 navigate (skip)')
            const skipTarget = bizId && bizId !== 'unknown'
              ? `${NEW_SMARTPLACE_BASE}/bizes/place/${bizId}`
              : `${NEW_SMARTPLACE_BASE}/bizes`
            await page.goto(skipTarget, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null)
            await page.waitForTimeout(2500)
            log.info({ afterSkipUrl: page.url().slice(0, 100) }, 'naver: v22 SmartPlace navigate 결과')
          }
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: v22 deviceAdd 처리 exception')
      }

      const urlAfterLogin = page.url()
      // URL을 Railway 로그에서 바로 볼 수 있도록 message 에 포함
      const loginResultShort = urlAfterLogin.replace('https://nid.naver.com/', 'nid/').replace('https://new.smartplace.naver.com', 'smartplace').slice(0, 80)
      log.info('naver: after form login — url=' + loginResultShort)

      if (urlAfterLogin.includes('captcha') || urlAfterLogin.includes('challenge')) {
        log.info({ urlAfterLogin }, 'naver: captcha detected — attempting auto-solve with 2captcha')
        const solved = await handleNaverCaptcha(page, log)
        if (solved) {
          const afterCaptchaUrl = page.url()
          log.info({ afterCaptchaUrl }, 'naver: captcha solved, checking login state')
          if (!afterCaptchaUrl.includes('nid.naver.com') && !afterCaptchaUrl.includes('login') && !afterCaptchaUrl.includes('captcha')) {
            await markLoginStatus(svc, userId, 'naver_place', 'success')
            log.info('naver: login succeeded after captcha solve')
          } else {
            // CAPTCHA 풀었지만 아직 로그인 안 됨 — SmartPlace 직접 이동으로 확인
            const bizTestUrl = bizId && bizId !== 'unknown'
              ? `${NEW_SMARTPLACE_BASE}/bizes/place/${bizId}`
              : `${NEW_SMARTPLACE_BASE}/bizes`
            await page.goto(bizTestUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
            await page.waitForTimeout(2000)
            const checkUrl = page.url()
            if (!checkUrl.includes('login') && !checkUrl.includes('nid.naver.com')) {
              loggedIn = true
              await markLoginStatus(svc, userId, 'naver_place', 'success')
              log.info('naver: captcha resolved, session confirmed')
            }
          }
        } else {
          // 2captcha 키 없거나 해결 실패
          await dumpPageDiagnostics(page, log, 'naver-captcha')
          await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
          const msg = process.env.TWOCAPTCHA_API_KEY
            ? 'naver: CAPTCHA 자동 해결 실패 — 잠시 후 재시도됩니다'
            : 'naver: CAPTCHA 발생 — TWOCAPTCHA_API_KEY를 Railway 환경변수에 추가해주세요'
          if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
          return { status: 'failed', message: msg }
        }
      }

      if (urlAfterLogin.includes('user2/help') || urlAfterLogin.includes('security') || urlAfterLogin.includes('verify')) {
        await dumpPageDiagnostics(page, log, 'naver-security')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        const msg = `naver: 네이버 보안인증 요구 — 처음 프록시 IP에서 로그인할 때 한 번 발생할 수 있어요. 잠시 후 재시도됩니다. (${urlAfterLogin})`
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      if (urlAfterLogin.includes('nid.naver.com') || urlAfterLogin.includes('login') || urlAfterLogin.includes('signin')) {
        // ── CAPTCHA 재시도: Naver가 로그인 제출 후 인라인 CAPTCHA를 삽입하는 경우 ──────
        // Tokyo IP에서 로그인 클릭 → Naver가 CAPTCHA를 응답으로 삽입 (제출 전에는 DOM에 없음)
        // 따라서 CAPTCHA 탐지는 제출 이후(이 시점)에 해야 함
        const captchaInputElRetry = await page.$(
          '#captcha, input[name="captcha"], input[placeholder*="자동입력"], input[placeholder*="자동"], input[class*="captcha"]'
        ).catch(() => null)

        // 모든 img 정보 수집 (Railway 로그에서 실제 selector 파악용)
        const postLoginImgs = await page.evaluate(() =>
          Array.from(document.querySelectorAll('img')).slice(0, 10).map((el: any) => ({
            id: el.id || '-',
            src: (el.getAttribute('src') || '').slice(0, 100),
            cls: (el.className || '').slice(0, 40),
          }))
        ).catch(() => [] as any[])
        log.info('naver: post-login imgs: ' + JSON.stringify(postLoginImgs).slice(0, 500))
        log.info('naver: captchaInputFoundAfterLogin=' + !!captchaInputElRetry)

        if (captchaInputElRetry) {
          log.info('naver: CAPTCHA appeared after login attempt')

          // CAPTCHA 이미지 src 추출 (data:image/png;base64,... 형식)
          const captchaImgSrc = await page.evaluate(() => {
            const img = document.querySelector('#captchaimg, img[id*="captcha"], img.captcha_img, .captcha_area img') as HTMLImageElement | null
            return img?.src || ''
          }).catch(() => '')
          // CAPTCHA 질문 텍스트 추출 (보조 정보 — 질문이 이미지 속에 있을 경우 비어있을 수 있음)
          const captchaQuestion = await page.evaluate(() => {
            const inp = document.querySelector('#captcha, input[name="captcha"]') as HTMLElement | null
            const container = inp?.closest('div, section, form') as HTMLElement | null
            const containerText = (container?.innerText || '').replace(/\s+/g, ' ').trim()
            if (containerText.length > 5) return containerText.slice(0, 200)
            // body 전체에서 영수증 키워드 검색
            const bt = (document.body?.innerText || '').replace(/\s+/g, ' ')
            const kws = ['구매한', '영수증', '결제', '금액', '총', '개 당', '몇', '가격', '이름']
            for (const kw of kws) {
              const idx = bt.indexOf(kw)
              if (idx >= 0) return bt.slice(Math.max(0, idx - 20), idx + 120)
            }
            return ''
          }).catch(() => '')
          log.info('naver: CAPTCHA img len=' + captchaImgSrc.length + ' question=' + (captchaQuestion || '(없음—이미지 속 질문)').slice(0, 80))

          let captchaAnswerRetry: string | null = null

          // 37차-13: 2Captcha (lang=ko, 한국어 worker 우선) + Claude Vision (Sonnet 3.5) 병렬 race
          // 둘 중 먼저 답하는 쪽 사용 → 정확도+속도 모두 향상
          if (captchaImgSrc.startsWith('data:')) {
            const rawB64 = captchaImgSrc.replace(/^data:[^;]+;base64,/, '')
            const mediaType = rawB64.startsWith('/9j/') ? 'image/jpeg' : 'image/png'
            const captchaInstruction = captchaQuestion
              ? captchaQuestion + '\n이미지의 영수증을 보고 답하세요. 답만 짧게 (예: 순창, 3, 15000). 설명 없이 답만.'
              : '이 이미지를 자세히 보세요. 이미지 안에 한국어 질문이 있습니다. 그 질문을 찾아 영수증 내용 기반으로 답하세요. 답만 짧게. 설명 없이 답만.'

            // ── Promise A: 2Captcha (lang=ko, 한국 worker 매칭) ───────────────────
            const twoCapKey = process.env.TWOCAPTCHA_API_KEY
            const promiseA = (async (): Promise<{ answer: string; via: string } | null> => {
              if (!twoCapKey) return null
              try {
                let instructions = captchaQuestion || '한국어 영수증 CAPTCHA. 이미지 안 한국어 질문에 답하세요.'
                if (captchaQuestion) {
                  if (captchaQuestion.includes('몇') || captchaQuestion.includes('kg') || captchaQuestion.includes('g') ||
                      captchaQuestion.includes('번호') || captchaQuestion.includes('숫자') || captchaQuestion.includes('금액') || captchaQuestion.includes('가격')) {
                    instructions = captchaQuestion + '\n숫자만 답하세요. 단위 빼고.'
                  } else if (captchaQuestion.includes('이름') || captchaQuestion.includes('상품') || captchaQuestion.includes('브랜드')) {
                    instructions = captchaQuestion + '\n한국어 이름만 답하세요.'
                  }
                }
                log.info('captcha[2captcha]: submitting (lang=ko) ...')
                const submitRes = await fetch('https://2captcha.com/in.php', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    key: twoCapKey, method: 'base64', body: rawB64, json: '1',
                    lang: 'ko',  // 한국어 worker 우선 할당
                    textinstructions: instructions,
                  }),
                }).then((r: any) => r.json()).catch(() => null)
                if (submitRes?.status !== 1) {
                  log.warn('captcha[2captcha]: submit failed: ' + JSON.stringify(submitRes || 'null').slice(0, 80))
                  return null
                }
                const captchaId = submitRes.request
                await new Promise((r) => setTimeout(r, 10000))
                for (let i = 0; i < 18; i++) {
                  await new Promise((r) => setTimeout(r, 4000))
                  const pollRes = await fetch(
                    'https://2captcha.com/res.php?key=' + twoCapKey + '&action=get&id=' + captchaId + '&json=1'
                  ).then((r: any) => r.json()).catch(() => null)
                  if (pollRes?.status === 1 && pollRes?.request) {
                    log.info('captcha[2captcha]: ✅ answered=' + String(pollRes.request).slice(0, 30))
                    return { answer: String(pollRes.request).trim(), via: '2captcha-ko' }
                  }
                  if (pollRes?.request && pollRes.request !== 'CAPCHA_NOT_READY') {
                    log.warn('captcha[2captcha]: error=' + JSON.stringify(pollRes).slice(0, 80))
                    return null
                  }
                }
                log.warn('captcha[2captcha]: timeout after 80s')
                return null
              } catch (e: any) {
                log.warn('captcha[2captcha]: exception ' + String(e?.message).slice(0, 80))
                return null
              }
            })()

            // ── Promise B: Claude Vision Sonnet 3.5 (Vercel 프록시 또는 직접) ──
            const promiseB = (async (): Promise<{ answer: string; via: string } | null> => {
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
              if (supabaseKey) {
                try {
                  log.info('captcha[claude]: Vercel proxy (Claude Sonnet 3.5)')
                  const proxyRes = await fetch('https://localution.vercel.app/api/captcha-solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + supabaseKey },
                    body: JSON.stringify({ image: rawB64, question: captchaInstruction, mediaType }),
                    signal: AbortSignal.timeout(25000),
                  }).then((r: any) => r.json()).catch((e: any) => ({ error: e?.message }))
                  const proxyAnswer = (proxyRes?.answer || '').trim()
                  if (proxyAnswer) {
                    log.info('captcha[claude]: ✅ Vercel proxy answered=' + proxyAnswer.slice(0, 30))
                    return { answer: proxyAnswer, via: 'claude-vercel' }
                  }
                  log.warn('captcha[claude]: Vercel empty' + (proxyRes?.error ? ' err=' + String(proxyRes.error).slice(0, 80) : ''))
                } catch (_) {}
              }
              const anthropicKey = process.env.ANTHROPIC_API_KEY
              if (anthropicKey) {
                try {
                  log.info('captcha[claude]: direct Anthropic Sonnet 3.5')
                  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
                    body: JSON.stringify({
                      model: 'claude-3-5-sonnet-20241022',  // 정확도 ↑ (Haiku → Sonnet 3.5)
                      max_tokens: 50,
                      messages: [{ role: 'user', content: [
                        { type: 'image', source: { type: 'base64', media_type: mediaType, data: rawB64 } },
                        { type: 'text', text: captchaInstruction },
                      ]}],
                    }),
                    signal: AbortSignal.timeout(25000),
                  }).then((r: any) => r.json()).catch(() => null)
                  const claudeAnswer = (claudeRes?.content?.[0]?.text || '').trim()
                  if (claudeAnswer) {
                    log.info('captcha[claude]: ✅ direct answered=' + claudeAnswer.slice(0, 30))
                    return { answer: claudeAnswer, via: 'claude-direct' }
                  }
                } catch (_) {}
              }
              return null
            })()

            // 둘 중 먼저 정답 내놓는 쪽 사용 (race)
            const winner = await Promise.race([
              promiseA.then((r) => r ?? new Promise<never>(() => {})), // null 이면 무한 대기 (다른쪽 기다림)
              promiseB.then((r) => r ?? new Promise<never>(() => {})),
              new Promise<{ answer: string; via: string } | null>((resolve) => setTimeout(() => resolve(null), 90000)), // 90초 timeout
            ]).catch(() => null)

            if (winner && winner.answer) {
              captchaAnswerRetry = winner.answer
              log.info('captcha: 🎯 winner=' + winner.via + ' answer=' + winner.answer.slice(0, 30))
            } else {
              // race 실패 시 양쪽 결과 다시 확인 (둘 다 null로 끝났을 수 있음)
              const [a, b] = await Promise.all([
                promiseA.catch(() => null),
                promiseB.catch(() => null),
              ])
              const fallback = a || b
              if (fallback) {
                captchaAnswerRetry = fallback.answer
                log.info('captcha: late winner=' + fallback.via + ' answer=' + fallback.answer.slice(0, 30))
              }
            }
          }

          // ══ 폴백: solveCaptcha (DOM 기반) — captchaImgSrc 가 data: 가 아닌 경우 ═══
          if (!captchaAnswerRetry && !captchaImgSrc.startsWith('data:')) {
            const apiKey = process.env.TWOCAPTCHA_API_KEY
            if (apiKey) {
              try {
                captchaAnswerRetry = await solveCaptcha({ page, log, type: 'image',
                  captchaSelector: '#captchaimg, img[id*="captcha"], img.captcha_img, .captcha_area img' })
              } catch (e: any) {
                log.warn('captcha[fallback]: solveCaptcha exception ' + String(e?.message).slice(0, 80))
              }
            }
          }

          if (!captchaAnswerRetry) {
            log.warn('naver: 모든 CAPTCHA 풀이 방법 실패 (2Captcha + Claude Vision 모두 실패)')
          }

          if (captchaAnswerRetry) {
            // Naver가 실패한 로그인 후 PW 필드를 초기화 → 재입력 필수
            const idElRetry = await page.$(DOM_SELECTORS.idInput).catch(() => null)
            if (idElRetry) {
              await idElRetry.click({ clickCount: 3 })
              await idElRetry.type(creds.account_id, { delay: 80 })
              await page.waitForTimeout(200)
            }
            const pwElRetry = await page.$('input[type="password"]:not([disabled])').catch(() => null)
            if (pwElRetry) {
              await pwElRetry.click({ clickCount: 3 })
              await pwElRetry.type(creds.password, { delay: 80 })
              await page.waitForTimeout(200)
            }
            // CAPTCHA 답 입력
            await captchaInputElRetry.click({ clickCount: 3 })
            await captchaInputElRetry.type(captchaAnswerRetry, { delay: 80 })
            await page.waitForTimeout(500)
            log.info('naver: ID/PW/CAPTCHA re-filled (answer len=' + captchaAnswerRetry.length + ') — re-submitting login')
            await page.evaluate(() => {
              const btn = document.querySelector('#log\\.login') as HTMLElement | null
              btn?.scrollIntoView({ block: 'center' })
            }).catch(() => null)
            await page.click(DOM_SELECTORS.loginBtn)
            await page.waitForURL(url => !String(url).includes('nidlogin.login'), { timeout: 25000 }).catch(() => null)
            await page.waitForTimeout(1500)

            // 37차-21: "새로운 기기 등록" 페이지 자동 통과 - 페이지 dump + 모든 버튼 시도
            try {
              const pgUrl = page.url()
              const pgBody = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
              const isDevicePage = pgBody.includes('새로운 기기') || pgBody.includes('자주 사용하는 기기') ||
                                    pgBody.includes('기기를 등록') || pgUrl.includes('deviceAdd') || pgUrl.includes('deviceConfirm')
              if (isDevicePage) {
                // 페이지 모든 버튼/링크/form 정보 dump (정확한 selector 진단)
                const dump = await page.evaluate(() => {
                  const out: any = { buttons: [], links: [], forms: [] }
                  document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach((b: any) => {
                    out.buttons.push({
                      text: (b.innerText || b.value || '').trim().slice(0, 40),
                      id: b.id || '',
                      cls: (b.className || '').slice(0, 60),
                      name: b.name || '',
                      type: b.type || '',
                    })
                  })
                  document.querySelectorAll('a').forEach((a: any) => {
                    const t = (a.innerText || '').trim()
                    if (t.length > 0 && t.length < 30) {
                      out.links.push({ text: t.slice(0, 40), href: (a.href || '').slice(-50) })
                    }
                  })
                  document.querySelectorAll('form').forEach((f: any) => {
                    out.forms.push({ id: f.id || '', action: (f.action || '').slice(-60), method: f.method || '' })
                  })
                  return out
                }).catch(() => ({ buttons: [], links: [], forms: [] }))
                log.info({ url: pgUrl.slice(0, 100), dump }, 'naver: 새기기 페이지 DUMP')

                // ⭐ v26: anchor onclick 추출 + click + form-submit triple-fallback
                // "등록" anchor 가 JS onclick 으로 form 을 submit 하므로, click 실패 시 추출한 JS 직접 실행
                const clickResult = await page.evaluate(() => {
                  const all = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'))
                  const candidates: any[] = []
                  for (const el of all) {
                    candidates.push({
                      tag: el.tagName,
                      text: ((el as any).innerText || (el as any).value || '').trim().slice(0, 30),
                      onclick: (el as any).getAttribute?.('onclick')?.slice(0, 100) || '',
                      href: ((el as any).href || '').slice(-30),
                    })
                  }
                  // 1순위: "등록" anchor — text 정확 매칭 후 click + onclick JS 직접 호출
                  let registerEl: HTMLElement | null = null
                  let registerText = ''
                  let registerOnclick = ''
                  for (const el of all) {
                    const t = ((el as any).innerText || (el as any).value || (el as any).textContent || '').trim()
                    if ((t === '등록' || t === 'Register' || t === 'Yes' || t === '확인' || t === '예') &&
                        !t.includes('안함') && !t.includes('안 함') && !t.includes("Don't") && !t.includes('Cancel')) {
                      registerEl = el as HTMLElement
                      registerText = t
                      registerOnclick = (el as any).getAttribute?.('onclick') || ''
                      break
                    }
                  }
                  if (registerEl) {
                    // 1) 표준 click event 발생
                    registerEl.click()
                    // 2) onclick attribute 가 있으면 직접 evaluate (해커 트릭)
                    let onclickRan = false
                    if (registerOnclick) {
                      try {
                        // onclick 안의 함수 직접 실행 (eval은 위험하니 Function 객체 사용)
                        const fn = new Function(registerOnclick)
                        fn.call(registerEl)
                        onclickRan = true
                      } catch (e) {}
                    }
                    // 3) anchor href 가 javascript: 면 그것도 실행
                    const href = (registerEl as HTMLAnchorElement).href || ''
                    let hrefRan = false
                    if (href.startsWith('javascript:')) {
                      try {
                        const code = href.replace(/^javascript:/, '')
                        const fn = new Function(code)
                        fn.call(registerEl)
                        hrefRan = true
                      } catch (e) {}
                    }
                    return {
                      clicked: true, by: 'register-priority', text: registerText,
                      onclickHas: !!registerOnclick, onclickRan, hrefStartsJs: href.startsWith('javascript:'), hrefRan,
                      candidates: candidates.slice(0, 15),
                    }
                  }
                  return { clicked: false, candidates: candidates.slice(0, 15) }
                }).catch((e: any) => ({ clicked: false, err: e?.message, candidates: [] }))
                log.info({ clickResult }, 'naver: deviceAdd click 결과 (v26 anchor+onclick fallback)')

                if (clickResult.clicked) {
                  await Promise.race([
                    page.waitForURL(u => !String(u).includes('deviceAdd') && !String(u).includes('deviceConfirm'), { timeout: 12000 }).catch(() => null),
                    page.waitForTimeout(5000),
                  ])
                }

                // URL still on deviceAdd → form 직접 submit 시도 (마지막 fallback)
                let stillUrl = page.url()
                if (stillUrl.includes('deviceAdd') || stillUrl.includes('deviceConfirm')) {
                  log.warn({ stillUrl: stillUrl.slice(0, 100) }, 'naver: deviceAdd 여전 → form 직접 submit 시도')
                  const submitResult = await page.evaluate(() => {
                    const f = document.querySelector('form') as HTMLFormElement | null
                    if (!f) return { ok: false, reason: 'no-form' }
                    // hidden input 모두 dump
                    const hiddens: any[] = []
                    f.querySelectorAll('input[type="hidden"]').forEach((h: any) => {
                      hiddens.push({ name: h.name, value: String(h.value || '').slice(0, 30) })
                    })
                    // 'register' / 'deviceConfirm' 비슷한 hidden 찾기 → 'Y' 로 강제 설정
                    f.querySelectorAll('input').forEach((i: any) => {
                      const n = (i.name || '').toLowerCase()
                      if (n.includes('register') || n.includes('confirm') || n.includes('save') || n === 'todo') {
                        if (i.value === 'N' || i.value === 'no' || i.value === '' || i.value === 'cancel') {
                          i.value = 'Y'
                        }
                      }
                    })
                    f.submit()
                    return { ok: true, action: f.action, hiddens }
                  }).catch((e: any) => ({ ok: false, reason: e?.message }))
                  log.info({ submitResult }, 'naver: deviceAdd form 직접 submit 결과')

                  await Promise.race([
                    page.waitForURL(u => !String(u).includes('deviceAdd') && !String(u).includes('deviceConfirm'), { timeout: 10000 }).catch(() => null),
                    page.waitForTimeout(5000),
                  ])
                  stillUrl = page.url()
                }

                if (stillUrl.includes('deviceAdd') || stillUrl.includes('deviceConfirm')) {
                  log.warn({ stillUrl: stillUrl.slice(0, 100) }, 'naver: 모든 deviceAdd 통과 시도 실패 → SmartPlace 직접 navigate')
                  const target = bizId && bizId !== 'unknown'
                    ? `${NEW_SMARTPLACE_BASE}/bizes/place/${bizId}`
                    : 'https://www.naver.com/'
                  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)
                  await page.waitForTimeout(2000)
                }
              }
            } catch (e: any) {
              log.warn({ err: e?.message }, 'naver: deviceAdd 처리 exception')
            }

            const urlAfterCaptcha = page.url()
            log.info('naver: after CAPTCHA retry — url=' + urlAfterCaptcha.replace('https://nid.naver.com/', 'nid/').slice(0, 80))
            // 성공 판정: nid.naver.com 떠나거나, naver.com 메인이거나, smartplace 등으로 이동
            const isLoggedIn = (
              !urlAfterCaptcha.includes('nid.naver.com') &&
              !urlAfterCaptcha.includes('nidlogin.login') &&
              !urlAfterCaptcha.includes('deviceAdd') &&
              !urlAfterCaptcha.includes('deviceConfirm')
            ) || urlAfterCaptcha.includes('www.naver.com')
            if (isLoggedIn) {
              await markLoginStatus(svc, userId, 'naver_place', 'success')
              log.info('naver: login succeeded after CAPTCHA solve')
              loggedIn = true
            } else {
              log.warn('naver: login still failed after CAPTCHA solve')
            }
          } else {
            log.warn('naver: 2captcha could not solve CAPTCHA after login attempt')
          }
        }

        if (!loggedIn) {
          // detectLoginFailure: 실제 에러 텍스트만 감지 (폼 라벨 '비밀번호','아이디'는 제외)
          const { reason } = await detectLoginFailure(page, ['일치하지', '잘못된', '실패', '오류', 'incorrect', 'invalid', '차단', '해외', '비밀번호가 잘못', '비밀번호를 변경'])
          const bodySnippet = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 400)).catch(() => '')
          log.warn('naver: login failed page text: ' + bodySnippet.slice(0, 300))
          await dumpPageDiagnostics(page, log, 'naver-login-failed')

          // v33: 실패 사유 분류 → DB 에 명시적 status 저장 + 사용자 안내 메시지 강화
          const cls = classifyLoginFailure(bodySnippet || reason || '')
          log.info({ kind: cls.kind, hint: cls.hint }, 'naver: login failure classified')
          const dbStatus: 'credentials_invalid' | 'account_locked' | 'failed' =
            cls.kind === 'credentials_invalid' ? 'credentials_invalid' :
            cls.kind === 'account_locked' ? 'account_locked' :
            'failed'
          await markLoginStatus(svc, userId, 'naver_place', dbStatus, reason || urlAfterLogin)

          const msg = `${cls.hint} | url=${urlAfterLogin.slice(0, 80)}${reason ? ` | reason=${reason.slice(0, 60)}` : ''}`
          if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
          return { status: 'failed', message: msg }
        }
      }

      if (!loggedIn) {
        await markLoginStatus(svc, userId, 'naver_place', 'success')
        log.info({ url: urlAfterLogin }, 'naver: form login success')
      }
    }

    if (action === 'health_check') return { status: 'ok', message: 'naver login ok' }

    // ── 3) SmartPlace 답글 등록 ───────────────────────────────────
    // v36: 외부 placeId 로드 (stores.naver_url 에서 추출) — createReply input.placeId 용
    const externalPlaceId = await loadExternalPlaceId(svc, userId)
    log.info({ externalPlaceId, internalPlaceId: bizId }, 'naver: v36 외부 placeId 로드 완료')
    const result = await postNaverReply(page, bizId, platformReviewId, replyText, log, externalPlaceId)
    if (result.ok) {
      await updateReviewStatus(svc, userId, platformReviewId, 'submitted', { replyContent: replyText })
      return { status: 'ok', message: `naver: reply posted for ${platformReviewId}` }
    }

    await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: result.reason })
    return { status: 'failed', message: `naver reply 실패: ${result.reason}` }

  } catch (e: any) {
    const errMsg = String(e?.message || e || 'unknown')
    // 프록시 결제 만료 / 연결 불가 → 명확한 안내
    const isProxyErr = errMsg.includes('402') || errMsg.includes('407') || errMsg.includes('Payment') ||
                       errMsg.includes('ERR_TUNNEL') || errMsg.includes('ERR_PROXY') || errMsg.includes('ERR_EMPTY_RESPONSE')
    const friendlyMsg = isProxyErr
      ? 'naver: 프록시 이용권 만료 또는 연결 실패 — IPRoyal 결제 후 Railway PROXY_PASS 확인 필요'
      : `naver: ${errMsg.slice(0, 150)}`
    // 에러 메시지를 Railway 로그에서 바로 볼 수 있도록 log message 에 포함
    log.error('naver unhandled error: ' + errMsg.slice(0, 200))
    if (platformReviewId) {
      await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: friendlyMsg }).catch(() => null)
    }
    return { status: 'failed', message: friendlyMsg }
  } finally {
    await context.close().catch(() => null)
  }
}


// ── SmartPlace GraphQL createReply 직접 호출 ──────────────────────
// 37차-15: Playwright UI 자동화 → GraphQL API 직접 호출로 전면 교체
//   사용자 캡처 cURL 분석:
//     POST https://new.smartplace.naver.com/graphql?opName=createReply
//     mutation createReviewReply($input: CreateReviewReplyInput!)
//     input: { text, reviewId, placeId }
//   UI 변경 무관, 1초 응답, 100% 안정적
async function postNaverReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
  externalPlaceId?: string | null,  // v36: m.place.naver.com 형식 외부 ID — input.placeId 용
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // UNIQUE_MARKER_v16_REFERER_FIX_20260502
  log.info({ marker: 'UNIQUE_MARKER_v16_REFERER_FIX_20260502' }, 'naver: postNaverReply v16 PC domain + correct referer')
  // 37차-16: 사용자 cURL 분석 결과 — SmartPlace는 referer 검증 + placeSeq/bookingBusinessId 매칭
  //   → final URL을 capture하여 referer로 사용 (placeSeq + bookingBusinessId 자동 포함)
  //   → PC 도메인 (new.smartplace) + Desktop UA 사용
  let finalRefererUrl = 'https://new.smartplace.naver.com/bizes/place/' + storeId + '/reviews?menu=visitor'
  let bookingBusinessId = ''
  try {
    // ── v29 핵심: bookingBusinessId 자동 추출 ──
    // 정식 owner URL: /bizes/place/{placeId}/reviews?bookingBusinessId={...}&menu=visitor
    // 이게 없으면 SmartPlace GraphQL 이 FORBIDDEN 반환
    //
    // Step 1) /bizes 메인 진입 → 매장 카드 클릭 → SPA redirect → URL 에 bookingBusinessId 포함
    try {
      await page.goto('https://new.smartplace.naver.com/bizes', {
        waitUntil: 'domcontentloaded', timeout: 15000,
      })
      await page.waitForTimeout(4000)  // 매장 목록 로딩 대기

      // ─── v34: 매장 카드 클릭 성공/실패 둘 다 동일하게 처리 ───
      // 카드 클릭 성공 → SPA 부분 hydration 후 page.goto 하면 state 충돌 (소금정원 OK / 일산닭칼국수 FAIL 차이)
      // 해결: 클릭 안 하고 곧바로 /bizes/place/{storeId} 직접 진입 → SPA 처음부터 init → bookingBusinessId 자동 추가 (소금정원 fallback 흐름)
      // 그 후 reviews 탭은 SPA 안에서 자연스럽게 클릭 (page.goto 안 함 → state 손상 방지)
      log.info({ approach: 'v34-direct-place-then-tab-click' }, 'naver: v34 SPA-friendly navigation 시작')
      await page.goto(`https://new.smartplace.naver.com/bizes/place/${storeId}`, {
        waitUntil: 'domcontentloaded', timeout: 15000,
      }).catch(() => null)
      await page.waitForTimeout(8000)  // SPA 가 bookingBusinessId 추가하고 dashboard hydration 까지

      // bookingBusinessId 추출
      let currUrl = page.url()
      let m = currUrl.match(/bookingBusinessId=(\d+)/)
      if (m) {
        bookingBusinessId = m[1]
        log.info({ bookingBusinessId, urlAfterPlaceVisit: currUrl.slice(0, 200) }, 'naver: ✅ v34 bookingBusinessId 추출 성공 (place 직접 진입)')
      } else {
        log.warn({ urlAfterPlaceVisit: currUrl.slice(0, 200) }, 'naver: v34 bookingBusinessId 추출 실패 — fallback 시도')
        // fallback: /bizes 메인에서 카드 클릭 (이전 방식)
        await page.goto('https://new.smartplace.naver.com/bizes', {
          waitUntil: 'domcontentloaded', timeout: 15000,
        }).catch(() => null)
        await page.waitForTimeout(4000)
        await page.evaluate((targetPlaceId: string) => {
          const card = document.querySelector(`a[href*="/bizes/place/${targetPlaceId}"]`) as HTMLElement | null
          if (card) (card as HTMLElement).click()
        }, storeId).catch(() => null)
        await page.waitForTimeout(7000)
        currUrl = page.url()
        m = currUrl.match(/bookingBusinessId=(\d+)/)
        if (m) {
          bookingBusinessId = m[1]
          log.info({ bookingBusinessId, urlAfterFallback: currUrl.slice(0, 200) }, 'naver: ✅ v34 bookingBusinessId 추출 (fallback 카드 클릭)')
        }
      }

      // ─── v34: SPA 안에서 reviews 탭 자연스럽게 클릭 (page.goto 회피) ───
      // SmartPlace 사이드바/탭 네비게이션의 reviews 링크 click — SPA history.pushState 사용 → state 보존
      const reviewsTabClicked = await page.evaluate(() => {
        // 다양한 selector 로 reviews 탭 찾기
        const candidates = Array.from(document.querySelectorAll('a, button, [role="link"], [role="tab"]'))
        for (const el of candidates) {
          const text = (el as HTMLElement).innerText || ''
          const href = (el as HTMLAnchorElement).href || ''
          if ((href.includes('/reviews') && href.includes(location.host)) ||
              text === '리뷰' || text === '리뷰 관리') {
            ;(el as HTMLElement).click()
            return { clicked: true, text: text.slice(0, 20), href: href.slice(-60) }
          }
        }
        return { clicked: false }
      }).catch(() => ({ clicked: false }))
      log.info({ reviewsTabClicked }, 'naver: v34 reviews 탭 SPA 클릭 시도')
      await page.waitForTimeout(5000)

      // 만약 SPA 클릭 후에도 reviews 페이지가 아니면 page.goto 보조 (필수일 때만)
      let urlNow = page.url()
      if (!urlNow.includes('/reviews')) {
        const reviewsUrl = bookingBusinessId
          ? `https://new.smartplace.naver.com/bizes/place/${storeId}/reviews?bookingBusinessId=${bookingBusinessId}&menu=visitor`
          : `https://new.smartplace.naver.com/bizes/place/${storeId}/reviews?menu=visitor`
        log.warn({ reviewsUrl }, 'naver: v34 SPA 탭 클릭 실패 → page.goto fallback')
        await page.goto(reviewsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.waitForTimeout(4000)
      }
      const u = page.url()
      log.info({ url: u, hasBookingBusinessId: !!bookingBusinessId, viaSpaTab: reviewsTabClicked.clicked }, 'naver: v34 visited SmartPlace reviews page')
      if (u.includes('nid.naver.com') || u.includes('login')) {
        return { ok: false, reason: 'SmartPlace 접근 시 로그인 redirect — 세션 만료' }
      }
      finalRefererUrl = u  // SPA 가 hydration 완료한 URL 그대로 사용
      log.info({ finalRefererUrl, bookingBusinessId }, 'naver: ✅ v29 captured final referer (with bookingBusinessId)')
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: v29 SmartPlace navigation failed (using fallback)')
    }

    // 2) 쿠키 캡처 (네이버 + smartplace 도메인)
    const allCookies = await page.context().cookies()
    const naverCookies = allCookies.filter((c: any) =>
      c.domain.includes('naver.com') || c.domain.includes('smartplace')
    )
    const cookieHeader = naverCookies.map((c: any) => c.name + '=' + c.value).join('; ')

    // ⭐ v24: NID_AUT / NID_SES 검증 — owner API 권한 핵심 쿠키
    const cookieNames = naverCookies.map((c: any) => String(c.name))
    const hasNidAut = cookieNames.includes('NID_AUT')
    const hasNidSes = cookieNames.includes('NID_SES')
    const allCookieNames = cookieNames.slice(0, 30)
    log.info({
      total: allCookies.length, naver: naverCookies.length,
      cookieLen: cookieHeader.length,
      sample: cookieNames.slice(0, 12),
      hasNidAut, hasNidSes,
      allNames: allCookieNames,
    }, 'naver: cookies captured (v24 with NID_AUT check)')

    if (!hasNidAut || !hasNidSes) {
      log.error({ hasNidAut, hasNidSes, cookieNames: allCookieNames },
        'naver: ❌ NID_AUT/NID_SES 누락 — deviceAdd "등록안함" 클릭으로 발생한 임시 세션 (owner 권한 차단됨)')
      return {
        ok: false,
        reason: 'NID_AUT/NID_SES 쿠키 미발급 — 새 기기 등록 화면에서 "등록"이 정상 처리되지 않아 사장님 권한이 풀리지 않음. 다시 시도해주세요 (3-5회 시도 후 재발급될 수 있음).',
      }
    }

    if (!cookieHeader || cookieHeader.length < 50) {
      return { ok: false, reason: '로그인 쿠키 캡처 실패 (쿠키 부족) — 로그인 재확인 필요' }
    }

    // 37차-16: PC 도메인 + Desktop UA + 캡처된 finalRefererUrl 사용 (placeSeq + bookingBusinessId 포함)
    const smartplaceHeaders = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      'Cookie': cookieHeader,
      'Referer': finalRefererUrl,  // 워커가 redirect로 캡처한 실제 URL (placeSeq/bookingBusinessId 포함)
      'Origin': 'https://new.smartplace.naver.com',
      'from-system': 'smartplace',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    }

    // ─── 3) 🆕 SmartPlace getReviews 로 internal reviewId 매핑 ───
    // 우리 platformReviewId (pcmap-api 형식) ≠ SmartPlace internal id
    // SmartPlace에 직접 reviews 목록 요청 → 매칭하여 정확한 id 추출
    const reviewsQuery = 'fragment CommonReviewReplyFields on ReviewReply { text isSuspended isQualified createdDateTime updatedDateTime isDeleted useReplyCandidate replierDisplayName suspendPostingReason __typename } fragment CommonReviewFields on Review { author { displayName reviewCount imageCount profileImage visitCount userId __typename } placeDetail { id __typename } bookingDetail { bookingUserDetail business bizItem items __typename } content { text mediaItems { id type thumbnail url trailer metadata __typename } rating tags { votedKeywords { category keywords { code emojiCode emojiUrl label { ko __typename } __typename } __typename } __typename } textGradeInspection { grade __typename } __typename } reply { ...CommonReviewReplyFields __typename } reactionStat { id targetId totalCount sortedTypeCountEntries __typename } createdDateTime displayUpdatedDateTime id rating isSuspended suspendPostingReason isQualified source mainPov visitCount visitDateTime cp hasReply hasText hasVotedKeyword hasNegativeTextGrade __typename } query getReviews($input: GetReviewsInput!) { reviews(input: $input) { totalCount items { ...CommonReviewFields __typename } __typename } }'

    let smartplaceReviewId: string | null = null
    // v23: getReviews 매핑 강화 — full body 로깅 + fuzzy match + DOM fallback
    let ourContent = ''
    try {
      // 우리 review의 content 가져오기 (DB) — 매칭 fallback 용
      const svcLocal = getServiceClient()
      const { data: ourReviewRow } = await svcLocal.from('platform_reviews')
        .select('content, posted_at')
        .eq('platform', 'naver_place')
        .eq('platform_review_id', platformReviewId)
        .eq('platform_store_id', storeId)
        .maybeSingle()
      ourContent = String(ourReviewRow?.content || '').trim()
      log.info({ ourContentLen: ourContent.length, ourContentPreview: ourContent.slice(0, 80) }, 'naver: our review content loaded')

      // SmartPlace getReviews 호출 (페이지네이션 — 최대 5페이지)
      let foundOnPage = -1
      const seenItemsSummary: any[] = []
      // v36: getReviews input.placeId 도 외부 placeId 사용
      const inputPlaceIdForGetReviews = externalPlaceId || storeId
      for (let p = 1; p <= 5 && !smartplaceReviewId; p++) {
        const grInput: any = { sort: 'CreatedDesc', placeId: inputPlaceIdForGetReviews, page: p }
        if (bookingBusinessId) {
          const bid = parseInt(bookingBusinessId, 10)
          if (!isNaN(bid)) grInput.bookingBusinessId = bid
        }
        // v34: getReviews 에도 동일한 SPA-style 헤더 (x-csrf-token, apollo headers)
        const reviewsResult = await page.evaluate(async ({ url, body }: any) => {
          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Accept': '*/*',
              'from-system': 'smartplace',
              'x-requested-with': 'XMLHttpRequest',
              'apollographql-client-name': 'smartplace-web',
              'apollographql-client-version': '1.0.0',
            }
            const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
            if (csrfMatch && csrfMatch[1]) headers['x-csrf-token'] = csrfMatch[1]
            const r = await fetch(url, { method: 'POST', headers, body, credentials: 'include' })
            const text = await r.text()
            return { ok: r.ok, status: r.status, text: text.slice(0, 3000) }
          } catch (e: any) { return { ok: false, status: 0, text: '', err: e?.message } }
        }, {
          url: 'https://new.smartplace.naver.com/graphql?opName=getReviews',
          body: JSON.stringify({
            operationName: 'getReviews',
            variables: { input: grInput },
            query: reviewsQuery,
          }),
        }).catch((e: any) => ({ ok: false, status: 0, text: '', err: e?.message }))
        // shim: 기존 코드 호환을 위해 reviewsRes 객체 형태로 변환
        const reviewsRes = {
          ok: reviewsResult.ok && reviewsResult.status === 200,
          status: reviewsResult.status,
          text: async () => reviewsResult.text,
          json: async () => { try { return JSON.parse(reviewsResult.text) } catch { return null } },
        } as any
        if (!reviewsRes.ok) {
          const errBody = await reviewsRes.text().catch(() => '')
          log.warn({ status: reviewsRes.status, page: p, errBody: errBody.slice(0, 300) }, 'naver: getReviews HTTP error')
          break
        }
        const rawText = await reviewsRes.text()
        let reviewsJson: any = null
        try { reviewsJson = JSON.parse(rawText) } catch {}
        const items: any[] = reviewsJson?.data?.reviews?.items || []
        const totalCount = reviewsJson?.data?.reviews?.totalCount
        const errs = reviewsJson?.errors
        log.info({
          page: p, count: items.length, totalCount,
          errors: errs ? JSON.stringify(errs).slice(0, 200) : null,
          rawPreview: items.length === 0 ? rawText.slice(0, 400) : null,
        }, 'naver: getReviews page loaded')
        if (items.length === 0) break

        // 직접 ID 매치
        const directMatch = items.find((it: any) => it.id === platformReviewId)
        if (directMatch) {
          smartplaceReviewId = directMatch.id
          foundOnPage = p
          log.info({ smartplaceReviewId, page: p }, 'naver: ✅ directID match')
          break
        }
        // content text 매치 (정확/부분/접두 모두 시도)
        if (ourContent.length > 0) {
          const ourNorm = ourContent.replace(/\s+/g, ' ').trim()
          const ourPrefix = ourNorm.slice(0, Math.min(ourNorm.length, 40))
          const contentMatch = items.find((it: any) => {
            const t = String(it.content?.text || '').replace(/\s+/g, ' ').trim()
            if (t.length === 0) return false
            return t === ourNorm || t.startsWith(ourPrefix) || ourNorm.startsWith(t.slice(0, 40))
          })
          if (contentMatch) {
            smartplaceReviewId = contentMatch.id
            foundOnPage = p
            log.info({
              smartplaceReviewId, page: p,
              ourPreview: ourNorm.slice(0, 40),
              matchedPreview: String(contentMatch.content?.text || '').slice(0, 40),
            }, 'naver: ✅ content match')
            break
          }
        }
        // 매치 안 되면 페이지의 모든 review id+content preview 저장 (진단용)
        for (const it of items) {
          seenItemsSummary.push({
            id: String(it.id || '').slice(0, 30),
            preview: String(it.content?.text || '').slice(0, 30),
            createdAt: String(it.createdDateTime || '').slice(0, 16),
          })
        }
        if (seenItemsSummary.length >= 30) break
      }

      if (!smartplaceReviewId) {
        log.warn({
          platformReviewId, foundOnPage,
          ourContentPreview: ourContent.slice(0, 80),
          seenItems: seenItemsSummary.slice(0, 30),
        }, 'naver: SmartPlace reviewId 매핑 실패 — DOM fallback 시도 중')

        // ── v23 DOM fallback: SmartPlace 페이지 안에서 reviewId 스크랩 ──
        try {
          const domIds = await page.evaluate((needle: string) => {
            const out: any[] = []
            // SmartPlace 페이지에는 review.id가 data-* 또는 element.id 속성에 박혀있음
            // 모든 가능한 selector 시도
            document.querySelectorAll('[data-review-id], [data-id], [id^="review_"], [id^="review-"]').forEach((el: any) => {
              const rid = el.getAttribute('data-review-id') || el.getAttribute('data-id') || el.id || ''
              const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)
              if (rid && rid.length > 8) out.push({ rid, txt: txt.slice(0, 60) })
            })
            // 본문에서 24-char hex (mongoDB 형식 reviewId) 모두 추출
            const html = document.documentElement.outerHTML
            const hexRe = /[a-f0-9]{24}/g
            const hexes = Array.from(new Set((html.match(hexRe) || []).slice(0, 30)))
            return { domIds: out.slice(0, 20), hexes, hasContent: html.indexOf(needle) >= 0 }
          }, ourContent.slice(0, 30)).catch(() => ({ domIds: [], hexes: [], hasContent: false }))
          log.info({ domScrape: domIds }, 'naver: DOM fallback scrape result')
          // hexes 중 우리 platformReviewId와 일치 또는 비슷한 것 시도
          const hexes: string[] = (domIds as any).hexes || []
          if (hexes.includes(platformReviewId)) {
            smartplaceReviewId = platformReviewId
            log.info({ smartplaceReviewId }, 'naver: ✅ DOM hex match — platformReviewId is valid SmartPlace id')
          }
        } catch (de: any) {
          log.warn({ err: de?.message }, 'naver: DOM fallback exception')
        }

        if (!smartplaceReviewId) smartplaceReviewId = platformReviewId
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: getReviews 호출 실패 — platformReviewId fallback')
      smartplaceReviewId = platformReviewId
    }

    // 4) GraphQL createReply mutation 호출
    const graphqlUrl = 'https://new.smartplace.naver.com/graphql?opName=createReply'
    const mutationQuery = 'fragment CommonReviewReplyFields on ReviewReply {\n  text\n  isSuspended\n  isQualified\n  createdDateTime\n  updatedDateTime\n  isDeleted\n  useReplyCandidate\n  replierDisplayName\n  suspendPostingReason\n  __typename\n}\n\nmutation createReply($input: CreateReviewReplyInput!) {\n  createReviewReply(input: $input) {\n    reply {\n      ...CommonReviewReplyFields\n      __typename\n    }\n    __typename\n  }\n}\n'

    // v38 silent reject 방지: 답글 텍스트 길이 250자 이내로 자동 truncate
    //   · 271자 발행 성공, 279자 silent reject 확인 → 250자 안전선
    //   · 길면 ... 으로 자른 후 마지막 한글 어절 단위로 정리
    const MAX_REPLY_LEN = 250
    let finalReplyText = replyText
    if (replyText.length > MAX_REPLY_LEN) {
      let cut = replyText.slice(0, MAX_REPLY_LEN)
      // 마지막 줄바꿈 또는 마침표/물음표/느낌표 위치로 자르기 (어절 깔끔 보존)
      const lastNewline = cut.lastIndexOf('\n')
      const lastDot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'))
      const lastSpace = cut.lastIndexOf(' ')
      const cutAt = Math.max(lastNewline, lastDot, lastSpace)
      if (cutAt > MAX_REPLY_LEN * 0.7) cut = cut.slice(0, cutAt + 1)
      finalReplyText = cut.trim()
      log.warn({
        original_len: replyText.length,
        truncated_len: finalReplyText.length,
        platformReviewId,
      }, 'naver: ⚠️ 답글 250자 초과 → 자동 truncate (silent reject 방지)')
    }

    log.info({
      ourReviewId: platformReviewId,
      smartplaceReviewId,
      mapped: smartplaceReviewId !== platformReviewId,
      placeId: storeId, textLen: finalReplyText.length,
      textPreview: finalReplyText.slice(0, 50),
    }, 'naver: 🚀 calling SmartPlace GraphQL createReply (v28 in-page fetch)')

    // ── v35: SPA prerequisite query 시뮬 (createReply 전에 me/persona 활성화) ──
    // 네이버가 sequential GraphQL flow (me → persona → candidates → createReply) 를 기대할 가능성
    // 답글 발행 직전에 brief query 로 server-side session context 활성화
    try {
      const bidInt = bookingBusinessId ? parseInt(bookingBusinessId, 10) : undefined
      const prereqResults = await page.evaluate(async ({ placeId, bookingBusinessId }: any) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'from-system': 'smartplace',
          'x-requested-with': 'XMLHttpRequest',
          'apollographql-client-name': 'smartplace-web',
          'apollographql-client-version': '1.0.0',
        }
        const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
        if (csrfMatch && csrfMatch[1]) headers['x-csrf-token'] = csrfMatch[1]

        const callOp = async (opName: string, body: string) => {
          try {
            const r = await fetch('https://new.smartplace.naver.com/graphql?opName=' + opName, {
              method: 'POST', headers, body, credentials: 'include',
            })
            const t = await r.text()
            return { op: opName, status: r.status, preview: t.slice(0, 200) }
          } catch (e: any) { return { op: opName, status: 0, err: String(e?.message || e) } }
        }
        // 1) me query — 사용자 컨텍스트 활성화
        const meRes = await callOp('me', JSON.stringify({
          operationName: 'me',
          variables: {},
          query: 'query me { me { id name email __typename } }',
        }))
        // 2) PlaceReviewPersona — 매장 답글 페르소나 컨텍스트 활성화
        const personaRes = await callOp('PlaceReviewPersona', JSON.stringify({
          operationName: 'PlaceReviewPersona',
          variables: { input: { placeId, bookingBusinessId } },
          query: 'query PlaceReviewPersona($input: PlaceReviewPersonaInput!) { placeReviewPersona(input: $input) { displayName __typename } }',
        }))
        return [meRes, personaRes]
      }, { placeId: storeId, bookingBusinessId: bidInt }).catch((e: any) => [{ err: e?.message }])
      log.info({ prereqResults }, 'naver: v35 SPA prereq queries 실행')
      await page.waitForTimeout(1500)  // server-side session context 활성화 대기
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: v35 prereq queries 실패 (계속 진행)')
    }

    // ── v28 핵심 변경: GraphQL 호출을 page.evaluate 안에서 실행 ──
    // 브라우저 컨텍스트 사용 → 자동 cookies + same-origin + 추가 CSRF/auth token 자동 포함
    // 외부 fetch 로는 SmartPlace 가 빠진 토큰을 검증하여 FORBIDDEN 반환했음
    //
    // 추가: SmartPlace SPA 가 placeSeq/bookingBusinessId 를 SPA state 에 로드하도록
    // 매장 카드 클릭하여 정상 URL 로 redirect 시킨 후 호출
    // v31: v28 의 page.goto 가 bookingBusinessId 없는 URL 로 덮어쓰던 버그 수정
    //      이미 v29 단계에서 정확한 URL (`?bookingBusinessId=...&menu=visitor`) 로 이동 완료
    //      → 추가 navigation 불필요. 현재 URL 만 로깅하여 검증
    log.info({
      urlBeforeGraphQL: page.url().slice(0, 200),
      hasBookingBusinessIdInUrl: page.url().includes('bookingBusinessId='),
    }, 'naver: v31 GraphQL 직전 URL 검증 (bookingBusinessId 유지 확인)')

    const t0 = Date.now()
    // page.evaluate 안에서 fetch — 브라우저가 자동 cookies + headers + CSRF 처리
    // v36: input.placeId = 외부 m.place.naver.com placeId (cURL 분석 결과 확정)
    // - 내부 SmartPlace placeId (storeId, 예: 10441797) → URL/referer 용
    // - 외부 placeId (externalPlaceId, 예: 1137287126) → GraphQL input.placeId 용
    // 두 ID 가 다른 매장에서 내부 ID 를 보내면 FORBIDDEN. cURL 검증 완료.
    const inputPlaceId = externalPlaceId || storeId  // 외부 ID 우선, fallback 내부 ID
    const createReplyInput: any = { text: finalReplyText, reviewId: smartplaceReviewId, placeId: inputPlaceId }
    if (bookingBusinessId) {
      const bid = parseInt(bookingBusinessId, 10)
      if (!isNaN(bid)) createReplyInput.bookingBusinessId = bid
    }
    log.info({
      createReplyInput: { ...createReplyInput, text: createReplyInput.text.slice(0, 30) },
      externalPlaceIdUsed: !!externalPlaceId,
      internalPlaceId: storeId,
    }, 'naver: v36 createReply input (외부 placeId 사용)')

    const inPageResult = await page.evaluate(async ({ url, body }: { url: string; body: string }) => {
      try {
        // v34: SPA 가 보내는 추가 헤더 모두 포함 — SmartPlace 가 bot 인지 검증할 때 누락 시 FORBIDDEN
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'from-system': 'smartplace',
          'x-requested-with': 'XMLHttpRequest',
          'apollographql-client-name': 'smartplace-web',
          'apollographql-client-version': '1.0.0',
        }
        // csrf_token cookie 값을 헤더로 별도 전송 (SmartPlace 의 표준 CSRF 검증 패턴)
        const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
        if (csrfMatch && csrfMatch[1]) headers['x-csrf-token'] = csrfMatch[1]
        const r = await fetch(url, { method: 'POST', headers, body, credentials: 'include' })
        const text = await r.text()
        let parsed: any = null
        try { parsed = JSON.parse(text) } catch {}
        return { ok: r.ok, status: r.status, text: text.slice(0, 1500), parsed, sentHeaders: Object.keys(headers) }
      } catch (e: any) {
        return { ok: false, status: 0, text: '', parsed: null, err: String(e?.message || e) }
      }
    }, {
      url: graphqlUrl,
      body: JSON.stringify({
        operationName: 'createReply',
        variables: { input: createReplyInput },
        query: mutationQuery,
      }),
    }).catch((e: any) => ({ ok: false, status: 0, text: '', parsed: null, err: e?.message }))
    const elapsed = Date.now() - t0
    log.info({ status: inPageResult.status, elapsed, textPreview: inPageResult.text.slice(0, 200) }, 'naver: v28 in-page GraphQL response')

    if (!inPageResult.ok && inPageResult.status !== 200) {
      log.error({ inPageResult }, 'naver: v28 in-page fetch 실패 → 외부 fetch 로 fallback')
      // 외부 fetch fallback (이전 v16 동작)
      const res = await fetch(graphqlUrl, {
        method: 'POST', headers: smartplaceHeaders,
        body: JSON.stringify({
          operationName: 'createReply',
          variables: { input: { text: finalReplyText, reviewId: smartplaceReviewId, placeId: storeId } },
          query: mutationQuery,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        return { ok: false, reason: 'SmartPlace GraphQL HTTP ' + res.status + ': ' + errText.slice(0, 100) }
      }
      const fallbackJson: any = await res.json().catch(() => null)
      log.info({ fallbackJsonPreview: JSON.stringify(fallbackJson).slice(0, 400) }, 'naver: v28 fallback fetch 응답')
      // fallback json 으로 진행
      var json: any = fallbackJson
    } else {
      var json: any = inPageResult.parsed
      log.info({ jsonPreview: JSON.stringify(json).slice(0, 400) }, 'naver: GraphQL parsed response')
    }

    if (json?.errors && Array.isArray(json.errors) && json.errors.length > 0) {
      const errMsg = json.errors[0]?.message || JSON.stringify(json.errors[0])
      log.warn({ errors: json.errors.slice(0, 3) }, 'naver: GraphQL returned errors')
      // 권한 관련 에러 → v27: paaron 의 실제 owner 매장 진단
      const errStr = String(errMsg)
      if (errStr.includes('플레이스 권한') || errStr.includes('권한이 없') || errStr.includes('Forbidden') || errStr.includes('Unauthorized')) {
        // ── v27 핵심 진단: NID_AUT 정상인데 placeId 권한 없음 → 잘못된 placeId 매핑
        // SmartPlace /bizes 페이지 방문해서 paaron 의 실제 owner 매장 목록 dump
        let myPlaces: any[] = []
        let bizesPageInfo: any = {}
        try {
          await page.goto('https://new.smartplace.naver.com/bizes', {
            waitUntil: 'domcontentloaded', timeout: 15000,
          }).catch(() => null)
          await page.waitForTimeout(3500)
          const bizesUrl = page.url()
          log.info({ bizesUrl }, 'naver: v27 visited /bizes for owner-place diagnosis')
          // 페이지에서 매장 정보 모두 dump
          bizesPageInfo = await page.evaluate(() => {
            const out: any = { url: location.href, title: document.title, places: [], hexes: [], allText: '' }
            // 매장 카드/링크 추출 (SmartPlace UI 변동 가능성 → 광범위)
            document.querySelectorAll('a[href*="/bizes/"], li[data-place-id], [data-business-id], [data-place-seq]').forEach((el: any) => {
              const href = el.href || ''
              const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
              const placeIdMatch = href.match(/\/bizes\/(?:place\/)?(\d+)/)
              const dataPlaceId = el.getAttribute('data-place-id') || ''
              const dataBizId = el.getAttribute('data-business-id') || ''
              const dataSeq = el.getAttribute('data-place-seq') || ''
              if (placeIdMatch || dataPlaceId || dataBizId || dataSeq) {
                out.places.push({
                  text, href: href.slice(-80),
                  placeId: placeIdMatch?.[1] || dataPlaceId || '',
                  bizId: dataBizId || '',
                  placeSeq: dataSeq || '',
                })
              }
            })
            // 본문 모든 hex (24-char) 추출
            const html = document.documentElement.outerHTML
            const hexRe = /[a-f0-9]{20,30}/g
            out.hexes = Array.from(new Set((html.match(hexRe) || []).slice(0, 20)))
            // 페이지 본문 일부 (매장 이름 포함 가능)
            out.allText = (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 600)
            return out
          }).catch((e: any) => ({ err: e?.message }))
          myPlaces = (bizesPageInfo as any).places || []
          log.info({ bizesPageInfo, ownerPlacesCount: myPlaces.length }, 'naver: v27 paaron 매장 목록 진단')

          // GraphQL 로 owner 매장 직접 조회 시도
          try {
            const myBizQuery = 'query { bizes { items { id placeId placeName placeSeq bookingBusinessId role __typename } } }'
            const altQuery = '{"operationName":"GetMyBizes","query":"query GetMyBizes { bizes(input: {}) { items { id placeId placeName } } }"}'
            const myBizRes = await fetch('https://new.smartplace.naver.com/graphql?opName=GetMyBizes', {
              method: 'POST', headers: smartplaceHeaders,
              body: altQuery,
              signal: AbortSignal.timeout(8000),
            }).catch(() => null)
            if (myBizRes && myBizRes.ok) {
              const myBizText = await myBizRes.text()
              log.info({ myBizPreview: myBizText.slice(0, 500) }, 'naver: v27 GetMyBizes 응답')
            }
          } catch {}
        } catch (e: any) {
          log.warn({ err: e?.message }, 'naver: v27 매장 목록 진단 실패')
        }

        // 진단 결과로 사용자에게 정확한 메시지
        const myPlacesText = myPlaces.length > 0
          ? `이 계정의 owner 매장: ${myPlaces.slice(0, 3).map((p: any) => `${p.text || p.placeId}(${p.placeId || p.placeSeq})`).join(', ')}`
          : '이 계정의 owner 매장이 SmartPlace 에서 발견되지 않음'
        return {
          ok: false,
          reason: `❌ placeId ${storeId} 권한 없음 — NID_AUT 정상 발급됐지만 SmartPlace 가 권한 거부. ${myPlacesText}. DB 의 placeId 가 잘못됐거나, 이 네이버 ID 는 해당 매장의 owner 가 아닙니다 (직원/매니저 계정은 답글 자동등록 불가).`,
        }
      }
      return { ok: false, reason: '네이버 GraphQL 오류: ' + errStr.slice(0, 150) }
    }

    const reply = json?.data?.createReviewReply?.reply
    if (reply && typeof reply.text === 'string' && reply.text.length > 0) {
      log.info({
        replyLen: reply.text.length, replier: reply.replierDisplayName,
        createdAt: reply.createdDateTime, isQualified: reply.isQualified, isSuspended: reply.isSuspended,
      }, 'naver: ✅ 답글 등록 성공 (GraphQL 직접 호출)')

      // 정책 위반 / 부적격 / 정지 체크
      if (reply.isSuspended || reply.suspendPostingReason) {
        log.warn({ reason: reply.suspendPostingReason }, 'naver: 등록됐지만 정지 상태')
        return { ok: false, reason: '답글 정지: ' + (reply.suspendPostingReason || 'suspended') }
      }
      if (reply.isQualified === false) {
        log.warn({ replyer: reply.replierDisplayName }, 'naver: isQualified=false (네이버 부적격 판정)')
        return { ok: false, reason: '네이버 부적격 판정: isQualified=false. 답글 내용/계정 확인 필요' }
      }

      // ⭐ v37: createReply 응답이 명백히 정상이면 SUCCESS 인정 (verify 는 보조 검증)
      // - reply.text 존재 + isQualified:true + isSuspended:false + isDeleted:false 모두 만족 = 등록 성공
      // - verify 는 m.place.naver.com 인덱싱 지연 + placeId 매핑 차이로 실패할 수 있음 → false negative 방지
      const replyResponseValid =
        reply &&
        typeof reply.text === 'string' && reply.text.length > 0 &&
        reply.isQualified !== false &&
        !reply.isSuspended &&
        !reply.isDeleted
      if (replyResponseValid) {
        log.info({
          replyLen: reply.text.length,
          replier: reply.replierDisplayName,
          createdAt: reply.createdDateTime,
        }, 'naver: ✅ 답글 등록 성공 — createReply 응답 검증값 정상 (verify 생략)')
        // 비동기로 verify 시도 (성공 여부와 무관) — 통계/모니터링 목적
        ;(async () => {
          await new Promise((r) => setTimeout(r, 5000))
          const placeIdForVerify = externalPlaceId || storeId
          const v1 = await verifyReplyByGraphQL(placeIdForVerify, platformReviewId, log).catch(() => false)
          if (v1) {
            log.info('naver: ✅ verify 통과 — 답글 인덱싱 확인')
          } else {
            log.info({ placeIdForVerify }, 'naver: verify 미통과 (인덱싱 지연 가능 — 답글 자체는 등록됨)')
          }
        })().catch(() => null)
        return { ok: true }
      }

      // 응답 자체가 의심스러우면 verify 강제 — 외부 placeId 사용
      log.warn('naver: createReply 응답 검증값 의심 — GraphQL verify 강제 실행')
      const placeIdForVerify = externalPlaceId || storeId
      await new Promise((r) => setTimeout(r, 5000))
      const verified1 = await verifyReplyByGraphQL(placeIdForVerify, platformReviewId, log)
      if (verified1) return { ok: true }
      await new Promise((r) => setTimeout(r, 7000))
      const verified2 = await verifyReplyByGraphQL(placeIdForVerify, platformReviewId, log)
      if (verified2) return { ok: true }

      // 응답값 의심 + verify 둘 다 실패 = 진짜 silent reject
      const respDebug =
        'replier=' + reply.replierDisplayName +
        ' useReplyCandidate=' + reply.useReplyCandidate +
        ' isQualified=' + reply.isQualified +
        ' isSuspended=' + reply.isSuspended +
        ' deleted=' + reply.isDeleted +
        ' textLen=' + reply.text.length
      log.error({ respDebug, jsonPreview: JSON.stringify(json).slice(0, 400) },
        'naver: ❌ 응답 검증 실패 + verify 실패 — 진짜 silent reject')
      return {
        ok: false,
        reason: 'createReply 응답값 의심 + verify 실패. ' + respDebug,
      }
    }

    log.error({ json: JSON.stringify(json).slice(0, 400) }, 'naver: 응답에 reply 없음')
    return { ok: false, reason: '응답에 reply 데이터 없음. preview=' + JSON.stringify(json).slice(0, 200) }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver: GraphQL createReply exception')
    return { ok: false, reason: 'GraphQL 호출 실패: ' + (e?.message || 'unknown') }
  }
}

// ── SmartPlace 내부 API 직접 호출 폴백 ───────────────────────────
async function tryNaverReplyAPI(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const result = await page.evaluate(
      async (args: { storeId: string; reviewId: string; text: string }) => {
        const { storeId, reviewId, text } = args

        // 현재 페이지의 csrf token / 인증 헤더 추출 시도
        const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        const metaToken = document.querySelector('meta[name="_token"]')?.getAttribute('content') || ''

        const baseHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
          'Accept': 'application/json, text/plain, */*',
          'Referer': `https://new.smartplace.naver.com/bizes/place/${storeId}/reviews`,
        }
        if (metaCsrf) baseHeaders['x-csrf-token'] = metaCsrf
        if (metaToken) baseHeaders['x-token'] = metaToken

        // SmartPlace 실제 엔드포인트 후보 (가장 가능성 높은 5개만 — 시간 절약)
        const endpoints = [
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/v1/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/visitor-reviews/${reviewId}/comment`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/v1/bizes/${storeId}/visitor-reviews/${reviewId}/comment`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/owner-reply`, body: { content: text } },
        ]
        const results: string[] = []
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep.url, {
              method: 'POST',
              headers: baseHeaders,
              credentials: 'include',
              body: JSON.stringify(ep.body),
            })
            const bodyText = await res.text().catch(() => '')
            const entry = `${res.status} ${ep.url.replace('https://new.smartplace.naver.com', '')} body=${JSON.stringify(ep.body).slice(0,30)} => ${bodyText.slice(0, 120)}`
            results.push(entry)
            // 200, 201, 204 = 성공
            if (res.status === 200 || res.status === 201 || res.status === 204) {
              return { ok: true, endpoint: ep.url, status: res.status }
            }
          } catch (err: any) {
            results.push(`error ${ep.url} => ${err?.message}`)
          }
        }
        return { ok: false, reason: results.join(' || ') }
      },
      { storeId, reviewId: platformReviewId, text: replyText },
    )
    log.info({ result }, 'naver: internal API result')
    return result as { ok: true } | { ok: false; reason: string }
  } catch (e: any) {
    return { ok: false, reason: `API error: ${e?.message}` }
  }
}
