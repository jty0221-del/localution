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
    contextOptions.proxy = {
      server: `${proxyProto}://${proxyHost}:${proxyPort}`,
      username: proxyUser,
      password: proxyPass,
    }
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}` }, 'naver: using residential proxy')
  } else {
    log.warn('naver: no proxy configured (PROXY_HOST/PORT missing) — Railway IP may be blocked')
  }

  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    // ── 1) 로그인: 세션쿠키 우선 ─────────────────────────────────
    let loggedIn = false

    const cookieJson = await loadCookieData(svc, userId)
    log.info({ hasCookieData: !!cookieJson, cookieDataLen: cookieJson?.length ?? 0 }, 'naver: cookie data from DB')

    if (cookieJson) {
      try {
        const parsed = JSON.parse(cookieJson)
        const cookieList: any[] = []
        const nowSec = Math.floor(Date.now() / 1000) + 86400 * 30

        if (Array.isArray(parsed)) {
          // 배열 형태: [{name,value,domain,...}]
          for (const c of parsed) {
            if (c.name && c.value) {
              cookieList.push({
                name: c.name,
                value: c.value,
                domain: c.domain || '.naver.com',
                path: c.path || '/',
                secure: c.secure !== false,
                httpOnly: c.httpOnly !== false,
                expires: c.expires || nowSec,
              })
            }
          }
        } else if (parsed && typeof parsed === 'object') {
          // 단순 객체: {NID_AUT: '...', NID_SES: '...'}
          if (parsed.NID_AUT) cookieList.push({ name: 'NID_AUT', value: parsed.NID_AUT, domain: '.naver.com', path: '/', secure: true, httpOnly: true, expires: nowSec })
          if (parsed.NID_SES) cookieList.push({ name: 'NID_SES', value: parsed.NID_SES, domain: '.naver.com', path: '/', secure: true, httpOnly: true, expires: nowSec })
        }

        log.info({ cookieCount: cookieList.length, cookieNames: cookieList.map(c => c.name) }, 'naver: cookies prepared')

        if (cookieList.length > 0) {
          await context.addCookies(cookieList)
          // SmartPlace 로 바로 이동해서 로그인 상태 확인 (naver.com은 비로그인도 접근 가능)
          const testUrl = bizId && bizId !== 'unknown'
            ? `${NEW_SMARTPLACE_BASE}/bizes/place/${bizId}`
            : `${NEW_SMARTPLACE_BASE}/bizes`
          log.info({ testUrl }, 'naver: navigating for cookie check')
          await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
          await page.waitForTimeout(2000)
          const checkUrl = page.url()
          log.info({ checkUrl, cookieCount: cookieList.length }, 'naver: cookie login check result')
          if (!checkUrl.includes('nid.naver.com') && !checkUrl.includes('login') && !checkUrl.includes('signin')) {
            loggedIn = true
            log.info('naver: session cookie login OK')
            await markLoginStatus(svc, userId, 'naver_place', 'success')
          } else {
            log.warn({ checkUrl }, 'naver: session cookies INVALID/EXPIRED — SmartPlace redirected to login')
          }
        } else {
          log.warn({ parsedType: typeof parsed }, 'naver: cookie list empty after parsing')
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie handling error')
      }
    } else {
      log.warn('naver: NO cookie data in DB — must save session cookies at /my/platforms/naver_place/session')
    }

    // ── 2) 폼 로그인 폴백 ─────────────────────────────────────────
    if (!loggedIn) {
      log.info('naver: trying form login')
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
      await idEl.type(creds.account_id, { delay: 80 })
      await page.waitForTimeout(400)

      const pwEl = await page.$(DOM_SELECTORS.pwInput)
      if (!pwEl) {
        const msg = 'naver: 로그인 폼 pw 입력란 없음'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      await pwEl.click({ clickCount: 3 })
      await pwEl.type(creds.password, { delay: 80 })
      await page.waitForTimeout(400)

      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => null),
        page.click(DOM_SELECTORS.loginBtn),
      ])
      await page.waitForTimeout(2000)

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
        const msg = `naver: 보안인증 요구 (${urlAfterLogin}) — 세션쿠키를 갱신해주세요`
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
          : 'naver login failed — Railway Tokyo IP 차단 또는 아이디/비밀번호 오류. 세션쿠키를 /my/platforms/naver_place/session 에서 저장하면 자동 해결됩니다'
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
      return { ok: false, reason: '세션 만료 — /my/platforms/naver_place/session 에서 쿠키를 갱신해주세요' }
    }

    const placeIdMatch = currentUrl.match(/\/bizes\/place\/(\d+)/)
    const actualPlaceId = placeIdMatch?.[1] || storeId
    log.info({ actualPlaceId, storeId }, 'naver: actual place ID from redirect')

    // 2) SmartPlace 내부 API 먼저 시도
    log.info({ actualPlaceId, platformReviewId }, 'naver: trying internal API first')
    const apiResult = await tryNaverReplyAPI(page, actualPlaceId, platformReviewId, replyText, log)
    if (apiResult.ok) {
      log.info('naver: reply posted via internal API')
      return apiResult
    }
    log.warn({ reason: (apiResult as any).reason }, 'naver: internal API failed, falling back to DOM')

    // 3) 리뷰 탭으로 이동
    try {
      // 이동 전 ESC로 혹시 있을 모달 닫기
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)

      const reviewTabSelectors = [
        'a[href*="/reviews"]:visible',
        '[class*="LocalNavigationBar"] a:has-text("리뷰")',
        '[class*="nav"] a:has-text("리뷰")',
        'nav a:has-text("리뷰")',
        'a:has-text("리뷰")',
      ]
      let tabClicked = false
      for (const sel of reviewTabSelectors) {
        try {
          const tab = await page.$(sel)
          if (tab) {
            await tab.click()
            // networkidle 대기: 리뷰 목록 XHR 완료까지 기다림
            await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => null)
            await page.waitForTimeout(2000)
            log.info({ sel }, 'naver: clicked reviews nav tab')
            tabClicked = true
            break
          }
        } catch {}
      }
      if (!tabClicked) {
        // 탭 클릭 실패 시 URL 직접 이동 (networkidle 사용)
        const reviewsPageUrl = `${NEW_SMARTPLACE_BASE}/bizes/place/${actualPlaceId}/reviews`
        log.info({ reviewsPageUrl }, 'naver: navigated to reviews page via URL (networkidle)')
        await page.goto(reviewsPageUrl, { waitUntil: 'networkidle', timeout: 40000 })
        await page.waitForTimeout(2000)
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: reviews navigation error')
    }

    currentUrl = page.url()
    log.info({ url: currentUrl }, 'naver: reviews page loaded')

    if (currentUrl.includes('nid.naver.com') || currentUrl.includes('login')) {
      return { ok: false, reason: '세션 만료 — /my/platforms/naver_place/session 에서 쿠키를 갱신해주세요' }
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

    // 5) 리뷰 카드 로딩 대기 (15초 + 스크롤 + 재대기)
    const CARD_WAIT_MS = 15000
    let cardsVisible = false
    try {
      await page.waitForSelector(
        '[class*="Review_single_review"], [class*="single_review"], [class*="ReviewItem"], [data-review-id], [class*="Review_item"], [class*="review_item"]',
        { timeout: CARD_WAIT_MS },
      )
      cardsVisible = true
      log.info('naver: review cards appeared via waitForSelector')
    } catch {
      log.warn('naver: waitForSelector timed out — trying scroll to trigger lazy load')
    }

    // 스크롤로 lazy load 유발 (카드가 보이든 안 보이든 실행)
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await page.waitForTimeout(350)
    }
    await page.waitForTimeout(1000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(800)

    // 스크롤 후 카드가 생겼는지 재확인
    if (!cardsVisible) {
      try {
        await page.waitForSelector(
          '[class*="Review_single_review"], [class*="single_review"], [class*="ReviewItem"], [data-review-id]',
          { timeout: 5000 },
        )
        cardsVisible = true
        log.info('naver: cards appeared after scroll')
      } catch {}
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

      // 두 번째 API 시도 (페이지 로드 후 쿠키가 완전히 설정됐을 수 있음)
      log.info('naver: second API attempt after full page load')
      const apiResult2 = await tryNaverReplyAPI(page, actualPlaceId, platformReviewId, replyText, log)
      if (apiResult2.ok) return apiResult2

      return { ok: false, reason: `review card not found (url: ${page.url()}, classes: ${reviewClasses.slice(0, 5).join(',')})` }
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

        // SmartPlace 실제 엔드포인트 후보 (다양한 body 형식 시도)
        const endpoints = [
          // 새 SmartPlace (new.smartplace.naver.com)
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { replyContent: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/owner-comment`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/v1/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/v2/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          // 구 SmartPlace 도메인
          { url: `https://smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          // place API
          { url: `https://place.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          // owner-reply 변형
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/owner-reply`, body: { content: text } },
          // text 필드 변형
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { comment: text } },
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
