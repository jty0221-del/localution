// worker/src/adapters/naver.ts
// ============================================================
// 41차-14 · NaverAdapter — 쿠키 주입 우선 + 폼 로그인 폴백
//   · platform_credentials.session_cookies (JSON) 가 있으면
//     Playwright context 에 쿠키를 주입해 로그인 폼 우회
//   · 쿠키 없으면 폼 로그인 시도 (Railway IP 차단 가능)
//   · 로그인 성공 후 쿠키 자동 저장 → 다음 번 폼 로그인 불필요
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const SMARTPLACE_BASE = 'https://smartplace.naver.com'
const SMARTPLACE_REVIEW_PATH = '/place/review'
const NAVER_HOME = 'https://www.naver.com'

const DOM_SELECTORS = {
  idInput:  '#id, input[name="id"]',
  pwInput:  '#pw, input[name="pw"], input[type="password"]',
  loginBtn: '#log\\.login, .btn_login, button[type="submit"]',
  userMenu: '.MyView-module__btn_user, [class*="btn_user"], .gnb_name, .link_login',
  reviewCard:   '[data-review-id], .review-item, [class*="ReviewItem"]',
  replyButton:  'button[data-type="reply"], button:has-text("답글 달기"), button:has-text("답글"), [class*="btn_reply"]',
  replyTextarea:'textarea[placeholder*="답글"], textarea[class*="reply"], .reply_write textarea',
  replySubmit:  'button:has-text("등록"), button[type="submit"][class*="reply"], [class*="btn_submit"]',
  ownerReply:   '[class*="OwnerReply"], [class*="owner_reply"], [class*="StoreReply"]',
}

export type NaverOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
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

  let creds: Awaited<ReturnType<typeof loadPlainCredentials>>
  try {
    creds = await loadPlainCredentials(svc, userId, 'naver_place')
  } catch (e: any) {
    return { status: 'failed', message: `naver credentials: ${e?.message}` }
  }

  // session_cookies 파싱 (extra_data 필드)
  let savedCookies: any[] | null = null
  try {
    const raw = (creds as any).session_cookies || (creds as any).extra_data?.session_cookies
    if (raw) savedCookies = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch { savedCookies = null }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    // ── 1) 쿠키 주입 로그인 (우선) ─────────────────────────────
    let loginOk = false

    if (savedCookies && savedCookies.length > 0) {
      log.info({ count: savedCookies.length }, 'naver: injecting saved cookies')
      await context.addCookies(savedCookies)
      // SmartPlace 접근으로 로그인 유효성 검증
      await page.goto('https://smartplace.naver.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)
      const spUrl = page.url()
      if (!spUrl.includes('nid.naver.com') && !spUrl.includes('login')) {
        log.info({ url: spUrl }, 'naver: cookie login OK')
        loginOk = true
        await markLoginStatus(svc, userId, 'naver_place', 'success')
      } else {
        log.warn({ url: spUrl }, 'naver: saved cookies expired, trying form login')
      }
    }

    // ── 2) 폼 로그인 폴백 ───────────────────────────────────────
    if (!loginOk) {
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1500)

      // ID 입력 — page.fill() 사용 (이벤트 트리거 포함)
      const idEl = page.locator(DOM_SELECTORS.idInput).first()
      if (await idEl.count() === 0) {
        await dumpPageDiagnostics(page, log, 'naver-no-id-input')
        return { status: 'failed', message: 'naver: 로그인 폼 id 입력란을 찾을 수 없음' }
      }
      await idEl.click()
      await page.keyboard.type(creds.account_id, { delay: 120 })
      await page.waitForTimeout(500)

      const pwEl = page.locator(DOM_SELECTORS.pwInput).first()
      if (await pwEl.count() === 0) return { status: 'failed', message: 'naver: pw 입력란 없음' }
      await pwEl.click()
      await page.keyboard.type(creds.password, { delay: 120 })
      await page.waitForTimeout(500)

      // Enter 키로 제출 (버튼 클릭보다 안정적)
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => null),
        page.keyboard.press('Enter'),
      ])
      await page.waitForTimeout(3000)

      const urlAfterLogin = page.url()
      log.info({ url: urlAfterLogin }, 'naver: after form login')

      if (urlAfterLogin.includes('captcha') || urlAfterLogin.includes('challenge')) {
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        return { status: 'failed', message: 'naver: 캡차 발생 — SmartPlace에서 수동 로그인 후 쿠키를 등록해주세요' }
      }

      if (urlAfterLogin.includes('nidlogin') || urlAfterLogin.includes('login') || urlAfterLogin.includes('signin')) {
        // 에러 텍스트 추출
        const errText = await page.evaluate(() => {
          const el = document.querySelector('.error_message, .msg_error, [class*="error"], #err_common')
          return el?.textContent?.trim() || ''
        })
        await dumpPageDiagnostics(page, log, 'naver-login-failed')
        const reason = errText || 'stayed on login page — IP 차단 또는 자격증명 오류 가능성'
        await markLoginStatus(svc, userId, 'naver_place', 'failed', reason)
        return {
          status: 'failed',
          message: `naver login failed: ${reason}\n\n💡 해결: SmartPlace 로그인 후 쿠키를 /my/platforms/naver_place/connect 에서 등록하세요`,
        }
      }

      loginOk = true
      await markLoginStatus(svc, userId, 'naver_place', 'success')

      // 쿠키 저장 (다음 번 폼 로그인 불필요)
      try {
        const cookies = await context.cookies()
        const naverCookies = cookies.filter(c => c.domain.includes('naver.com'))
        await svc.from('platform_credentials')
          .update({ extra_data: { session_cookies: naverCookies } })
          .eq('user_id', userId)
          .eq('platform', 'naver_place')
        log.info({ count: naverCookies.length }, 'naver: cookies saved for next time')
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: failed to save cookies (non-fatal)')
      }
    }

    if (action === 'health_check') return { status: 'ok', message: 'naver login ok' }

    // ── 3) post_reply: SmartPlace 답글 등록 ──────────────────────
    if (!payload?.platform_review_id || !payload?.reply_text) {
      return { status: 'failed', message: 'naver post_reply: platform_review_id / reply_text 누락' }
    }

    const platformReviewId = String(payload.platform_review_id)
    const replyText = String(payload.reply_text)
    const storeId = creds.platform_store_id || opts.storeId

    const result = await postNaverReply(page, storeId, platformReviewId, replyText, log)
    if (result.ok) {
      await svc
        .from('platform_reviews')
        .update({
          has_reply: true,
          reply_content: replyText,
          reply_status: 'submitted',
          reply_submitted_at: new Date().toISOString(),
          reply_error: null,
        })
        .eq('user_id', userId)
        .eq('platform', 'naver_place')
        .eq('platform_review_id', platformReviewId)
      return { status: 'ok', message: `naver: reply posted for ${platformReviewId}` }
    }

    await svc
      .from('platform_reviews')
      .update({ reply_status: 'failed', reply_error: result.reason.slice(0, 200) })
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .eq('platform_review_id', platformReviewId)

    return { status: 'failed', message: `naver reply 실패: ${result.reason}` }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver error')
    return { status: 'failed', message: `naver: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

async function postNaverReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const reviewUrl = storeId && storeId !== 'unknown'
      ? `${SMARTPLACE_BASE}/place/${storeId}${SMARTPLACE_REVIEW_PATH}`
      : `${SMARTPLACE_BASE}${SMARTPLACE_REVIEW_PATH}`

    await page.goto(reviewUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(3000)

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await page.waitForTimeout(600)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    let card = await page.$(`[data-review-id="${platformReviewId}"]`)

    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      for (const c of allCards) {
        const html = await c.evaluate((el: Element) => el.getAttribute('data-id') || el.getAttribute('data-review-id') || '')
        if (html && html.includes(platformReviewId)) { card = c; break }
      }
    }

    if (!card) {
      log.warn({ platformReviewId }, 'naver: card not found in DOM, trying API approach')
      const apiResult = await tryNaverReplyAPI(page, storeId, platformReviewId, replyText, log)
      if (apiResult.ok) return apiResult
      await dumpPageDiagnostics(page, log, `naver-review-not-found-${platformReviewId}`)
      return { ok: false, reason: `review card not found for ${platformReviewId}` }
    }

    const alreadyReplied = await card.$(DOM_SELECTORS.ownerReply)
    if (alreadyReplied) {
      log.info({ platformReviewId }, 'naver: review already has a reply')
      return { ok: true }
    }

    const replyBtn = await card.$(DOM_SELECTORS.replyButton)
    if (!replyBtn) return { ok: false, reason: '답글 버튼 없음' }

    await replyBtn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await replyBtn.click()
    await page.waitForTimeout(1500)

    let textarea = await card.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: '답글 텍스트 영역 없음' }

    await textarea.scrollIntoViewIfNeeded()
    await textarea.click({ clickCount: 3 })
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    let submitBtn = await card.$(DOM_SELECTORS.replySubmit)
    if (!submitBtn) submitBtn = await page.$(DOM_SELECTORS.replySubmit)
    if (!submitBtn) return { ok: false, reason: '등록 버튼 없음' }

    await submitBtn.click()
    await page.waitForTimeout(3000)

    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver postReply error')
    return { ok: false, reason: e?.message || 'unknown error' }
  }
}

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
        const endpoints = [
          `/api2/bizes/${storeId}/reviews/${reviewId}/comment`,
          `/api/v1/bizes/${storeId}/reviews/${reviewId}/reply`,
        ]
        for (const ep of endpoints) {
          try {
            const res = await fetch(`https://smartplace.naver.com${ep}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ content: text }),
            })
            if (res.ok) return { ok: true, endpoint: ep }
          } catch (_) {}
        }
        return { ok: false, reason: 'all API endpoints failed' }
      },
      { storeId, reviewId: platformReviewId, text: replyText },
    )
    log.info({ result }, 'naver: API approach result')
    return result as { ok: true } | { ok: false; reason: string }
  } catch (e: any) {
    return { ok: false, reason: `API approach error: ${e?.message}` }
  }
}
