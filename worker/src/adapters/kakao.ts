// worker/src/adapters/kakao.ts
// ============================================================
// 36차-2 · KakaoMapAdapter
//   · 카카오 계정 로그인 → 장소 리뷰 API 수집 → platform_reviews UPSERT
//   · 리뷰 API: 로그인 세션으로 place-api.map.kakao.com 을 인터셉트
//   · DOM 파싱 fallback: place.map.kakao.com/{placeId}#review 스크롤
//   · 사장님 답글: place.map.kakao.com/{placeId} 내 답글 버튼 (로그인 시 노출)
//
//   셀렉터 / API 경로는 DEBUG_CAPTURE=1 로그 기반으로 튜닝 필요 (MVP 추정값)
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const KAKAO_LOGIN_URL = 'https://accounts.kakao.com/login'
const KAKAO_LOGIN_ALT  = 'https://kauth.kakao.com/oauth/authorize'
const PLACE_BASE       = 'https://place.map.kakao.com'
// 로그인 후 리뷰 수집을 위한 place-api 엔드포인트 (DEBUG_CAPTURE 로 정확한 경로 확인 필요)
const REVIEW_API_BASE  = 'https://place-api.map.kakao.com/places'

// DOM 셀렉터 (place.map.kakao.com 구조 기준 MVP — 실측 후 교체)
const DOM_SELECTORS = {
  // 로그인 폼
  emailInput: 'input[name="loginKey"], input[type="email"], input[placeholder*="이메일"], input[placeholder*="카카오계정"]',
  pwInput:    'input[name="password"], input[type="password"]',
  loginBtn:   'button[type="submit"], .btn_g.highlight, button:has-text("로그인")',
  // 리뷰 카드 (place.map.kakao.com 모바일 웹 구조)
  reviewTab:   'a[href*="review"], button:has-text("리뷰"), [data-tab="review"]',
  reviewCard:  '[class*="ReviewItem"], [class*="review_item"], [data-testid*="review"], li[class*="review"]',
  reviewAuthor:'[class*="name"], [class*="nickname"], [class*="username"]',
  starFilled:  '[class*="StarFilled"], [class*="star_on"], [class*="ico_star_on"]',
  reviewContent: '[class*="comment"], [class*="content"], p[class*="txt"], [class*="review_txt"]',
  reviewDate:  'time, [class*="date"], [class*="time"]',
  reviewPhoto: 'img[src*="kakaocdn"], img[src*="kakao"], img[class*="photo"]',
  ownerReply:  '[class*="OwnerComment"], [class*="owner_reply"], [class*="comment_owner"]',
  // 사장님 답글
  replyButton: 'button:has-text("사장님 댓글"), button:has-text("답글"), [class*="btn_reply"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[placeholder*="댓글"], textarea[class*="reply"]',
  replySubmit:   'button:has-text("등록"), button:has-text("확인"), button:has-text("저장")',
}

export type KakaoOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

export async function runKakao(
  opts: KakaoOptions,
  action: Action,
  payload?: Record<string, unknown>,
): Promise<JobResult> {
  const { userId, browser, log } = opts

  if (action !== 'fetch_reviews' && action !== 'health_check' && action !== 'post_reply') {
    return { status: 'skipped', message: `kakao_map: action ${action} not yet supported` }
  }

  const svc = getServiceClient()
  let creds: any
  try {
    creds = await loadPlainCredentials(svc, userId, 'kakao_map')
  } catch (e: any) {
    if (String(e?.message || '').includes('not_connected')) {
      log.warn({ userId }, 'kakao_map: 사용자가 연결 해제됨 — 큐 잡 skip')
      return { status: 'skipped', message: 'user disconnected' }
    }
    throw e
  }

  // place_id: platform_store_id 에 저장된 카카오맵 장소 ID
  const placeId = creds.platform_store_id
  if (!placeId) {
    return { status: 'failed', message: 'kakao_map: platform_store_id(장소 ID) 없음 — connect 페이지에서 장소 URL 입력 필요' }
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { pf: 'web' },
  })
  const page = await context.newPage()

  // 리뷰 API 응답 인터셉트 (DEBUG_CAPTURE=1 또는 항상)
  const capturedReviews: unknown[] = []
  page.on('response', async (res) => {
    const url = res.url()
    if (!url.includes('review') && !url.includes('comment') && !url.includes('panel3')) return
    try {
      const ct = res.headers()['content-type'] ?? ''
      if (!ct.includes('json')) return
      const json = await res.json().catch(() => null)
      if (json) capturedReviews.push({ url, json })
      log.debug({ url }, 'kakao network review response captured')
    } catch {}
  })

  startNetworkCapture(page, log, ['review', 'comment', 'rating', 'place'])

  try {
    // ── 1) 카카오 로그인 ────────────────────────────
    await page.goto(KAKAO_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 로그인 폼이 없으면 이미 로그인된 세션일 수 있음
    const hasLoginForm = await page.$(DOM_SELECTORS.emailInput).catch(() => null)
    if (hasLoginForm) {
      await page.fill(DOM_SELECTORS.emailInput, creds.account_id)
      await page.waitForTimeout(500)
      await page.fill(DOM_SELECTORS.pwInput, creds.password)
      await page.waitForTimeout(300)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => null),
        page.click(DOM_SELECTORS.loginBtn),
      ])
    }

    await page.waitForTimeout(2000)
    const afterLoginUrl = page.url()

    // 로그인 실패 판정
    if (afterLoginUrl.includes('kakao.com/login') || afterLoginUrl.includes('accounts.kakao')) {
      const { failed, reason } = await detectLoginFailure(page)
      if (failed) {
        await markLoginStatus(svc, userId, 'kakao_map', 'failed', reason || 'stayed on login')
        return { status: 'failed', message: `kakao_map login failed — ${reason}` }
      }
      // 2단계 인증 등
      await dumpPageDiagnostics(page, log, 'kakao-login-stuck')
      return { status: 'failed', message: 'kakao_map: 로그인 후 추가 인증 필요 (2FA/캡챠)' }
    }

    await markLoginStatus(svc, userId, 'kakao_map', 'success')
    if (action === 'health_check') return { status: 'ok', message: 'kakao_map login ok' }

    // ── 2) 장소 리뷰 페이지 이동 ────────────────────
    const placeUrl = `${PLACE_BASE}/${placeId}`
    await page.goto(placeUrl, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(2500)

    // 리뷰 탭 클릭
    const reviewTabEl = await page.$(DOM_SELECTORS.reviewTab).catch(() => null)
    if (reviewTabEl) {
      await reviewTabEl.click()
      await page.waitForTimeout(2000)
    }

    // 스크롤로 리뷰 로드
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200))
      await page.waitForTimeout(600)
    }

    // ── 3) API 인터셉트 결과 우선 처리 ───────────────
    let apiReviews: CollectedReview[] | null = null
    for (const captured of capturedReviews) {
      const data = (captured as any).json
      const reviews = extractReviewsFromApiResponse(data, placeId)
      if (reviews && reviews.length > 0) {
        log.info({ count: reviews.length, url: (captured as any).url }, 'kakao: API reviews extracted')
        apiReviews = reviews
        break
      }
    }

    // ── 4) DOM fallback ───────────────────────────
    if (!apiReviews) {
      const domReviews = await page.evaluate((sel) => {
        const cards = Array.from(document.querySelectorAll(sel.reviewCard))
        return cards.slice(0, 200).map((c, idx) => {
          const author = (c.querySelector(sel.reviewAuthor) as HTMLElement | null)?.innerText?.trim() ?? null
          const filledStars = c.querySelectorAll(sel.starFilled).length
          const rating = filledStars > 0 && filledStars <= 5 ? filledStars : null
          const content = (c.querySelector(sel.reviewContent) as HTMLElement | null)?.innerText?.trim() ?? null
          const dateEl = c.querySelector(sel.reviewDate) as HTMLElement | null
          const posted = dateEl?.getAttribute('datetime') || dateEl?.innerText?.trim() || null
          const photos = Array.from(c.querySelectorAll(sel.reviewPhoto))
            .map((img) => (img as HTMLImageElement).src)
            .filter(Boolean)
          const hasReply = !!c.querySelector(sel.ownerReply)
          const replyContent = hasReply
            ? (c.querySelector(sel.ownerReply) as HTMLElement | null)?.innerText?.trim() ?? null
            : null
          const idAttr =
            (c as HTMLElement).getAttribute('data-review-id') ||
            (c as HTMLElement).getAttribute('data-comment-id') ||
            (c as HTMLElement).getAttribute('data-id') ||
            null
          return {
            platform_review_id: idAttr || `kakao:${idx}:${(content || '').slice(0, 20)}:${posted || ''}`,
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

      if (!domReviews || domReviews.length === 0) {
        await dumpPageDiagnostics(page, log, 'kakao-no-review-cards')
        log.warn('kakao_map: DOM 파싱 실패 — DEBUG_CAPTURE=1 환경변수로 재수집하면 API 엔드포인트 확인 가능')
      }

      apiReviews = domReviews
        .filter((r) => r.content || r.author_name)
        .map((r) => ({ ...r, posted_at: normalizeDate(r.posted_at) }))
    }

    const res = await upsertReviews(svc, userId, 'kakao_map', placeId, apiReviews ?? [])
    log.info({ ...res }, 'kakao_map reviews upserted')

    // ── 5) post_reply ────────────────────────────
    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const reviewDbId = payload.review_db_id ? String(payload.review_db_id) : null
      const col = reviewDbId ? 'id' : 'platform_review_id'
      const val = reviewDbId ?? targetId

      // v1.6y: 리뷰 정보 미리 조회 (작성자 + 본문 매칭용 fallback)
      let reviewInfo: { author?: string | null; content?: string | null } = {}
      try {
        const { data } = await svc
          .from('platform_reviews')
          .select('author_name, content')
          .eq(col, val)
          .eq('user_id', userId)
          .maybeSingle()
        if (data) reviewInfo = { author: data.author_name, content: data.content }
      } catch {}

      const replied = await postKakaoReply(page, targetId, replyText, reviewInfo, log)
      if (replied.ok) {
        await svc
          .from('platform_reviews')
          .update({
            has_reply: true,
            reply_content: replyText,
            reply_status: 'submitted',
            reply_submitted_at: new Date().toISOString(),
            reply_error: null,
          })
          .eq(col, val)
          .eq('user_id', userId)
        return { status: 'ok', message: `kakao_map: reply posted for ${targetId}` }
      }
      await svc
        .from('platform_reviews')
        .update({ reply_status: 'failed', reply_error: replied.reason })
        .eq(col, val)
        .eq('user_id', userId)
      return { status: 'failed', message: `kakao_map reply 실패: ${replied.reason}` }
    }

    return {
      status: 'ok',
      message: `kakao_map: collected ${res.total}, upserted ${res.inserted}`,
      data: res,
    }
  } catch (e: any) {
    log.error({ err: e?.message }, 'kakao_map error')
    return { status: 'failed', message: `kakao_map: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

// ─────────────────────────────────────────────
// API 응답에서 리뷰 배열 추출 (panel3 + place-api 양식 지원)
// ─────────────────────────────────────────────
function extractReviewsFromApiResponse(data: unknown, placeId: string): CollectedReview[] | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, any>

  // panel3 형식: kakaomap_review.reviews[]
  const panel3Reviews = d?.kakaomap_review?.reviews
  if (Array.isArray(panel3Reviews) && panel3Reviews.length > 0) {
    return panel3Reviews.map((r: any, idx: number) => ({
      platform_review_id: String(r.review_id ?? `kakao:${placeId}:${idx}`),
      author_name: r.meta?.owner?.nickname ?? r.author?.nickname ?? null,
      rating: r.star_rating ?? r.starRating ?? null,
      content: r.contents ?? r.body ?? null,
      photos: Array.isArray(r.photos) ? r.photos.map((p: any) => p.original_url ?? p.url ?? p) : [],
      posted_at: normalizeDate(r.registered_at ?? r.created_at ?? null),
      has_reply: !!(r.comment_owner || r.owner_reply),
      reply_content: r.comment_owner?.content ?? r.owner_reply ?? null,
    }))
  }

  // place-api 형식: data.reviews[] 또는 result.reviews[]
  const listReviews = d?.reviews ?? d?.result?.reviews ?? d?.data?.reviews
  if (Array.isArray(listReviews) && listReviews.length > 0) {
    return listReviews.map((r: any, idx: number) => ({
      platform_review_id: String(r.id ?? r.reviewId ?? r.review_id ?? `kakao:${placeId}:${idx}`),
      author_name: r.writer?.nickname ?? r.user?.nickname ?? r.author ?? null,
      rating: r.star ?? r.rating ?? r.starRating ?? null,
      content: r.content ?? r.body ?? r.text ?? null,
      photos: Array.isArray(r.photos) ? r.photos.map((p: any) => p.url ?? p) : [],
      posted_at: normalizeDate(r.createdAt ?? r.created_at ?? r.registeredAt ?? null),
      has_reply: !!(r.ownerComment ?? r.ownerReply),
      reply_content: r.ownerComment?.content ?? r.ownerReply ?? null,
    }))
  }

  return null
}

// ─────────────────────────────────────────────
// 사장님 답글 등록 (place.map.kakao.com 기반)
//   v1.6y — 카드 찾기 다단계 fallback (data 속성 → 작성자 매칭 → 본문 매칭)
//   카카오는 사장님 권한이 카카오 비즈니스 (https://place-mall.kakao.com)
//   계정과 연결돼 있어야 답글 버튼이 노출됨
// ─────────────────────────────────────────────
async function postKakaoReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  reviewInfo: { author?: string | null; content?: string | null },
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    log.info({ platformReviewId, hasAuthor: !!reviewInfo.author, hasContent: !!reviewInfo.content }, 'kakao_map: post_reply 시작')

    // v1.6y: 리뷰 탭 진입 보장
    const reviewTabEl = await page.$(DOM_SELECTORS.reviewTab).catch(() => null)
    if (reviewTabEl) {
      await reviewTabEl.click().catch(() => null)
      await page.waitForTimeout(1500)
    }

    // 스크롤하면서 모든 리뷰 로드 시도 (lazy load 대응)
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000)).catch(() => null)
      await page.waitForTimeout(500)
    }

    // ── 1단계: data 속성으로 카드 찾기 ──
    let card = await page.$(
      `[data-review-id="${platformReviewId}"], [data-comment-id="${platformReviewId}"], [data-id="${platformReviewId}"]`,
    ).catch(() => null)

    // ── 2단계: 작성자 + 본문 텍스트 매칭 ──
    if (!card && (reviewInfo.author || reviewInfo.content)) {
      const author = reviewInfo.author || ''
      const contentSnippet = (reviewInfo.content || '').slice(0, 30)
      log.info({ author, contentSnippet }, 'kakao_map: data 속성 매칭 실패 → 작성자/본문 매칭 시도')

      card = await page.evaluateHandle((args: { selector: string; author: string; content: string }) => {
        const cards = Array.from(document.querySelectorAll(args.selector))
        for (const c of cards) {
          const text = (c as HTMLElement).innerText || ''
          const matchAuthor = args.author && text.includes(args.author)
          const matchContent = args.content && text.includes(args.content)
          if (matchAuthor || matchContent) return c
        }
        return null
      }, { selector: DOM_SELECTORS.reviewCard, author, content: contentSnippet }).catch(() => null)

      const isNull = card ? await card.evaluate((el: any) => el == null).catch(() => true) : true
      if (isNull) card = null
    }

    if (!card) {
      await dumpPageDiagnostics(page, log, 'kakao-reply-card-not-found')
      return { ok: false, reason: `리뷰 카드 못찾음 (${platformReviewId}) — 카카오 비즈니스 권한 또는 페이지 구조 변경 가능` }
    }

    // ── 사장님 답글 버튼 ──
    const replyBtn = await card.$(DOM_SELECTORS.replyButton).catch(() => null)
    if (!replyBtn) {
      await dumpPageDiagnostics(page, log, 'kakao-reply-button-missing')
      return { ok: false, reason: '사장님 댓글 버튼 없음 — 카카오 비즈니스 (place-mall.kakao.com) 매장 연결 확인 필요' }
    }
    await replyBtn.click()
    await page.waitForTimeout(1500)

    // ── 텍스트 입력 ──
    const textarea = await page.$(DOM_SELECTORS.replyTextarea).catch(() => null)
    if (!textarea) {
      await dumpPageDiagnostics(page, log, 'kakao-reply-textarea-missing')
      return { ok: false, reason: '답글 입력창 못찾음 (DOM 변경 가능)' }
    }
    await textarea.fill(replyText)
    await page.waitForTimeout(500)

    // ── 등록 버튼 ──
    const submit = await page.$(DOM_SELECTORS.replySubmit).catch(() => null)
    if (!submit) {
      await dumpPageDiagnostics(page, log, 'kakao-reply-submit-missing')
      return { ok: false, reason: '답글 등록 버튼 못찾음' }
    }
    await submit.click()
    await page.waitForTimeout(2500)

    // ── 검증: 답글이 실제로 등록됐는지 확인 ──
    const verified = await page.evaluate((args: { reply: string }) => {
      const candidates = Array.from(document.querySelectorAll(
        '[class*="OwnerComment"], [class*="owner_reply"], [class*="comment_owner"]',
      ))
      const snippet = args.reply.trim().slice(0, 25)
      return candidates.some((el) => ((el as HTMLElement).innerText || '').includes(snippet))
    }, { reply: replyText }).catch(() => false)

    if (!verified) {
      log.warn({ platformReviewId }, 'kakao_map: submit 클릭됐으나 답글 노출 검증 실패 (성공으로 간주하되 다음 fetch 에서 재확인)')
    }

    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'kakao reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}

// ─────────────────────────────────────────────
// 날짜 정규화
// ─────────────────────────────────────────────
function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  // "2026-04-21 18:42:38" KST
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (m1) {
    return `${m1[1]}-${m1[2]}-${m1[3]}T${m1[4]}:${m1[5]}:${m1[6]}+09:00`
  }
  const m2 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}T00:00:00+09:00`
  }
  const now = new Date()
  const mDay = s.match(/(\d+)일\s*전/)
  if (mDay) {
    now.setDate(now.getDate() - parseInt(mDay[1], 10))
    return now.toISOString()
  }
  return null
}
