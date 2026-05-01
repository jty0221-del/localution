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
import { loadPlainCredentials, loadCookieData, markLoginStatus } from '../lib/credentials'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import { handleNaverCaptcha } from '../lib/captcha'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const NEW_SMARTPLACE_BASE = 'https://new.smartplace.naver.com'

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

  const contextOptions: any = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'sec-ch-ua': '"Google Chrome";v="127", "Chromium";v="127", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
  }
  if (useProxy) {
    const proxyUrl = (proxyUser && proxyPass)
      ? `${proxyProto}://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`
      : `${proxyProto}://${proxyHost}:${proxyPort}`
    contextOptions.proxy = { server: proxyUrl }
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}` }, 'naver: using residential proxy')
  } else {
    log.warn('naver: no proxy configured (PROXY_HOST/PORT missing) — Railway IP may be blocked')
  }

  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    // ── 1) ID/PW 폼 로그인 (IPRoyal 프록시 + 2captcha 사용)
    //    쿠키 방식 제거 → 매번 신선한 로그인으로 세션 문제 해결
    log.info({
      hasProxy: useProxy,
      proxyHost: proxyHost || '(없음 — Railway IP 직접)',
      hasTwocaptcha: !!process.env.TWOCAPTCHA_API_KEY,
    }, 'naver: starting fresh form login')
    let loggedIn = false

    // ── 2) 폼 로그인 ─────────────────────────────────────────
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
      await idEl.click({ clickCount: 3 })
      await idEl.type(creds.account_id, { delay: 60 })
      await page.waitForTimeout(300)

      const pwEl = await page.$(DOM_SELECTORS.pwInput)
      if (!pwEl) {
        const msg = 'naver: 로그인 폼 pw 입력란 없음'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      await pwEl.click({ clickCount: 3 })
      await pwEl.type(creds.password, { delay: 60 })
      await page.waitForTimeout(300)

      // 로그인 버튼 클릭 후 URL 변경 대기 (networkidle 대신 URL 변경 감지로 빠르게)
      await page.click(DOM_SELECTORS.loginBtn)
      await page.waitForURL(url => !url.href.includes('nidlogin.login'), { timeout: 20000 }).catch(() => null)
      await page.waitForTimeout(1500)

      const urlAfterLogin = page.url()
      log.info({ url: urlAfterLogin }, 'naver: after form login')

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
        // detectLoginFailure: 실제 에러 텍스트만 감지 (폼 라벨 '비밀번호','아이디'는 제외)
        const { reason } = await detectLoginFailure(page, ['일치하지', '잘못된', '실패', '오류', 'incorrect', 'invalid', '차단', '해외'])
        await dumpPageDiagnostics(page, log, 'naver-login-failed')
        await markLoginStatus(svc, userId, 'naver_place', 'failed', reason || urlAfterLogin)
        const msg = reason
          ? `naver login failed — ${reason}`
          : 'naver login failed — 아이디·비밀번호 오류 또는 Railway IP 차단. PROXY_HOST/PORT 환경변수 설정 또는 아이디·비밀번호 재확인 필요'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      await markLoginStatus(svc, userId, 'naver_place', 'success')
      log.info({ url: urlAfterLogin }, 'naver: form login success')
    }

    if (action === 'health_check') return { status: 'ok', message: 'naver login ok' }

    // ── 3) SmartPlace 답글 등록 ───────────────────────────────────
    const result = await postNaverReply(page, bizId, platformReviewId, replyText, log)
    if (result.ok) {
      await updateReviewStatus(svc, userId, platformReviewId, 'submitted', { replyContent: replyText })
      return { status: 'ok', message: `naver: reply posted for ${platformReviewId}` }
    }

    await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: result.reason })
    return { status: 'failed', message: `naver reply 실패: ${result.reason}` }

  } catch (e: any) {
    log.error({ err: e?.message }, 'naver unhandled error')
    if (platformReviewId) {
      await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: `unhandled: ${e?.message}` }).catch(() => null)
    }
    return { status: 'failed', message: `naver: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

// ── SmartPlace 리뷰 답글 등록 ────────────────────────────────────
async function postNaverReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // ── 항상 SmartPlace API 호출 캡처 (DEBUG_CAPTURE 무관) ──────────
    const capturedApis: string[] = []
    // 실제 리뷰 목록 GET 엔드포인트 자동 포착 (동적 reply URL 구성에 활용)
    let discoveredReviewListPath = ''
    page.on('response', async (resp: any) => {
      try {
        const url = resp.url()
        if (url.includes('smartplace.naver.com') && (url.includes('/api/') || url.includes('/v1/') || url.includes('/v2/'))) {
          const status = resp.status()
          const method = resp.request().method()
          const body = await resp.text().catch(() => '')
          const entry = `${method} ${status} ${url.replace('https://new.smartplace.naver.com', '')} => ${body.slice(0, 150)}`
          capturedApis.push(entry)
          log.info({ url, method, status, bodyPreview: body.slice(0, 200) }, 'naver: SmartPlace API intercepted')
          // GET 200으로 리뷰 목록을 반환하는 엔드포인트 포착
          if (method === 'GET' && status === 200 && !discoveredReviewListPath &&
              (url.includes('review') || url.includes('visitor')) &&
              (url.includes(storeId) || url.includes('/bizes/'))) {
            const pathPart = url.replace('https://new.smartplace.naver.com', '').split('?')[0]
            discoveredReviewListPath = pathPart
            log.info({ discoveredReviewListPath }, 'naver: review list API path discovered')
          }
        }
      } catch {}
    })

    // 1) 스토어 대시보드로 이동 → actualPlaceId 확인
    const dashUrl = storeId && storeId !== 'unknown'
      ? `${NEW_SMARTPLACE_BASE}/bizes/place/${storeId}`
      : `${NEW_SMARTPLACE_BASE}/bizes`

    log.info({ dashUrl, storeId, platformReviewId }, 'naver: navigating to store dashboard first')
    await page.goto(dashUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    let currentUrl = page.url()
    log.info({ url: currentUrl }, 'naver: dashboard loaded')

    if (currentUrl.includes('nid.naver.com') || currentUrl.includes('login')) {
      return { ok: false, reason: 'SmartPlace 대시보드 접근 실패 — 로그인 세션이 유효하지 않습니다. 아이디·비밀번호 확인 후 재시도해주세요.' }
    }

    const placeIdMatch = currentUrl.match(/\/bizes\/place\/(\d+)/)
    const actualPlaceId = placeIdMatch?.[1] || storeId
    log.info({ actualPlaceId, storeId }, 'naver: actual place ID from redirect')

    // 2) 리뷰 페이지로 URL 직접 이동 (탭 클릭 제거 — 오버레이로 인한 60초 지연 방지)
    const reviewsPageUrl = `${NEW_SMARTPLACE_BASE}/bizes/place/${actualPlaceId}/reviews`
    try {
      log.info({ reviewsPageUrl }, 'naver: navigating to reviews page via URL (domcontentloaded)')
      await page.goto(reviewsPageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: reviews navigation error')
    }

    currentUrl = page.url()
    log.info({ url: currentUrl }, 'naver: reviews page loaded')

    if (currentUrl.includes('nid.naver.com') || currentUrl.includes('login')) {
      return { ok: false, reason: 'SmartPlace 리뷰 페이지 접근 실패 — 로그인 세션 만료. 아이디·비밀번호 확인 후 재시도해주세요.' }
    }

    // 4) 모달/오버레이/dimmed 닫기
    try {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(700)

      // dimmed 레이어 처리 (SmartPlace가 페이지 로드 시 표시하는 모달)
      const dimmedSelectors = [
        '.dimmed',
        '[class*="dimmed_"]',
        '[class*="_dimmed"]',
        '[class*="Dimmed"]',
        '[class*="modal_bg"]',
        '[class*="ModalBg"]',
        '[class*="overlay_bg"]',
      ]
      for (const dSel of dimmedSelectors) {
        const dimmedEl = await page.$(dSel)
        if (dimmedEl) {
          log.info({ selector: dSel }, 'naver: found dimmed overlay, clicking to dismiss')
          await dimmedEl.click({ force: true }).catch(() => null)
          await page.waitForTimeout(600)
          break
        }
      }

      const closeBtn = await page.$('button:has-text("닫기")')
        ?? await page.$('button:has-text("확인")')
        ?? await page.$('[aria-label="닫기"]')
        ?? await page.$('[aria-label="close"]')
        ?? await page.$('button[class*="close"]:visible')
        ?? await page.$('button[class*="Close"]:visible')
      if (closeBtn) {
        await closeBtn.click()
        await page.waitForTimeout(600)
        log.info('naver: closed modal via close button')
      }
    } catch {}

    // 5) "답글" 버튼이 DOM에 나타날 때까지 대기 (최대 35초)
    //    Naver SmartPlace는 emotion CSS-in-JS → class selector 무용 → textContent 기반으로 탐색
    let buttonsLoaded = false
    try {
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('button')).some(
          (b: any) => {
            const t = (b.textContent || '').trim()
            return t === '답글 달기' || t === '답글쓰기' || t === '답글 쓰기' || t === '답글 작성' || t.startsWith('답글')
          }
        ),
        { timeout: 35000, polling: 700 },
      )
      buttonsLoaded = true
      log.info('naver: reply buttons appeared in DOM via waitForFunction')
    } catch {
      log.warn('naver: reply buttons not found after 35s — scroll recovery 시도')
      // 스크롤로 lazy load 유발
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 500))
        await page.waitForTimeout(300)
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(800)
      // 스크롤 후 재확인
      try {
        buttonsLoaded = await page.evaluate(() =>
          Array.from(document.querySelectorAll('button')).some(
            (b: any) => (b.textContent || '').includes('답글')
          )
        )
        if (buttonsLoaded) log.info('naver: reply buttons found after scroll recovery')
      } catch {}
    }

    // 5b) waitForFunction 이후 로그인 리다이렉트 재확인
    //     SmartPlace SPA가 reviews API 호출 후 세션 만료 감지 → 로그인 페이지로 리다이렉트
    const urlAfterWait = page.url()
    log.info({ urlAfterWait, buttonsLoaded }, 'naver: URL after waitForFunction')
    if (urlAfterWait.includes('nid.naver.com') || urlAfterWait.includes('login')) {
      return {
        ok: false,
        reason: 'SmartPlace 리뷰 로딩 중 세션 만료 감지 — 로그인 재시도 필요. 프록시 설정 또는 아이디·비밀번호를 확인해주세요.',
      }
    }

    // 6) 페이지 상태 덤프 (항상 실행 — 선택자 튜닝 단서)
    const reviewClasses = await page.evaluate(() => {
      const set = new Set<string>()
      document.querySelectorAll('[class]').forEach((el: Element) => {
        const cls = el.getAttribute('class') || ''
        cls.split(/\s+/).forEach((c: string) => {
          if (c.length > 3 && c.length < 80 &&
            (c.toLowerCase().includes('review') || c.toLowerCase().includes('card') ||
             c.toLowerCase().includes('item') || c.toLowerCase().includes('reply') ||
             c.toLowerCase().includes('single') || c.toLowerCase().includes('write'))) {
            set.add(c)
          }
        })
      })
      return Array.from(set).slice(0, 50)
    }).catch(() => [] as string[])
    log.info({ reviewRelatedClasses: reviewClasses, capturedApiCount: capturedApis.length, recentApis: capturedApis.slice(-5) }, 'naver: page class/api dump')

    // 7) JS 기반 카드 탐색 — CSS 선택자 한계 극복
    //    "답글 달기" 버튼을 포함한 요소를 직접 JavaScript로 탐색
    const replyBtnFound = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'))
      const candidates = allBtns.filter((b: HTMLButtonElement) => {
        const t = (b.textContent || '').trim()
        return t === '답글 달기' || t === '답글쓰기' || t === '답글 쓰기' || t === '답글 작성' || t === '답글'
      })
      if (candidates.length > 0) {
        return { found: true, count: candidates.length, texts: candidates.map((b: HTMLButtonElement) => (b.textContent || '').trim()) }
      }
      return { found: false, count: 0, texts: [] }
    }).catch(() => ({ found: false, count: 0, texts: [] }))
    log.info({ replyBtnFound }, 'naver: JS reply button search')

    // JS로 "답글" 버튼 발견 시 바로 클릭
    if (replyBtnFound.found) {
      const directBtn = await page.$('button:has-text("답글 달기")')
        ?? await page.$('button:has-text("답글쓰기")')
        ?? await page.$('button:has-text("답글 쓰기")')
        ?? await page.$('button:has-text("답글 작성")')
        ?? await page.$('button:has-text("답글")')
      if (directBtn) {
        log.info('naver: clicking reply button found via JS search')
        await directBtn.scrollIntoViewIfNeeded()
        await page.waitForTimeout(400)
        await directBtn.click()
        await page.waitForTimeout(1500)

        let textarea = await page.$(DOM_SELECTORS.replyTextarea)
        if (!textarea) {
          // textarea가 다른 위치에 나타날 수도 있음
          await page.waitForTimeout(1000)
          textarea = await page.$(DOM_SELECTORS.replyTextarea)
        }
        if (textarea) {
          await textarea.scrollIntoViewIfNeeded()
          await textarea.click({ clickCount: 3 })
          await textarea.fill(replyText)
          await page.waitForTimeout(600)
          const submitBtn = await page.$('button:has-text("등록")')
            ?? await page.$('button:has-text("완료")')
            ?? await page.$('button:has-text("저장")')
          if (submitBtn) {
            await submitBtn.click()
            await page.waitForTimeout(3000)
            log.info({ platformReviewId }, 'naver: reply submitted via JS button search')
            return { ok: true }
          }
          return { ok: false, reason: '등록 버튼 없음 (JS 버튼 방식)' }
        }
        return { ok: false, reason: 'textarea 없음 (JS 버튼 방식)' }
      }
    }

    // 8) CSS 선택자로 카드 찾기 (기존 방식)
    let card = await page.$(`[data-review-id="${platformReviewId}"]`)
    log.info({ foundByAttr: !!card }, 'naver: data-review-id attribute search')

    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      log.info({ totalCards: allCards.length }, 'naver: total review cards found')
      for (const c of allCards) {
        const attrId = await c.evaluate((el: Element) =>
          el.getAttribute('data-id') || el.getAttribute('data-review-id') || el.getAttribute('data-key') || ''
        )
        if (attrId && attrId.includes(platformReviewId)) { card = c; break }
      }
    }

    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      if (allCards.length === 1) {
        card = allCards[0]
        log.info('naver: using single card (only one visible)')
      } else if (allCards.length > 1) {
        for (const c of allCards) {
          const hasReply = await c.$(DOM_SELECTORS.ownerReply)
          if (!hasReply) { card = c; break }
        }
        if (card) log.info('naver: using first unanswered card')
      }
    }

    // 9) 카드 못 찾음 → 마지막 폴백
    if (!card) {
      log.warn({ url: page.url(), capturedApis: capturedApis.slice(-5) }, 'naver: card not found by any selector')
      await dumpPageDiagnostics(page, log, `naver-no-card-${platformReviewId}`)

      // 발견된 리뷰 API 경로로 동적 POST 시도
      if (discoveredReviewListPath) {
        log.info({ discoveredReviewListPath }, 'naver: trying dynamic reply endpoint from captured GET')
        const dynamicResult = await page.evaluate(
          async (args: { basePath: string; reviewId: string; text: string }) => {
            const candidates = [
              `https://new.smartplace.naver.com${args.basePath}/${args.reviewId}/reply`,
              `https://new.smartplace.naver.com${args.basePath}/${args.reviewId}/comment`,
              `https://new.smartplace.naver.com${args.basePath}/${args.reviewId}/owner-reply`,
            ]
            for (const url of candidates) {
              try {
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
                  credentials: 'include',
                  body: JSON.stringify({ content: args.text }),
                })
                if (res.status === 200 || res.status === 201 || res.status === 204) {
                  return { ok: true, url, status: res.status }
                }
              } catch {}
            }
            return { ok: false }
          },
          { basePath: discoveredReviewListPath, reviewId: platformReviewId, text: replyText },
        ).catch(() => ({ ok: false }))
        if ((dynamicResult as any).ok) {
          log.info({ dynamicResult }, 'naver: reply posted via dynamic API endpoint')
          return { ok: true }
        }
      }

      return { ok: false, reason: `review card not found (url: ${page.url()}, discoveredApi: ${discoveredReviewListPath}, classes: ${reviewClasses.slice(0, 5).join(',')})` }
    }

    // 10) 카드 내 버튼 디버그
    try {
      const cardBtns = await card.$$('button')
      const btnTexts = await Promise.all(cardBtns.map((b: any) => b.innerText().catch(() => '')))
      log.info({ btnTexts: btnTexts.slice(0, 10) }, 'naver: buttons in card')
    } catch {}

    // 이미 답글 있으면 스킵
    const alreadyReplied = await card.$(DOM_SELECTORS.ownerReply)
      ?? await card.$('[class*="reply"]:not(button), [class*="Reply"]:not(button), [class*="owner"]:not(button)')
    if (alreadyReplied) {
      log.info({ platformReviewId }, 'naver: already replied — skip')
      return { ok: true }
    }

    // 답글 달기 버튼
    const replyBtn = await card.$('button:has-text("답글 달기")')
      ?? await card.$('button:has-text("답글 쓰기")')
      ?? await card.$('button:has-text("답글쓰기")')
      ?? await card.$('button:has-text("답글 작성")')
      ?? await card.$('button:has-text("답글 수정")')
      ?? await card.$('button:has-text("답글")')
      ?? await card.$(DOM_SELECTORS.replyButton)
      ?? await page.$('button:has-text("답글 달기")')
      ?? await page.$('button:has-text("답글 쓰기")')
      ?? await page.$('button:has-text("답글")')
    log.info({ foundReplyBtn: !!replyBtn }, 'naver: reply button search result')
    if (!replyBtn) return { ok: false, reason: '답글 버튼 없음 (SmartPlace DOM 변경 가능)' }
    await replyBtn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await replyBtn.click()
    await page.waitForTimeout(1500)

    let textarea = await card.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: '답글 입력란 없음' }
    await textarea.scrollIntoViewIfNeeded()
    await textarea.click({ clickCount: 3 })
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    let submitBtn = await card.$(DOM_SELECTORS.replySubmit)
    if (!submitBtn) submitBtn = await page.$('button:has-text("등록"), button:has-text("완료"), button:has-text("저장")')
    if (!submitBtn) return { ok: false, reason: '등록 버튼 없음' }
    await submitBtn.click()
    await page.waitForTimeout(3000)

    log.info({ platformReviewId }, 'naver: reply submitted')
    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver postReply error')
    return { ok: false, reason: e?.message || 'unknown' }
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
