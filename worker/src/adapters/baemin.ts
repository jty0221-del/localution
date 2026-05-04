// @ts-nocheck
// worker/src/adapters/baemin.ts
// ============================================================
// 배민 Worker 어댑터 v2
//
// 핵심 변경:
//   1. Playwright 컨텍스트에 PROXY_HOST/USER/PASS 적용
//      → 브라우저 전체 트래픽이 한국 프록시 경유 → geo-block 해소
//   2. biz-member.baemin.com/login 직접 이동 (버튼 탐색 불필요)
//   3. 다중 매장 → shops/{shopId}/reviews 직접 URL
//   4. self-api.baemin.com 전체 XHR 캡처
// ============================================================
import type { Browser, BrowserContextOptions } from 'playwright'
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
// - id 필드: name="id" (API body 기준 확인됨)
// - pw 필드: name="pw" (API body 기준 확인됨)
const LOGIN_FORM = {
  idInput:  'input[name="id"], input[placeholder*="아이디"], input[id*="id" i][type="text"]',
  pwInput:  'input[name="pw"], input[type="password"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인")',
}

// 답글 셀렉터 (UI 버전 대응)
const REPLY_SEL = {
  button:   'button:has-text("답글 작성"), button:has-text("답글쓰기"), button:has-text("사장님 답글"), button:has-text("답글"), [class*="reply" i][role="button"]',
  textarea: 'textarea[placeholder*="답글"], textarea[placeholder*="내용"], textarea[class*="reply" i]',
  submit:   'button:has-text("등록"), button:has-text("완료"), button:has-text("저장")',
}

const DASHBOARD_KW = ['리뷰관리', '가게관리', '주문관리', '정산관리', '주문내역', '정산내역', '메뉴관리', '혜택관리']

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
    return { status: 'skipped', message: `baemin: unsupported action ${action}` }
  }

  const svc   = getServiceClient()
  const creds = await loadPlainCredentials(svc, userId, 'baemin')

  // ── Playwright 컨텍스트 옵션 (프록시 포함) ──────────────────
  const ctxOpts: BrowserContextOptions = {
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport:   { width: 1366, height: 900 },
    locale:     'ko-KR',
    timezoneId: 'Asia/Seoul',
  }

  // 한국 프록시 설정 (Railway env에 PROXY_HOST 등 설정되어 있으면 적용)
  const proxyHost = process.env.PROXY_HOST
  const proxyPort = process.env.PROXY_PORT || '80'
  const proxyUser = process.env.PROXY_USER
  const proxyPass = process.env.PROXY_PASS
  const proxyProto = process.env.PROXY_PROTOCOL || 'http'

  // proxy는 chromium.launch() 레벨에서 설정됨 (index.ts)
  // context 레벨에서 재설정하면 ERR_PROXY_AUTH_UNSUPPORTED 발생 → 여기서는 로그만
  if (proxyHost && proxyHost.trim() && !proxyHost.includes('제공값') && !proxyHost.includes('유저')) {
    log.info({ proxyHost, proxyPort }, 'baemin: using proxy (set at browser launch level)')
  } else {
    log.warn('baemin: no proxy configured — login may fail from non-KR IP')
  }

  const context = await browser.newContext(ctxOpts)
  const page    = await context.newPage()

  // ── XHR 캡처 (페이지 로드 전 등록) ────────────────────────
  const capturedApiResponses: Array<{ url: string; data: any }> = []
  page.on('response', async (response) => {
    try {
      const url = response.url()
      const ct  = response.headers()['content-type'] || ''
      const isTarget =
        url.includes('self-api.baemin.com') ||
        (ct.includes('json') && (
          url.includes('review') || url.includes('feedback') ||
          url.includes('rating') || url.includes('comment') ||
          url.includes('/v1/') || url.includes('/api/')
        ) && url.includes('baemin'))
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
    // ── Step 1: CEO_HOME 방문 → 인증 여부 확인 ────────────────
    log.info('baemin: goto CEO_HOME')
    await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForTimeout(3000)

    const isAuth = await checkAuth(page, DASHBOARD_KW)
    log.info({ isAuth, url: page.url() }, 'baemin: auth check')

    // ── Step 2: 미인증 → biz-member 로그인 직접 이동 ──────────
    if (!isAuth) {
      log.info('baemin: not authenticated → navigating to login page')
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForTimeout(3000)

      log.info({ url: page.url() }, 'baemin: on login page')

      // PW 입력창 대기 (SPA라 JS 렌더링 필요)
      const pwInput = await page.waitForSelector(LOGIN_FORM.pwInput, { timeout: 20_000 }).catch(() => null)
      if (!pwInput) {
        await dumpPageDiagnostics(page, log, 'baemin-no-pw-input')
        return { status: 'failed', message: 'baemin: 로그인 폼 없음 — biz-member.baemin.com 접근 실패 또는 UI 변경' }
      }

      // ID 입력
      const idInput = await page.$(LOGIN_FORM.idInput)
      if (idInput) {
        await idInput.click()
        await idInput.fill(creds.account_id)
        await page.waitForTimeout(500)
      }

      // PW 입력
      await pwInput.click()
      await pwInput.fill(creds.password)
      await page.waitForTimeout(500)

      log.info('baemin: submitting login')
      // 로그인 버튼 클릭 + URL 변경 대기
      const [navResult] = await Promise.allSettled([
        page.waitForURL((url) => !url.href.includes('biz-member'), { timeout: 30_000 }),
        page.click(LOGIN_FORM.loginBtn),
      ])
      await page.waitForTimeout(3000)

      const postUrl = page.url()
      log.info({ postUrl }, 'baemin: post-login URL')

      // 여전히 biz-member 로그인 페이지 = 실패
      if (postUrl.includes('biz-member')) {
        const { failed, reason } = await detectLoginFailure(page)
        await markLoginStatus(svc, userId, 'baemin', 'failed', reason || 'stayed on login page')
        await dumpPageDiagnostics(page, log, 'baemin-login-failed')
        return { status: 'failed', message: `baemin: 로그인 실패 — ${reason || '아이디/비밀번호 또는 IP 차단 확인'}` }
      }

      if (postUrl.includes('captcha') || postUrl.includes('block')) {
        await markLoginStatus(svc, userId, 'baemin', 'captcha', postUrl)
        return { status: 'failed', message: 'baemin: captcha/block 감지' }
      }

      // self.baemin.com이 아니면 강제 이동
      if (!postUrl.includes('self.baemin.com')) {
        await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await page.waitForTimeout(3000)
      }

      // 로그인 후 인증 재확인
      const postAuth = await checkAuth(page, DASHBOARD_KW)
      if (!postAuth) {
        await dumpPageDiagnostics(page, log, 'baemin-post-login-no-dashboard')
        await markLoginStatus(svc, userId, 'baemin', 'failed', 'no dashboard after login')
        return { status: 'failed', message: 'baemin: 로그인 후 대시보드 미확인 — 자격증명 재확인' }
      }

      await markLoginStatus(svc, userId, 'baemin', 'success')
      log.info('baemin: login success ✓')
    }

    if (action === 'health_check') return { status: 'ok', message: 'baemin: login ok' }

    // ── Step 3: shopId 결정 ──────────────────────────────────
    let shopId: string = creds.platform_store_id || storeId || ''
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
    if (!shopId) return { status: 'failed', message: 'baemin: shopId 없음 — platform_store_id 설정 필요' }
    log.info({ shopId }, 'baemin: shopId confirmed')

    // ── Step 4: 리뷰 페이지 직접 이동 ─────────────────────────
    const reviewsUrl = REVIEWS_URL.replace('{shopId}', shopId)
    log.info({ reviewsUrl }, 'baemin: goto reviews page')
    await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(3000)

    // 스크롤로 lazy-load + 추가 XHR 유발
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(2000)

    log.info({ count: capturedApiResponses.length }, 'baemin: XHR total captured')

    // ── Step 5: XHR → 리뷰 추출 ──────────────────────────────
    let reviews: CollectedReview[] = []
    for (const { url, data } of capturedApiResponses) {
      const extracted = extractReviewsFromApiResponse(data, log)
      if (extracted.length > 0) {
        log.info({ url: url.slice(0, 100), count: extracted.length }, 'baemin: XHR reviews')
        for (const r of extracted) {
          if (!reviews.some(x => x.platform_review_id === r.platform_review_id)) {
            reviews.push(r)
          }
        }
      }
    }

    // ── Step 6: DOM 폴백 ─────────────────────────────────────
    if (reviews.length === 0) {
      log.info('baemin: XHR empty → DOM fallback')
      reviews = await extractReviewsFromDom(page, log)
    }

    log.info({ count: reviews.length }, 'baemin: reviews total')
    if (reviews.length === 0) await dumpPageDiagnostics(page, log, 'baemin-no-reviews')

    const res = await upsertReviews(svc, userId, 'baemin', shopId, reviews)
    log.info(res, 'baemin: upserted')

    // ── Step 7: 답글 등록 ────────────────────────────────────
    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId  = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const replied   = await postBaeminReply(page, targetId, replyText, log)
      if (replied.ok) {
        await svc.from('platform_reviews').update({
          has_reply: true, reply_content: replyText,
          reply_status: 'submitted', reply_submitted_at: new Date().toISOString(),
        })
        .eq('user_id', userId).eq('platform', 'baemin').eq('platform_review_id', targetId)
        return { status: 'ok', message: `baemin: reply posted ${targetId}` }
      }
      return { status: 'failed', message: `baemin reply failed: ${replied.reason}` }
    }

    return { status: 'ok', message: `baemin: total=${res.total} inserted=${res.inserted}`, data: res }

  } catch (e: any) {
    log.error({ err: e?.message }, 'baemin error')
    return { status: 'failed', message: `baemin: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

// ── 인증 확인 ────────────────────────────────────────────────
async function checkAuth(page: any, kw: string[]): Promise<boolean> {
  return page.evaluate((keywords: string[]) => {
    const body = document.body?.textContent || ''
    return keywords.some(k => body.includes(k)) ||
      !!document.querySelector('a[href*="/shops/"]') ||
      !!document.querySelector('[class*="sidebar" i], nav[class*="menu" i]')
  }, kw).catch(() => false)
}

// ── XHR → 리뷰 추출 ─────────────────────────────────────────
function extractReviewsFromApiResponse(data: any, log: Logger): CollectedReview[] {
  if (!data || typeof data !== 'object') return []

  const candidates = [
    data, data?.data, data?.result, data?.reviews, data?.items,
    data?.content, data?.list, data?.reviewList, data?.contents,
    data?.data?.reviews, data?.data?.items, data?.data?.list, data?.data?.contents,
    data?.result?.reviews, data?.result?.items, data?.result?.list,
  ].filter(Boolean)

  for (const candidate of candidates) {
    const arr: any[] = Array.isArray(candidate) ? candidate
      : Array.isArray(candidate?.reviews)  ? candidate.reviews
      : Array.isArray(candidate?.items)    ? candidate.items
      : Array.isArray(candidate?.list)     ? candidate.list
      : Array.isArray(candidate?.contents) ? candidate.contents
      : (null as any)

    if (!arr || arr.length === 0) continue

    const first = arr[0]
    if (!first || typeof first !== 'object') continue

    const keys = Object.keys(first)
    const REVIEW_FIELDS = ['rating','content','nickname','score','starScore','reviewContent','authorName','reviewId','userId','writerNickname','reviewNo']
    if (!keys.some(k => REVIEW_FIELDS.includes(k))) continue

    log.info({ keys: keys.slice(0, 20), count: arr.length }, 'baemin: matched review array')

    const results: CollectedReview[] = []
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item || typeof item !== 'object') continue

      const id     = item.reviewId ?? item.reviewNo ?? item.id ?? item.seq ?? `api:${i}`
      const rating = item.starScore ?? item.rating ?? item.score ?? null
      const content= item.reviewContent ?? item.content ?? item.comment ?? item.body ?? null
      const author = item.nickname ?? item.writerNickname ?? item.authorName ?? item.userName ?? item.memberNickname ?? null
      const rawDate= item.createdDate ?? item.createdAt ?? item.registeredAt ?? item.orderDate ?? item.regDate ?? null
      const hasReply = !!(item.ownerReply ?? item.reply ?? item.ownerComment ?? item.replyContent ?? item.hasOwnerReply)
      const replyContent = item.ownerReply?.content ?? item.ownerReply
        ?? item.reply?.content ?? item.reply
        ?? item.ownerComment ?? item.replyContent ?? null

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

// ── DOM 폴백 ─────────────────────────────────────────────────
async function extractReviewsFromDom(page: any, log: Logger): Promise<CollectedReview[]> {
  const rawReviews = await page.evaluate(() => {
    const results: any[] = []
    const bodyText = document.body.innerText || ''
    const blocks = bodyText.split(/리뷰번호\s*/)
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i]
      const idMatch = block.match(/^(\d{7,15})/)
      if (!idMatch) continue
      let rating: number | null = null
      const rm = block.match(/별점\s*(\d)점/)
      if (rm) rating = parseInt(rm[1], 10)
      let postedAt: string | null = null
      const dm = block.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
      if (dm) postedAt = `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}T00:00:00+09:00`
      const afterId = block.slice(idMatch[0].length)
      const content = afterId.split(/사장님 답글|답글 등록|리뷰번호/)[0]
        .replace(/(\d{4})년\s*\d{1,2}월\s*\d{1,2}일/, '').trim().slice(0, 1000)
      const hasReply = block.includes('사장님 답글') || block.includes('답글 등록')
      results.push({ platform_review_id: `baemin:${idMatch[1]}`, author_name: null, rating, content: content || null, photos: [], posted_at: postedAt, has_reply: hasReply, reply_content: null })
    }
    return results
  })
  log.info({ count: rawReviews.length }, 'baemin: DOM parse')
  return rawReviews
}

// ── 답글 등록 (BAEMIN v1: APIRequestContext, 쿠팡 74차 패턴) ──
// Playwright DOM 조작 → page.context().request.fetch() 로 전환
// · navigation 영향 없음 (page.evaluate 금지)
// · 응답 body 검증으로 silent fail 차단 (쿠팡 63차)
async function postBaeminReply(
  page: any, platformReviewId: string, replyText: string, log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const idNum = platformReviewId.replace(/^baemin(-real-|:)?/, '')

    // shopId 추출 (page url 또는 storage)
    const url = page.url()
    const m = url.match(/\/shops\/(\d+)/)
    const shopNo = m ? m[1] : ''
    if (!shopNo) {
      log.error({ url }, 'baemin: shopNo not in URL')
      return { ok: false, reason: 'shopNo not in URL' }
    }

    log.info({ idNum, shopNo }, 'baemin: posting reply via APIRequestContext')

    const apiUrl = 'https://self-api.baemin.com/v1/review/shops/' + shopNo + '/reviews/comments'
    const res = await page.context().request.fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://self.baemin.com/shops/' + shopNo + '/reviews',
        'Origin': 'https://self.baemin.com',
        'service-channel': 'SELF_SERVICE_PC',
        'X-Web-Version': 'v20260422143632',
      },
      data: { reviewNo: idNum, comment: replyText, shopNo: Number(shopNo) },
    })

    const status = res.status()
    const text = await res.text().catch(() => '')
    let body: any = null
    try { body = text ? JSON.parse(text) : null } catch { body = { raw: text.slice(0, 200) } }

    if (status < 200 || status >= 300) {
      log.error({ status, body }, 'baemin: reply HTTP fail')
      return { ok: false, reason: 'HTTP ' + status + ': ' + JSON.stringify(body).slice(0, 200) }
    }

    // 응답 body 검증 (쿠팡 63차)
    if (body && typeof body === 'object') {
      const code = String(body.code ?? body.status ?? body.resultCode ?? '').toUpperCase()
      const isSuccess = (!code || code === 'SUCCESS' || code === 'OK' || code === '0' || code === '200')
        && body.success !== false && !body.error && !body.errorMessage
      if (!isSuccess) {
        log.error({ status, body }, 'baemin: reply body validation failed')
        return { ok: false, reason: 'body invalid: ' + JSON.stringify(body).slice(0, 200) }
      }
    }

    log.info({ status, idNum }, 'baemin: reply posted ✓')
    return { ok: true }
  } catch (e: any) {
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
  const mK = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (mK) return `${mK[1]}-${mK[2].padStart(2,'0')}-${mK[3].padStart(2,'0')}T00:00:00+09:00`
  const now = new Date()
  const mD = s.match(/(\d+)일\s*전/)
  if (mD) { now.setDate(now.getDate() - parseInt(mD[1],10)); return now.toISOString() }
  const mH = s.match(/(\d+)시간\s*전/)
  if (mH) { now.setHours(now.getHours() - parseInt(mH[1],10)); return now.toISOString() }
  return null
}
