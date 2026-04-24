// worker/src/adapters/naver.ts
// ============================================================
// 37차-8 · NaverAdapter (new.smartplace.naver.com)
//   · 로그인: https://nid.naver.com/nidlogin.login
//   · 답글 등록: 스마트플레이스 → 리뷰 → 사장님 답글
//
//   주의:
//     - 네이버는 캡챠·이메일 인증·OTP 확률이 높음
//     - 2단계 인증이 걸려 있으면 markLoginStatus('captcha') 반환 후 사용자 재로그인 유도
//     - 리뷰 수집(fetch_reviews) 은 Vercel 공개 GraphQL 수집기를 그대로 쓰고, Worker 에서는 post_reply 만 담당
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login?mode=form&url=https%3A%2F%2Fnew.smartplace.naver.com%2F'
const SMARTPLACE_HOME = 'https://new.smartplace.naver.com/'

const DOM_SELECTORS = {
  // 네이버 로그인 폼 (id/pw 는 과거 #id #pw, 현재는 placeholder 기반도 병행)
  idInput: '#id, input[name="id"]',
  pwInput: '#pw, input[name="pw"]',
  loginBtn: '#log\\.login, button[type="submit"], button:has-text("로그인")',
  // 로그인 방해 요소
  deviceRegisterSkip: 'a:has-text("등록안함"), button:has-text("등록안함"), a:has-text("나중에")',
  captchaImage: 'img[id*="captcha"], img[src*="captcha"]',
  // 스마트플레이스 좌측 메뉴
  reviewMenu: 'a[href*="review"], a:has-text("리뷰"), [data-menu*="review"]',
  // 리뷰 카드 — 스마트플레이스 신규 디자인
  reviewCard: '[class*="ReviewItem"], li[class*="review"], article[class*="Review"], [data-review-id]',
  replyButton: 'button:has-text("답글 등록"), button:has-text("답글쓰기"), button:has-text("답글")',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[class*="reply"]',
  replySubmit: 'button:has-text("등록"), button:has-text("저장"), button[type="submit"]:has-text("확인")',
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

  // fetch_reviews 는 Vercel 공개 GraphQL 수집기가 담당 — Worker 는 skip
  if (action === 'fetch_reviews') {
    return {
      status: 'skipped',
      message: 'naver_place fetch_reviews: Vercel /api/place/reviews/fetch 가 담당',
    }
  }
  if (action !== 'post_reply' && action !== 'health_check') {
    return { status: 'skipped', message: `naver_place: action ${action} 미지원` }
  }

  const svc = getServiceClient()
  const creds = await loadPlainCredentials(svc, userId, 'naver_place')
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'smartplace', 'reply'])

  try {
    // ── 1) 로그인 ───────────────────────────────
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1000)

    // 네이버는 자동입력을 막기 때문에 keyboard.type 으로 한 글자씩 입력
    await page.click(DOM_SELECTORS.idInput).catch(() => null)
    await page.keyboard.type(creds.account_id, { delay: 35 })
    await page.click(DOM_SELECTORS.pwInput).catch(() => null)
    await page.keyboard.type(creds.password, { delay: 40 })

    // 캡챠 체크
    const hasCaptcha = await page.$(DOM_SELECTORS.captchaImage)
    if (hasCaptcha) {
      await dumpPageDiagnostics(page, log, 'naver-captcha-before-submit')
      await markLoginStatus(svc, userId, 'naver_place', 'captcha', 'captcha image detected')
      return { status: 'failed', message: 'naver captcha — 수동 로그인 필요' }
    }

    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null),
      page.click(DOM_SELECTORS.loginBtn),
    ])

    const currentUrl = page.url()

    // 기기 등록 페이지 — 건너뛰기
    if (currentUrl.includes('deviceConfirm') || currentUrl.includes('device')) {
      const skip = await page.$(DOM_SELECTORS.deviceRegisterSkip)
      if (skip) {
        await skip.click().catch(() => null)
        await page.waitForTimeout(2000)
      }
    }

    // 캡챠/OTP 재검사
    if (page.url().includes('nidlogin.login') || page.url().includes('captcha')) {
      const { failed, reason } = await detectLoginFailure(page)
      await markLoginStatus(
        svc,
        userId,
        'naver_place',
        failed ? 'failed' : 'captcha',
        reason || 'stayed on login',
      )
      return {
        status: 'failed',
        message: failed
          ? `naver login failed — ${reason}`
          : 'naver 2FA/캡챠 필요 — 수동 로그인 후 재시도',
      }
    }

    await markLoginStatus(svc, userId, 'naver_place', 'success')

    if (action === 'health_check') {
      return { status: 'ok', message: 'naver_place login ok' }
    }

    // ── 2) 답글 등록 ───────────────────────────────
    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const reviewDbId = payload.review_db_id ? String(payload.review_db_id) : null

      // 스마트플레이스 홈으로
      await page.goto(SMARTPLACE_HOME, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null)
      await page.waitForTimeout(1500)

      // 리뷰 메뉴 진입
      const menu = await page.$(DOM_SELECTORS.reviewMenu)
      if (menu) await menu.click().catch(() => null)
      await page.waitForTimeout(2500)

      const replied = await postNaverReply(page, targetId, replyText, log)

      const col = reviewDbId ? 'id' : 'platform_review_id'
      const val = reviewDbId ?? targetId

      if (replied.ok) {
        await svc
          .from('platform_reviews')
          .update({
            has_reply: true,
            reply_status: 'submitted',
            reply_submitted_at: new Date().toISOString(),
            reply_error: null,
          })
          .eq(col, val)
          .eq('user_id', userId)
        return { status: 'ok', message: `naver_place reply posted for ${targetId}` }
      }
      await svc
        .from('platform_reviews')
        .update({ reply_status: 'failed', reply_error: replied.reason })
        .eq(col, val)
        .eq('user_id', userId)
      return { status: 'failed', message: `naver_place reply 실패: ${replied.reason}` }
    }

    return { status: 'skipped', message: 'naver_place: payload 없음' }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver error')
    return { status: 'failed', message: `naver_place: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

async function postNaverReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // 리뷰 카드 찾기 (data-review-id 우선, 실패 시 부분 매칭)
    let card = await page.$(`[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`)

    if (!card) {
      // 스크롤해가며 카드 탐색 (최대 8번)
      for (let i = 0; i < 8; i++) {
        card = await page.$(`[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`)
        if (card) break
        await page.evaluate(() => window.scrollBy(0, 800))
        await page.waitForTimeout(700)
      }
    }

    if (!card) {
      return { ok: false, reason: `card not found for ${platformReviewId}` }
    }

    const replyBtn = await card.$(DOM_SELECTORS.replyButton)
    if (!replyBtn) return { ok: false, reason: 'reply button not found' }
    await replyBtn.click()
    await page.waitForTimeout(1500)

    const textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: 'reply textarea not found' }
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    const submit = await page.$(DOM_SELECTORS.replySubmit)
    if (!submit) return { ok: false, reason: 'reply submit button not found' }
    await submit.click()
    await page.waitForTimeout(3000)

    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}
