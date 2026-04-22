// worker/src/adapters/baemin.ts
// ============================================================
// 32차-2 · BaeminAdapter (ceo.baemin.com)
//   · 로그인 → 리뷰 페이지 탐색 → DOM 파싱 → platform_reviews UPSERT
//   · 셀렉터는 배민 사장님 포털 DOM 기준 MVP — 변경시 DOM_SELECTORS 상단에서 교체
//   · 로그인 실패(captcha/2FA) 시 markLoginStatus('captcha') + failed 반환
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://self.baemin.com/login'
const REVIEWS_URL = 'https://self.baemin.com/shops/{shopId}/reviews'
const CEO_HOME = 'https://self.baemin.com/'

// DOM 셀렉터 (배민 포털 구조 변경시 본 상수만 업데이트)
const DOM_SELECTORS = {
  idInput: 'input[name="id"], input[type="text"][placeholder*="아이디"], input[name="loginId"]',
  pwInput: 'input[name="password"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인")',
  shopSelector: 'a[href*="/shops/"], [data-shop-id]',
  reviewCard: '[data-testid="review-card"], [class*="ReviewCard"], article[class*="review"], li[class*="Review"]',
  reviewAuthor: '[class*="nickname"], [class*="author"], [class*="UserName"]',
  reviewRating: '[class*="rating"] [class*="star"], [class*="Star"]',
  reviewContent: '[class*="content"], [class*="reviewBody"], [class*="Content"]',
  reviewDate: 'time, [class*="date"], [class*="Date"]',
  reviewPhoto: 'img[src*="baedalyo"], img[class*="photo"], img[class*="Photo"]',
  ownerReply: '[class*="ownerReply"], [class*="reply"][class*="owner"], [class*="OwnerReply"]',
  replyButton: 'button:has-text("답글"), button:has-text("사장님 답글"), [class*="replyButton"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[class*="reply"]',
  replySubmit: 'button:has-text("등록"), button:has-text("저장"), button:has-text("확인")',
}

export type BaeminOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

export async function runBaemin(
  opts: BaeminOptions,
  action: Action,
  payload?: Record<string, unknown>,
): Promise<JobResult> {
  const { userId, storeId, browser, log } = opts

  if (action !== 'fetch_reviews' && action !== 'health_check' && action !== 'post_reply') {
    return { status: 'skipped', message: `baemin: action ${action} not yet supported` }
  }

  const svc = getServiceClient()
  const creds = await loadPlainCredentials(svc, userId, 'baemin')
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  // 33차-2: DEBUG_CAPTURE=1 일 때 review 관련 XHR 자동 로깅
  startNetworkCapture(page, log, ['review', 'feedback', 'rating', 'shop'])

  try {
    // ── 1) 로그인 ───────────────────────────────
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)

    await page.fill(DOM_SELECTORS.idInput, creds.account_id)
    await page.fill(DOM_SELECTORS.pwInput, creds.password)
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null),
      page.click(DOM_SELECTORS.loginBtn),
    ])

    // 캡챠/블록 감지
    const currentUrl = page.url()
    if (currentUrl.includes('captcha') || currentUrl.includes('block')) {
      await markLoginStatus(svc, userId, 'baemin', 'captcha', currentUrl)
      return { status: 'failed', message: 'baemin captcha/block — 수동 로그인 필요' }
    }
    if (currentUrl.includes('login')) {
      const { failed, reason } = await detectLoginFailure(page)
      await markLoginStatus(svc, userId, 'baemin', 'failed', reason || 'stayed on login')
      return {
        status: 'failed',
        message: failed
          ? `baemin login failed — ${reason}`
          : 'baemin login failed — 아이디/비밀번호 확인 또는 페이지 지연',
      }
    }

    await markLoginStatus(svc, userId, 'baemin', 'success')
    if (action === 'health_check') {
      return { status: 'ok', message: 'baemin login ok' }
    }

    // ── 2) 매장 선택 (단일 매장이면 자동 이동, 복수면 첫 번째) ─
    let shopId = creds.platform_store_id
    if (!shopId) {
      // ceo 홈에서 첫 번째 shop id 추출
      await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
      shopId = await page.evaluate(() => {
        const a = document.querySelector('a[href*="/shops/"]') as HTMLAnchorElement | null
        if (!a) return null
        const m = a.href.match(/\/shops\/(\d+)/)
        return m ? m[1] : null
      })
    }
    if (!shopId) {
      return { status: 'failed', message: 'baemin shopId resolve 실패 — platform_store_id 등록 필요' }
    }

    // ── 3) 리뷰 페이지 이동 ───────────────────────
    const reviewsUrl = REVIEWS_URL.replace('{shopId}', shopId)
    await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(2500)

    // 스크롤로 리뷰 로드 (lazy load 대응)
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200))
      await page.waitForTimeout(700)
    }

    // ── 4) 리뷰 파싱 ─────────────────────────────
    const reviews = await page.evaluate((sel) => {
      const cards = Array.from(document.querySelectorAll(sel.reviewCard))
      return cards.slice(0, 200).map((c, idx) => {
        const author = (c.querySelector(sel.reviewAuthor) as HTMLElement | null)?.innerText?.trim() ?? null
        // 별점: 노란 별 개수 (.filled / .active / aria-hidden=false)
        let rating: number | null = null
        const stars = c.querySelectorAll(sel.reviewRating)
        if (stars.length) {
          const filled = Array.from(stars).filter((s) => {
            const cls = (s as HTMLElement).className || ''
            return cls.includes('fill') || cls.includes('active') || cls.includes('on')
          }).length
          rating = filled > 0 ? filled : null
        }
        // aria-label 폴백 (예: "별점 4점")
        if (rating === null) {
          const lab = (c as HTMLElement).getAttribute('aria-label') || ''
          const m = lab.match(/(\d)점/)
          if (m) rating = parseInt(m[1], 10)
        }
        const content = (c.querySelector(sel.reviewContent) as HTMLElement | null)?.innerText?.trim() ?? null
        const dateEl = c.querySelector(sel.reviewDate) as HTMLElement | null
        const posted = dateEl?.getAttribute('datetime') || dateEl?.innerText || null
        const photos = Array.from(c.querySelectorAll(sel.reviewPhoto))
          .map((img) => (img as HTMLImageElement).src)
          .filter(Boolean)
        const hasReply = !!c.querySelector(sel.ownerReply)
        const replyContent = hasReply
          ? (c.querySelector(sel.ownerReply) as HTMLElement | null)?.innerText?.trim() ?? null
          : null
        const idAttr =
          (c as HTMLElement).getAttribute('data-review-id') ||
          (c as HTMLElement).getAttribute('data-id') ||
          null
        return {
          platform_review_id: idAttr || `baemin:${idx}:${(content || '').slice(0, 20)}:${posted || ''}`,
          author_name: author,
          rating,
          content,
          photos,
          posted_at: posted,
          has_reply: hasReply,
          reply_content: replyContent,
        }
      })
    }, DOM_SELECTORS)

    // 33차-2: 리뷰 카드 매칭 실패 시 페이지 구조 덤프 → 셀렉터 튜닝 단서
    if (!reviews || reviews.length === 0) {
      await dumpPageDiagnostics(page, log, 'baemin-no-review-cards')
    }

    // posted_at 문자열을 ISO 로 변환 (배민은 "2일 전" / "2024.03.15" 등 다양)
    const normalized: CollectedReview[] = reviews
      .filter((r) => r.content || r.author_name)
      .map((r) => ({
        ...r,
        posted_at: normalizeBaeminDate(r.posted_at),
      }))

    const res = await upsertReviews(svc, userId, 'baemin', shopId, normalized)
    log.info({ ...res }, 'baemin reviews upserted')

    // ── 5) post_reply 요청이면 추가로 답글 등록 ─────
    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const replied = await postBaeminReply(page, targetId, replyText, log)
      if (replied.ok) {
        // DB 상태 업데이트
        await svc
          .from('platform_reviews')
          .update({
            has_reply: true,
            reply_content: replyText,
            reply_status: 'submitted',
            reply_submitted_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('platform', 'baemin')
          .eq('platform_review_id', targetId)
        return { status: 'ok', message: `baemin: reply posted for ${targetId}` }
      }
      return { status: 'failed', message: `baemin reply 실패: ${replied.reason}` }
    }

    return {
      status: 'ok',
      message: `baemin: collected ${res.total}, upserted ${res.inserted}`,
      data: res,
    }
  } catch (e: any) {
    log.error({ err: e?.message }, 'baemin error')
    return { status: 'failed', message: `baemin: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

async function postBaeminReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // 리뷰 카드에서 data-review-id 매칭 → 해당 카드 내 답글 버튼 클릭
    const card = await page.$(`[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`)
    if (!card) {
      return { ok: false, reason: `card not found for ${platformReviewId}` }
    }
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
    log.error({ err: e?.message }, 'baemin reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}

function normalizeBaeminDate(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  // ISO 8601 already?
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  // "YYYY.MM.DD" or "YYYY-MM-DD"
  const m1 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m1) {
    const [, y, mo, d] = m1
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+09:00`
  }
  // "N일 전" / "N시간 전"
  const now = new Date()
  const mDay = s.match(/(\d+)일\s*전/)
  if (mDay) {
    now.setDate(now.getDate() - parseInt(mDay[1], 10))
    return now.toISOString()
  }
  const mHour = s.match(/(\d+)시간\s*전/)
  if (mHour) {
    now.setHours(now.getHours() - parseInt(mHour[1], 10))
    return now.toISOString()
  }
  return null
}
