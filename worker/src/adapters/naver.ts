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
    update.reply_content = extra.replyContent
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

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    // ── 1) 로그인: 세션쿠키 우선 ─────────────────────────────────
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
          if (parsed.NID_AUT) cookieList.push({ name: 'NID_AUT', value: parsed.NID_AUT, domain: '.naver.com', path: '/', secure: true, httpOnly: true, expires: nowSec })
          if (parsed.NID_SES) cookieList.push({ name: 'NID_SES', value: parsed.NID_SES, domain: '.naver.com', path: '/', secure: true, httpOnly: true, expires: nowSec })
        }

        if (cookieList.length > 0) {
          await context.addCookies(cookieList)
          // SmartPlace 로 바로 이동해서 로그인 상태 확인 (naver.com은 비로그인도 접근 가능)
          const testUrl = bizId && bizId !== 'unknown'
            ? `${NEW_SMARTPLACE_BASE}/bizes/place/${bizId}`
            : `${NEW_SMARTPLACE_BASE}/bizes`
          await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
          await page.waitForTimeout(2000)
          const checkUrl = page.url()
          log.info({ checkUrl, cookieCount: cookieList.length }, 'naver: cookie login check')
          if (!checkUrl.includes('nid.naver.com') && !checkUrl.includes('login') && !checkUrl.includes('signin')) {
            loggedIn = true
            log.info('naver: session cookie login OK')
            await markLoginStatus(svc, userId, 'naver_place', 'success')
          } else {
            log.warn({ checkUrl }, 'naver: session cookies invalid/expired — falling back to form login')
          }
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie handling error')
      }
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
        await dumpPageDiagnostics(page, log, 'naver-captcha')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        const msg = 'naver: 캡차 발생 — /my/platforms/naver_place/session 에서 세션쿠키를 저장하면 자동 해결됩니다'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      if (urlAfterLogin.includes('user2/help') || urlAfterLogin.includes('security') || urlAfterLogin.includes('verify')) {
        await dumpPageDiagnostics(page, log, 'naver-security')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        const msg = `naver: 보안인증 요구 (${urlAfterLogin}) — 세션쿠키를 갱신해주세요`
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      if (urlAfterLogin.includes('nid.naver.com') || urlAfterLogin.includes('login') || urlAfterLogin.includes('signin')) {
        const { reason } = await detectLoginFailure(page)
        await dumpPageDiagnostics(page, log, 'naver-login-failed')
        await markLoginStatus(svc, userId, 'naver_place', 'failed', reason || urlAfterLogin)
        const msg = `naver login failed — ${reason || '아이디/비밀번호 오류 또는 세션쿠키 설정 필요'}`
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
    const reviewUrl = storeId && storeId !== 'unknown'
      ? `${NEW_SMARTPLACE_BASE}/bizes/place/${storeId}/reviews/${platformReviewId}`
      : `${NEW_SMARTPLACE_BASE}/bizes`

    log.info({ reviewUrl, storeId, platformReviewId }, 'naver: navigating to review')
    await page.goto(reviewUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    log.info({ url: currentUrl }, 'naver: review page loaded')

    if (currentUrl.includes('nid.naver.com') || currentUrl.includes('login')) {
      return { ok: false, reason: '세션 만료 — /my/platforms/naver_place/session 에서 쿠키를 갱신해주세요' }
    }

    // 스크롤로 리뷰 로딩
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await page.waitForTimeout(500)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // 리뷰 카드 찾기
    let card = await page.$(`[data-review-id="${platformReviewId}"]`)
    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      for (const c of allCards) {
        const attrId = await c.evaluate((el: Element) =>
          el.getAttribute('data-id') || el.getAttribute('data-review-id') || ''
        )
        if (attrId && attrId.includes(platformReviewId)) { card = c; break }
      }
    }
    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      if (allCards.length === 1) {
        card = allCards[0]
        log.info('naver: using single card on direct review URL')
      }
    }

    // SmartPlace 내부 API 폴백
    if (!card) {
      log.warn({ platformReviewId, url: page.url() }, 'naver: card not found, trying internal API')
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
