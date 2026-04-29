// worker/src/adapters/coupangeats.ts
// ============================================================
// 32차-2 · CoupangEatsAdapter (store.coupangeats.com)
// ── IP 차단 대응: extra_data.session_cookies 쿠키 세션 방식 우선 ──
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://store.coupangeats.com/merchant/login'
const REVIEWS_BASE_URL = 'https://store.coupangeats.com/merchant/management/reviews'

const DOM_SELECTORS = {
  idInput: 'input[name="loginId"], input[name="username"], input[name="email"], input[type="email"]',
  pwInput: 'input[name="password"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인"), button:has-text("로그인하기")',
  reviewCard: '[class*="ReviewItem"], [class*="review-item"], [data-testid*="review"]',
  reviewAuthor: '[class*="name"], [class*="nickname"], [class*="author"]',
  starFilled: '[class*="star"][class*="fill"], svg[class*="active"], [class*="StarActive"]',
  ratingText: '[class*="rating"], [class*="Rating"]',
  reviewContent: '[class*="content"], [class*="Content"], p[class*="body"]',
  reviewDate: 'time, [class*="date"], [class*="Date"]',
  reviewPhoto: 'img[class*="photo"], img[class*="image"], img[class*="thumbnail"]',
  ownerReply: '[class*="reply"][class*="owner"], [class*="OwnerReply"], [class*="StoreReply"]',
  replyButton: 'button:has-text("답글"), button:has-text("사장님 답글"), [class*="replyButton"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[class*="reply"]',
  replySubmit: 'button:has-text("등록"), button:has-text("저장"), button:has-text("확인")',
}

export type CoupangOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

export async function runCoupangEats(
  opts: CoupangOptions,
  action: Action,
  payload?: Record<string, unknown>,
): Promise<JobResult> {
  const { userId, browser, log } = opts

  if (action !== 'fetch_reviews' && action !== 'health_check' && action !== 'post_reply') {
    return { status: 'skipped', message: `coupangeats: action ${action} not yet supported` }
  }

  const svc = getServiceClient()
  const creds = await loadPlainCredentials(svc, userId, 'coupangeats')

  // ── 저장된 세션 쿠키 조회 (IP 차단 우회용) ──
  const savedCookies = await loadCoupangSessionCookies(svc, userId, log)
  log.info({ hasSavedCookies: !!savedCookies, cookieCount: savedCookies?.length ?? 0 }, 'coupangeats session cookie status')

  const proxyHost = process.env.PROXY_HOST
  const proxyPort = process.env.PROXY_PORT
  const proxyUser = process.env.PROXY_USER
  const proxyPass = process.env.PROXY_PASS
  const proxyProto = process.env.PROXY_PROTOCOL || 'http'
  const useProxy = !!(proxyHost && proxyPort)

  const contextOptions: any = {
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
  }
  if (useProxy) {
    contextOptions.proxy = {
      server: `${proxyProto}://${proxyHost}:${proxyPort}`,
      username: proxyUser,
      password: proxyPass,
    }
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}` }, 'coupangeats: using proxy')
  }

  const context = await browser.newContext(contextOptions)

  // 저장된 쿠키가 있으면 세션 복원
  if (savedCookies && savedCookies.length > 0) {
    try {
      await context.addCookies(savedCookies)
      log.info({ count: savedCookies.length }, 'coupangeats: session cookies restored')
    } catch (e: any) {
      log.warn({ err: e?.message }, 'coupangeats: failed to restore cookies')
    }
  }

  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'feedback', 'rating', 'merchant'])

  try {
    // ── 쿠키 세션으로 리뷰 페이지 직접 접근 ──
    if (savedCookies && savedCookies.length > 0) {
      const reviewsUrl = creds.platform_store_id
        ? `${REVIEWS_BASE_URL}/${creds.platform_store_id}`
        : REVIEWS_BASE_URL
      log.info({ reviewsUrl }, 'coupangeats: trying direct reviews access with saved cookies')
      await page.goto(reviewsUrl, { waitUntil: 'load', timeout: 45000 })
      await page.waitForTimeout(4000)

      const directUrl = page.url()
      if (!directUrl.includes('/login')) {
        log.info({ directUrl }, 'coupangeats: cookie session valid')
        await markLoginStatus(svc, userId, 'coupangeats', 'success')
        if (action === 'health_check') return { status: 'ok', message: 'coupangeats cookie session ok' }
        return await fetchCoupangReviews(page, svc, creds, userId, action, payload, log)
      }
      log.warn('coupangeats: saved cookies expired, falling back to login')
    }

    // ── 폼 로그인 (쿠키 없거나 만료) ──
    log.info('coupangeats: attempting form login')
    await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(6000)

    const pwLocator = page.locator(DOM_SELECTORS.pwInput).first()
    const pwVisible = await pwLocator.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)
    if (!pwVisible) {
      await dumpPageDiagnostics(page, log, 'coupangeats-login-form-missing')
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', 'login form not found')
      return {
        status: 'failed',
        message: 'coupangeats 로그인 폼 없음 — /my/platforms/coupangeats/connect 에서 쿠키를 등록해주세요',
      }
    }

    const idCandidates = [
      'input[name="loginId"]',
      'input[name="username"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="아이디"]',
      'input[placeholder*="이메일"]',
      'input[placeholder*="ID"]',
      'input[placeholder*="id"]',
    ]
    let idFilled = false
    for (const sel of idCandidates) {
      try {
        const loc = page.locator(sel).first()
        const visible = await loc.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)
        if (visible) {
          await loc.click()
          await loc.fill('')
          await loc.pressSequentially(creds.account_id, { delay: 60 })
          idFilled = true
          log.info({ sel }, 'coupangeats id input filled')
          break
        }
      } catch { continue }
    }
    if (!idFilled) {
      await dumpPageDiagnostics(page, log, 'coupangeats-id-input-not-found')
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', 'id input not found')
      return { status: 'failed', message: 'coupangeats ID 입력 필드를 찾지 못했습니다' }
    }
    await pwLocator.click()
    await pwLocator.fill('')
    await pwLocator.pressSequentially(creds.password, { delay: 80 })
    await page.waitForTimeout(800)
    await page.locator(DOM_SELECTORS.loginBtn).first().click()
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 20000 }).catch(() => null)
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    if (currentUrl.includes('captcha')) {
      await markLoginStatus(svc, userId, 'coupangeats', 'captcha', currentUrl)
      return { status: 'failed', message: 'coupangeats captcha — 수동 로그인 필요' }
    }
    if (currentUrl.includes('/login')) {
      await dumpPageDiagnostics(page, log, 'coupangeats-login-failed')
      const { failed, reason } = await detectLoginFailure(page)
      await markLoginStatus(svc, userId, 'coupangeats', 'failed', reason || 'stayed on login')
      return {
        status: 'failed',
        message: 'coupangeats: Railway IP 차단으로 로그인 불가 — /my/platforms/coupangeats/connect 에서 브라우저 쿠키를 붙여넣어 주세요',
      }
    }

    await markLoginStatus(svc, userId, 'coupangeats', 'success')

    // 로그인 성공 시 쿠키 저장 (다음 실행 때 재활용)
    try {
      const cookies = await context.cookies()
      const relevant = cookies.filter((c) =>
        c.domain.includes('coupangeats') || c.domain.includes('coupang')
      )
      if (relevant.length > 0) {
        await saveCoupangSessionCookies(svc, userId, relevant, log)
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'coupangeats: failed to save session cookies')
    }

    if (action === 'health_check') return { status: 'ok', message: 'coupangeats login ok' }
    return await fetchCoupangReviews(page, svc, creds, userId, action, payload, log)
  } catch (e: any) {
    log.error({ err: e?.message }, 'coupangeats error')
    return { status: 'failed', message: `coupangeats: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

async function fetchCoupangReviews(
  page: any,
  svc: any,
  creds: any,
  userId: string,
  action: Action,
  payload: Record<string, unknown> | undefined,
  log: Logger,
): Promise<JobResult> {
  const reviewsUrl = creds.platform_store_id
    ? `${REVIEWS_BASE_URL}/${creds.platform_store_id}`
    : REVIEWS_BASE_URL

  const cur = page.url()
  if (!cur.includes('/reviews')) {
    log.info({ reviewsUrl }, 'coupangeats navigating to reviews')
    await page.goto(reviewsUrl, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(4000)
  }

  if (page.url().includes('/login')) {
    return { status: 'failed', message: 'coupangeats: 세션 만료 — 쿠키를 다시 등록해주세요' }
  }

  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 1200))
    await page.waitForTimeout(700)
  }

  const reviews = await page.evaluate((sel: typeof DOM_SELECTORS) => {
    const cards = Array.from(document.querySelectorAll(sel.reviewCard))
    return cards.slice(0, 200).map((c, idx) => {
      const author = (c.querySelector(sel.reviewAuthor) as HTMLElement | null)?.innerText?.trim() ?? null
      const filled = c.querySelectorAll(sel.starFilled).length
      let rating: number | null = filled > 0 && filled <= 5 ? filled : null
      if (rating === null) {
        const ratingEl = c.querySelector(sel.ratingText) as HTMLElement | null
        const t = ratingEl?.innerText || ''
        const m = t.match(/(\d(?:\.\d)?)/)
        if (m) rating = Math.round(parseFloat(m[1]))
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
        platform_review_id: idAttr || `coupangeats:${idx}:${(content || '').slice(0, 20)}:${posted || ''}`,
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
    await dumpPageDiagnostics(page, log, 'coupangeats-no-review-cards')
  }

  const normalized: CollectedReview[] = reviews
    .filter((r: any) => r.content || r.author_name)
    .map((r: any) => ({ ...r, posted_at: normalizeDate(r.posted_at) }))

  const shopId = creds.platform_store_id || 'unknown'
  const res = await upsertReviews(svc, userId, 'coupangeats', shopId, normalized)
  log.info({ ...res }, 'coupangeats reviews upserted')

  if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
    const targetId = String(payload.platform_review_id)
    const replyText = String(payload.reply_text)
    const replied = await postCoupangEatsReply(page, targetId, replyText, log)
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
        .eq('platform', 'coupangeats')
        .eq('platform_review_id', targetId)
      return { status: 'ok', message: `coupangeats: reply posted for ${targetId}` }
    }
    return { status: 'failed', message: `coupangeats reply 실패: ${replied.reason}` }
  }

  return {
    status: 'ok',
    message: `coupangeats: collected ${res.total}, upserted ${res.inserted}`,
    data: res,
  }
}

async function loadCoupangSessionCookies(
  svc: any,
  userId: string,
  log: Logger,
): Promise<any[] | null> {
  try {
    const { data, error } = await svc
      .from('platform_credentials')
      .select('extra_data')
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
      .maybeSingle()
    if (error || !data?.extra_data) return null
    const cookieJson = (data.extra_data as any)?.session_cookies
    if (!cookieJson) return null
    const cookies = typeof cookieJson === 'string' ? JSON.parse(cookieJson) : cookieJson
    if (!Array.isArray(cookies) || cookies.length === 0) return null
    log.info({ count: cookies.length }, 'coupangeats: loaded session cookies from DB')
    return cookies
  } catch (e: any) {
    log.warn({ err: e?.message }, 'coupangeats: loadCoupangSessionCookies failed')
    return null
  }
}

async function saveCoupangSessionCookies(
  svc: any,
  userId: string,
  cookies: any[],
  log: Logger,
): Promise<void> {
  try {
    const { data: existing } = await svc
      .from('platform_credentials')
      .select('extra_data')
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
      .maybeSingle()
    const extraData = { ...(existing?.extra_data || {}), session_cookies: cookies }
    await svc
      .from('platform_credentials')
      .update({ extra_data: extraData })
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
    log.info({ count: cookies.length }, 'coupangeats: session cookies saved to DB')
  } catch (e: any) {
    log.warn({ err: e?.message }, 'coupangeats: saveCoupangSessionCookies failed')
  }
}

async function postCoupangEatsReply(
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
    log.error({ err: e?.message }, 'coupangeats reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  const m1 = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
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
