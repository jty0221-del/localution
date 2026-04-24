// worker/src/adapters/baemin.ts
// ============================================================
// 38차-8 · BaeminAdapter (self.baemin.com)
//   · 로그인 → 리뷰 페이지 탐색 → 텍스트 기반 파싱 → platform_reviews UPSERT
//   · /login URL 404 문제 수정 → CEO_HOME 진입 후 리다이렉트 감지
//   · CSS 클래스 의존 제거 → 리뷰번호/날짜 텍스트 패턴 기반 추출
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, markLoginStatus } from '../lib/credentials'
import { upsertReviews, CollectedReview } from '../lib/reviews'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const CEO_HOME = 'https://self.baemin.com/'
const REVIEWS_URL = 'https://self.baemin.com/shops/{shopId}/reviews'

// 로그인 폼 셀렉터 (광범위 — SPA 렌더 후 input 아무거나)
const ID_INPUT_SEL = 'input[type="text"], input[type="tel"], input[type="email"], input[name*="id"], input[name*="Id"], input[placeholder*="아이디"]'
const PW_INPUT_SEL = 'input[type="password"]'
const LOGIN_BTN_SEL = 'button[type="submit"], button:has-text("로그인"), button:has-text("확인")'

// 리뷰 답글 버튼 셀렉터
const REPLY_BTN_SEL = 'button:has-text("사장님 댓글 등록하기"), button:has-text("댓글 등록"), button:has-text("답글")'
const REPLY_TEXTAREA_SEL = 'textarea[placeholder*="댓글"], textarea[placeholder*="답글"], textarea'
const REPLY_SUBMIT_SEL = 'button[type="submit"]:has-text("등록"), button:has-text("저장"), button:has-text("확인")'

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
  startNetworkCapture(page, log, ['review', 'feedback', 'rating', 'shop'])

  try {
    // ── 1) CEO_HOME 진입 → 로그인 리다이렉트 감지 ─────────────
    log.info('baemin: navigating to CEO_HOME')
    await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 로그인 필요 여부 판단: input[type=password]가 있으면 로그인 페이지
    const needLogin = await page.$(PW_INPUT_SEL).then(el => !!el)
    
    if (needLogin) {
      log.info('baemin: login form detected, filling credentials')
      
      // ID 입력 (여러 셀렉터 시도)
      const idInput = await page.waitForSelector(ID_INPUT_SEL, { timeout: 15000 }).catch(() => null)
      if (!idInput) {
        await dumpPageDiagnostics(page, log, 'baemin-no-id-input')
        await markLoginStatus(svc, userId, 'baemin', 'failed', 'ID input not found')
        return { status: 'failed', message: 'baemin: ID 입력 필드를 찾을 수 없음' }
      }
      await idInput.fill(creds.account_id)
      await page.waitForTimeout(500)

      // PW 입력
      const pwInput = await page.$(PW_INPUT_SEL)
      if (!pwInput) {
        await markLoginStatus(svc, userId, 'baemin', 'failed', 'PW input not found')
        return { status: 'failed', message: 'baemin: PW 입력 필드를 찾을 수 없음' }
      }
      await pwInput.fill(creds.password)
      await page.waitForTimeout(500)

      // 로그인 버튼 클릭
      const loginBtn = await page.$(LOGIN_BTN_SEL)
      if (!loginBtn) {
        await dumpPageDiagnostics(page, log, 'baemin-no-login-btn')
        await markLoginStatus(svc, userId, 'baemin', 'failed', 'Login button not found')
        return { status: 'failed', message: 'baemin: 로그인 버튼을 찾을 수 없음' }
      }
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null),
        loginBtn.click(),
      ])
      await page.waitForTimeout(2000)

      // 로그인 실패 감지
      const afterUrl = page.url()
      const stillOnLogin = await page.$(PW_INPUT_SEL).then(el => !!el)
      if (stillOnLogin) {
        const { failed, reason } = await detectLoginFailure(page)
        await markLoginStatus(svc, userId, 'baemin', 'failed', reason || 'still on login')
        return {
          status: 'failed',
          message: failed ? `baemin login failed — ${reason}` : 'baemin login failed — 아이디/비밀번호 확인 필요',
        }
      }
      if (afterUrl.includes('captcha') || afterUrl.includes('block')) {
        await markLoginStatus(svc, userId, 'baemin', 'captcha', afterUrl)
        return { status: 'failed', message: 'baemin captcha/block — 수동 로그인 필요' }
      }
    } else {
      log.info('baemin: already logged in (no login form)')
    }

    await markLoginStatus(svc, userId, 'baemin', 'success')
    if (action === 'health_check') {
      return { status: 'ok', message: 'baemin login ok' }
    }

    // ── 2) 매장 shopId 확보 ──────────────────────────────────
    let shopId = creds.platform_store_id
    if (!shopId) {
      // CEO_HOME에서 /shops/ 링크 추출
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

    // ── 3) 리뷰 페이지 이동 ──────────────────────────────────
    const reviewsUrl = REVIEWS_URL.replace('{shopId}', shopId)
    log.info({ reviewsUrl }, 'baemin: navigating to reviews')
    await page.goto(reviewsUrl, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(3000)

    // 스크롤로 lazy load 트리거
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await page.waitForTimeout(600)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(1000)

    // ── 4) 텍스트 기반 리뷰 추출 ─────────────────────────────
    const reviews = await page.evaluate(() => {
      const results: Array<{
        platform_review_id: string
        author_name: string | null
        rating: number | null
        content: string | null
        photos: string[]
        posted_at: string | null
        has_reply: boolean
        reply_content: string | null
      }> = []

      // "리뷰번호 XXXXXXXXX" 패턴으로 리뷰 식별
      const allEls = Array.from(document.querySelectorAll('*'))
      
      for (const el of allEls) {
        const text = el.textContent || ''
        const m = text.match(/리뷰번호\s+(\d{15,20})/)
        if (!m) continue
        if (el.children.length > 3) continue // 리뷰번호 직접 포함 leaf에 가까운 요소

        const reviewId = m[1]
        // 이미 처리한 ID 스킵
        if (results.some(r => r.platform_review_id === reviewId)) continue

        // 카드 컨테이너 탐색 (상위 7레벨)
        let card: Element = el
        for (let i = 0; i < 7; i++) {
          if (card.parentElement) card = card.parentElement
          const cardText = card.textContent || ''
          if (cardText.length > 200) break // 충분한 컨텍스트 확보 시 중단
        }

        const cardText = card.textContent || ''

        // 날짜 파싱 (YYYY년 M월 DD일)
        const dateM = cardText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
        const posted_at = dateM
          ? `${dateM[1]}-${dateM[2].padStart(2,'0')}-${dateM[3].padStart(2,'0')}T00:00:00+09:00`
          : null

        // 작성자 (배달타입 prefix 제거)
        const authorM = cardText.match(/(알뜰배달|한집배달|직접배달|가게배달)([^\d\n]+?)(?=\d{4}년|\s*리뷰번호)/)
        const author_name = authorM ? authorM[2].trim() : null

        // 별점: 이미지 alt 또는 aria-label
        let rating: number | null = null
        const starEls = card.querySelectorAll('img[alt*="점"], [aria-label*="별점"], [aria-label*="점"]')
        if (starEls.length) {
          const starText = (starEls[0] as HTMLElement).getAttribute('aria-label') ||
                           (starEls[0] as HTMLImageElement).alt || ''
          const sm = starText.match(/(\d)/)
          if (sm) rating = parseInt(sm[1], 10)
        }
        // 별점 폴백: 노란 star svg/img count
        if (rating === null) {
          const starImgs = card.querySelectorAll('img[src*="star"], svg[class*="star"], [class*="Star"]')
          if (starImgs.length) rating = starImgs.length
        }

        // 리뷰 내용 (리뷰번호/날짜/주문메뉴 라인 제외 텍스트)
        const lines = cardText.split(/\n+/).map(s => s.trim()).filter(Boolean)
        const contentLines = lines.filter(l => {
          if (/리뷰번호|주문메뉴|배달리뷰|좋아요|댓글|등록|^\d{4}년|알뜰배달|한집배달|직접배달|가게배달/.test(l)) return false
          if (l.length < 2) return false
          return true
        })
        const content = contentLines.join(' ').trim() || null

        // 사진
        const photos = Array.from(card.querySelectorAll('img'))
          .map(img => img.src)
          .filter(src => src && !src.includes('star') && !src.includes('icon') && src.startsWith('http'))

        // 답글 여부
        const has_reply = !cardText.includes('사장님 댓글 등록하기') && cardText.includes('사장님')
        const reply_content = null // 추후 구현

        results.push({
          platform_review_id: reviewId,
          author_name,
          rating,
          content,
          photos,
          posted_at,
          has_reply,
          reply_content,
        })
      }

      return results
    })

    log.info({ count: reviews.length }, 'baemin: reviews parsed')

    if (!reviews || reviews.length === 0) {
      await dumpPageDiagnostics(page, log, 'baemin-no-reviews')
      return { status: 'ok', message: 'baemin: 리뷰 0건 (페이지 구조 확인 필요)', data: { total: 0, inserted: 0 } }
    }

    const res = await upsertReviews(svc, userId, 'baemin', shopId, reviews as CollectedReview[])
    log.info({ ...res }, 'baemin reviews upserted')

    // ── 5) post_reply 처리 ────────────────────────────────────
    if (action === 'post_reply' && payload?.platform_review_id && payload?.reply_text) {
      const targetId = String(payload.platform_review_id)
      const replyText = String(payload.reply_text)
      const reviewDbId = payload.review_db_id ? String(payload.review_db_id) : null

      const replied = await postBaeminReply(page, targetId, replyText, log)
      const col = reviewDbId ? 'id' : 'platform_review_id'
      const val = reviewDbId ?? targetId

      if (replied.ok) {
        await svc.from('platform_reviews').update({
          has_reply: true, reply_content: replyText,
          reply_status: 'submitted', reply_submitted_at: new Date().toISOString(), reply_error: null,
        }).eq(col, val).eq('user_id', userId)
        return { status: 'ok', message: `baemin: reply posted for ${targetId}` }
      }
      await svc.from('platform_reviews').update({
        reply_status: 'failed', reply_error: replied.reason,
      }).eq(col, val).eq('user_id', userId)
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
    // 리뷰번호로 해당 카드 찾기
    const targetCard = await page.evaluateHandle((id: string) => {
      const els = Array.from(document.querySelectorAll('*'))
      return els.find(el => (el.textContent || '').includes(`리뷰번호 ${id}`) && el.children.length < 3)?.closest('li,article,[class*="card"],[class*="Card"]') || null
    }, platformReviewId)
    
    if (!targetCard) return { ok: false, reason: `review card not found for ${platformReviewId}` }
    
    const replyBtn = await targetCard.$(REPLY_BTN_SEL)
    if (!replyBtn) return { ok: false, reason: 'reply button not found' }
    await replyBtn.click()
    await page.waitForTimeout(1200)

    const textarea = await page.$(REPLY_TEXTAREA_SEL)
    if (!textarea) return { ok: false, reason: 'reply textarea not found' }
    await textarea.fill(replyText)
    await page.waitForTimeout(500)

    const submit = await page.$(REPLY_SUBMIT_SEL)
    if (!submit) return { ok: false, reason: 'reply submit button not found' }
    await submit.click()
    await page.waitForTimeout(2500)

    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'baemin reply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}
