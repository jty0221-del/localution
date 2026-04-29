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

  // fetch / XHR 인터셉터 주입 — React 앱이 실제 호출하는 API 도메인 파악
  await page.addInitScript(() => {
    const win = window as any
    win.__capturedRequests = []
    const _fetch = window.fetch
    window.fetch = async function (...args: any[]) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || ''
      const res = await _fetch.apply(this, args)
      const clone = res.clone()
      clone.text().then((t: string) => {
        win.__capturedRequests.push({ url, status: res.status, body: t.slice(0, 300), type: 'fetch' })
      }).catch(() => {})
      return res
    }
    // XHR 인터셉터
    const XHR = XMLHttpRequest.prototype
    const _open = XHR.open as any
    XHR.open = function (method: string, url: string, ...rest: any[]) {
      (this as any).__url = url
      return _open.apply(this, [method, url, ...rest])
    }
    const _send = XHR.send
    XHR.send = function (...args: any[]) {
      this.addEventListener('load', function () {
        win.__capturedRequests.push({
          url: (this as any).__url,
          status: (this as any).status,
          body: (this as any).responseText?.slice(0, 300),
          type: 'xhr',
        })
      })
      return _send.apply(this, args)
    }
  })

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

    // 2-b) 홈 로드 후 캡처된 요청 확인
    const homeRequests = await page.evaluate(() => (window as any).__capturedRequests || [])
    log.info({
      count: homeRequests.length,
      urls: homeRequests.map((r: any) => `[${r.type}] ${r.status} ${r.url}`).slice(0, 20),
    }, 'yogiyo home page captured requests')

    // 3) 쿠키에서 EXT_REFRESH_TOKEN 추출 → 액세스 토큰 교환
    const storeId = creds.platform_store_id || ''

    const tokenResult = await page.evaluate(async (sid: string) => {
      // 쿠키 파싱
      const cookies: Record<string, string> = {}
      document.cookie.split(';').forEach(c => {
        const idx = c.indexOf('=')
        if (idx > 0) cookies[c.slice(0, idx).trim()] = c.slice(idx + 1).trim()
      })
      const refreshToken = cookies['EXT_REFRESH_TOKEN'] || cookies['refresh_token'] || null
      const accessToken = cookies['EXT_ACCESS_TOKEN'] || cookies['access_token'] || null

      // localStorage/sessionStorage 도 확인
      const allStorage: Record<string, string> = {}
      try { Object.assign(allStorage, { ...localStorage, ...sessionStorage }) } catch {}
      const storageRefresh = Object.entries(allStorage).find(([k]) =>
        k.toLowerCase().includes('refresh'))?.[1] || null
      const storageAccess = Object.entries(allStorage).find(([k]) =>
        k.toLowerCase().includes('access') || k.toLowerCase().includes('token'))?.[1] || null

      const finalRefresh = refreshToken || storageRefresh
      const finalAccess = accessToken || storageAccess

      // 액세스 토큰이 이미 있으면 바로 사용
      if (finalAccess && finalAccess.startsWith('ey')) {
        return { accessToken: finalAccess, source: 'cookie/storage', refreshToken: finalRefresh }
      }

      // 리프레시 토큰으로 액세스 토큰 교환
      if (finalRefresh) {
        const refreshEndpoints = [
          'https://ceo.yogiyo.co.kr/api/v4/users/login/refresh/',
          'https://ceo.yogiyo.co.kr/api/v1/users/token/refresh/',
          'https://ceo.yogiyo.co.kr/api/v2/users/token/refresh/',
          'https://ceo.yogiyo.co.kr/users/token/refresh/',
          'https://ceo.yogiyo.co.kr/api/v4/token/refresh/',
        ]
        for (const ep of refreshEndpoints) {
          try {
            const res = await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ refresh: finalRefresh }),
            })
            const text = await res.text()
            if (res.status === 200 && text.includes('{')) {
              const json = JSON.parse(text)
              if (json.access || json.access_token || json.token) {
                return {
                  accessToken: json.access || json.access_token || json.token,
                  source: ep,
                  refreshToken: finalRefresh,
                }
              }
            }
          } catch {}
        }
      }

      // 4) 토큰 없어도 쿠키만으로 API 시도
      // 요기요 실제 API 도메인 탐색
      const apiDomains = [
        'https://ceo.yogiyo.co.kr',
        'https://api.yogiyo.co.kr',
        'https://order.yogiyo.co.kr',
      ]
      const reviewPaths = [
        `/api/v4/reviews/?page=1&page_size=50`,
        `/api/v4/reviews/?vendor_id=${sid}&page=1&page_size=50`,
        `/api/v4/vendors/${sid}/reviews/?page=1&page_size=50`,
        `/v4/reviews/?vendor_id=${sid}`,
        `/reviews/?vendor_id=${sid}`,
      ]
      const probeResults: any[] = []
      for (const domain of apiDomains) {
        for (const path of reviewPaths) {
          try {
            const res = await fetch(`${domain}${path}`, {
              credentials: 'include',
              headers: { Accept: 'application/json' },
            })
            const text = await res.text()
            probeResults.push({ url: `${domain}${path}`, status: res.status, isJson: text.startsWith('{') || text.startsWith('[') })
            if (res.status === 200 && (text.startsWith('{') || text.startsWith('['))) {
              return { accessToken: null, source: 'cookie-only', apiData: JSON.parse(text), apiUrl: `${domain}${path}` }
            }
          } catch (e: any) {
            probeResults.push({ url: `${domain}${path}`, error: e?.message })
          }
        }
      }

      return {
        accessToken: finalAccess,
        refreshToken: finalRefresh,
        source: 'none',
        cookieKeys: Object.keys(cookies),
        storageKeys: Object.keys(allStorage).slice(0, 10),
        probeResults: probeResults.slice(0, 10),
      }
    }, storeId)

    log.info({
      source: (tokenResult as any).source,
      hasAccess: !!(tokenResult as any).accessToken,
      hasRefresh: !!(tokenResult as any).refreshToken,
      cookieKeys: (tokenResult as any).cookieKeys,
      probeResults: (tokenResult as any).probeResults,
      directApiData: (tokenResult as any).apiData
        ? JSON.stringify((tokenResult as any).apiData).slice(0, 400) : null,
    }, 'yogiyo token + api probe result')

    // 5) 리뷰 추출
    let reviews: any[] = []

    // 직접 API 데이터 (쿠키만으로 성공)
    if ((tokenResult as any).apiData) {
      reviews = extractYogiyoReviews((tokenResult as any).apiData, (tokenResult as any).apiUrl)
      log.info({ count: reviews.length }, 'yogiyo: cookie-only api success')
    }

    // 액세스 토큰으로 API 호출
    if (reviews.length === 0 && (tokenResult as any).accessToken) {
      const accessToken = (tokenResult as any).accessToken
      const apiData = await page.evaluate(async (args: { token: string; sid: string }) => {
        const { token, sid } = args
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
        const endpoints = [
          `https://ceo.yogiyo.co.kr/api/v4/reviews/?page=1&page_size=50`,
          `https://ceo.yogiyo.co.kr/api/v4/reviews/?vendor_id=${sid}&page=1&page_size=50`,
          `https://ceo.yogiyo.co.kr/api/v4/vendors/${sid}/reviews/?page=1&page_size=50`,
          `https://api.yogiyo.co.kr/api/v4/reviews/?vendor_id=${sid}`,
          `https://api.yogiyo.co.kr/v4/reviews/?vendor_id=${sid}`,
        ]
        for (const url of endpoints) {
          try {
            const res = await fetch(url, { credentials: 'include', headers })
            const text = await res.text()
            if (res.status === 200 && (text.startsWith('{') || text.startsWith('['))) {
              return { url, data: JSON.parse(text) }
            }
          } catch {}
        }
        return null
      }, { token: accessToken, sid: storeId })

      if (apiData) {
        reviews = extractYogiyoReviews((apiData as any).data, (apiData as any).url)
        log.info({ count: reviews.length, url: (apiData as any).url }, 'yogiyo: token api success')
      }
    }

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

      // 리뷰 페이지에서 캡처된 실제 API 요청 로깅
      const reviewPageRequests = await page.evaluate(() => (window as any).__capturedRequests || [])
      log.info({
        count: reviewPageRequests.length,
        allUrls: reviewPageRequests.map((r: any) => `[${r.type}] ${r.status} ${r.url}`),
        jsonCalls: reviewPageRequests.filter((r: any) => r.body?.startsWith('{')).map((r: any) => ({
          url: r.url, status: r.status, bodySample: r.body?.slice(0, 200),
        })),
      }, 'yogiyo reviews page captured requests — actual api urls')

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
