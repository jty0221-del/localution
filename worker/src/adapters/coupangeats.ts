// worker/src/adapters/coupangeats.ts
// ============================================================
// 32차-2 · CoupangEatsAdapter (store.coupangeats.com)
// ── IP 차단 대응: extra_data.session_cookies 쿠키 세션 방식 우선 ──
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

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
  if (useProxy) {
    // credentials를 URL에 직접 포함 — ERR_PROXY_AUTH_UNSUPPORTED 우회
    const proxyUrl = (proxyUser && proxyPass)
      ? `${proxyProto}://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`
      : `${proxyProto}://${proxyHost}:${proxyPort}`
    contextOptions.proxy = { server: proxyUrl }
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}` }, 'coupangeats: using proxy')
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
    // ── 쿠키 세션으로 리뷰 페이지 직접 접근 ──
    if (savedCookies && savedCookies.length > 0) {
      const reviewsUrl = creds.platform_store_id
        ? `${REVIEWS_BASE_URL}/${creds.platform_store_id}`
        : REVIEWS_BASE_URL
      log.info({ reviewsUrl }, 'coupangeats: trying direct reviews access with saved cookies')
      await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 45000 }).catch(() =>
        page.goto(reviewsUrl, { waitUntil: 'load', timeout: 45000 })
      )
      await page.waitForTimeout(4000)

      const directUrl = page.url()
      // 리뷰 관리 페이지에 실제로 도달했는지 확인 (login/signin/auth 등 리다이렉트 방지)
      const cookieValid = directUrl.includes('/management/reviews') || directUrl.includes('/merchant/management') || directUrl.includes('/merchant/main')
      if (cookieValid) {
        log.info({ directUrl, earlyCaptured: earlyCapture.length }, 'coupangeats: cookie session valid')
        await markLoginStatus(svc, userId, 'coupangeats', 'success')
        if (action === 'health_check') return { status: 'ok', message: 'coupangeats cookie session ok' }
        return await fetchCoupangReviews(page, svc, creds, userId, action, payload, log, earlyCapture, earlyCaptureUrls, allRequestUrls, allJsonUrls)
      }
      log.warn('coupangeats: saved cookies expired, falling back to login')
    }

    // ── 폼 로그인 (쿠키 없거나 만료) ──
    log.info('coupangeats: attempting form login')
    await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 45000 })
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
    return await fetchCoupangReviews(page, svc, creds, userId, action, payload, log, earlyCapture, earlyCaptureUrls, allRequestUrls, allJsonUrls)
  } catch (e: any) {
    log.error({ err: e?.message }, 'coupangeats error')
    return { status: 'failed', message: `coupangeats: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

async function fetchCoupangReviews(
  page: any,
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
): Promise<JobResult> {
  const reviewsUrl = creds.platform_store_id
    ? `${REVIEWS_BASE_URL}/${creds.platform_store_id}`
    : REVIEWS_BASE_URL

  // ── 네트워크 인터셉트: earlyCapture 배열을 그대로 사용 (같은 참조 → 리스너가 계속 push) ──
  const capturedReviews = earlyCapture       // 같은 배열 참조 (리스너 push 반영됨)
  const capturedUrls = earlyCaptureUrls      // 같은 배열 참조

  const alreadyOnReviews = page.url().includes('/review')
  log.info({ reviewsUrl, alreadyOnReviews, earlyCaptured: capturedReviews.length }, 'coupangeats: fetchCoupangReviews entry')

  // ── 리뷰 관리 페이지로 이동 (네트워크 인터셉트 + 자연 API 호출 유도) ──
  if (!alreadyOnReviews) {
    log.info({ reviewsUrl }, 'coupangeats: navigating to reviews page for natural API capture')
    try {
      await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
        page.goto(reviewsUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
      )
      await page.waitForTimeout(4000)   // 자연 API 호출이 완료될 때까지 대기
      log.info({ url: page.url(), capturedSoFar: capturedReviews.length }, 'coupangeats: reviews page loaded')
    } catch (navErr: any) {
      log.warn({ err: navErr?.message }, 'coupangeats: reviews navigation failed, trying direct API')
    }
  }

  // ── 페이지 상호작용으로 리뷰 API 자연 유도 ──
  await closeAllModals(page, log)
  try {
    // 검색/조회 버튼 클릭으로 리뷰 목록 트리거
    const triggerSelectors = [
      'button:has-text("조회")', 'button:has-text("검색")', 'button:has-text("불러오기")',
      '[class*="search-btn"]', '[class*="filter"] button', 'button[class*="submit"]',
    ]
    for (const sel of triggerSelectors) {
      const btn = page.locator(sel).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        log.info({ sel }, 'coupangeats: clicked trigger button')
        await page.waitForTimeout(2000)
        break
      }
    }
  } catch (_) { /* ignore */ }
  await page.waitForTimeout(1000)

  const storeId = creds.platform_store_id || '738438'
  log.info({ storeId, naturalCaptured: capturedReviews.length }, 'coupangeats: calling review API via page.evaluate')

  // 전체 리뷰 페이지네이션 수집 (최대 500개)
  // 실제 확인된 API: /api/v1/merchant/reviews/search?storeId=738438&page=1&statusType=EXPOSE&size=5
  const evalResult: { reviews: any[]; rawBodySample: string; errors: string[] } = await page.evaluate(async (sid: string) => {
    // CSRF 토큰 추출 시도 (다양한 패턴)
    const csrfToken: string = (window as any).__CSRF_TOKEN__
      || (window as any).__csrf_token__
      || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      || document.querySelector('meta[name="_csrf"]')?.getAttribute('content')
      || document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.split('=')[1]
      || ''
    // 커스텀 헤더 최소화 — X-Requested-With 등이 봇탐지 트리거할 수 있음
    const hdrs: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken, 'X-XSRF-TOKEN': csrfToken } : {}),
    }

    function extractArr(body: any): any[] {
      if (Array.isArray(body)) return body
      // Spring Page 구조: { content: [...], totalPages: N }
      if (Array.isArray(body?.content)) return body.content
      if (Array.isArray(body?.data?.content)) return body.data.content
      // 기타 구조
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

    // 세션 유효성 확인
    let whoami: any = null
    try {
      const wRes = await fetch('/api/v1/merchant/whoami', { credentials: 'include' })
      if (wRes.ok) whoami = await wRes.json().catch(() => null)
    } catch (_) { /* ignore */ }

    const collected: any[] = []
    const seenIds = new Set<string>()
    let rawBodySample = whoami ? JSON.stringify(whoami).slice(0, 200) : '(whoami failed)'
    const errors: string[] = []

    // statusType 시도 순서: EXPOSE (실제 확인됨), UNEXPOSE, REPORTED
    const statusTypes = ['EXPOSE', 'UNEXPOSE', 'REPORTED']

    for (const statusType of statusTypes) {
      let pageNum = 1
      let hasMore = true
      while (hasMore && collected.length < 500) {
        try {
          const url = `/api/v1/merchant/reviews/search?storeId=${sid}&page=${pageNum}&statusType=${statusType}&size=100`
          const res = await fetch(url, { credentials: 'include', headers: hdrs })
          if (!res.ok) {
            let errBody = ''
            try { errBody = JSON.stringify(await res.json()) } catch (eb) { try { errBody = await res.text() } catch (et) { errBody = '(no body)' } }
            errors.push(`${statusType} p${pageNum}: HTTP ${res.status} ${errBody.slice(0, 150)}`)
            if (!rawBodySample) rawBodySample = `HTTP${res.status}: ${errBody.slice(0, 300)}`
            hasMore = false; break
          }
          const body = await res.json().catch(() => null)
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

    return { reviews: collected, rawBodySample, errors }
  }, storeId)

  const allApiReviews = evalResult.reviews || []
  log.info({
    storeId,
    count: allApiReviews.length,
    rawBodySample: evalResult.rawBodySample,
    errors: evalResult.errors,
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
      rawBodySample: evalResult.rawBodySample || '(empty)',
      apiErrors: evalResult.errors,
      capturedUrls,
      capturedCount: capturedReviews.length,
      storeId,
      currentUrl: page.url(),
      allJsonUrls: allJsonUrls.slice(0, 30),
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
