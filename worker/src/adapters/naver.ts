// worker/src/adapters/naver.ts
// ============================================================
// NaverAdapter — SmartPlace 사장님 답글 자동 등록
//   · 로그인: 세션쿠키 우선, 실패 시 폼 로그인 폴백
//   · 쿠키 체크: SmartPlace 직접 이동으로 확인 (naver.com 우회)
//   · 모든 실패 경로에서 platform_reviews DB 업데이트
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, loadCookieData, markLoginStatus } from '../lib/credentials'
import { dumpPageDiagnostics, startNetworkCapture, detectLoginFailure } from '../lib/diagnostics'
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const NEW_SMARTPLACE_BASE = 'https://new.smartplace.naver.com'

const DOM_SELECTORS = {
  idInput:   'input#id, input[name="id"], input[placeholder*="아이디"]',
  pwInput:   'input#pw, input[name="pw"], input[type="password"]',
  loginBtn:  '#log\\.login, button[type="submit"], .btn_login',
  // SmartPlace 실제 클래스 (2026-04 확인)
  // Review_container 는 전체 목록 컨테이너 → 개별 카드 선택자에서 제외
  reviewCard:    '[class*="Review_single_review"], [class*="single_review"], [class*="ReviewItem"], [class*="review_item"], [data-review-id], [class*="Review_review"], [class*="Review_item"]',
  replyButton:   '[class*="Review_btn_write"], [class*="fn-write"], button:has-text("답글 달기"), button:has-text("답글"), [class*="btn_reply"]',
  replyTextarea: 'textarea[placeholder*="답글"], textarea[placeholder*="답변"], textarea[class*="reply"], textarea[class*="write"], textarea',
  replySubmit:   'button:has-text("등록"), button:has-text("완료"), button:has-text("저장"), [class*="btn_submit"]',
  ownerReply:    '[class*="OwnerReply"], [class*="owner_reply"], [class*="StoreReply"], [class*="reply_owner"], [class*="Reply_owner"], [class*="owner_comment"]',
}

export type NaverOptions = {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

// platform_reviews 상태 업데이트 헬퍼
async function updateReviewStatus(
  svc: ReturnType<typeof getServiceClient>,
  userId: string,
  platformReviewId: string,
  status: 'submitted' | 'failed',
  extra: { replyContent?: string; error?: string },
) {
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { reply_status: status, reply_error: null }
  if (status === 'submitted') {
    update.has_reply = true
    update.reply_submitted_at = now
  } else {
    update.reply_error = (extra.error || 'unknown error').slice(0, 200)
  }
  console.log('[naver][updateReviewStatus] START', { userId: userId.slice(0, 12), platformReviewId, status, error: (extra.error || '').slice(0, 80) })
  try {
    const { data, error, count } = await svc
      .from('platform_reviews')
      .update(update)
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .eq('platform_review_id', platformReviewId)
      .select('id, reply_status')
    if (error) {
      console.error('[naver][updateReviewStatus] SUPABASE ERROR:', error.message, error.code, error.details)
    } else {
      console.log('[naver][updateReviewStatus] SUCCESS rows:', JSON.stringify(data), 'count:', count)
    }
  } catch (e: any) {
    console.error('[naver][updateReviewStatus] EXCEPTION:', e?.message)
  }
}

export async function runNaver(
  opts: NaverOptions,
  action: Action,
  payload?: Record<string, unknown>,
): Promise<JobResult> {
  const { userId, browser, log } = opts

  if (action !== 'post_reply' && action !== 'health_check') {
    return { status: 'skipped', message: `naver: action ${action} — 리뷰 수집은 Vercel /api/place/reviews/fetch 사용` }
  }

  const svc = getServiceClient()

  // post_reply 필수 파라미터 먼저 검증
  const platformReviewId = action === 'post_reply' ? String(payload?.platform_review_id || '') : ''
  const replyText = action === 'post_reply' ? String(payload?.reply_text || '') : ''

  // ── 디버그 로그: 받은 payload 확인 ──────────────────────────────
  log.info({
    action,
    userId: opts.userId.slice(0, 12) + '...',
    platformReviewId: platformReviewId || '(empty)',
    replyTextLen: replyText.length,
    bizIdRaw: payload?.biz_id || '(none)',
    payloadKeys: payload ? Object.keys(payload) : [],
  }, 'naver: runNaver start')

  if (action === 'post_reply' && (!platformReviewId || !replyText)) {
    log.error({ platformReviewId, replyTextLen: replyText.length }, 'naver: MISSING REQUIRED PARAMS — no DB update possible')
    return { status: 'failed', message: 'naver post_reply: platform_review_id / reply_text 누락' }
  }

  let creds: Awaited<ReturnType<typeof loadPlainCredentials>>
  try {
    creds = await loadPlainCredentials(svc, userId, 'naver_place')
  } catch (e: any) {
    if (platformReviewId) {
      await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: `credentials: ${e?.message}` })
    }
    return { status: 'failed', message: `naver credentials: ${e?.message}` }
  }

  const bizId = payload?.biz_id
    ? String(payload.biz_id)
    : (creds.platform_store_id || opts.storeId)

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    // ── 1) 로그인: 세션쿠키 우선 ─────────────────────────────────
    let loggedIn = false

    const cookieJson = await loadCookieData(svc, userId)
    log.info({ hasCookieData: !!cookieJson, cookieDataLen: cookieJson?.length ?? 0 }, 'naver: cookie data from DB')

    if (cookieJson) {
      try {
        const parsed = JSON.parse(cookieJson)
        const cookieList: any[] = []
        const nowSec = Math.floor(Date.now() / 1000) + 86400 * 30

        if (Array.isArray(parsed)) {
          // 배열 형태: [{name,value,domain,...}]
          for (const c of parsed) {
            if (c.name && c.value) {
              cookieList.push({
                name: c.name,
                value: c.value,
                domain: c.domain || '.naver.com',
                path: c.path || '/',
                secure: c.secure !== false,
                httpOnly: c.httpOnly !== false,
                expires: c.expires || nowSec,
              })
            }
          }
        } else if (parsed && typeof parsed === 'object') {
          // 단순 객체: {NID_AUT: '...', NID_SES: '...'}
          if (parsed.NID_AUT) cookieList.push({ name: 'NID_AUT', value: parsed.NID_AUT, domain: '.naver.com', path: '/', secure: true, httpOnly: true, expires: nowSec })
          if (parsed.NID_SES) cookieList.push({ name: 'NID_SES', value: parsed.NID_SES, domain: '.naver.com', path: '/', secure: true, httpOnly: true, expires: nowSec })
        }

        log.info({ cookieCount: cookieList.length, cookieNames: cookieList.map(c => c.name) }, 'naver: cookies prepared')

        if (cookieList.length > 0) {
          await context.addCookies(cookieList)
          // SmartPlace 로 바로 이동해서 로그인 상태 확인 (naver.com은 비로그인도 접근 가능)
          const testUrl = bizId && bizId !== 'unknown'
            ? `${NEW_SMARTPLACE_BASE}/bizes/place/${bizId}`
            : `${NEW_SMARTPLACE_BASE}/bizes`
          log.info({ testUrl }, 'naver: navigating for cookie check')
          await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
          await page.waitForTimeout(2000)
          const checkUrl = page.url()
          log.info({ checkUrl, cookieCount: cookieList.length }, 'naver: cookie login check result')
          if (!checkUrl.includes('nid.naver.com') && !checkUrl.includes('login') && !checkUrl.includes('signin')) {
            loggedIn = true
            log.info('naver: session cookie login OK')
            await markLoginStatus(svc, userId, 'naver_place', 'success')
          } else {
            log.warn({ checkUrl }, 'naver: session cookies INVALID/EXPIRED — SmartPlace redirected to login')
          }
        } else {
          log.warn({ parsedType: typeof parsed }, 'naver: cookie list empty after parsing')
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver: cookie handling error')
      }
    } else {
      log.warn('naver: NO cookie data in DB — must save session cookies at /my/platforms/naver_place/session')
    }

    // ── 2) 폼 로그인 폴백 ─────────────────────────────────────────
    if (!loggedIn) {
      log.info('naver: trying form login')
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)

      const idEl = await page.$(DOM_SELECTORS.idInput)
      if (!idEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-id-input')
        const msg = 'naver: 로그인 폼 id 입력란 없음'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      await idEl.click({ clickCount: 3 })
      await idEl.type(creds.account_id, { delay: 80 })
      await page.waitForTimeout(400)

      const pwEl = await page.$(DOM_SELECTORS.pwInput)
      if (!pwEl) {
        const msg = 'naver: 로그인 폼 pw 입력란 없음'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      await pwEl.click({ clickCount: 3 })
      await pwEl.type(creds.password, { delay: 80 })
      await page.waitForTimeout(400)

      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => null),
        page.click(DOM_SELECTORS.loginBtn),
      ])
      await page.waitForTimeout(2000)

      const urlAfterLogin = page.url()
      log.info({ url: urlAfterLogin }, 'naver: after form login')

      if (urlAfterLogin.includes('captcha') || urlAfterLogin.includes('challenge')) {
        await dumpPageDiagnostics(page, log, 'naver-captcha')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        const msg = 'naver: 캡차 발생 — /my/platforms/naver_place/session 에서 세션쿠키를 저장하면 자동 해결됩니다'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      if (urlAfterLogin.includes('user2/help') || urlAfterLogin.includes('security') || urlAfterLogin.includes('verify')) {
        await dumpPageDiagnostics(page, log, 'naver-security')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        const msg = `naver: 보안인증 요구 (${urlAfterLogin}) — 세션쿠키를 갱신해주세요`
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      if (urlAfterLogin.includes('nid.naver.com') || urlAfterLogin.includes('login') || urlAfterLogin.includes('signin')) {
        // detectLoginFailure: 실제 에러 텍스트만 감지 (폼 라벨 '비밀번호','아이디'는 제외)
        const { reason } = await detectLoginFailure(page, ['일치하지', '잘못된', '실패', '오류', 'incorrect', 'invalid', '차단', '해외'])
        await dumpPageDiagnostics(page, log, 'naver-login-failed')
        await markLoginStatus(svc, userId, 'naver_place', 'failed', reason || urlAfterLogin)
        const msg = reason
          ? `naver login failed — ${reason}`
          : 'naver login failed — Railway Tokyo IP 차단 또는 아이디/비밀번호 오류. 세션쿠키를 /my/platforms/naver_place/session 에서 저장하면 자동 해결됩니다'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      await markLoginStatus(svc, userId, 'naver_place', 'success')
      log.info({ url: urlAfterLogin }, 'naver: form login success')
    }

    if (action === 'health_check') return { status: 'ok', message: 'naver login ok' }

    // ── 3) SmartPlace 답글 등록 ───────────────────────────────────
    const result = await postNaverReply(page, bizId, platformReviewId, replyText, log)
    if (result.ok) {
      await updateReviewStatus(svc, userId, platformReviewId, 'submitted', { replyContent: replyText })
      return { status: 'ok', message: `naver: reply posted for ${platformReviewId}` }
    }

    await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: result.reason })
    return { status: 'failed', message: `naver reply 실패: ${result.reason}` }

  } catch (e: any) {
    log.error({ err: e?.message }, 'naver unhandled error')
    if (platformReviewId) {
      await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: `unhandled: ${e?.message}` }).catch(() => null)
    }
    return { status: 'failed', message: `naver: ${e?.message || e}` }
  } finally {
    await context.close().catch(() => null)
  }
}

// ── SmartPlace 리뷰 답글 등록 ────────────────────────────────────
async function postNaverReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // 1) 먼저 스토어 대시보드로 이동해서 실제 place ID 확인
    const dashUrl = storeId && storeId !== 'unknown'
      ? `${NEW_SMARTPLACE_BASE}/bizes/place/${storeId}`
      : `${NEW_SMARTPLACE_BASE}/bizes`

    log.info({ dashUrl, storeId, platformReviewId }, 'naver: navigating to store dashboard first')
    await page.goto(dashUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    let currentUrl = page.url()
    log.info({ url: currentUrl }, 'naver: dashboard loaded')

    if (currentUrl.includes('nid.naver.com') || currentUrl.includes('login')) {
      return { ok: false, reason: '세션 만료 — /my/platforms/naver_place/session 에서 쿠키를 갱신해주세요' }
    }

    // 리다이렉트된 실제 place ID 추출
    const placeIdMatch = currentUrl.match(/\/bizes\/place\/(\d+)/)
    const actualPlaceId = placeIdMatch?.[1] || storeId
    log.info({ actualPlaceId, storeId }, 'naver: actual place ID from redirect')

    // 2) 리뷰 페이지로 명시적 이동
    const reviewsPageUrl = `${NEW_SMARTPLACE_BASE}/bizes/place/${actualPlaceId}/reviews`
    log.info({ reviewsPageUrl }, 'naver: navigating to reviews page')
    await page.goto(reviewsPageUrl, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForTimeout(3000)

    currentUrl = page.url()
    log.info({ url: currentUrl }, 'naver: reviews page loaded')

    if (currentUrl.includes('nid.naver.com') || currentUrl.includes('login')) {
      return { ok: false, reason: '세션 만료 — /my/platforms/naver_place/session 에서 쿠키를 갱신해주세요' }
    }

    // 3) 모달/오버레이 닫기 (dimmed 클래스 감지)
    try {
      const hasDimmed = await page.$('.dimmed, [class*="dimmed"], [class*="modal_wrap"], [class*="layer_wrap"]')
      if (hasDimmed) {
        log.warn('naver: dimmed overlay detected — trying to dismiss')
        // ESC 키로 닫기
        await page.keyboard.press('Escape')
        await page.waitForTimeout(800)
        // 닫기 버튼 클릭 시도
        const closeBtn = await page.$('button:has-text("닫기")')
          ?? await page.$('button:has-text("확인")')
          ?? await page.$('[class*="btn_close"], [class*="close_btn"], [class*="ico_close"]')
        if (closeBtn) {
          await closeBtn.click()
          await page.waitForTimeout(800)
          log.info('naver: modal closed via button')
        }
        // dimmed 영역 자체 클릭 (배경 클릭으로 닫히는 모달)
        const dimmedEl = await page.$('.dimmed, [class*="dimmed"]')
        if (dimmedEl) {
          await dimmedEl.click()
          await page.waitForTimeout(500)
        }
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: modal dismiss failed')
    }

    // 4) 리뷰 카드 로딩 대기 (최대 15초)
    try {
      await page.waitForSelector('[class*="Review_single_review"], [class*="single_review"], [class*="ReviewItem"], [class*="review_item"]', { timeout: 15000 })
      log.info('naver: review cards appeared')
    } catch {
      // 페이지 HTML 일부 로깅 (디버그)
      const bodyHtml = await page.evaluate(() => document.body?.innerHTML?.slice(0, 2000) || '')
      log.warn({ bodyHtml: bodyHtml.slice(0, 500) }, 'naver: review card selector timeout')
    }

    // 스크롤로 lazy load 유발
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 600))
      await page.waitForTimeout(400)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(800)

    // 리뷰 카드 찾기: data-review-id 속성 우선
    let card = await page.$(`[data-review-id="${platformReviewId}"]`)
    log.info({ foundByAttr: !!card }, 'naver: data-review-id search')

    if (!card) {
      // 모든 카드에서 data-id / data-review-id 속성으로 찾기
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      log.info({ totalCards: allCards.length }, 'naver: total review cards found')
      for (const c of allCards) {
        const attrId = await c.evaluate((el: Element) =>
          el.getAttribute('data-id') || el.getAttribute('data-review-id') || el.getAttribute('data-key') || ''
        )
        if (attrId && attrId.includes(platformReviewId)) { card = c; break }
      }
    }

    // 카드가 1개뿐이면 그걸 사용 (리뷰 목록에 하나만 보이는 경우)
    if (!card) {
      const allCards = await page.$$(DOM_SELECTORS.reviewCard)
      if (allCards.length === 1) {
        card = allCards[0]
        log.info('naver: using single card (only one visible)')
      } else if (allCards.length > 1) {
        // 여러 카드: 첫 번째 미답변 카드 사용
        for (const c of allCards) {
          const hasReply = await c.$(DOM_SELECTORS.ownerReply)
          if (!hasReply) { card = c; break }
        }
        if (card) log.info('naver: using first unanswered card')
      }
    }

    // ── 카드를 못 찾은 경우: 페이지에서 "답글 달기" 버튼 직접 탐색 ──────────
    if (!card) {
      log.warn({ url: page.url() }, 'naver: card not found by selector, trying direct button search')

      // 페이지 전체에서 "답글 달기" 버튼 찾기 (카드 특정 불필요)
      const directBtn = await page.$('button:has-text("답글 달기")')
        ?? await page.$('button:has-text("답글쓰기")')
        ?? await page.$('button:has-text("답글")')
        ?? await page.$('[class*="btn_write"]')

      if (directBtn) {
        log.info('naver: found reply button directly on page — using it')
        await directBtn.scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)
        await directBtn.click()
        await page.waitForTimeout(1500)

        const textarea = await page.$(DOM_SELECTORS.replyTextarea)
        if (textarea) {
          await textarea.scrollIntoViewIfNeeded()
          await textarea.click({ clickCount: 3 })
          await textarea.fill(replyText)
          await page.waitForTimeout(600)
          const submitBtn = await page.$('button:has-text("등록")')
            ?? await page.$('button:has-text("완료")')
            ?? await page.$('button:has-text("저장")')
          if (submitBtn) {
            await submitBtn.click()
            await page.waitForTimeout(3000)
            log.info({ platformReviewId }, 'naver: reply submitted via direct button')
            return { ok: true }
          }
          return { ok: false, reason: '등록 버튼 없음 (직접 버튼 방식)' }
        }
        return { ok: false, reason: 'textarea 없음 (직접 버튼 방식)' }
      }

      // 최후: SmartPlace 내부 API 폴백
      log.warn({ platformReviewId, url: page.url() }, 'naver: no reply button found, trying internal API')
      const apiResult = await tryNaverReplyAPI(page, actualPlaceId, platformReviewId, replyText, log)
      if (apiResult.ok) return apiResult
      await dumpPageDiagnostics(page, log, `naver-no-card-${platformReviewId}`)
      return { ok: false, reason: `review card not found (url: ${page.url()})` }
    }

    // 카드 내 버튼 목록 디버그 로깅
    try {
      const cardBtns = await card.$$('button')
      const btnTexts = await Promise.all(cardBtns.map(b => b.innerText().catch(() => '')))
      log.info({ btnTexts: btnTexts.slice(0, 10) }, 'naver: buttons in card')
    } catch {}

    // 이미 답글 있으면 스킵 (선택자 넓힘)
    const alreadyReplied = await card.$(DOM_SELECTORS.ownerReply)
      ?? await card.$('[class*="reply"]:not(button), [class*="Reply"]:not(button), [class*="owner"]:not(button)')
    if (alreadyReplied) {
      log.info({ platformReviewId }, 'naver: already replied — skip')
      return { ok: true }
    }

    // 답글 달기 버튼 (달기/쓰기/작성/수정 등 모든 변형 포함)
    const replyBtn = await card.$('button:has-text("답글 달기")')
      ?? await card.$('button:has-text("답글 쓰기")')
      ?? await card.$('button:has-text("답글쓰기")')
      ?? await card.$('button:has-text("답글 작성")')
      ?? await card.$('button:has-text("답글 수정")')
      ?? await card.$('button:has-text("답글")')
      ?? await card.$(DOM_SELECTORS.replyButton)
      ?? await page.$('button:has-text("답글 달기")')
      ?? await page.$('button:has-text("답글 쓰기")')
      ?? await page.$('button:has-text("답글")')
    log.info({ foundReplyBtn: !!replyBtn }, 'naver: reply button search result')
    if (!replyBtn) return { ok: false, reason: '답글 버튼 없음 (SmartPlace DOM 변경 가능)' }
    await replyBtn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await replyBtn.click()
    await page.waitForTimeout(1500)

    // textarea
    let textarea = await card.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) textarea = await page.$(DOM_SELECTORS.replyTextarea)
    if (!textarea) return { ok: false, reason: '답글 입력란 없음' }
    await textarea.scrollIntoViewIfNeeded()
    await textarea.click({ clickCount: 3 })
    await textarea.fill(replyText)
    await page.waitForTimeout(600)

    // 등록 버튼
    let submitBtn = await card.$(DOM_SELECTORS.replySubmit)
    if (!submitBtn) submitBtn = await page.$('button:has-text("등록"), button:has-text("완료"), button:has-text("저장")')
    if (!submitBtn) return { ok: false, reason: '등록 버튼 없음' }
    await submitBtn.click()
    await page.waitForTimeout(3000)

    log.info({ platformReviewId }, 'naver: reply submitted')
    return { ok: true }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver postReply error')
    return { ok: false, reason: e?.message || 'unknown' }
  }
}

// ── SmartPlace 내부 API 직접 호출 폴백 ───────────────────────────
async function tryNaverReplyAPI(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const result = await page.evaluate(
      async (args: { storeId: string; reviewId: string; text: string }) => {
        const { storeId, reviewId, text } = args
        const endpoints = [
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/comment`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/v1/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
        ]
        const results: string[] = []
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
              credentials: 'include',
              body: JSON.stringify(ep.body),
            })
            const bodyText = await res.text().catch(() => '')
            results.push(`${ep.url} → ${res.status}: ${bodyText.slice(0, 100)}`)
            if (res.ok) return { ok: true, endpoint: ep.url }
          } catch (err: any) {
            results.push(`${ep.url} → error: ${err?.message}`)
          }
        }
        return { ok: false, reason: 'all SmartPlace API endpoints failed: ' + results.join(' | ') }
      },
      { storeId, reviewId: platformReviewId, text: replyText },
    )
    log.info({ result }, 'naver: internal API result')
    return result as { ok: true } | { ok: false; reason: string }
  } catch (e: any) {
    return { ok: false, reason: `API error: ${e?.message}` }
  }
}
