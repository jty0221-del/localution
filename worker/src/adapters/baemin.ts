// worker/src/adapters/baemin.ts
// ============================================================
// 39차-1 · BaeminAdapter (self.baemin.com)
//   · CEO_HOME 방문 → 대시보드 텍스트로 인증 상태 확인
//   · 미인증 → 로그인 버튼 클릭 → 폼 입력 → 로그인
//   · 리뷰 페이지 이동 시 XHR 자동 캡처 (DOM 파싱보다 안정적)
//   · XHR 실패 시 DOM 텍스트 파싱 폴백 (리뷰번호/한국날짜 패턴)
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, detectLoginFailure } from '../lib/diagnostics'
import { verifyReplySubmitted } from '../lib/post-reply-verify'
import type { JobResult, Action } from '../jobs'

const CEO_HOME = 'https://self.baemin.com/'
const REVIEWS_URL = 'https://self.baemin.com/shops/{shopId}/reviews'

// 로그인 폼 셀렉터 (공개 랜딩 페이지 기준)
const LOGIN_SELECTORS = {
  loginTrigger:
    'a[href*="login"], a:has-text("사장님 로그인"), a:has-text("로그인"), button:has-text("로그인"), button:has-text("사장님 로그인")',
  idInput:
    'input[name="id"], input[type="text"][placeholder*="아이디"], input[name="loginId"], input[type="email"], input[placeholder*="아이디"]',
  pwInput: 'input[name="password"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인")',
  replyButton:
    'button:has-text("답글"), button:has-text("사장님 답글"), [class*="replyButton"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[class*="reply"]',
  replySubmit: 'button:has-text("등록"), button:has-text("저장"), button:has-text("확인")',
}

// 인증된 대시보드에서만 보이는 텍스트 키워드
const DASHBOARD_KEYWORDS = ['리뷰관리', '가게관리', '주문관리', '정산관리', '배달현황']

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
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()

  // ── XHR 캡처 세팅 (페이지 로드 전에 등록) ───────────────────
  const capturedApiResponses: Array<{ url: string; data: any }> = []
  page.on('response', async (response) => {
    try {
      const url = response.url()
      const ct = response.headers()['content-type'] || ''
      if (
        ct.includes('json') &&
        (url.includes('review') || url.includes('feedback') || url.includes('rating'))
      ) {
        const data = await response.json().catch(() => null)
        if (data) {
          log.info({ url }, 'baemin: XHR captured')
          capturedApiResponses.push({ url, data })
        }
      }
    } catch {}
  })

  try {
    // ── 1) CEO_HOME 방문 ──────────────────────────────────────
    log.info('baemin: navigating to CEO_HOME')
    await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)

    // ── 2) 인증 상태 확인 (대시보드 키워드 존재 여부) ──────────
    const isAuthenticated = await page.evaluate((keywords: string[]) => {
      const body = document.body.textContent || ''
      const hasKeyword = keywords.some((k) => body.includes(k))
      const hasShopLink = !!document.querySelector('a[href*="/shops/"]')
      return hasKeyword || hasShopLink
    }, DASHBOARD_KEYWORDS)

    log.info({ isAuthenticated, url: page.url() }, 'baemin: auth check result')

    if (!isAuthenticated) {
      // ── 3) 로그인 진입 ──────────────────────────────────────
      log.info('baemin: not authenticated — looking for login trigger')
      const loginTrigger = await page.$(LOGIN_SELECTORS.loginTrigger)

      if (loginTrigger) {
        log.info('baemin: clicking login trigger')
        await loginTrigger.click()
        await page.waitForTimeout(2500)
      } else {
        // 버튼 못 찾으면 현재 페이지 덤프 후 실패
        log.warn({ url: page.url() }, 'baemin: no login trigger found')
        await dumpPageDiagnostics(page, log, 'baemin-no-login-trigger')
        return {
          status: 'failed',
          message:
            'baemin: 로그인 버튼을 찾을 수 없음 — 배민 UI 구조 변경 확인 필요 (로그 덤프 참고)',
        }
      }

      // ── 4) 비밀번호 입력 필드 대기 ──────────────────────────
      const pwInput = await page
        .waitForSelector(LOGIN_SELECTORS.pwInput, { timeout: 15000 })
        .catch(() => null)
      if (!pwInput) {
        log.warn({ url: page.url() }, 'baemin: password input not found after trigger click')
        await dumpPageDiagnostics(page, log, 'baemin-no-pw-input')
        return {
          status: 'failed',
          message:
            'baemin: 로그인 폼 진입 실패 — 페이지 구조 변경 또는 팝업 차단 가능성 (로그 덤프 참고)',
        }
      }

      // ── 5) 크리덴셜 입력 ─────────────────────────────────────
      const idInput = await page.$(LOGIN_SELECTORS.idInput)
      if (idInput) {
        await idInput.fill(creds.account_id)
        await page.waitForTimeout(400)
      }
      await pwInput.fill(creds.password)
      await page.waitForTimeout(400)

      log.info('baemin: submitting login form')
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null),
        page.click(LOGIN_SELECTORS.loginBtn),
      ])
      await page.waitForTimeout(2500)

      // ── 6) 로그인 결과 확인 ───────────────────────────────────
      const afterUrl = page.url()
      log.info({ afterUrl }, 'baemin: post-login URL')

      if (afterUrl.includes('captcha') || afterUrl.includes('block')) {
        await markLoginStatus(svc, userId, 'baemin', 'captcha', afterUrl)
        return { status: 'failed', message: 'baemin: captcha/block 감지 — 수동 로그인 필요' }
      }
      if (afterUrl.includes('login')) {
        const { failed, reason } = await detectLoginFailure(page)
        await markLoginStatus(svc, userId, 'baemin', 'failed', reason || 'stayed on login')
        return {
          status: 'failed',
          message: `baemin: 로그인 실패 — ${reason || '아이디/비밀번호 확인 필요'}`,
        }
      }

      // 로그인 후 대시보드 확인
      const postLoginAuth = await page.evaluate((keywords: string[]) => {
        const body = document.body.textContent || ''
        return keywords.some((k) => body.includes(k)) || !!document.querySelector('a[href*="/shops/"]')
      }, DASHBOARD_KEYWORDS)

      if (!postLoginAuth) {
        log.warn({ url: page.url() }, 'baemin: no dashboard after login — credentials may be wrong')
        await dumpPageDiagnostics(page, log, 'baemin-post-login-no-dashboard')
        await markLoginStatus(svc, userId, 'baemin', 'failed', 'no dashboard after login')
        return {
          status: 'failed',
          message: 'baemin: 로그인 후 대시보드 미확인 — 아이디/비밀번호 재확인 필요',
        }
      }

      await markLoginStatus(svc, userId, 'baemin', 'success')
      log.info('baemin: login success')
    }

    if (action === 'health_check') {
      return { status: 'ok', message: 'baemin login ok' }
    }

    // ── 7) 매장 ID 확인 ──────────────────────────────────────
    let shopId: string | null = creds.platform_store_id || null
    if (!shopId) {
      shopId = await page.evaluate(() => {
        const a = document.querySelector('a[href*="/shops/"]') as HTMLAnchorElement | null
        if (!a) return null
        const m = a.href.match(/\/shops\/(\d+)/)
        return m ? m[1] : null
      })
    }
    if (!shopId) {
      return { status: 'failed', message: 'baemin: shopId 없음 — platform_store_id 등록 필요' }
    }

    // ── 8) 리뷰 페이지 이동 (XHR 캡처 자동) ──────────────────
    const reviewsUrl = REVIEWS_URL.replace('{shopId}', String(shopId))
    log.info({ reviewsUrl }, 'baemin: navigating to reviews page')
    await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(3000)

    // 스크롤로 lazy-load 트리거 (더 많은 XHR 유발)
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200))
      await page.waitForTimeout(700)
    }

    log.info(
      { capturedCount: capturedApiResponses.length },
      'baemin: XHR capture summary',
    )

    // ── 9) XHR 기반 리뷰 추출 ────────────────────────────────
    let reviews: CollectedReview[] = []

    if (capturedApiResponses.length > 0) {
      for (const { url, data } of capturedApiResponses) {
        const extracted = extractReviewsFromApiResponse(data, log)
        if (extracted.length > 0) {
          log.info({ url, count: extracted.length }, 'baemin: reviews extracted from XHR')
          reviews = [...reviews, ...extracted]
          break // 첫 번째 유효한 응답에서 추출 성공하면 중지
        }
      }
    }

    // ── 10) DOM 텍스트 파싱 폴백 ─────────────────────────────
    if (reviews.length === 0) {
      log.info('baemin: XHR extraction 0 → DOM text parsing fallback')
      reviews = await extractReviewsFromDom(page, log)
    }

    log.info({ count: reviews.length }, 'baemin: total reviews parsed')

    if (reviews.length === 0) {
      await dumpPageDiagnostics(page, log, 'baemin-no-reviews-final')
    }

    const res = await upsertReviews(svc, userId, 'baemin', String(shopId), reviews)
    log.info({ ...res }, 'baemin: reviews upserted')

    // ── 11) post_reply ────────────────────────────────────────
    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const replied = await postBaeminReply(page, targetId, replyText, log)
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

// ── XHR 응답에서 리뷰 배열 추출 ─────────────────────────────
function extractReviewsFromApiResponse(data: any, log: Logger): CollectedReview[] {
  if (!data || typeof data !== 'object') return []

  // 가능한 review 배열 경로들 순서대로 탐색
  const candidates = [
    data,
    data?.data,
    data?.result,
    data?.reviews,
    data?.items,
    data?.content,
    data?.list,
    data?.reviewList,
    data?.data?.reviews,
    data?.data?.items,
    data?.data?.list,
    data?.result?.reviews,
    data?.result?.items,
  ].filter(Boolean)

  for (const candidate of candidates) {
    const arr = Array.isArray(candidate)
      ? candidate
      : Array.isArray(candidate?.reviews)
        ? candidate.reviews
        : Array.isArray(candidate?.items)
          ? candidate.items
          : Array.isArray(candidate?.list)
            ? candidate.list
            : null

    if (!arr || arr.length === 0) continue

    const firstItem = arr[0]
    if (!firstItem || typeof firstItem !== 'object') continue

    const keys = Object.keys(firstItem)
    log.info({ keys: keys.slice(0, 20) }, 'baemin: API candidate item keys')

    // 리뷰 필드 존재 여부 확인
    const reviewFieldNames = [
      'rating',
      'content',
      'nickname',
      'score',
      'starScore',
      'reviewContent',
      'authorName',
      'reviewId',
      'userId',
    ]
    const hasReviewFields = keys.some((k) => reviewFieldNames.includes(k))
    if (!hasReviewFields) continue

    const results: CollectedReview[] = []
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item || typeof item !== 'object') continue

      const id = item.reviewId ?? item.id ?? item.seq ?? item.reviewNo ?? `api:${i}`
      const rating = item.starScore ?? item.rating ?? item.score ?? null
      const content = item.reviewContent ?? item.content ?? item.comment ?? item.body ?? null
      const author =
        item.nickname ?? item.authorName ?? item.userName ?? item.writerName ?? null
      const rawDate =
        item.createdDate ??
        item.createdAt ??
        item.registeredAt ??
        item.orderDate ??
        item.regDate ??
        null
      const hasReply = !!(
        item.ownerReply ??
        item.reply ??
        item.ownerComment ??
        item.replyContent
      )
      const replyContent =
        item.ownerReply?.content ??
        item.ownerReply ??
        item.reply?.content ??
        item.reply ??
        item.ownerComment ??
        item.replyContent ??
        null

      // photos
      const photoFields = item.photos ?? item.images ?? item.imageUrls ?? item.reviewImages ?? []
      const photos: string[] = Array.isArray(photoFields)
        ? photoFields
            .map((p: any) => (typeof p === 'string' ? p : p?.url ?? p?.imageUrl ?? ''))
            .filter(Boolean)
        : []

      results.push({
        platform_review_id: String(id),
        author_name: typeof author === 'string' ? author : null,
        rating: typeof rating === 'number' ? rating : null,
        content: typeof content === 'string' ? content.trim() || null : null,
        photos,
        posted_at: rawDate ? normalizeBaeminDate(String(rawDate)) : null,
        has_reply: hasReply,
        reply_content:
          typeof replyContent === 'string' ? replyContent.trim() || null : null,
      })
    }

    if (results.length > 0) return results
  }

  return []
}

// ── DOM 텍스트 파싱 폴백 ─────────────────────────────────────
async function extractReviewsFromDom(page: any, log: Logger): Promise<CollectedReview[]> {
  const rawReviews = await page.evaluate(() => {
    const results: any[] = []
    const bodyText = document.body.innerText || ''

    // 리뷰번호 패턴으로 분할
    const blocks = bodyText.split(/리뷰번호\s*/)
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i]
      const idMatch = block.match(/^(\d{7,15})/)
      if (!idMatch) continue
      const reviewId = idMatch[1]

      // 별점: "별점 N점" 패턴
      let rating: number | null = null
      const ratingMatch = block.match(/별점\s*(\d)점/)
      if (ratingMatch) rating = parseInt(ratingMatch[1], 10)

      // 날짜: "YYYY년 M월 DD일"
      let postedAt: string | null = null
      const dateMatch = block.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
      if (dateMatch) {
        const [, y, mo, d] = dateMatch
        postedAt = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+09:00`
      } else {
        const dateMatch2 = block.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/)
        if (dateMatch2) {
          const [, y, mo, d] = dateMatch2
          postedAt = `${y}-${mo}-${d}T00:00:00+09:00`
        }
      }

      // 리뷰 내용: 날짜 이후 텍스트 (다음 리뷰번호/답글 전까지)
      const afterId = block.slice(idMatch[0].length)
      const trimmed = afterId
        .split(/사장님 답글|답글 등록|리뷰번호/)[0]
        .replace(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일/, '')
        .trim()
        .slice(0, 1000)

      const hasReply =
        block.includes('사장님 답글') ||
        block.includes('답글 등록') ||
        block.includes('답글이 등록')

      results.push({
        platform_review_id: `baemin:${reviewId}`,
        author_name: null,
        rating,
        content: trimmed || null,
        photos: [],
        posted_at: postedAt,
        has_reply: hasReply,
        reply_content: null,
      })
    }
    return results
  })

  log.info({ count: rawReviews.length }, 'baemin: DOM text parse result')
  return rawReviews
}

// ── 답글 등록 ────────────────────────────────────────────────
async function postBaeminReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const card = await page.$(
      `[data-review-id="${platformReviewId}"], [data-id="${platformReviewId}"]`,
    )
    if (!card) {
      return { ok: false, reason: `card not found for ${platformReviewId}` }
    }
    const replyBtn = await card.$(LOGIN_SELECTORS.replyButton)
    if (!replyBtn) return { ok: false, reason: 'reply button not found' }
    await replyBtn.click()
    await page.waitForTimeout(1200)

    const textarea = await page.$(LOGIN_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: 'reply textarea not found' }
    await textarea.fill(replyText)
    await page.waitForTimeout(500)

    const submit = await page.$(LOGIN_SELECTORS.replySubmit)
    if (!submit) return { ok: false, reason: 'reply submit button not found' }
    await submit.click()

    // 43차-5: 클릭 후 실제 등록 신호 대기 (textarea 사라짐 / 에러 텍스트 검출)
    const verify = await verifyReplySubmitted(page, {
      textareaSelector: LOGIN_SELECTORS.replyTextarea,
      timeoutMs: 8000,
    }, log)
    if (!verify.ok) {
      await dumpPageDiagnostics(page, log, 'baemin-reply-verify-failed')
      return verify
    }
    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'baemin reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}

// ── 날짜 정규화 ──────────────────────────────────────────────
function normalizeBaeminDate(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.trim()

  // ISO 8601
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s

  // Unix timestamp (ms)
  if (/^\d{13}$/.test(s)) {
    return new Date(parseInt(s, 10)).toISOString()
  }

  // "YYYY.MM.DD" or "YYYY-MM-DD" or "YYYY/MM/DD"
  const m1 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m1) {
    const [, y, mo, d] = m1
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+09:00`
  }

  // "YYYY년 M월 DD일"
  const mKor = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (mKor) {
    const [, y, mo, d] = mKor
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
