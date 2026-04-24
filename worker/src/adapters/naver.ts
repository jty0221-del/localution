// worker/src/adapters/naver.ts
// ============================================================
// 41차-10 · NaverAdapter — SmartPlace 사장님 답글 자동 등록
//   · action: 'post_reply' 전용 (리뷰 수집은 Vercel /api/place/reviews/fetch)
//   · 로그인: https://nid.naver.com/nidlogin.login
//   · 답글 등록: https://smartplace.naver.com/place/{storeId}/review
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

const DOM_SELECTORS = {
  // 로그인 폼
  idInput:  'input#id, input[name="id"], input[placeholder*="아이디"]',
  pwInput:  'input#pw, input[name="pw"], input[type="password"]',
  loginBtn: '#log\.login, button[type="submit"], .btn_login',
  // 로그인 성공 판별
  userMenu: '.MyView-module__btn_user, [class*="btn_user"], .gnb_name',
  // 리뷰 카드 (SmartPlace SPA)
  reviewCard:   '[data-review-id], .review-item, [class*="ReviewItem"]',
  replyButton:  'button[data-type="reply"], button:has-text("답글 달기"), button:has-text("답글"), [class*="btn_reply"]',
  replyTextarea:'textarea[placeholder*="답글"], textarea[class*="reply"], .reply_write textarea',
  replySubmit:  'button:has-text("등록"), button[type="submit"][class*="reply"], [class*="btn_submit"]',
  // 이미 답글 있는 경우
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

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    // ── 1) 네이버 아이디 로그인 ──────────────────────────────────
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1200)

    // 아이디 입력
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
    log.info({ url: urlAfterLogin }, 'naver: after login')

    if (urlAfterLogin.includes('captcha') || urlAfterLogin.includes('challenge')) {
      await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
      return { status: 'failed', message: 'naver: 캡차 발생 — 수동 로그인 후 다시 시도해주세요' }
    }

    if (urlAfterLogin.includes('login') || urlAfterLogin.includes('signin')) {
      const { failed, reason } = await detectLoginFailure(page)
      await markLoginStatus(svc, userId, 'naver_place', 'failed', reason || 'stayed on login')
      return {
        status: 'failed',
        message: failed
          ? `naver login failed — ${reason}`
          : 'naver login failed — 아이디/비밀번호 확인 또는 2단계 인증 필요',
      }
    }

    await markLoginStatus(svc, userId, 'naver_place', 'success')
    if (action === 'health_check') return { status: 'ok', message: 'naver login ok' }

    // ── 2) post_reply: SmartPlace 답글 등록 ──────────────────────
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

    // 실패 시 DB 에 error 기록
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

// ── 내부: SmartPlace 리뷰 답글 등록 ──────────────────────────────
async function postNaverReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // SmartPlace 리뷰 관리 페이지로 이동
    const reviewUrl = storeId && storeId !== 'unknown'
      ? `${SMARTPLACE_BASE}/place/${storeId}${SMARTPLACE_REVIEW_PATH}`
      : `${SMARTPLACE_BASE}${SMARTPLACE_REVIEW_PATH}`

    await page.goto(reviewUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(3000)

    // 페이지 스크롤로 리뷰 로딩 유도
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await page.waitForTimeout(600)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // 전략 1: data-review-id 속성으로 직접 찾기
    let card = await page.$(`[data-review-id="${platformReviewId}"]`)

    // 전략 2: review-id 가 없으면 모든 카드에서 text 매칭 (reviewId가 카드 내부에 텍스트로 있는 경우)
    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      for (const c of allCards) {
        const html = await c.evaluate((el: Element) => el.getAttribute('data-id') || el.getAttribute('data-review-id') || '')
        if (html && html.includes(platformReviewId)) {
          card = c
          break
        }
      }
    }

    // 전략 3: 네이버 스마트플레이스 특정 URL — /reply/{reviewId} 직접 POST
    // API 방식 시도 (페이지 DOM 에서 CSRF 토큰 추출 후 fetch)
    if (!card) {
      log.warn({ platformReviewId }, 'naver: card not found in DOM, trying API approach')
      const apiResult = await tryNaverReplyAPI(page, storeId, platformReviewId, replyText, log)
      if (apiResult.ok) return apiResult
      // API 도 실패하면 dump 후 실패 반환
      await dumpPageDiagnostics(page, log, `naver-review-not-found-${platformReviewId}`)
      return { ok: false, reason: `review card not found for ${platformReviewId}` }
    }

    // 이미 답글이 달린 경우 체크
    const alreadyReplied = await card.$(DOM_SELECTORS.ownerReply)
    if (alreadyReplied) {
      log.info({ platformReviewId }, 'naver: review already has a reply — skipping')
      return { ok: true } // 이미 달린 경우도 성공으로 처리
    }

    // 답글 달기 버튼 클릭
    const replyBtn = await card.$(DOM_SELECTORS.replyButton)
    if (!replyBtn) return { ok: false, reason: '답글 버튼 없음 — SmartPlace DOM 변경 가능성' }

    await replyBtn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await replyBtn.click()
    await page.waitForTimeout(1500)

    // textarea 찾기 (카드 내부 우선, 없으면 전체 페이지)
    let textarea = await card.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: '답글 텍스트 영역 없음' }

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

    // 성공 확인: 답글 영역이 새로 생겼는지
    const postedReply = await card.$(DOM_SELECTORS.ownerReply)
    if (!postedReply) {
      log.warn({ platformReviewId }, 'naver: submit clicked but reply section not visible — may still have succeeded')
    }

    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver postReply error')
    return { ok: false, reason: e?.message || 'unknown error' }
  }
}

// ── SmartPlace 내부 API 방식 (DOM에서 카드를 못 찾을 때 폴백) ──────
async function tryNaverReplyAPI(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // SmartPlace SPA 내부에서 fetch 를 직접 실행해 CSRF 토큰 활용
    const result = await page.evaluate(
      async (args: { storeId: string; reviewId: string; text: string }) => {
        const { storeId, reviewId, text } = args
        // API 엔드포인트 패턴 (SmartPlace 내부 API)
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
