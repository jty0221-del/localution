// worker/src/adapters/naver.ts
// ============================================================
// 41차-15 fix · naver: detectLoginFailure 시그니처 수정 (Page 파라미터)
//   인증 순서:
//     1) platform_credentials.extra_data.session_cookies 쿠키 주입
//     2) 폼 로그인 fallback (한국 서버 이전 전까지 실패 가능)
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { encryptSecret } from '../lib/crypto'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import { verifyReplySubmitted } from '../lib/post-reply-verify'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const SMARTPLACE_BASE = 'https://smartplace.naver.com'

const DOM_SELECTORS = {
  idInput:  'input#id, input[name="id"]',
  pwInput:  'input#pw, input[name="pw"], input[type="password"]',
  replyButton:  'button[data-type="reply"], [class*="btn_reply"]',
  replyTextarea: 'textarea[placeholder*="\uB2F5\uAE00"], textarea[class*="reply"], .reply_write textarea',
  replySubmit:  '[class*="btn_submit"]',
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
    return { status: 'skipped', message: `naver: action ${action} handled by Vercel` }
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

    // ── 1) \uC138\uC158 \uCFE0\uD0A4 \uC8FC\uC785 ─────────────────────────────────────────
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
          log.warn('naver: cookie expired or invalid')
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie inject exception')
      }
    }

    // ── 2) \uD3FC \uB85C\uADF8\uC778 fallback ─────────────────────────────────────────────
    if (!loginOk) {
      if (!creds.account_id || !creds.password) {
        return { status: 'failed', message: 'naver: \uC138\uC158 \uCFE0\uD0A4 \uB9CC\uB8CC. /naver-cookie-setup \uC5D0\uC11C \uC7AC\uB4F1\uB85D \uD544\uC694.' }
      }
      log.info('naver: form login attempt')
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)

      const idEl = await page.$(DOM_SELECTORS.idInput)
      if (!idEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-id-input')
        return { status: 'failed', message: 'naver: id \uC785\uB825\uB780 \uC5C6\uC74C' }
      }
      await idEl.click({ clickCount: 3 })
      await page.keyboard.type(creds.account_id, { delay: 120 })
      await page.waitForTimeout(400)

      const pwEl = await page.$(DOM_SELECTORS.pwInput)
      if (!pwEl) return { status: 'failed', message: 'naver: pw \uC785\uB825\uB780 \uC5C6\uC74C' }
      await pwEl.click({ clickCount: 3 })
      await page.keyboard.type(creds.password, { delay: 120 })
      await page.waitForTimeout(400)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3500)

      const urlAfterLogin = page.url()
      log.info({ url: urlAfterLogin }, 'naver: after form login')

      if (urlAfterLogin.includes('nid.naver.com') || urlAfterLogin.includes('/login')) {
        const result = await detectLoginFailure(page)
        await markLoginStatus(svc, userId, 'naver_place', 'failed', result.reason || 'ip_blocked')
        return {
          status: 'failed',
          message: `naver: \uB85C\uADF8\uC778 \uC2E4\uD328 (${result.reason || 'IP\uCC28\uB2E8'}). /naver-cookie-setup \uC5D0\uC11C \uC138\uC158 \uCFE0\uD0A4 \uB4F1\uB85D \uD544\uC694.`,
        }
      }

      loginOk = true
      await markLoginStatus(svc, userId, 'naver_place', 'success', 'form_login')

      // \uC131\uACF5 \uC2DC \uCFE0\uD0A4 \uC800\uC7A5
      try {
        const cookies = await context.cookies()
        const naverCookies = cookies.filter(c => c.domain.includes('naver.com'))
        if (naverCookies.length > 0) {
          const { data: ex } = await svc.from('platform_credentials').select('extra_data')
            .eq('user_id', userId).eq('platform', 'naver_place').maybeSingle()
          const prevExtra = (ex?.extra_data as any) ?? {}
          const enc = encryptSecret(JSON.stringify(naverCookies))
          const { session_cookies: _drop, ...rest } = prevExtra
          await svc.from('platform_credentials')
            .update({ extra_data: { ...rest, session_cookies_encrypted: enc } })
            .eq('user_id', userId).eq('platform', 'naver_place')
          log.info({ count: naverCookies.length }, 'naver: session cookies saved (encrypted)')
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie save failed (non-fatal)')
      }
    }

    if (action === 'health_check') {
      return { status: 'ok', message: 'naver: logged in OK' }
    }

    // ── 3) \uB2F5\uAE00 \uB4F1\uB85D ─────────────────────────────────────────────────────
    const platformReviewId = String(payload?.platform_review_id || '')
    const replyText = String(payload?.reply_text || '').trim()
    if (!platformReviewId) return { status: 'failed', message: 'naver: platform_review_id \uB204\uB77D' }
    if (!replyText) return { status: 'failed', message: 'naver: reply_text \uBE44\uC5B4\uC788\uC74C' }

    const reviewPageUrl = `${SMARTPLACE_BASE}/place/${storeId}/review`
    log.info({ url: reviewPageUrl }, 'naver: goto review page')
    await page.goto(reviewPageUrl, { waitUntil: 'networkidle', timeout: 35000 })
    await page.waitForTimeout(2500)

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
      return { status: 'failed', message: `naver: review ${platformReviewId} \uCC3E\uC744 \uC218 \uC5C6\uC74C` }
    }

    const existingReply = await foundReview.$(DOM_SELECTORS.ownerReply)
    if (existingReply) return { status: 'skipped', message: 'naver: \uC774\uBBF8 \uB2F5\uAE00 \uC788\uC74C' }

    const replyBtn = await foundReview.$(DOM_SELECTORS.replyButton)
    if (!replyBtn) {
      await dumpPageDiagnostics(page, log, 'naver-no-reply-btn')
      return { status: 'failed', message: 'naver: \uB2F5\uAE00 \uBC84\uD2BC \uC5C6\uC74C' }
    }
    await replyBtn.click()
    await page.waitForTimeout(1200)

    const textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) {
      await dumpPageDiagnostics(page, log, 'naver-no-reply-textarea')
      return { status: 'failed', message: 'naver: \uB2F5\uAE00 \uC785\uB825\uCC3D \uC5C6\uC74C' }
    }
    await textarea.click()
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    const submitBtn = await page.$(DOM_SELECTORS.replySubmit)
    if (!submitBtn) return { status: 'failed', message: 'naver: \uB4F1\uB85D \uBC84\uD2BC \uC5C6\uC74C' }
    await submitBtn.click()

    // 43차-5: 폴링 검증 (textarea 사라짐 + ownerReply 노드 등장)
    const verify = await verifyReplySubmitted(page, {
      textareaSelector: DOM_SELECTORS.replyTextarea,
      successSelector: DOM_SELECTORS.ownerReply,
      timeoutMs: 9000,
    }, log)

    if (verify.ok) {
      await svc.from('platform_reviews').update({
        has_reply: true, reply_text: replyText, reply_status: 'submitted',
        reply_submitted_at: new Date().toISOString(), reply_error: null,
      }).eq('platform', 'naver_place').eq('platform_review_id', platformReviewId).eq('user_id', userId)
      return { status: 'ok', message: 'naver: \uB2F5\uAE00 \uB4F1\uB85D \uC644\uB8CC' }
    }

    await dumpPageDiagnostics(page, log, 'naver-reply-unknown')
    return { status: 'failed', message: `naver: 등록 후 확인 불가 (${verify.reason})` }

  } finally {
    await context.close()
  }
}
