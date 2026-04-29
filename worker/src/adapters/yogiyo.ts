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

const DOM_SELECTORS = {
  pwInput: 'input[name="password"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인"), button:has-text("로그인하기")',
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
    // 1) 로그인
    await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(5000)

    const pwLocator = page.locator(DOM_SELECTORS.pwInput).first()
    const pwVisible = await pwLocator.waitFor({ state: 'visible', timeout: 25000 }).then(() => true).catch(() => false)
    if (!pwVisible) {
      await dumpPageDiagnostics(page, log, 'yogiyo-login-form-missing')
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', 'login form not found')
      return { status: 'failed', message: 'yogiyo 로그인 폼을 찾지 못했습니다 — 페이지 구조 변경 가능성' }
    }

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
          await loc.click()
          await loc.fill('')
          await loc.pressSequentially(creds.account_id, { delay: 60 })
          idFilled = true
          log.info({ sel }, 'yogiyo id input filled')
          break
        }
      } catch { continue }
    }
    if (!idFilled) {
      await dumpPageDiagnostics(page, log, 'yogiyo-id-input-not-found')
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', 'id input not found')
      return { status: 'failed', message: 'yogiyo ID 입력 필드를 찾지 못했습니다' }
    }
    await pwLocator.click()
    await pwLocator.fill('')
    await pwLocator.pressSequentially(creds.password, { delay: 60 })
    await page.waitForTimeout(500)
    await page.locator(DOM_SELECTORS.loginBtn).first().click()
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 20000 }).catch(() => null)
    await page.waitForTimeout(2000)

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

    // 2) 홈 먼저 이동 → SPA 완전 초기화 후 토큰 획득
    const postLoginOrigin = (() => {
      try { return new URL(page.url()).origin } catch { return 'https://ceo.yogiyo.co.kr' }
    })()
    await page.goto(`${postLoginOrigin}/self-service-home/`, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(6000)

    // 3) localStorage / sessionStorage 에서 인증 토큰 추출
    const authToken = await page.evaluate(() => {
      const win = window as any
      const ls = { ...localStorage }
      const ss = { ...sessionStorage }
      const all = { ...ls, ...ss }
      const tokenKeys = Object.keys(all).filter(k =>
        k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') ||
        k.toLowerCase().includes('jwt') || k.toLowerCase().includes('access')
      )
      const token = tokenKeys.length > 0 ? all[tokenKeys[0]] : null
      return {
        token,
        tokenKey: tokenKeys[0] || null,
        allKeys: Object.keys(all).slice(0, 20),
        cookieStr: document.cookie.slice(0, 300),
      }
    }).catch(() => ({ token: null, tokenKey: null, allKeys: [], cookieStr: '' }))

    log.info({
      hasToken: !!authToken.token,
      tokenKey: authToken.tokenKey,
      storageKeys: authToken.allKeys,
      cookiePreview: authToken.cookieStr.slice(0, 100),
    }, 'yogiyo auth token status')

    // 4) 직접 API 호출 — 토큰 + 쿠키 함께 사용
    const storeId = creds.platform_store_id || ''
    const apiReviews = await page.evaluate(async (args: { storeId: string; token: string | null }) => {
      const { storeId, token } = args
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      }
      if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`
        headers['X-Access-Token'] = token
      }

      const endpoints = [
        // 현재 URL 기반
        `/api/v4/reviews/?page=1&page_size=50`,
        `/api/v4/reviews/?vendor_id=${storeId}&page=1&page_size=50`,
        `/api/v3/reviews/?vendor_id=${storeId}&page=1&page_size=50`,
        `/api/v4/vendors/${storeId}/reviews/?page=1&page_size=50`,
        `/api/v3/vendors/${storeId}/reviews/`,
        `/api/v2/vendors/${storeId}/reviews/`,
        `/api/reviews/`,
        // 새 패턴
        `/bizes/${storeId}/reviews`,
        `/api/bizes/${storeId}/reviews`,
      ]

      const results: any[] = []
      for (const ep of endpoints) {
        try {
          const url = `https://ceo.yogiyo.co.kr${ep}`
          const res = await fetch(url, { credentials: 'include', headers })
          const text = await res.text()
          const entry: any = { ep, status: res.status, body: text.slice(0, 300) }
          results.push(entry)
          if (res.status === 200) {
            try {
              const json = JSON.parse(text)
              return { ok: true, ep, data: json }
            } catch {}
          }
        } catch (e: any) {
          results.push({ ep, error: e?.message })
        }
      }
      return { ok: false, results }
    }, { storeId, token: authToken.token })

    log.info({
      ok: (apiReviews as any).ok,
      ep: (apiReviews as any).ep,
      results: (apiReviews as any).results,
      dataSample: (apiReviews as any).data
        ? JSON.stringify((apiReviews as any).data).slice(0, 500) : null,
    }, 'yogiyo direct api probe')

    // 5) 리뷰 추출
    let reviews: any[] = []

    if ((apiReviews as any).ok && (apiReviews as any).data) {
      reviews = extractYogiyoReviews((apiReviews as any).data, (apiReviews as any).ep)
      log.info({ count: reviews.length, ep: (apiReviews as any).ep }, 'yogiyo: api reviews extracted')
    }

    // API 실패 시 — 리뷰 탭 페이지 직접 이동해서 DOM 파싱
    if (reviews.length === 0) {
      log.warn('yogiyo: direct api failed, trying DOM scrape on reviews page')
      const reviewsUrl = storeId
        ? `${postLoginOrigin}/reviews/${storeId}`
        : `${postLoginOrigin}/reviews`
      await page.goto(reviewsUrl, { waitUntil: 'load', timeout: 45000 })
      await page.waitForTimeout(15000)
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 800))
        await page.waitForTimeout(1000)
      }

      // window 전역 상태에서 리뷰 추출
      const winState = await page.evaluate(() => {
        const win = window as any
        const sources = [
          win.__NEXT_DATA__, win.__INITIAL_STATE__, win.__STORE__,
          win.__APP_STATE__, win.__PRELOADED_STATE__, win.APP_STATE,
        ]
        for (const s of sources) {
          if (s && typeof s === 'object') return s
        }
        return null
      }).catch(() => null)

      if (winState) {
        reviews = deepExtractReviews(winState)
        log.info({ count: reviews.length }, 'yogiyo: window state extract result')
      }

      if (reviews.length === 0) {
        await dumpPageDiagnostics(page, log, 'yogiyo-all-methods-failed')
      }
    }

    log.info({ reviewsFound: reviews.length }, 'yogiyo collect summary')

    const normalized: CollectedReview[] = reviews
      .filter((r) => r.content || r.author_name)
      .slice(0, 200)
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

function extractYogiyoReviews(data: any, apiUrl: string): any[] {
  if (!data || typeof data !== 'object') return []
  const candidates = [
    data?.reviews, data?.data?.reviews, data?.result?.reviews,
    data?.items, data?.data?.items, data?.result?.items,
    data?.list, data?.data?.list, data?.review_list,
    data?.results, data?.data?.results,
    // DRF pagination: { count, next, results }
    (data?.count !== undefined && Array.isArray(data?.results)) ? data.results : null,
    Array.isArray(data) ? data : null,
  ]
  for (const list of candidates) {
    if (!Array.isArray(list) || list.length === 0) continue
    const first = list[0]
    if (!first || typeof first !== 'object') continue
    const hasReviewFields =
      'rating' in first || 'score' in first || 'content' in first ||
      'body' in first || 'review' in first || 'comment' in first
    if (!hasReviewFields) continue
    return list.map((r: any, idx: number) => ({
      platform_review_id: String(
        r.id || r.review_id || r.reviewId || r.pk ||
        `yogiyo:${idx}:${(r.content || r.body || '').slice(0, 20)}`
      ),
      author_name: r.user_name || r.userName || r.nickname || r.author || r.writer || null,
      rating: r.rating ?? r.score ?? r.star ?? r.stars ?? null,
      content: r.content || r.body || r.review || r.comment || null,
      photos: Array.isArray(r.photos)
        ? r.photos.map((p: any) => (typeof p === 'string' ? p : p.url || p.image_url))
        : Array.isArray(r.images)
        ? r.images.map((p: any) => (typeof p === 'string' ? p : p.url))
        : [],
      posted_at: r.created_at || r.createdAt || r.date || r.reviewed_at || r.registered_at || null,
      has_reply: !!(r.comment || r.reply || r.owner_reply || r.store_reply || r.ceo_reply),
      reply_content:
        r.comment?.content || r.reply?.content ||
        r.owner_reply || r.store_reply || r.ceo_reply || null,
    }))
  }
  return []
}

function deepExtractReviews(data: any, depth = 0): any[] {
  if (depth > 4 || !data || typeof data !== 'object') return []
  if (Array.isArray(data)) {
    if (data.length > 0) {
      const first = data[0]
      if (first && typeof first === 'object' &&
          ('rating' in first || 'score' in first || 'content' in first)) {
        return extractYogiyoReviews(data, 'deep')
      }
    }
    return []
  }
  for (const val of Object.values(data)) {
    const result = deepExtractReviews(val, depth + 1)
    if (result.length > 0) return result
  }
  return []
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
