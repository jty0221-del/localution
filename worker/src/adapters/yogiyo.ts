// worker/src/adapters/yogiyo.ts (rebuilt)
// ============================================================
// 33차 · YogiyoAdapter — Playwright response intercept 방식
// page.on('response') → Node.js 레벨에서 모든 JSON API 응답 캡처
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, detectLoginFailure } from '../lib/diagnostics'
import { notifyNewReviews } from '../lib/notify'
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
    },
  })
  const page = await context.newPage()

  // ── Playwright 레벨 응답 인터셉터 (CORS 우회, 모든 JSON 캡처) ──
  const capturedJsonResponses: Array<{ url: string; status: number; body: any }> = []
  page.on('response', async (response) => {
    const url = response.url()
    const ct = response.headers()['content-type'] || ''
    // JSON API만 수집 (HTML/CSS/JS/이미지 제외)
    if (!ct.includes('application/json') && !ct.includes('text/json')) return
    // 로그인/인증 엔드포인트 제외
    if (url.includes('/login') || url.includes('/token') || url.includes('/refresh')) return
    try {
      const body = await response.json()
      capturedJsonResponses.push({ url, status: response.status(), body })
      log.info({ url, status: response.status() }, 'yogiyo: json response captured')
    } catch { /* body not JSON */ }
  })

  try {
    // 1) 로그인
    await page.goto(LOGIN_URL, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(3000)

    const pwLocator = page.locator(DOM_SELECTORS.pwInput).first()
    const pwVisible = await pwLocator.waitFor({ state: 'visible', timeout: 25000 }).then(() => true).catch(() => false)
    if (!pwVisible) {
      await dumpPageDiagnostics(page, log, 'yogiyo-login-form-missing')
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', 'login form not found')
      return { status: 'failed', message: 'yogiyo 로그인 폼을 찾지 못했습니다' }
    }

    // 아이디 입력
    const idCandidates = [
      'input[name="username"]', 'input[name="loginId"]', 'input[name="email"]',
      'input[type="email"]', 'input[placeholder*="아이디"]', 'input[placeholder*="이메일"]',
    ]
    let idFilled = false
    for (const sel of idCandidates) {
      try {
        const loc = page.locator(sel).first()
        const visible = await loc.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)
        if (visible) {
          await loc.fill(creds.account_id)
          idFilled = true
          log.info({ sel }, 'yogiyo id input filled')
          break
        }
      } catch { continue }
    }
    if (!idFilled) {
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', 'id input not found')
      return { status: 'failed', message: 'yogiyo ID 입력 필드를 찾지 못했습니다' }
    }

    await pwLocator.fill(creds.password)
    await page.waitForTimeout(300)
    await page.locator(DOM_SELECTORS.loginBtn).first().click()
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 20000 }).catch(() => null)
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      const { failed, reason } = await detectLoginFailure(page)
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', reason || 'stayed on login')
      return { status: 'failed', message: failed ? `yogiyo login failed — ${reason}` : 'yogiyo login failed' }
    }

    await markLoginStatus(svc, userId, 'yogiyo', 'success')
    if (action === 'health_check') return { status: 'ok', message: 'yogiyo login ok' }

    const storeId = creds.platform_store_id || ''
    const origin = (() => { try { return new URL(page.url()).origin } catch { return 'https://ceo.yogiyo.co.kr' } })()

    // 2) 홈 → 리뷰 탭 순서로 이동해 SPA API 호출 트리거
    // 홈 이동 (SPA 초기화)
    await page.goto(`${origin}/self-service-home/`, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(5000)

    // 리뷰 페이지 이동 (SPA가 reviews API 호출함)
    const reviewsUrl = storeId ? `${origin}/reviews/${storeId}` : `${origin}/reviews/`
    await page.goto(reviewsUrl, { waitUntil: 'load', timeout: 45000 })
    // 충분히 대기 — SPA 렌더링 + API 응답 완료
    await page.waitForTimeout(12000)

    // 스크롤로 더 많은 리뷰 로드 시도
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000))
      await page.waitForTimeout(2000)
    }

    log.info({
      capturedCount: capturedJsonResponses.length,
      urls: capturedJsonResponses.map(r => `${r.status} ${r.url}`).slice(0, 15),
    }, 'yogiyo: all captured json responses')

    // 3) 캡처된 응답에서 리뷰 추출
    let reviews: any[] = []
    for (const resp of capturedJsonResponses) {
      const extracted = extractYogiyoReviews(resp.body, resp.url)
      if (extracted.length > 0) {
        reviews = extracted
        log.info({ count: reviews.length, url: resp.url }, 'yogiyo: reviews extracted from captured response')
        break
      }
    }

    // 4) API 캡처 실패 시 — 쿠키 기반 직접 API 호출
    if (reviews.length === 0 && capturedJsonResponses.length === 0) {
      log.warn('yogiyo: no json responses captured, trying direct API with cookies')
      const apiResult = await page.evaluate(async (sid: string) => {
        const endpoints = [
          `/api/v4/reviews/?page=1&page_size=50`,
          `/api/v4/reviews/?vendor_id=${sid}&page=1&page_size=50`,
          `/api/v4/vendors/${sid}/reviews/?page=1&page_size=50`,
          `/api/v1/reviews/?page=1&page_size=50`,
        ]
        for (const path of endpoints) {
          try {
            const res = await fetch(path, {
              credentials: 'include',
              headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
            const ct = res.headers.get('content-type') || ''
            if (ct.includes('json')) {
              const data = await res.json()
              return { ok: true, path, status: res.status, data }
            }
          } catch (e: any) {
            // continue
          }
        }
        return { ok: false }
      }, storeId)

      if (apiResult.ok && (apiResult as any).data) {
        reviews = extractYogiyoReviews((apiResult as any).data, (apiResult as any).path)
        log.info({ count: reviews.length, path: (apiResult as any).path }, 'yogiyo: direct relative api success')
      } else {
        log.warn({ result: (apiResult as any) }, 'yogiyo: direct api also failed')
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

    // v1.6p: 새 리뷰 들어왔을 때 알림 트리거 (배민과 동일 패턴)
    if (res.inserted > 0 && action !== 'post_reply') {
      try {
        const notifyRes = await notifyNewReviews(log, {
          userId, platform: 'yogiyo', reviewIds: 'all_new',
        })
        log.info({ ...notifyRes }, 'yogiyo: notification triggered')
      } catch (notifyErr: any) {
        log.warn({ err: notifyErr?.message }, 'yogiyo: notification trigger failed (non-fatal)')
      }
    }

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
    (data?.count !== undefined && Array.isArray(data?.results)) ? data.results : null,
    Array.isArray(data) ? data : null,
  ]
  for (const list of candidates) {
    if (!Array.isArray(list) || list.length === 0) continue
    const first = list[0]
    if (!first || typeof first !== 'object') continue
    if (!('rating' in first || 'score' in first || 'content' in first || 'body' in first || 'comment' in first)) continue
    return list.map((r: any, idx: number) => ({
      platform_review_id: String(r.id || r.review_id || r.reviewId || r.pk || `yogiyo:${idx}:${(r.content || r.body || '').slice(0, 20)}`),
      author_name: r.user_name || r.userName || r.nickname || r.author || r.writer || null,
      rating: r.rating ?? r.score ?? r.star ?? r.stars ?? null,
      content: r.content || r.body || r.review || r.comment || null,
      photos: Array.isArray(r.photos)
        ? r.photos.map((p: any) => (typeof p === 'string' ? p : p.url || p.image_url))
        : Array.isArray(r.images) ? r.images.map((p: any) => (typeof p === 'string' ? p : p.url)) : [],
      posted_at: r.created_at || r.createdAt || r.date || r.reviewed_at || r.registered_at || null,
      has_reply: !!(r.comment || r.reply || r.owner_reply || r.store_reply || r.ceo_reply),
      reply_content: r.comment?.content || r.reply?.content || r.owner_reply || r.store_reply || r.ceo_reply || null,
    }))
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
