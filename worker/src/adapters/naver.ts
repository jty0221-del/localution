// worker/src/adapters/naver.ts
// ============================================================
// 41차-10 · NaverAdapter — SmartPlace 사장님 답글 자동 등록
// 41차-14 · 쿠키 주입 우선 (Railway IP 차단 우회)
// 41차-15 · loadPlainCredentials 에서 session_cookies 포함
//
//   인증 순서:
//     1) platform_credentials.extra_data.session_cookies 주입
//     2) 폼 로그인 fallback (클라우드 IP 에서는 실패 가능)
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const SMARTPLACE_BASE = 'https://smartplace.naver.com'

const DOM_SELECTORS = {
  idInput:  'input#id, input[name="id"], input[placeholder*="\uC544\uC774\uB514"]',
  pwInput:  'input#pw, input[name="pw"], input[type="password"]',
  replyButton:  'button[data-type="reply"], button:has-text("\uB2F5\uAE00 \uB2EC\uAE30"), button:has-text("\uB2F5\uAE00"), [class*="btn_reply"]',
  replyTextarea: 'textarea[placeholder*="\uB2F5\uAE00"], textarea[class*="reply"], .reply_write textarea',
  replySubmit:  'button:has-text("\uB4F1\uB85D"), button[type="submit"][class*="reply"], [class*="btn_submit"]',
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
  const { userId, storeId, browser, log } = opts

  if (action !== 'post_reply' && action !== 'health_check') {
    return { status: 'skipped', message: `naver: action ${action} — \uB9AC\uBDF0 \uC218\uC9D1\uC740 Vercel /api/place/reviews/fetch \uC0AC\uC6A9` }
  }

  const svc = getServiceClient()

  let creds: Awaited<ReturnType<typeof loadPlainCredentials>>
  try {
    creds = await loadPlainCredentials(svc, userId, 'naver_place')
  } catch (e: any) {
    return { status: 'failed', message: `naver credentials: ${e?.message}` }
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    let loginOk = false

    // ── 1) \uC138\uC158 \uCFE0\uD0A4 \uC8FC\uC785 (Railway IP \uCC28\uB2E8 \uC6B0\uD68C) ─────────────────────────────────
    const savedCookies = creds.session_cookies
    if (savedCookies && Array.isArray(savedCookies) && savedCookies.length > 0) {
      log.info({ count: savedCookies.length }, 'naver: cookie injection attempt')
      try {
        await context.addCookies(savedCookies)
        await page.goto(SMARTPLACE_BASE, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(2000)
        const spUrl = page.url()
        log.info({ url: spUrl }, 'naver: after cookie inject')
        if (!spUrl.includes('nid.naver.com') && !spUrl.includes('/login')) {
          loginOk = true
          log.info('naver: cookie injection LOGIN OK')
          await markLoginStatus(svc, userId, 'naver_place', 'success', 'cookie_inject')
        } else {
          log.warn('naver: cookie injection failed — redirected to login, cookies may be expired')
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie injection exception')
      }
    }

    // ── 2) \uD3FC \uB85C\uADF8\uC778 fallback ────────────────────────────────────────────
    if (!loginOk) {
      if (!creds.account_id || !creds.password) {
        return {
          status: 'failed',
          message: 'naver: \uC138\uC158 \uCFE0\uD0A4\uAC00 \uB9CC\uB8CC\uB429\uB2C8\uB2E4. /my/platforms/naver_place/connect \uC5D0\uC11C \uCFE0\uD0A4\uB97C \uB2E4\uC2DC \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.',
        }
      }

      log.info('naver: trying form login fallback')
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)

      const idEl = await page.$(DOM_SELECTORS.idInput)
      if (!idEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-id-input')
        return { status: 'failed', message: 'naver: \uB85C\uADF8\uC778 \uD3FC id \uC785\uB825\uB780 \uC5C6\uC74C' }
      }
      await idEl.click({ clickCount: 3 })
      await page.keyboard.type(creds.account_id, { delay: 120 })
      await page.waitForTimeout(400)

      const pwEl = await page.$(DOM_SELECTORS.pwInput)
      if (!pwEl) return { status: 'failed', message: 'naver: \uB85C\uADF8\uC778 \uD3FC pw \uC785\uB825\uB780 \uC5C6\uC74C' }
      await pwEl.click({ clickCount: 3 })
      await page.keyboard.type(creds.password, { delay: 120 })
      await page.waitForTimeout(400)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3500)

      const urlAfterLogin = page.url()
      log.info({ url: urlAfterLogin }, 'naver: after form login')

      if (urlAfterLogin.includes('nid.naver.com') || urlAfterLogin.includes('/login')) {
        const bodyText = await page.textContent('body').catch(() => '')
        const reason = detectLoginFailure(bodyText || '')
        await markLoginStatus(svc, userId, 'naver_place', 'failed', reason || 'form_login_blocked')
        return {
          status: 'failed',
          message: `naver: \uB85C\uADF8\uC778 \uC2E4\uD328 (${reason || 'IP\uCC28\uB2E8/\uCE90\uCC28'}). /my/platforms/naver_place/connect \uC5D0\uC11C \uC138\uC158 \uCFE0\uD0A4\uB97C \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.`,
        }
      }

      loginOk = true
      await markLoginStatus(svc, userId, 'naver_place', 'success', 'form_login')

      // \uC131\uACF5 \uC2DC \uCFE0\uD0A4 \uC800\uC7A5 (\uB2E4\uC74C \uC2E4\uD589 \uC7AC\uC0AC\uC6A9)
      try {
        const cookies = await context.cookies()
        const naverCookies = cookies.filter((c) => c.domain.includes('naver.com'))
        if (naverCookies.length > 0) {
          const { data: existing } = await svc
            .from('platform_credentials')
            .select('extra_data')
            .eq('user_id', userId)
            .eq('platform', 'naver_place')
            .maybeSingle()
          const newExtra = { ...(existing?.extra_data ?? {}), session_cookies: naverCookies }
          await svc.from('platform_credentials')
            .update({ extra_data: newExtra })
            .eq('user_id', userId)
            .eq('platform', 'naver_place')
          log.info({ count: naverCookies.length }, 'naver: session cookies saved for reuse')
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie save failed (non-fatal)')
      }
    }

    // ── health_check ──────────────────────────────────────────────────────
    if (action === 'health_check') {
      return { status: 'ok', message: 'naver: logged in OK' }
    }

    // ── 3) \uB2F5\uAE00 \uB4F1\uB85D (post_reply) ──────────────────────────────────────────────
    const platformReviewId = String(payload?.platform_review_id || '')
    const replyText = String(payload?.reply_text || '').trim()
    if (!platformReviewId) return { status: 'failed', message: 'naver: platform_review_id \uB204\uB77D' }
    if (!replyText) return { status: 'failed', message: 'naver: reply_text \uBE44\uC5B4\uC788\uC74C' }

    const reviewPageUrl = `${SMARTPLACE_BASE}/place/${storeId}/review`
    log.info({ url: reviewPageUrl }, 'naver: navigating to review page')
    await page.goto(reviewPageUrl, { waitUntil: 'networkidle', timeout: 35000 })
    await page.waitForTimeout(2500)

    // \uD574\uB2F9 \uB9AC\uBDF0 \uCE74\uB4DC \uD0D0\uC0C9 + \uC2A4\uD06C\uB864
    let foundReview = await page.$(`[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`)
    if (!foundReview) {
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.scrollBy(0, 700))
        await page.waitForTimeout(700)
        foundReview = await page.$(`[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`)
        if (foundReview) break
      }
    }
    if (!foundReview) {
      await dumpPageDiagnostics(page, log, 'naver-review-not-found')
      return { status: 'failed', message: `naver: review ${platformReviewId} \uC744 \uD398\uC774\uC9C0\uC5D0\uC11C \uCC3E\uC744 \uC218 \uC5C6\uC74C` }
    }

    // \uC774\uBBF8 \uB2F5\uAE00 \uD655\uC778
    const existingReply = await foundReview.$(DOM_SELECTORS.ownerReply)
    if (existingReply) {
      return { status: 'skipped', message: 'naver: \uC774\uBBF8 \uB2F5\uAE00\uC774 \uB2EC\uB9B0 \uB9AC\uBDF0' }
    }

    // \uB2F5\uAE00 \uB2EC\uAE30 \uBC84\uD2BC
    const replyBtn = await foundReview.$(DOM_SELECTORS.replyButton)
    if (!replyBtn) {
      await dumpPageDiagnostics(page, log, 'naver-no-reply-btn')
      return { status: 'failed', message: 'naver: \uB2F5\uAE00 \uB2EC\uAE30 \uBC84\uD2BC \uC5C6\uC74C' }
    }
    await replyBtn.click()
    await page.waitForTimeout(1200)

    // \uD14D\uC2A4\uD2B8 \uC601\uC5ED \uC785\uB825
    const textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) {
      await dumpPageDiagnostics(page, log, 'naver-no-reply-textarea')
      return { status: 'failed', message: 'naver: \uB2F5\uAE00 \uC785\uB825\uCC3D \uC5C6\uC74C' }
    }
    await textarea.click()
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    // \uB4F1\uB85D \uBC84\uD2BC
    const submitBtn = await page.$(DOM_SELECTORS.replySubmit)
    if (!submitBtn) {
      return { status: 'failed', message: 'naver: \uB2F5\uAE00 \uB4F1\uB85D \uBC84\uD2BC \uC5C6\uC74C' }
    }
    await submitBtn.click()
    await page.waitForTimeout(2500)

    // \uACB0\uACFC \uD655\uC778
    const newReply = await foundReview.$(DOM_SELECTORS.ownerReply)
    if (newReply) {
      await svc.from('platform_reviews')
        .update({
          has_reply: true,
          reply_text: replyText,
          reply_status: 'submitted',
          reply_submitted_at: new Date().toISOString(),
          reply_error: null,
        })
        .eq('platform', 'naver_place')
        .eq('platform_review_id', platformReviewId)
        .eq('user_id', userId)
      return { status: 'ok', message: 'naver: \uB2F5\uAE00 \uB4F1\uB85D \uC644\uB8CC' }
    }

    await dumpPageDiagnostics(page, log, 'naver-reply-submit-unknown')
    return { status: 'failed', message: 'naver: \uB4F1\uB85D \uBC84\uD2BC \uD074\uB9AD \uD6C4 \uB2F5\uAE00 \uD655\uC778 \uBD88\uAC00' }

  } finally {
    await context.close()
  }
}
