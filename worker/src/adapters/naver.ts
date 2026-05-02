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
import { handleNaverCaptcha, solveCaptcha } from '../lib/captcha'
import type { JobResult, Action } from '../jobs'

const NAVER_CODE_VERSION = 'v6-verify-reply-20260502'

const LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const NEW_SMARTPLACE_BASE = 'https://new.smartplace.naver.com'

// 등록 후 GraphQL로 실제 답글 반영 확인 (false positive 방지)
async function verifyReplyByGraphQL(
  placeId: string,
  reviewId: string,
  log: Logger,
): Promise<boolean> {
  const categories = ['restaurant', 'cafe', 'place', 'hairshop', 'beautyshop']
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  for (const cat of categories) {
    try {
      const res = await fetch('https://pcmap-api.place.naver.com/graphql', {
        method: 'POST',
        headers: {
          'User-Agent': ua, 'Accept': '*/*', 'Accept-Language': 'ko-KR,ko;q=0.9',
          'Content-Type': 'application/json',
          'Origin': 'https://m.place.naver.com',
          'Referer': `https://m.place.naver.com/${cat}/${placeId}/review/visitor`,
        },
        body: JSON.stringify([{
          operationName: 'getVisitorReviews',
          variables: { input: { businessId: placeId, businessType: cat, item: '0', page: 1, size: 50, isPhotoUsed: false, includeContent: true, getReactions: true } },
          query: 'query getVisitorReviews($input: VisitorReviewsInput) { visitorReviews(input: $input) { items { id reply { body } } } }',
        }]),
        signal: AbortSignal.timeout(10000),
      })
      const j = await res.json().catch(() => null) as any
      const items = j?.[0]?.data?.visitorReviews?.items || []
      if (items.length === 0) continue
      const found = items.find((i: any) => i.id === reviewId)
      if (found?.reply?.body && String(found.reply.body).length > 0) {
        log.info({ reviewId, cat, replyLen: found.reply.body.length }, 'naver: ✅ GraphQL verify OK — 실제 답글 반영 확인')
        return true
      }
      // 카테고리 매치는 됐지만 답글 미반영 (해당 카테고리가 정답)
      log.info({ reviewId, cat, foundItem: !!found, hasReply: !!found?.reply, hasBody: !!found?.reply?.body }, 'naver: GraphQL verify — 답글 미반영')
      return false
    } catch (e: any) {
      log.warn({ cat, err: String(e?.message).slice(0, 80) }, 'naver: GraphQL verify error, try next category')
    }
  }
  return false
}

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

  // 주거용 프록시 설정 (Railway IP 차단 우회)
  const proxyHost = process.env.PROXY_HOST
  const proxyPort = process.env.PROXY_PORT
  const proxyUser = process.env.PROXY_USER
  const proxyPass = process.env.PROXY_PASS
  const proxyProto = process.env.PROXY_PROTOCOL || 'http'
  const useProxy = !!(proxyHost && proxyPort)

  const contextOptions: any = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'sec-ch-ua': '"Google Chrome";v="127", "Chromium";v="127", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
  }
  // proxy는 chromium.launch() 레벨에서 설정됨 (index.ts)
  // context 레벨에서 재설정하면 ERR_PROXY_AUTH_UNSUPPORTED 발생 → 여기서는 로그만
  if (useProxy) {
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}`, hasAuth: !!(proxyUser && proxyPass) }, 'naver: using residential proxy (set at browser launch level)')
  } else {
    log.warn('naver: no proxy configured (PROXY_HOST/PORT missing) — Railway IP may be blocked')
  }

  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  startNetworkCapture(page, log, ['review', 'reply', 'smartplace'])

  try {
    let loggedIn = false

    // ── 0) 프록시 alive 체크 (결제 만료 조기 감지) ─────────────────────
    if (useProxy) {
      try {
        // 가벼운 HTTP 요청으로 프록시 402/407 체크
        const proxyTestUrl = 'http://www.gstatic.com/generate_204'
        const resp = await page.request.get(proxyTestUrl, { timeout: 10000 }).catch((e2: any) => ({ status: () => 0, _err: e2?.message }))
        const status = typeof resp.status === 'function' ? resp.status() : 0
        log.info({ proxyStatus: status }, 'naver: proxy alive check')
        if (status === 402 || status === 407) {
          const msg = `naver: 프록시 이용권 만료(HTTP ${status}) — IPRoyal 결제 후 Railway PROXY_PASS 확인 필요`
          log.error('naver proxy expired: HTTP ' + status)
          if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
          return { status: 'failed', message: msg }
        }
      } catch (_) {
        // alive 체크 실패는 무시하고 계속 진행
      }
    }

    // ── 1) 항상 ID/PW 폼 로그인 (IPRoyal 프록시 경유 한국 IP)
    //    노트: 저장된 NID 쿠키는 다른 IP에서 사용 시 Naver가 강제 만료시킴
    //    → 쿠키 방식 제거, 매번 신선한 폼 로그인으로 진행
    log.info({
      hasProxy: useProxy,
      proxyHost: proxyHost || '(없음 — Railway IP 직접)',
      hasTwocaptcha: !!process.env.TWOCAPTCHA_API_KEY,
    }, 'naver: starting 2-step form login (ID → 다음 → PW → 로그인)')

    if (!loggedIn) {
      log.info('naver: form login (proxy + 2captcha)')

      if (!creds.account_id || !creds.password) {
        const msg = 'naver: ID/PW 미설정 — /my/platforms/naver_place/connect 에서 아이디·비밀번호 입력 필요'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1200)

      const idEl = await page.$(DOM_SELECTORS.idInput)
      if (!idEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-id-input')
        const msg = 'naver: 로그인 폼 id 입력란 없음'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      // ── 네이버 2단계 로그인: ID 입력 후 "다음" 클릭 → PW 입력 후 "로그인" 클릭
      //    (2026년 네이버 로그인 UX: #log.login 버튼이 "다음" → "로그인" 으로 바뀜)
      //    중요: ID 입력 시 fill()보다 clear+type()이 Naver JS 이벤트 처리에 안전
      await idEl.click({ clickCount: 3 })
      await idEl.type(creds.account_id, { delay: 80 })
      await page.waitForTimeout(500)

      const step1BtnText = await page.$eval(
        '#log\\.login .btn_text, #log\\.login span, #log\\.login',
        (el: any) => el.textContent?.trim()
      ).catch(() => '')
      log.info({ step1BtnText, idValueLen: await idEl.evaluate((el: any) => el.value?.length ?? 0).catch(() => 0) }, 'naver: step1 before click')

      // 1단계: ID 확인 ("다음" 클릭)
      // scroll into view → click (container가 위에 있으면 클릭 miss 발생)
      await page.evaluate(() => {
        const btn = document.querySelector('#log\\.login') as HTMLElement | null
        btn?.scrollIntoView({ block: 'center' })
      }).catch(() => null)
      await page.waitForTimeout(300)
      await page.click(DOM_SELECTORS.loginBtn)

      // 다음 클릭 후: PW 필드가 visible 상태가 될 때까지 대기 (최대 8초)
      // Naver 로그인은 SPA — URL은 그대로이나 PW 필드가 hidden→visible 로 바뀜
      const pwVisible = await page.waitForSelector(
        'input[type="password"]:not([disabled]):not([hidden])',
        { state: 'visible', timeout: 8000 }
      ).then(() => true).catch(() => false)

      const urlAfterStep1 = page.url()
      const step2BtnText = await page.$eval(
        '#log\\.login .btn_text, #log\\.login span, #log\\.login',
        (el: any) => el.textContent?.trim()
      ).catch(() => '')
      log.info({ urlAfterStep1, pwVisible, step2BtnText }, 'naver: after step1 click')

      if (!pwVisible) {
        // PW 필드가 안 보이면 페이지 상태 덤프 후 상위 URL 체크로 이동
        await dumpPageDiagnostics(page, log, 'naver-no-pw-after-step1')
        // URL check: already off nidlogin.login� (보안인증 등) → 상위 URL 체크로 처리
        if (!urlAfterStep1.includes('nidlogin.login')) {
          log.warn({ urlAfterStep1 }, 'naver: navigated away after step1 — skipping PW step')
          // below url-check logic will handle it
        } else {
          // 여전히 nidlogin.login 인데 PW 없음 → bot 차단 or 네이버 CAPTCHA 삽입
          const pageText = await page.$eval('body', (el: any) => (el as HTMLElement).innerText?.slice(0, 500)).catch(() => '')
          log.warn({ pageText }, 'naver: still on nidlogin.login but no PW field — possible bot block')
        }
      }

      // 2단계: 비밀번호 입력 (visible & enabled 필드만 타겟)
      const pwEl = await page.waitForSelector(
        'input[type="password"]:not([disabled])',
        { state: 'visible', timeout: 4000 }
      ).catch(async () => {
        // fallback: any pw input
        return page.$('input#pw, input[name="pw"], input[type="password"]')
      })

      if (!pwEl) {
        await dumpPageDiagnostics(page, log, 'naver-no-pw-input')
        const msg = 'naver: 비밀번호 입력란 없음 — ID 단계 이후 화면 전환 실패 또는 봇 차단'
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }
      await pwEl.click({ clickCount: 3 })
      await pwEl.type(creds.password, { delay: 80 })
      await page.waitForTimeout(500)

      // PW가 실제로 입력됐는지 확인
      const pwLen = await pwEl.evaluate((el: any) => (el as HTMLInputElement).value?.length ?? 0).catch(() => 0)
      log.info({ pwLen, step2BtnText }, 'naver: PW typed, about to click login')

      if (pwLen === 0) {
        log.warn('naver: PW field appears empty after type() — retrying with fill()')
        await pwEl.focus()
        await page.keyboard.type(creds.password, { delay: 80 })
        await page.waitForTimeout(300)
      }

      // 로그인 버튼 클릭
      // (CAPTCHA 탐지는 로그인 제출 이후에 수행 — Naver가 Tokyo IP에 CAPTCHA를 반응으로 삽입)
      await page.evaluate(() => {
        const btn = document.querySelector('#log\\.login') as HTMLElement | null
        btn?.scrollIntoView({ block: 'center' })
      }).catch(() => null)
      await page.click(DOM_SELECTORS.loginBtn)
      // URL이 nidlogin.login 에서 벗어날 때까지 대기
      await page.waitForURL(url => !String(url).includes('nidlogin.login'), { timeout: 20000 }).catch(() => null)
      await page.waitForTimeout(1500)

      const urlAfterLogin = page.url()
      // URL을 Railway 로그에서 바로 볼 수 있도록 message 에 포함
      const loginResultShort = urlAfterLogin.replace('https://nid.naver.com/', 'nid/').replace('https://new.smartplace.naver.com', 'smartplace').slice(0, 80)
      log.info('naver: after form login — url=' + loginResultShort)

      if (urlAfterLogin.includes('captcha') || urlAfterLogin.includes('challenge')) {
        log.info({ urlAfterLogin }, 'naver: captcha detected — attempting auto-solve with 2captcha')
        const solved = await handleNaverCaptcha(page, log)
        if (solved) {
          const afterCaptchaUrl = page.url()
          log.info({ afterCaptchaUrl }, 'naver: captcha solved, checking login state')
          if (!afterCaptchaUrl.includes('nid.naver.com') && !afterCaptchaUrl.includes('login') && !afterCaptchaUrl.includes('captcha')) {
            await markLoginStatus(svc, userId, 'naver_place', 'success')
            log.info('naver: login succeeded after captcha solve')
          } else {
            // CAPTCHA 풀었지만 아직 로그인 안 됨 — SmartPlace 직접 이동으로 확인
            const bizTestUrl = bizId && bizId !== 'unknown'
              ? `${NEW_SMARTPLACE_BASE}/bizes/place/${bizId}`
              : `${NEW_SMARTPLACE_BASE}/bizes`
            await page.goto(bizTestUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
            await page.waitForTimeout(2000)
            const checkUrl = page.url()
            if (!checkUrl.includes('login') && !checkUrl.includes('nid.naver.com')) {
              loggedIn = true
              await markLoginStatus(svc, userId, 'naver_place', 'success')
              log.info('naver: captcha resolved, session confirmed')
            }
          }
        } else {
          // 2captcha 키 없거나 해결 실패
          await dumpPageDiagnostics(page, log, 'naver-captcha')
          await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
          const msg = process.env.TWOCAPTCHA_API_KEY
            ? 'naver: CAPTCHA 자동 해결 실패 — 잠시 후 재시도됩니다'
            : 'naver: CAPTCHA 발생 — TWOCAPTCHA_API_KEY를 Railway 환경변수에 추가해주세요'
          if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
          return { status: 'failed', message: msg }
        }
      }

      if (urlAfterLogin.includes('user2/help') || urlAfterLogin.includes('security') || urlAfterLogin.includes('verify')) {
        await dumpPageDiagnostics(page, log, 'naver-security')
        await markLoginStatus(svc, userId, 'naver_place', 'captcha', urlAfterLogin)
        const msg = `naver: 네이버 보안인증 요구 — 처음 프록시 IP에서 로그인할 때 한 번 발생할 수 있어요. 잠시 후 재시도됩니다. (${urlAfterLogin})`
        if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
        return { status: 'failed', message: msg }
      }

      if (urlAfterLogin.includes('nid.naver.com') || urlAfterLogin.includes('login') || urlAfterLogin.includes('signin')) {
        // ── CAPTCHA 재시도: Naver가 로그인 제출 후 인라인 CAPTCHA를 삽입하는 경우 ──────
        // Tokyo IP에서 로그인 클릭 → Naver가 CAPTCHA를 응답으로 삽입 (제출 전에는 DOM에 없음)
        // 따라서 CAPTCHA 탐지는 제출 이후(이 시점)에 해야 함
        const captchaInputElRetry = await page.$(
          '#captcha, input[name="captcha"], input[placeholder*="자동입력"], input[placeholder*="자동"], input[class*="captcha"]'
        ).catch(() => null)

        // 모든 img 정보 수집 (Railway 로그에서 실제 selector 파악용)
        const postLoginImgs = await page.evaluate(() =>
          Array.from(document.querySelectorAll('img')).slice(0, 10).map((el: any) => ({
            id: el.id || '-',
            src: (el.getAttribute('src') || '').slice(0, 100),
            cls: (el.className || '').slice(0, 40),
          }))
        ).catch(() => [] as any[])
        log.info('naver: post-login imgs: ' + JSON.stringify(postLoginImgs).slice(0, 500))
        log.info('naver: captchaInputFoundAfterLogin=' + !!captchaInputElRetry)

        if (captchaInputElRetry) {
          log.info('naver: CAPTCHA appeared after login attempt')

          // CAPTCHA 이미지 src 추출 (data:image/png;base64,... 형식)
          const captchaImgSrc = await page.evaluate(() => {
            const img = document.querySelector('#captchaimg, img[id*="captcha"], img.captcha_img, .captcha_area img') as HTMLImageElement | null
            return img?.src || ''
          }).catch(() => '')
          // CAPTCHA 질문 텍스트 추출 (보조 정보 — 질문이 이미지 속에 있을 경우 비어있을 수 있음)
          const captchaQuestion = await page.evaluate(() => {
            const inp = document.querySelector('#captcha, input[name="captcha"]') as HTMLElement | null
            const container = inp?.closest('div, section, form') as HTMLElement | null
            const containerText = (container?.innerText || '').replace(/\s+/g, ' ').trim()
            if (containerText.length > 5) return containerText.slice(0, 200)
            // body 전체에서 영수증 키워드 검색
            const bt = (document.body?.innerText || '').replace(/\s+/g, ' ')
            const kws = ['구매한', '영수증', '결제', '금액', '총', '개 당', '몇', '가격', '이름']
            for (const kw of kws) {
              const idx = bt.indexOf(kw)
              if (idx >= 0) return bt.slice(Math.max(0, idx - 20), idx + 120)
            }
            return ''
          }).catch(() => '')
          log.info('naver: CAPTCHA img len=' + captchaImgSrc.length + ' question=' + (captchaQuestion || '(없음—이미지 속 질문)').slice(0, 80))

          let captchaAnswerRetry: string | null = null

          // 37차-13: 2Captcha (lang=ko, 한국어 worker 우선) + Claude Vision (Sonnet 3.5) 병렬 race
          // 둘 중 먼저 답하는 쪽 사용 → 정확도+속도 모두 향상
          if (captchaImgSrc.startsWith('data:')) {
            const rawB64 = captchaImgSrc.replace(/^data:[^;]+;base64,/, '')
            const mediaType = rawB64.startsWith('/9j/') ? 'image/jpeg' : 'image/png'
            const captchaInstruction = captchaQuestion
              ? captchaQuestion + '\n이미지의 영수증을 보고 답하세요. 답만 짧게 (예: 순창, 3, 15000). 설명 없이 답만.'
              : '이 이미지를 자세히 보세요. 이미지 안에 한국어 질문이 있습니다. 그 질문을 찾아 영수증 내용 기반으로 답하세요. 답만 짧게. 설명 없이 답만.'

            // ── Promise A: 2Captcha (lang=ko, 한국 worker 매칭) ───────────────────
            const twoCapKey = process.env.TWOCAPTCHA_API_KEY
            const promiseA = (async (): Promise<{ answer: string; via: string } | null> => {
              if (!twoCapKey) return null
              try {
                let instructions = captchaQuestion || '한국어 영수증 CAPTCHA. 이미지 안 한국어 질문에 답하세요.'
                if (captchaQuestion) {
                  if (captchaQuestion.includes('몇') || captchaQuestion.includes('kg') || captchaQuestion.includes('g') ||
                      captchaQuestion.includes('번호') || captchaQuestion.includes('숫자') || captchaQuestion.includes('금액') || captchaQuestion.includes('가격')) {
                    instructions = captchaQuestion + '\n숫자만 답하세요. 단위 빼고.'
                  } else if (captchaQuestion.includes('이름') || captchaQuestion.includes('상품') || captchaQuestion.includes('브랜드')) {
                    instructions = captchaQuestion + '\n한국어 이름만 답하세요.'
                  }
                }
                log.info('captcha[2captcha]: submitting (lang=ko) ...')
                const submitRes = await fetch('https://2captcha.com/in.php', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    key: twoCapKey, method: 'base64', body: rawB64, json: '1',
                    lang: 'ko',  // 한국어 worker 우선 할당
                    textinstructions: instructions,
                  }),
                }).then((r: any) => r.json()).catch(() => null)
                if (submitRes?.status !== 1) {
                  log.warn('captcha[2captcha]: submit failed: ' + JSON.stringify(submitRes || 'null').slice(0, 80))
                  return null
                }
                const captchaId = submitRes.request
                await new Promise((r) => setTimeout(r, 10000))
                for (let i = 0; i < 18; i++) {
                  await new Promise((r) => setTimeout(r, 4000))
                  const pollRes = await fetch(
                    'https://2captcha.com/res.php?key=' + twoCapKey + '&action=get&id=' + captchaId + '&json=1'
                  ).then((r: any) => r.json()).catch(() => null)
                  if (pollRes?.status === 1 && pollRes?.request) {
                    log.info('captcha[2captcha]: ✅ answered=' + String(pollRes.request).slice(0, 30))
                    return { answer: String(pollRes.request).trim(), via: '2captcha-ko' }
                  }
                  if (pollRes?.request && pollRes.request !== 'CAPCHA_NOT_READY') {
                    log.warn('captcha[2captcha]: error=' + JSON.stringify(pollRes).slice(0, 80))
                    return null
                  }
                }
                log.warn('captcha[2captcha]: timeout after 80s')
                return null
              } catch (e: any) {
                log.warn('captcha[2captcha]: exception ' + String(e?.message).slice(0, 80))
                return null
              }
            })()

            // ── Promise B: Claude Vision Sonnet 3.5 (Vercel 프록시 또는 직접) ──
            const promiseB = (async (): Promise<{ answer: string; via: string } | null> => {
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
              if (supabaseKey) {
                try {
                  log.info('captcha[claude]: Vercel proxy (Claude Sonnet 3.5)')
                  const proxyRes = await fetch('https://localution.vercel.app/api/captcha-solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + supabaseKey },
                    body: JSON.stringify({ image: rawB64, question: captchaInstruction, mediaType }),
                    signal: AbortSignal.timeout(25000),
                  }).then((r: any) => r.json()).catch((e: any) => ({ error: e?.message }))
                  const proxyAnswer = (proxyRes?.answer || '').trim()
                  if (proxyAnswer) {
                    log.info('captcha[claude]: ✅ Vercel proxy answered=' + proxyAnswer.slice(0, 30))
                    return { answer: proxyAnswer, via: 'claude-vercel' }
                  }
                  log.warn('captcha[claude]: Vercel empty' + (proxyRes?.error ? ' err=' + String(proxyRes.error).slice(0, 80) : ''))
                } catch (_) {}
              }
              const anthropicKey = process.env.ANTHROPIC_API_KEY
              if (anthropicKey) {
                try {
                  log.info('captcha[claude]: direct Anthropic Sonnet 3.5')
                  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
                    body: JSON.stringify({
                      model: 'claude-3-5-sonnet-20241022',  // 정확도 ↑ (Haiku → Sonnet 3.5)
                      max_tokens: 50,
                      messages: [{ role: 'user', content: [
                        { type: 'image', source: { type: 'base64', media_type: mediaType, data: rawB64 } },
                        { type: 'text', text: captchaInstruction },
                      ]}],
                    }),
                    signal: AbortSignal.timeout(25000),
                  }).then((r: any) => r.json()).catch(() => null)
                  const claudeAnswer = (claudeRes?.content?.[0]?.text || '').trim()
                  if (claudeAnswer) {
                    log.info('captcha[claude]: ✅ direct answered=' + claudeAnswer.slice(0, 30))
                    return { answer: claudeAnswer, via: 'claude-direct' }
                  }
                } catch (_) {}
              }
              return null
            })()

            // 둘 중 먼저 정답 내놓는 쪽 사용 (race)
            const winner = await Promise.race([
              promiseA.then((r) => r ?? new Promise<never>(() => {})), // null 이면 무한 대기 (다른쪽 기다림)
              promiseB.then((r) => r ?? new Promise<never>(() => {})),
              new Promise<{ answer: string; via: string } | null>((resolve) => setTimeout(() => resolve(null), 90000)), // 90초 timeout
            ]).catch(() => null)

            if (winner && winner.answer) {
              captchaAnswerRetry = winner.answer
              log.info('captcha: 🎯 winner=' + winner.via + ' answer=' + winner.answer.slice(0, 30))
            } else {
              // race 실패 시 양쪽 결과 다시 확인 (둘 다 null로 끝났을 수 있음)
              const [a, b] = await Promise.all([
                promiseA.catch(() => null),
                promiseB.catch(() => null),
              ])
              const fallback = a || b
              if (fallback) {
                captchaAnswerRetry = fallback.answer
                log.info('captcha: late winner=' + fallback.via + ' answer=' + fallback.answer.slice(0, 30))
              }
            }
          }

          // ══ 폴백: solveCaptcha (DOM 기반) — captchaImgSrc 가 data: 가 아닌 경우 ═══
          if (!captchaAnswerRetry && !captchaImgSrc.startsWith('data:')) {
            const apiKey = process.env.TWOCAPTCHA_API_KEY
            if (apiKey) {
              try {
                captchaAnswerRetry = await solveCaptcha({ page, log, type: 'image',
                  captchaSelector: '#captchaimg, img[id*="captcha"], img.captcha_img, .captcha_area img' })
              } catch (e: any) {
                log.warn('captcha[fallback]: solveCaptcha exception ' + String(e?.message).slice(0, 80))
              }
            }
          }

          if (!captchaAnswerRetry) {
            log.warn('naver: 모든 CAPTCHA 풀이 방법 실패 (2Captcha + Claude Vision 모두 실패)')
          }

          if (captchaAnswerRetry) {
            // Naver가 실패한 로그인 후 PW 필드를 초기화 → 재입력 필수
            const idElRetry = await page.$(DOM_SELECTORS.idInput).catch(() => null)
            if (idElRetry) {
              await idElRetry.click({ clickCount: 3 })
              await idElRetry.type(creds.account_id, { delay: 80 })
              await page.waitForTimeout(200)
            }
            const pwElRetry = await page.$('input[type="password"]:not([disabled])').catch(() => null)
            if (pwElRetry) {
              await pwElRetry.click({ clickCount: 3 })
              await pwElRetry.type(creds.password, { delay: 80 })
              await page.waitForTimeout(200)
            }
            // CAPTCHA 답 입력
            await captchaInputElRetry.click({ clickCount: 3 })
            await captchaInputElRetry.type(captchaAnswerRetry, { delay: 80 })
            await page.waitForTimeout(500)
            log.info('naver: ID/PW/CAPTCHA re-filled (answer len=' + captchaAnswerRetry.length + ') — re-submitting login')
            await page.evaluate(() => {
              const btn = document.querySelector('#log\\.login') as HTMLElement | null
              btn?.scrollIntoView({ block: 'center' })
            }).catch(() => null)
            await page.click(DOM_SELECTORS.loginBtn)
            await page.waitForURL(url => !String(url).includes('nidlogin.login'), { timeout: 25000 }).catch(() => null)
            await page.waitForTimeout(1500)
            const urlAfterCaptcha = page.url()
            log.info('naver: after CAPTCHA retry — url=' + urlAfterCaptcha.replace('https://nid.naver.com/', 'nid/').slice(0, 80))
            if (!urlAfterCaptcha.includes('nid.naver.com') && !urlAfterCaptcha.includes('nidlogin.login')) {
              await markLoginStatus(svc, userId, 'naver_place', 'success')
              log.info('naver: login succeeded after CAPTCHA solve')
              loggedIn = true
            } else {
              log.warn('naver: login still failed after CAPTCHA solve')
            }
          } else {
            log.warn('naver: 2captcha could not solve CAPTCHA after login attempt')
          }
        }

        if (!loggedIn) {
          // detectLoginFailure: 실제 에러 텍스트만 감지 (폼 라벨 '비밀번호','아이디'는 제외)
          const { reason } = await detectLoginFailure(page, ['일치하지', '잘못된', '실패', '오류', 'incorrect', 'invalid', '차단', '해외'])
          // 페이지 본문 첫 400자를 Railway 로그에서 볼 수 있도록 message 에 포함
          const bodySnippet = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 400)).catch(() => '')
          log.warn('naver: login failed page text: ' + bodySnippet.slice(0, 300))
          await dumpPageDiagnostics(page, log, 'naver-login-failed')
          await markLoginStatus(svc, userId, 'naver_place', 'failed', reason || urlAfterLogin)
          const msg = reason
            ? `[v2] naver login failed — ${reason} | url=${urlAfterLogin.slice(0, 80)}`
            : `[v2] naver login failed — url=${urlAfterLogin.slice(0, 100)} | body=${bodySnippet.replace(/\s+/g, ' ').slice(0, 150)}`
          if (platformReviewId) await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: msg })
          return { status: 'failed', message: msg }
        }
      }

      if (!loggedIn) {
        await markLoginStatus(svc, userId, 'naver_place', 'success')
        log.info({ url: urlAfterLogin }, 'naver: form login success')
      }
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
    const errMsg = String(e?.message || e || 'unknown')
    // 프록시 결제 만료 / 연결 불가 → 명확한 안내
    const isProxyErr = errMsg.includes('402') || errMsg.includes('407') || errMsg.includes('Payment') ||
                       errMsg.includes('ERR_TUNNEL') || errMsg.includes('ERR_PROXY') || errMsg.includes('ERR_EMPTY_RESPONSE')
    const friendlyMsg = isProxyErr
      ? 'naver: 프록시 이용권 만료 또는 연결 실패 — IPRoyal 결제 후 Railway PROXY_PASS 확인 필요'
      : `naver: ${errMsg.slice(0, 150)}`
    // 에러 메시지를 Railway 로그에서 바로 볼 수 있도록 log message 에 포함
    log.error('naver unhandled error: ' + errMsg.slice(0, 200))
    if (platformReviewId) {
      await updateReviewStatus(svc, userId, platformReviewId, 'failed', { error: friendlyMsg }).catch(() => null)
    }
    return { status: 'failed', message: friendlyMsg }
  } finally {
    await context.close().catch(() => null)
  }
}


// ── SmartPlace GraphQL createReply 직접 호출 ──────────────────────
// 37차-15: Playwright UI 자동화 → GraphQL API 직접 호출로 전면 교체
//   사용자 캡처 cURL 분석:
//     POST https://new.smartplace.naver.com/graphql?opName=createReply
//     mutation createReviewReply($input: CreateReviewReplyInput!)
//     input: { text, reviewId, placeId }
//   UI 변경 무관, 1초 응답, 100% 안정적
async function postNaverReply(
  page: any,
  storeId: string,
  platformReviewId: string,
  replyText: string,
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // UNIQUE_MARKER_v13_FRESH_BUILD_20260502_1145
  log.info({ marker: 'UNIQUE_MARKER_v13_FRESH_BUILD_20260502_1145' }, 'naver: postNaverReply v13 GraphQL entry')
  try {
    // 1) SmartPlace 페이지 한 번 방문 → 인증 쿠키 (NID_AUT, BSP_*, MM_NEW_DVC) 확보
    try {
      await page.goto('https://new.smartplace.naver.com/bizes/place/' + storeId, {
        waitUntil: 'domcontentloaded', timeout: 15000,
      })
      await page.waitForTimeout(2500)
      const u = page.url()
      log.info({ url: u }, 'naver: visited SmartPlace dashboard for cookies')
      if (u.includes('nid.naver.com') || u.includes('login')) {
        return { ok: false, reason: 'SmartPlace 접근 시 로그인 redirect — 세션 만료' }
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: SmartPlace dashboard visit failed (cookies may still be OK)')
    }

    // 2) 쿠키 캡처 (네이버 + smartplace 도메인)
    const allCookies = await page.context().cookies()
    const naverCookies = allCookies.filter((c: any) =>
      c.domain.includes('naver.com') || c.domain.includes('smartplace')
    )
    const cookieHeader = naverCookies.map((c: any) => c.name + '=' + c.value).join('; ')

    log.info({
      total: allCookies.length, naver: naverCookies.length,
      cookieLen: cookieHeader.length,
      sample: naverCookies.slice(0, 8).map((c: any) => c.name),
    }, 'naver: cookies captured')

    if (!cookieHeader || cookieHeader.length < 50) {
      return { ok: false, reason: '로그인 쿠키 캡처 실패 (쿠키 부족) — 로그인 재확인 필요' }
    }

    // 공통 SmartPlace 헤더 (모바일 도메인 사용)
    const smartplaceHeaders = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',
      'Cookie': cookieHeader,
      'Referer': 'https://new-m.smartplace.naver.com/bizes/place/' + storeId + '/reviews?menu=visitor',
      'Origin': 'https://new-m.smartplace.naver.com',
      'from-system': 'smartplace',
      'sec-ch-ua-platform': '"Android"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    }

    // ─── 3) 🆕 SmartPlace getReviews 로 internal reviewId 매핑 ───
    // 우리 platformReviewId (pcmap-api 형식) ≠ SmartPlace internal id
    // SmartPlace에 직접 reviews 목록 요청 → 매칭하여 정확한 id 추출
    const reviewsQuery = 'fragment CommonReviewReplyFields on ReviewReply { text isSuspended isQualified createdDateTime updatedDateTime isDeleted useReplyCandidate replierDisplayName suspendPostingReason __typename } fragment CommonReviewFields on Review { author { displayName reviewCount imageCount profileImage visitCount userId __typename } placeDetail { id __typename } bookingDetail { bookingUserDetail business bizItem items __typename } content { text mediaItems { id type thumbnail url trailer metadata __typename } rating tags { votedKeywords { category keywords { code emojiCode emojiUrl label { ko __typename } __typename } __typename } __typename } textGradeInspection { grade __typename } __typename } reply { ...CommonReviewReplyFields __typename } reactionStat { id targetId totalCount sortedTypeCountEntries __typename } createdDateTime displayUpdatedDateTime id rating isSuspended suspendPostingReason isQualified source mainPov visitCount visitDateTime cp hasReply hasText hasVotedKeyword hasNegativeTextGrade __typename } query getReviews($input: GetReviewsInput!) { reviews(input: $input) { totalCount items { ...CommonReviewFields __typename } __typename } }'

    let smartplaceReviewId: string | null = null
    try {
      // 우리 review의 content 가져오기 (DB) — 매칭 fallback 용
      const svcLocal = getServiceClient()
      const { data: ourReviewRow } = await svcLocal.from('platform_reviews')
        .select('content, posted_at')
        .eq('platform', 'naver_place')
        .eq('platform_review_id', platformReviewId)
        .eq('platform_store_id', storeId)
        .maybeSingle()
      const ourContent = String(ourReviewRow?.content || '').trim()
      log.info({ ourContentLen: ourContent.length, ourContentPreview: ourContent.slice(0, 50) }, 'naver: our review content loaded')

      // SmartPlace getReviews 호출 (페이지네이션 — 최대 5페이지)
      let foundOnPage = -1
      for (let p = 1; p <= 5 && !smartplaceReviewId; p++) {
        const reviewsRes = await fetch('https://new-m.smartplace.naver.com/graphql?opName=getReviews', {
          method: 'POST',
          headers: smartplaceHeaders,
          body: JSON.stringify({
            operationName: 'getReviews',
            variables: { input: { sort: 'CreatedDesc', placeId: storeId, page: p } },
            query: reviewsQuery,
          }),
          signal: AbortSignal.timeout(10000),
        })
        if (!reviewsRes.ok) {
          log.warn({ status: reviewsRes.status, page: p }, 'naver: getReviews HTTP error')
          break
        }
        const reviewsJson: any = await reviewsRes.json().catch(() => null)
        const items = reviewsJson?.data?.reviews?.items || []
        log.info({ page: p, count: items.length, totalCount: reviewsJson?.data?.reviews?.totalCount }, 'naver: getReviews page loaded')
        if (items.length === 0) break

        // 1) 직접 ID 매치 (혹시 같은 형식이면)
        const directMatch = items.find((it: any) => it.id === platformReviewId)
        if (directMatch) {
          smartplaceReviewId = directMatch.id
          foundOnPage = p
          log.info({ smartplaceReviewId, page: p }, 'naver: ✅ directID match')
          break
        }
        // 2) content text 매치 (가장 신뢰할 만한 매칭)
        if (ourContent.length > 0) {
          const contentMatch = items.find((it: any) => {
            const t = String(it.content?.text || '').trim()
            return t.length > 0 && t === ourContent
          })
          if (contentMatch) {
            smartplaceReviewId = contentMatch.id
            foundOnPage = p
            log.info({ smartplaceReviewId, page: p, ourContentPreview: ourContent.slice(0, 30) }, 'naver: ✅ content match')
            break
          }
        }
      }

      if (!smartplaceReviewId) {
        log.warn({ platformReviewId, foundOnPage }, 'naver: SmartPlace reviewId 매핑 실패 — 기존 platformReviewId로 시도')
        smartplaceReviewId = platformReviewId
      }
    } catch (e: any) {
      log.warn({ err: e?.message }, 'naver: getReviews 호출 실패 — platformReviewId fallback')
      smartplaceReviewId = platformReviewId
    }

    // 4) GraphQL createReply mutation 호출
    const graphqlUrl = 'https://new-m.smartplace.naver.com/graphql?opName=createReply'
    const mutationQuery = 'fragment CommonReviewReplyFields on ReviewReply {\n  text\n  isSuspended\n  isQualified\n  createdDateTime\n  updatedDateTime\n  isDeleted\n  useReplyCandidate\n  replierDisplayName\n  suspendPostingReason\n  __typename\n}\n\nmutation createReply($input: CreateReviewReplyInput!) {\n  createReviewReply(input: $input) {\n    reply {\n      ...CommonReviewReplyFields\n      __typename\n    }\n    __typename\n  }\n}\n'

    log.info({
      ourReviewId: platformReviewId,
      smartplaceReviewId,
      mapped: smartplaceReviewId !== platformReviewId,
      placeId: storeId, textLen: replyText.length,
      textPreview: replyText.slice(0, 50),
    }, 'naver: 🚀 calling SmartPlace GraphQL createReply (with mapped reviewId)')

    const t0 = Date.now()
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: smartplaceHeaders,
      body: JSON.stringify({
        operationName: 'createReply',
        variables: { input: { text: replyText, reviewId: smartplaceReviewId, placeId: storeId } },
        query: mutationQuery,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const elapsed = Date.now() - t0
    log.info({ status: res.status, elapsed }, 'naver: GraphQL HTTP response')

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      log.error({ status: res.status, errText: errText.slice(0, 300) }, 'naver: GraphQL HTTP error')
      return { ok: false, reason: 'SmartPlace GraphQL HTTP ' + res.status + ': ' + errText.slice(0, 100) }
    }

    const json: any = await res.json().catch(() => null)
    log.info({ jsonPreview: JSON.stringify(json).slice(0, 400) }, 'naver: GraphQL parsed response')

    if (json?.errors && Array.isArray(json.errors) && json.errors.length > 0) {
      const errMsg = json.errors[0]?.message || JSON.stringify(json.errors[0])
      log.warn({ errors: json.errors.slice(0, 3) }, 'naver: GraphQL returned errors')
      // 권한 관련 에러 → 사용자에게 명확한 안내
      const errStr = String(errMsg)
      if (errStr.includes('플레이스 권한') || errStr.includes('권한이 없') || errStr.includes('Forbidden') || errStr.includes('Unauthorized')) {
        return {
          ok: false,
          reason: '⚠️ 사장님 계정 권한 부족: 이 계정이 해당 매장의 사장님(owner)이 아닙니다. SmartPlace에서 직접 로그인해 매장 관리가 가능한지 확인해주세요. 직원/매니저 계정은 답글 자동 등록이 불가합니다.',
        }
      }
      return { ok: false, reason: '네이버 GraphQL 오류: ' + errStr.slice(0, 150) }
    }

    const reply = json?.data?.createReviewReply?.reply
    if (reply && typeof reply.text === 'string' && reply.text.length > 0) {
      log.info({
        replyLen: reply.text.length, replier: reply.replierDisplayName,
        createdAt: reply.createdDateTime, isQualified: reply.isQualified, isSuspended: reply.isSuspended,
      }, 'naver: ✅ 답글 등록 성공 (GraphQL 직접 호출)')

      // 정책 위반 / 부적격 / 정지 체크
      if (reply.isSuspended || reply.suspendPostingReason) {
        log.warn({ reason: reply.suspendPostingReason }, 'naver: 등록됐지만 정지 상태')
        return { ok: false, reason: '답글 정지: ' + (reply.suspendPostingReason || 'suspended') }
      }
      if (reply.isQualified === false) {
        log.warn({ replyer: reply.replierDisplayName }, 'naver: isQualified=false (네이버 부적격 판정)')
        return { ok: false, reason: '네이버 부적격 판정: isQualified=false. 답글 내용/계정 확인 필요' }
      }

      // ⭐ 실제 등록 검증: GraphQL pcmap-api 로 답글 반영 확인 (false positive 차단)
      log.info('naver: createReply 응답 OK — 5초 후 GraphQL verify 시작')
      await new Promise((r) => setTimeout(r, 5000))
      const verified1 = await verifyReplyByGraphQL(storeId, platformReviewId, log)
      if (verified1) {
        log.info('naver: ✅ verify 통과 (1차) — 답글 실제 반영 확인')
        return { ok: true }
      }
      // 인덱스 지연 가능 → 7초 더 대기 후 재확인
      log.warn('naver: verify 1차 실패 (인덱스 지연 가능) — 7초 후 재시도')
      await new Promise((r) => setTimeout(r, 7000))
      const verified2 = await verifyReplyByGraphQL(storeId, platformReviewId, log)
      if (verified2) {
        log.info('naver: ✅ verify 통과 (2차) — 답글 실제 반영 확인')
        return { ok: true }
      }

      // ⛔ createReply 응답은 200이지만 실제 답글 없음 = SmartPlace의 silent reject
      const respDebug =
        'replier=' + reply.replierDisplayName +
        ' useReplyCandidate=' + reply.useReplyCandidate +
        ' isQualified=' + reply.isQualified +
        ' isSuspended=' + reply.isSuspended +
        ' deleted=' + reply.isDeleted +
        ' textLen=' + reply.text.length
      log.error({ respDebug, jsonPreview: JSON.stringify(json).slice(0, 400) },
        'naver: ❌ createReply 응답은 OK인데 GraphQL verify 두 번 모두 실패 (silent reject)')
      return {
        ok: false,
        reason: 'createReply 응답은 OK지만 실제 네이버에 답글 없음 (silent reject). ' + respDebug,
      }
    }

    log.error({ json: JSON.stringify(json).slice(0, 400) }, 'naver: 응답에 reply 없음')
    return { ok: false, reason: '응답에 reply 데이터 없음. preview=' + JSON.stringify(json).slice(0, 200) }
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver: GraphQL createReply exception')
    return { ok: false, reason: 'GraphQL 호출 실패: ' + (e?.message || 'unknown') }
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

        // 현재 페이지의 csrf token / 인증 헤더 추출 시도
        const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        const metaToken = document.querySelector('meta[name="_token"]')?.getAttribute('content') || ''

        const baseHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
          'Accept': 'application/json, text/plain, */*',
          'Referer': `https://new.smartplace.naver.com/bizes/place/${storeId}/reviews`,
        }
        if (metaCsrf) baseHeaders['x-csrf-token'] = metaCsrf
        if (metaToken) baseHeaders['x-token'] = metaToken

        // SmartPlace 실제 엔드포인트 후보 (가장 가능성 높은 5개만 — 시간 절약)
        const endpoints = [
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/v1/bizes/${storeId}/reviews/${reviewId}/reply`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/visitor-reviews/${reviewId}/comment`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/v1/bizes/${storeId}/visitor-reviews/${reviewId}/comment`, body: { content: text } },
          { url: `https://new.smartplace.naver.com/api/bizes/${storeId}/reviews/${reviewId}/owner-reply`, body: { content: text } },
        ]
        const results: string[] = []
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep.url, {
              method: 'POST',
              headers: baseHeaders,
              credentials: 'include',
              body: JSON.stringify(ep.body),
            })
            const bodyText = await res.text().catch(() => '')
            const entry = `${res.status} ${ep.url.replace('https://new.smartplace.naver.com', '')} body=${JSON.stringify(ep.body).slice(0,30)} => ${bodyText.slice(0, 120)}`
            results.push(entry)
            // 200, 201, 204 = 성공
            if (res.status === 200 || res.status === 201 || res.status === 204) {
              return { ok: true, endpoint: ep.url, status: res.status }
            }
          } catch (err: any) {
            results.push(`error ${ep.url} => ${err?.message}`)
          }
        }
        return { ok: false, reason: results.join(' || ') }
      },
      { storeId, reviewId: platformReviewId, text: replyText },
    )
    log.info({ result }, 'naver: internal API result')
    return result as { ok: true } | { ok: false; reason: string }
  } catch (e: any) {
    return { ok: false, reason: `API error: ${e?.message}` }
  }
}
