// worker/src/adapters/baemin.ts
// ============================================================
// 배민 Worker 어댑터 (self.baemin.com)
//
// 로그인 흐름:
//   CEO_HOME 방문 → 미인증이면 biz-member.baemin.com/login 직접 이동
//   → ID/PW 입력 (브라우저 JS가 RSA 암호화 처리) → 제출
//   → self.baemin.com 리다이렉트 확인 → 리뷰 페이지 이동
//
// 다중 매장:
//   shops/{shopId}/reviews URL 직접 접근 → 드롭다운 선택 불필요
//
// XHR 캡처:
//   self-api.baemin.com 전체 JSON 응답 캡처 → 리뷰 추출
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, detectLoginFailure } from '../lib/diagnostics'
import { verifyReplySubmitted } from '../lib/post-reply-verify'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL   = 'https://biz-member.baemin.com/login'
const CEO_HOME    = 'https://self.baemin.com/'
const REVIEWS_URL = 'https://self.baemin.com/shops/{shopId}/reviews'

// biz-member.baemin.com 로그인 폼 셀렉터
const LOGIN_FORM = {
  idInput:  'input[name="id"], input[placeholder*="아이디"], input[type="text"]:not([readonly])',
  pwInput:  'input[name="pw"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인")',
}

// 답글 관련 셀렉터 (다양한 UI 버전 대응)
const REPLY_SEL = {
  button:   'button:has-text("답글 작성"), button:has-text("답글쓰기"), button:has-text("사장님 답글"), button:has-text("답글"), [class*="reply"][role="button"], [class*="Reply"][role="button"]',
  textarea: 'textarea[placeholder*="답글"], textarea[placeholder*="내용"], textarea[class*="reply" i], textarea[class*="Reply"]',
  submit:   'button:has-text("등록"), button:has-text("완료"), button:has-text("저장"), button[type="submit"]:has-text("등록")',
  cancel:   'button:has-text("취소")',
}

// 인증된 대시보드에서만 보이는 키워드
const DASHBOARD_KW = ['리뷰관리', '가게관리', '주문관리', '정산관리', '배달현황', '주문내역', '정산내역', '메뉴관리']

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

  const svc   = getServiceClient()
  const creds = await loadPlainCredentials(svc, userId, 'baemin')

  const context = await browser.newContext({
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport:   { width: 1366, height: 900 },
    locale:     'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()

  // XHR 캡처 세팅 (페이지 로드 전에 반드시 등록)
  const capturedApiResponses: Array<{ url: string; data: any }> = []
  page.on('response', async (response) => {
    try {
      const url = response.url()
      const ct  = response.headers()['content-type'] || ''
      // self-api.baemin.com 전체 또는 리뷰 관련 JSON 응답 캡처
      const isTarget =
        url.includes('self-api.baemin.com') ||
        (ct.includes('json') && (
          url.includes('review') || url.includes('feedback') ||
          url.includes('rating') || url.includes('comment')
        ))
      if (isTarget) {
        const data = await response.json().catch(() => null)
        if (data) {
          log.info({ url: url.slice(0, 120) }, 'baemin: XHR captured')
          capturedApiResponses.push({ url, data })
        }
      }
    } catch {}
  })

  try {
    // ── Step 1: CEO_HOME 방문 → 인증 상태 확인 ─────────────────
    log.info('baemin: navigating to CEO_HOME')
    await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForTimeout(3000)

    const isAuthenticated = await checkAuth(page, DASHBOARD_KW, log)
    log.info({ isAuthenticated, url: page.url() }, 'baemin: auth check')

    // ── Step 2: 미인증 → biz-member 로그인 페이지로 직접 이동 ──
    if (!isAuthenticated) {
      log.info('baemin: navigating directly to login page')
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForTimeout(2500)

      // PW 입력창 대기
      const pwInput = await page.waitForSelector(LOGIN_FORM.pwInput, { timeout: 15_000 }).catch(() => null)
      if (!pwInput) {
        await dumpPageDiagnostics(page, log, 'baemin-no-pw-input')
        return { status: 'failed', message: 'baemin: 로그인 폼 로드 실패 — biz-member.baemin.com 접근 확인 필요' }
      }

      // ID 입력
      const idInput = await page.$(LOGIN_FORM.idInput)
      if (idInput) {
        await idInput.click()
        await idInput.fill(creds.account_id)
        await page.waitForTimeout(500)
      } else {
        log.warn('baemin: ID input not found — trying direct fill on first text input')
        await page.fill('input[type="text"]:first-of-type', creds.account_id).catch(() => null)
      }

      // PW 입력
      await pwInput.click()
      await pwInput.fill(creds.password)
      await page.waitForTimeout(500)

      // 로그인 버튼 클릭 + 내비게이션 대기
      log.info('baemin: submitting login form')
      await Promise.all([
        page.waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }).catch(() => null),
        page.click(LOGIN_FORM.loginBtn),
      ])
      await page.waitForTimeout(3000)

      const postUrl = page.url()
      log.info({ postUrl }, 'baemin: post-login URL')

      // 여전히 로그인 페이지 = 실패
      if (postUrl.includes('biz-member') && postUrl.includes('login')) {
        const { failed, reason } = await detectLoginFailure(page)
        await markLoginStatus(svc, userId, 'baemin', 'failed', reason || 'stayed on login page')
        return { status: 'failed', message: `baemin: 로그인 실패 — ${reason || '아이디/비밀번호 확인 필요'}` }
      }

      // captcha/block 감지
      if (postUrl.includes('captcha') || postUrl.includes('block')) {
        await markLoginStatus(svc, userId, 'baemin', 'captcha', postUrl)
        return { status: 'failed', message: 'baemin: captcha/block 감지 — 잠시 후 재시도 필요' }
      }

      // self.baemin.com이 아니면 강제 이동
      if (!postUrl.includes('self.baemin.com')) {
        await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await page.waitForTimeout(3000)
      }

      // 로그인 후 대시보드 확인
      const postAuth = await checkAuth(page, DASHBOARD_KW, log)
      if (!postAuth) {
        await dumpPageDiagnostics(page, log, 'baemin-post-login-no-dashboard')
        await markLoginStatus(svc, userId, 'baemin', 'failed', 'no dashboard after login')
        return { status: 'failed', message: 'baemin: 로그인 후 대시보드 확인 실패 — 자격증명 재확인 필요' }
      }

      await markLoginStatus(svc, userId, 'baemin', 'success')
      log.info('baemin: login success')
    }

    if (action === 'health_check') {
      return { status: 'ok', message: 'baemin: login ok' }
    }

    // ── Step 3: shopId 결정 ───────────────────────────────────
    let shopId: string = creds.platform_store_id || storeId || ''

    // DB에 없으면 현재 페이지에서 자동 추출
    if (!shopId) {
      shopId = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/shops/"]'))
        for (const a of links) {
          const m = (a as HTMLAnchorElement).href.match(/\/shops\/(\d+)/)
          if (m) return m[1]
        }
        return ''
      }) || ''
    }

    if (!shopId) {
      return { status: 'failed', message: 'baemin: shopId 없음 — platform_store_id 설정 필요' }
    }

    log.info({ shopId }, 'baemin: using shopId')

    // ── Step 4: 리뷰 페이지로 직접 이동 (다중 매장 드롭다운 불필요) ──
    const reviewsUrl = REVIEWS_URL.replace('{shopId}', shopId)
    log.info({ reviewsUrl }, 'baemin: navigating to reviews page')

    await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(3000)

    // 추가 XHR 트리거를 위한 스크롤
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await page.waitForTimeout(600)
    }
    await page.waitForTimeout(2000)

    log.info({ capturedCount: capturedApiResponses.length }, 'baemin: XHR capture summary')

    // ── Step 5: XHR 기반 리뷰 추출 ───────────────────────────
    let reviews: CollectedReview[] = []

    if (capturedApiResponses.length > 0) {
      for (const { url, data } of capturedApiResponses) {
        const extracted = extractReviewsFromApiResponse(data, log)
        if (extracted.length > 0) {
          log.info({ url: url.slice(0, 100), count: extracted.length }, 'baemin: reviews from XHR')
          // 중복 제거하며 병합
          for (const r of extracted) {
            if (!reviews.some(x => x.platform_review_id === r.platform_review_id)) {
              reviews.push(r)
            }
          }
        }
      }
    }

    // ── Step 6: DOM 파싱 폴백 ─────────────────────────────────
    if (reviews.length === 0) {
      log.info('baemin: XHR empty → DOM fallback')
      reviews = await extractReviewsFromDom(page, log)
    }

    log.info({ count: reviews.length }, 'baemin: total reviews')

    if (reviews.length === 0) {
      await dumpPageDiagnostics(page, log, 'baemin-no-reviews-final')
    }

    const res = await upsertReviews(svc, userId, 'baemin', shopId, reviews)
    log.info({ ...res }, 'baemin: upserted')

    // ── Step 7: 답글 등록 (post_reply) ───────────────────────
    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId  = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const replied   = await postBaeminReply(page, targetId, replyText, shopId, log)
      if (replied.ok) {
        await svc.from('platform_reviews').update({
          has_reply:           true,
          reply_content:       replyText,
          reply_status:        'submitted',
          reply_submitted_at:  new Date().toISOString(),
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

// ── 인증 상태 확인 ────────────────────────────────────────────
async function checkAuth(page: any, keywords: string[], log: Logger): Promise<boolean> {
  return page.evaluate((kw: string[]) => {
    const body = document.body?.textContent || ''
    const hasKeyword  = kw.some((k) => body.includes(k))
    const hasShopLink = !!document.querySelector('a[href*="/shops/"]')
    const hasSidebar  = !!document.querySelector('[class*="sidebar" i], [class*="Sidebar"], nav')
    return hasKeyword || hasShopLink || hasSidebar
  }, keywords).catch(() => false)
}

// ── XHR 응답에서 리뷰 배열 추출 ─────────────────────────────
function extractReviewsFromApiResponse(data: any, log: Logger): CollectedReview[] {
  if (!data || typeof data !== 'object') return []

  const candidates = [
    data,
    data?.data,
    data?.result,
    data?.reviews,
    data?.items,
    data?.content,
    data?.list,
    data?.reviewList,
    data?.contents,
    data?.data?.reviews,
    data?.data?.items,
    data?.data?.list,
    data?.data?.contents,
    data?.result?.reviews,
    data?.result?.items,
    data?.result?.list,
  ].filter(Boolean)

  for (const candidate of candidates) {
    const arr: any[] = Array.isArray(candidate)
      ? candidate
      : (Array.isArray(candidate?.reviews) ? candidate.reviews
        : Array.isArray(candidate?.items)   ? candidate.items
        : Array.isArray(candidate?.list)    ? candidate.list
        : Array.isArray(candidate?.contents)? candidate.contents
        : null) as any

    if (!arr || arr.length === 0) continue

    const first = arr[0]
    if (!first || typeof first !== 'object') continue

    const keys = Object.keys(first)
    log.info({ keys: keys.slice(0, 20) }, 'baemin: API candidate keys')

    const REVIEW_FIELDS = ['rating','content','nickname','score','starScore','reviewContent','authorName','reviewId','userId','writerNickname','reviewNo']
    if (!keys.some(k => REVIEW_FIELDS.includes(k))) continue

    const results: CollectedReview[] = []
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item || typeof item !== 'object') continue

      const id     = item.reviewId ?? item.reviewNo ?? item.id ?? item.seq ?? `api:${i}`
      const rating = item.starScore ?? item.rating ?? item.score ?? null
      const content= item.reviewContent ?? item.content ?? item.comment ?? item.body ?? null
      const author = item.nickname ?? item.writerNickname ?? item.authorName ?? item.userName ?? null
      const rawDate= item.createdDate ?? item.createdAt ?? item.registeredAt ?? item.orderDate ?? item.regDate ?? null
      const hasReply = !!(item.ownerReply ?? item.reply ?? item.ownerComment ?? item.replyContent ?? item.hasReply)
      const replyContent = item.ownerReply?.content ?? item.ownerReply
        ?? item.reply?.content ?? item.reply
        ?? item.ownerComment ?? item.replyContent ?? null

      // 사진 추출 (여러 필드명 대응)
      const photoSrc = item.photos ?? item.images ?? item.imageUrls ?? item.reviewImages ?? item.imageList ?? []
      const photos: string[] = Array.isArray(photoSrc)
        ? photoSrc.map((p: any) => typeof p === 'string' ? p : (p?.url ?? p?.imageUrl ?? p?.src ?? '')).filter(Boolean)
        : []

      results.push({
        platform_review_id: String(id),
        author_name:   typeof author === 'string' ? author : null,
        rating:        typeof rating === 'number' ? rating : null,
        content:       typeof content === 'string' ? content.trim() || null : null,
        photos,
        posted_at:     rawDate ? normalizeBaeminDate(String(rawDate)) : null,
        has_reply:     hasReply,
        reply_content: typeof replyContent === 'string' ? replyContent.trim() || null : null,
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
    const blocks = bodyText.split(/리뷰번호\s*/)
    for (let i = 1; i < blocks.length; i++) {
      const block   = blocks[i]
      const idMatch = block.match(/^(\d{7,15})/)
      if (!idMatch) continue

      let rating: number | null = null
      const ratingMatch = block.match(/별점\s*(\d)점/)
      if (ratingMatch) rating = parseInt(ratingMatch[1], 10)

      let postedAt: string | null = null
      const dateMatch = block.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
      if (dateMatch) {
        const [, y, mo, d] = dateMatch
        postedAt = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+09:00`
      } else {
        const dm2 = block.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/)
        if (dm2) {
          const [, y, mo, d] = dm2
          postedAt = `${y}-${mo}-${d}T00:00:00+09:00`
        }
      }

      const afterId  = block.slice(idMatch[0].length)
      const trimmed  = afterId.split(/사장님 답글|답글 등록|리뷰번호/)[0]
        .replace(/(\d{4})년\s*\d{1,2}월\s*\d{1,2}일/, '')
        .trim().slice(0, 1000)

      const hasReply = block.includes('사장님 답글') || block.includes('답글 등록')

      results.push({
        platform_review_id: `baemin:${idMatch[1]}`,
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

  log.info({ count: rawReviews.length }, 'baemin: DOM parse result')
  return rawReviews
}

// ── 답글 등록 ────────────────────────────────────────────────
async function postBaeminReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  shopId: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // ID로 리뷰 카드 찾기 (여러 data attribute 시도)
    const idNum = platformReviewId.replace(/^baemin(-real-|:)?/, '')
    log.info({ idNum }, 'baemin: finding review card')

    let card = await page.$(
      `[data-review-id="${idNum}"], [data-id="${idNum}"], [data-review-no="${idNum}"]`
    )

    // data attribute 없으면 텍스트에서 리뷰 번호 포함하는 섹션 찾기
    if (!card) {
      card = await page.evaluate((reviewId: string) => {
        const spans = Array.from(document.querySelectorAll('span, p, div'))
        for (const el of spans) {
          if (el.textContent?.includes(reviewId) && el.closest('[class*="review" i]')) {
            return el.closest('[class*="review" i]')
          }
        }
        return null
      }, idNum)
    }

    if (!card) {
      log.warn({ idNum }, 'baemin: review card not found by id, trying scroll search')
      // 스크롤하면서 리뷰 번호 텍스트 찾기
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000))
        await page.waitForTimeout(700)
        card = await page.$(`[data-review-id="${idNum}"], [data-id="${idNum}"]`)
        if (card) break
      }
    }

    if (!card) {
      return { ok: false, reason: `review card not found: ${idNum}` }
    }

    // 답글 버튼 클릭 (카드 내부에서 찾기)
    let replyBtn = await card.$(REPLY_SEL.button)
    if (!replyBtn) {
      // 카드 외부에서 찾기
      replyBtn = await page.$(REPLY_SEL.button)
    }
    if (!replyBtn) return { ok: false, reason: 'reply button not found' }

    await replyBtn.click()
    await page.waitForTimeout(1500)

    // textarea 대기
    const textarea = await page.waitForSelector(REPLY_SEL.textarea, { timeout: 10000 }).catch(() => null)
    if (!textarea) return { ok: false, reason: 'reply textarea not found' }

    await textarea.click()
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    // 제출 버튼
    const submitBtn = await page.$(REPLY_SEL.submit)
    if (!submitBtn) return { ok: false, reason: 'reply submit button not found' }

    await submitBtn.click()

    // 등록 완료 확인
    const verify = await verifyReplySubmitted(page, {
      textareaSelector: REPLY_SEL.textarea,
      timeoutMs: 10000,
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
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  if (/^\d{13}$/.test(s)) return new Date(parseInt(s, 10)).toISOString()
  const m1 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m1) return `${m1[1]}-${m1[2].padStart(2,'0')}-${m1[3].padStart(2,'0')}T00:00:00+09:00`
  const mKor = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (mKor) return `${mKor[1]}-${mKor[2].padStart(2,'0')}-${mKor[3].padStart(2,'0')}T00:00:00+09:00`
  const now = new Date()
  const mDay = s.match(/(\d+)일\s*전/)
  if (mDay) { now.setDate(now.getDate() - parseInt(mDay[1],10)); return now.toISOString() }
  const mHour = s.match(/(\d+)시간\s*전/)
  if (mHour) { now.setHours(now.getHours() - parseInt(mHour[1],10)); return now.toISOString() }
  return null
}
