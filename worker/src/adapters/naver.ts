// worker/src/adapters/naver.ts
// ============================================================
// NaverAdapter — SmartPlace 사장님 답글 자동 등록
//   · 로그인 우선순위: 세션쿠키 > 아이디/비밀번호 폼 로그인
//   · 세션쿠키 있으면 IP 차단 우회 (캡차/보안인증 불필요)
//   · bizId 있으면 정확한 리뷰 URL 직접 이동
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, loadCookieData, markLoginStatus } from '../lib/credentials'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const NEW_SMARTPLACE_BASE = 'https://new.smartplace.naver.com'

const DOM_SELECTORS = {
  idInput:   'input#id, input[name="id"], input[placeholder*="아이디"]',
  pwInput:   'input#pw, input[name="pw"], input[type="password"]',
  loginBtn:  '#log\\.login, button[type="submit"], .btn_login',
  reviewCard:    '[class*="ReviewItem"], [class*="review_item"], .review-item, [data-review-id]',
  replyButton:   'button:has-text("답글 달기"), button:has-text("답글"), button[class*="reply"], [class*="btn_reply"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[class*="reply"], .reply_write textarea',
  replySubmit:   'button:has-text("등록"), button:has-text("완료"), [class*="btn_submit"]',
  ownerReply:    '[class*="OwnerReply"], [class*="owner_reply"], [class*="StoreReply"], [class*="reply_owner"]',
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

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    // ── 1) 로그인: 세션쿠키 우선, 없으면 폼 로그인 ─────────────────
    let loggedIn = false

    const cookieJson = await loadCookieData(svc, userId)
    if (cookieJson) {
      try {
        const parsed = JSON.parse(cookieJson)
        const cookieList: any[] = []
        const nowSec = Math.floor(Date.now() / 1000) + 86400 * 30

        if (Array.isArray(parsed)) {
          cookieList.push(...parsed)
        } else if (parsed && (parsed.NID_AUT || parsed.NID_SES)) {
          if (parsed.NID_AUT) {
            cookieList.push({ name: 'NID_AUT', value: parsed.NID_AUT, domain: '.naver.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax', expires: nowSec })
          }
          if (parsed.NID_SES) {
            cookieList.push({ name: 'NID_SES', value: parsed.NID_SES, domain: '.naver.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax', expires: nowSec })
          }
        }

        if (cookieList.length > 0) {
          await context.addCookies(cookieList)
          await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
          await page.waitForTimeout(1500)
          const checkUrl = page.url()
          if (!checkUrl.includes('nid.naver.com') && !checkUrl.includes('login')) {
            loggedIn = true
            log.info({ cookieCount: cookieList.length }, 'naver: session cookie login OK')
            await markLoginStatus(svc, userId, 'naver_place', 'success')
          } else {
            log.warn({ checkUrl }, 'naver: session cookies expired or invalid')
          }
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie parse error')
      }
    }

    // 폼 로그인 폴백
    if (!loggedIn) {
      log.info('naver: falling back to form login')
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)

      const idEl = await page.$(DOM_SELECTORS.idInput)
      if (!idEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-id-input')
        return { status: 'failed', message: 'naver: 로그인 폼 id 입력란을 찾을 수 없음' }
      }
      await idEl.click({ clickCount: 3 })
      await idEl.type(creds.account_id, { delay: 80 })
      await page.waitForTimeout(400)

      const pwEl = await page.$(DOM_SELECTORS.pwInput)
      if (!pwEl) return { status: 'failed', message: 'naver: 로그인 폼 pw 입력란을 찾을 수 없음' }
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
        await dumpPageDiagnostics(page, log, 'naver-captcha')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        return { status: 'failed', message: 'naver: 캡차 발생 — /my/platforms/naver_place/session 에서 세션쿠키를 저장하면 자동 해결됩니다' }
      }

      if (urlAfterLogin.includes('user2/help') || urlAfterLogin.includes('security') || urlAfterLogin.includes('verify')) {
        await dumpPageDiagnostics(page, log, 'naver-security')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        return { status: 'failed', message: 'naver: 보안인증 요구 — /my/platforms/naver_place/session 에서 세션쿠키를 저장해주세요' }
      }

      if (urlAfterLogin.includes('nid.naver.com') || urlAfterLogin.includes('login') || urlAfterLogin.includes('signin')) {
        const { reason } = await detectLoginFailure(page)
        await dumpPageDiagnostics(page, log, 'naver-login-failed')
        await markLoginStatus(svc, userId, 'naver_place', 'failed', reason || urlAfterLogin)
        return { status: 'failed', message: `naver login failed — ${reason || '아이디/비밀번호 오류 또는 세션쿠키 설정 필요'}` }
      }

      await markLoginStatus(svc, userId, 'naver_place', 'success')
      log.info({ url: urlAfterLogin }, 'naver: form login success')
    }

    if (action === 'health_check') return { status: 'ok', message: 'naver login ok' }

    // ── 2) post_reply: SmartPlace 답글 등록 ──────────────────────
    if (!payload?.platform_review_id || !payload?.reply_text) {
      return { status: 'failed', message: 'naver post_reply: platform_review_id / reply_text 누락' }
    }

    const platformReviewId = String(payload.platform_review_id)
    const replyText = String(payload.reply_text)
    // bizId 우선순위: payload.biz_id > platform_store_id > storeId
    const bizId = payload.biz_id
      ? String(payload.biz_id)
      : (creds.platform_store_id || opts.storeId)

    const result = await postNaverReply(page, bizId, platformReviewId, replyText, log)
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

// ── SmartPlace 리뷰 답글 등록 ────────────────────────────────────
async function postNaverReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // bizId가 있으면 정확한 리뷰 URL로 바로 이동
    const reviewUrl = storeId && storeId !== 'unknown'
      ? `${NEW_SMARTPLACE_BASE}/bizes/place/${storeId}/reviews/${platformReviewId}`
      : `${NEW_SMARTPLACE_BASE}/bizes`

    log.info({ reviewUrl, storeId, platformReviewId }, 'naver: navigating to review')
    await page.goto(reviewUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    log.info({ url: currentUrl }, 'naver: review page loaded')

    // 로그인 리다이렉트 체크
    if (currentUrl.includes('nid.naver.com') || currentUrl.includes('login')) {
      return { ok: false, reason: '세션 만료 — 세션쿠키를 다시 저장해주세요 (/my/platforms/naver_place/session)' }
    }

    // 스크롤로 리뷰 로딩
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await page.waitForTimeout(500)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // 리뷰 카드 찾기: data-review-id 속성
    let card = await page.$(`[data-review-id="${platformReviewId}"]`)

    // 모든 카드 탐색
    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      for (const c of allCards) {
        const attrId = await c.evaluate((el: Element) =>
          el.getAttribute('data-id') || el.getAttribute('data-review-id') || ''
        )
        if (attrId && attrId.includes(platformReviewId)) { card = c; break }
      }
    }

    // 단일 리뷰 페이지(직접 URL 이동 시) — 첫 번째 카드 사용
    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      if (allCards.length === 1) {
        card = allCards[0]
        log.info('naver: using single card on direct review URL')
      }
    }

    // SmartPlace 내부 API 폴백
    if (!card) {
      log.warn({ platformReviewId }, 'naver: card not found, trying internal API')
      const apiResult = await tryNaverReplyAPI(page, storeId, platformReviewId, replyText, log)
      if (apiResult.ok) return apiResult
      await dumpPageDiagnostics(page, log, `naver-no-card-${platformReviewId}`)
      return { ok: false, reason: `review card not found (url: ${page.url()})` }
    }

    // 이미 답글 있으면 스킵
    const alreadyReplied = await card.$(DOM_SELECTORS.ownerReply)
    if (alreadyReplied) {
      log.info({ platformReviewId }, 'naver: already replied — skip')
      return { ok: true }
    }

    // 답글 달기 버튼
    const replyBtn = await card.$(DOM_SELECTORS.replyButton)
    if (!replyBtn) return { ok: false, reason: '답글 버튼 없음 (SmartPlace DOM 변경 가능)' }
    await replyBtn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await replyBtn.click()
    await page.waitForTimeout(1500)

    // textarea
    let textarea = await card.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: '답글 입력란 없음' }
    await textarea.scrollIntoViewIfNeeded()
    await textarea.click({ clickCount: 3 })
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    // 등록 버튼
    let submitBtn = await card.$(DOM_SELECTORS.replySubmit)
    if (!submitBtn) submitBtn = await page.$(DOM_SELECTORS.replySubmit)
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

// ── SmartPlace 내부 API 직접 호출 (DOM 폴백) ─────────────────────
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
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/comment`, body: { content: text } },
        ]
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
              credentials: 'include',
              body: JSON.stringify(ep.body),
            })
            if (res.ok) return { ok: true, endpoint: ep.url }
          } catch {}
        }
        return { ok: false, reason: 'all SmartPlace API endpoints failed' }
      },
      { storeId, reviewId: platformReviewId, text: replyText },
    )
    log.info({ result }, 'naver: internal API result')
    return result as { ok: true } | { ok: false; reason: string }
  } catch (e: any) {
    return { ok: false, reason: `API error: ${e?.message}` }
  }
}
