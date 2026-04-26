// worker/src/adapters/yogiyo.ts
// ============================================================
// 32차-2 · YogiyoAdapter (ceo.yogiyo.co.kr)
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://ceo.yogiyo.co.kr/login/'
const REVIEWS_BASE_URL = 'https://ceo.yogiyo.co.kr/reviews'

const DOM_SELECTORS = {
  idInput: 'input[name="username"], input[name="loginId"], input[name="email"], input[type="email"], input[type="text"]',
  pwInput: 'input[name="password"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인"), button:has-text("로그인하기")',
  reviewCard: '[class*="ReviewList"] [class*="ReviewItem"], [data-testid*="review-item"], article[class*="review"], li[class*="ReviewItem"]',
  reviewAuthor: '[class*="nickname"], [class*="UserName"], [class*="author"]',
  starFilled: '[class*="star"][class*="fill"], [class*="StarFilled"], svg[class*="active"]',
  reviewContent: '[class*="ReviewContent"], [class*="content"], p[class*="body"]',
  reviewDate: 'time, [class*="Date"], [class*="date"]',
  reviewPhoto: 'img[src*="yogiyo"], img[class*="photo"], img[class*="image"]',
  ownerReply: '[class*="OwnerReply"], [class*="ownerReply"], [class*="StoreReply"]',
  replyButton: 'button:has-text("답글"), button:has-text("사장님 답글"), [class*="replyButton"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[class*="reply"]',
  replySubmit: 'button:has-text("등록"), button:has-text("저장"), button:has-text("확인")',
}

export type YogiyoOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

export async function runYogiyo(
  opts: YogiyoOptions,
  action: Action,
  payload?: Record<string, unknown>,
): Promise<JobResult> {
  const { userId, browser, log } = opts

  if (action !== 'fetch_reviews' && action !== 'health_check' && action !== 'post_reply') {
    return { status: 'skipped', message: `yogiyo: action ${action} not yet supported` }
  }

  const svc = getServiceClient()
  const creds = await loadPlainCredentials(svc, userId, 'yogiyo')
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'sec-ch-ua': '"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'feedback', 'rating'])

  try {
    // 1) 로그인 — load 이후 SPA 렌더링 대기 (networkidle은 WebSocket으로 인해 타임아웃)
    await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(5000)

    // 폼이 실제로 나타날 때까지 대기
    const pwLocator = page.locator(DOM_SELECTORS.pwInput).first()
    const pwVisible = await pwLocator.waitFor({ state: 'visible', timeout: 25000 }).then(() => true).catch(() => false)
    if (!pwVisible) {
      await dumpPageDiagnostics(page, log, 'yogiyo-login-form-missing')
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', 'login form not found')
      return { status: 'failed', message: 'yogiyo 로그인 폼을 찾지 못했습니다 — 페이지 구조 변경 가능성' }
    }

    // ID 입력창 — 셀렉터 후보 순차 시도
    const idCandidates = [
      'input[name="username"]',
      'input[name="loginId"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="아이디"]',
      'input[placeholder*="이메일"]',
      'input[placeholder*="ID"]',
    ]
    let idFilled = false
    for (const sel of idCandidates) {
      try {
        const loc = page.locator(sel).first()
        const visible = await loc.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)
        if (visible) {
          await loc.fill(creds.account_id, { timeout: 5000 })
          idFilled = true
          log.info({ sel }, 'yogiyo id input filled')
          break
        }
      } catch { continue }
    }
    if (!idFilled) {
      await dumpPageDiagnostics(page, log, 'yogiyo-id-input-not-found')
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', 'id input not found')
      return { status: 'failed', message: 'yogiyo ID 입력 필드를 찾지 못했습니다 — html_snippet 로그 확인 필요' }
    }
    await pwLocator.fill(creds.password)
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null),
      page.locator(DOM_SELECTORS.loginBtn).first().click(),
    ])

    const currentUrl = page.url()
    if (currentUrl.includes('captcha')) {
      await markLoginStatus(svc, userId, 'yogiyo', 'captcha', currentUrl)
      return { status: 'failed', message: 'yogiyo captcha — 수동 로그인 필요' }
    }
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      await dumpPageDiagnostics(page, log, 'yogiyo-login-failed')
      const { failed, reason } = await detectLoginFailure(page)
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', reason || 'stayed on login')
      return {
        status: 'failed',
        message: failed
          ? `yogiyo login failed — ${reason}`
          : 'yogiyo login failed — 아이디/비밀번호 확인 또는 페이지 지연',
      }
    }

    await markLoginStatus(svc, userId, 'yogiyo', 'success')
    if (action === 'health_check') return { status: 'ok', message: 'yogiyo login ok' }

    // 2) 리뷰 페이지 이동 — store_id 있으면 직접 접속
    const reviewsUrl = creds.platform_store_id
      ? `${REVIEWS_BASE_URL}/${creds.platform_store_id}`
      : REVIEWS_BASE_URL
    log.info({ reviewsUrl }, 'yogiyo navigating to reviews')
    await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(2500)

    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200))
      await page.waitForTimeout(700)
    }

    // 3) 리뷰 파싱
    const reviews = await page.evaluate((sel) => {
      const cards = Array.from(document.querySelectorAll(sel.reviewCard))
      return cards.slice(0, 200).map((c, idx) => {
        const author = (c.querySelector(sel.reviewAuthor) as HTMLElement | null)?.innerText?.trim() ?? null
        const filledStars = c.querySelectorAll(sel.starFilled).length
        let rating: number | null = filledStars > 0 && filledStars <= 5 ? filledStars : null
        if (rating === null) {
          const lab = (c as HTMLElement).getAttribute('aria-label') || ''
          const m = lab.match(/(\d)/)
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
          platform_review_id: idAttr || `yogiyo:${idx}:${(content || '').slice(0, 20)}:${posted || ''}`,
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

    if (!reviews || reviews.length === 0) {
      await dumpPageDiagnostics(page, log, 'yogiyo-no-review-cards')
    }

    const normalized: CollectedReview[] = reviews
      .filter((r) => r.content || r.author_name)
      .map((r) => ({ ...r, posted_at: normalizeDate(r.posted_at) }))

    const shopId = creds.platform_store_id || 'unknown'
    const res = await upsertReviews(svc, userId, 'yogiyo', shopId, normalized)
    log.info({ ...res }, 'yogiyo reviews upserted')

    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const replied = await postYogiyoReply(page, targetId, replyText, log)
      if (replied.ok) {
        await svc
          .from('platform_reviews')
          .update({
            has_reply: true,
            reply_content: replyText,
            reply_status: 'submitted',
            reply_submitted_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('platform', 'yogiyo')
          .eq('platform_review_id', targetId)
        return { status: 'ok', message: `yogiyo: reply posted for ${targetId}` }
      }
      return { status: 'failed', message: `yogiyo reply 실패: ${replied.reason}` }
    }

    return {
      status: 'ok',
      message: `yogiyo: collected ${res.total}, upserted ${res.inserted}`,
      data: res,
    }
  } catch (e: any) {
    log.error({ err: e?.message }, 'yogiyo error')
    return { status: 'failed', message: `yogiyo: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

async function postYogiyoReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const card = await page.$(`[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`)
    if (!card) return { ok: false, reason: `card not found for ${platformReviewId}` }

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
    log.error({ err: e?.message }, 'yogiyo reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  const m1 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m1) {
    const [, y, mo, d] = m1
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+09:00`
  }
  const now = new Date()
  const mDay = s.match(/(\d+)일\s*전/)
  if (mDay) {
    now.setDate(now.getDate() - parseInt(mDay[1], 10))
    return now.toISOString()
  }
  return null
}
