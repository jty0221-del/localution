// @ts-nocheck
// worker/src/adapters/baemin.ts
// ============================================================
// 배민 Worker 어댑터 v2 + v1.5 cookie injection
//
// 핵심 변경:
//   1. Playwright 컨텍스트에 PROXY_HOST/USER/PASS 적용 (한국 프록시)
//   2. v1.5: save-login 으로 저장된 쿠키를 Playwright context 에 주입
//      → biz-member.baemin.com 로그인 우회 (ERR_ABORTED 회피)
//      → self.baemin.com 즉시 인증 상태로 진입
//   3. 다중 매장 → shops/{shopId}/reviews 직접 URL
//   4. self-api.baemin.com 전체 XHR 캡처
// ============================================================
import type { Browser, BrowserContextOptions } from 'playwright'
import type { Logger } from 'pino'
import { createDecipheriv } from 'crypto'
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

// v1.5: 저장된 쿠키 로드 + Playwright cookie 형식 변환
function loadKekHex(): Buffer | null {
  const raw = (process.env.ENCRYPTION_KEK_HEX || '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) return null
  return Buffer.from(raw, 'hex')
}

function decryptCookieStr(enc: string, iv: string, tag: string): string | null {
  const kek = loadKekHex()
  if (!kek) return null
  try {
    const d = createDecipheriv('aes-256-gcm', kek, Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8')
  } catch { return null }
}

async function loadBaeminCookieJar(svc: any, userId: string): Promise<{ cookies: any[]; cookieStr: string } | null> {
  try {
    const { data } = await svc
      .from('platform_credentials')
      .select('extra_data')
      .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()
    const extra = (data?.extra_data as any) || {}

    // v1.6c: 우선순위 1 — JSON object 배열 (domain/path/flags 보존된 정확한 쿠키)
    if (extra.baemin_cookies_json_enc) {
      const json = decryptCookieStr(extra.baemin_cookies_json_enc, extra.baemin_cookies_json_iv, extra.baemin_cookies_json_tag)
      if (json) {
        try {
          const arr = JSON.parse(json)
          if (Array.isArray(arr) && arr.length > 0) {
            // Playwright addCookies 형식 검증 + sanitize
            const cookies = arr
              .filter((c: any) => c && c.name && c.value && (c.domain || c.url))
              .map((c: any) => {
                const out: any = {
                  name: String(c.name),
                  value: String(c.value),
                  domain: c.domain || '.baemin.com',
                  path: c.path || '/',
                  httpOnly: !!c.httpOnly,
                  secure: c.secure !== false,
                }
                if (typeof c.expires === 'number' && c.expires > 0) out.expires = c.expires
                if (c.sameSite && ['Strict', 'Lax', 'None'].includes(c.sameSite)) {
                  out.sameSite = c.sameSite
                } else {
                  out.sameSite = 'Lax'
                }
                return out
              })
            const cookieStr = cookies.map((c: any) => c.name + '=' + c.value).join('; ')
            return { cookies, cookieStr }
          }
        } catch { /* fall through to legacy */ }
      }
    }

    // v1.6c: 우선순위 2 — legacy cookie string (호환성)
    if (extra.baemin_cookie_enc) {
      const cookieStr = decryptCookieStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
      if (!cookieStr) return null
      const cookies: any[] = []
      for (const part of cookieStr.split(';')) {
        const kv = part.trim()
        const eq = kv.indexOf('=')
        if (eq <= 0) continue
        const name = kv.slice(0, eq).trim()
        const value = kv.slice(eq + 1).trim()
        if (!name || !value) continue
        cookies.push({
          name, value,
          domain: '.baemin.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax' as const,
        })
      }
      return { cookies, cookieStr }
    }

    return null
  } catch { return null }
}

// v1.1: 배민 공식 CDN 도메인 화이트리스트 — 이외 도메인 이미지 차단 (다른 업체 leak 방지)
const BAEMIN_PHOTO_DOMAINS = ['baemin.com', 'bmcdn.com', 'woowahan.com', 'woowa.in', 'baedalminjok.com']
function isValidBaeminPhotoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  let u = url.trim()
  if (u.startsWith('//')) u = 'https:' + u
  if (!u.toLowerCase().startsWith('http')) return false
  try {
    const host = new URL(u).hostname.toLowerCase()
    return BAEMIN_PHOTO_DOMAINS.some(d => host === d || host.endsWith('.' + d))
  } catch { return false }
}

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

  // v1.6j: 진짜 배민 필드명 매핑 — contents (본문), comments[0].contents (사장님 답글)
  log.info({ version: 'v1.6j', ts: '20260505T1700' }, 'BAEMIN_ADAPTER_VERSION_MARKER')

  const svc   = getServiceClient()
  let creds: any
  try {
    creds = await loadPlainCredentials(svc, userId, 'baemin')
  } catch (credErr: any) {
    log.error({ err: credErr?.message }, 'baemin: loadPlainCredentials failed — checking extra_data fallback')
    // v1.6: password_encrypted 없어도 extra_data.baemin_pw_enc 로 fallback
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('account_id, platform_store_id, extra_data')
      .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()
    if (!cred) throw credErr
    const extra = (cred.extra_data as any) || {}
    if (!extra.baemin_pw_enc) throw new Error('baemin: 비밀번호 미저장 — 다시 연결 필요')
    const kek = loadKekHex()
    if (!kek) throw new Error('baemin: ENCRYPTION_KEK_HEX 누락')
    const password = decryptCookieStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
    if (!password) throw new Error('baemin: 비밀번호 복호화 실패')
    creds = {
      account_id: cred.account_id || extra.baemin_id || '',
      password,
      platform_store_id: cred.platform_store_id || null,
      platform_store_name: null,
      session_cookies: null,
    }
  }

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

  // v1.5: save-login 쿠키 주입 — biz-member 로그인 우회 (ERR_ABORTED 회피)
  const cookieJar = await loadBaeminCookieJar(svc, userId)
  if (cookieJar && cookieJar.cookies.length > 0) {
    try {
      await context.addCookies(cookieJar.cookies)
      log.info({ count: cookieJar.cookies.length }, 'baemin: cookies injected from save-login')
    } catch (e: any) {
      log.warn({ err: e?.message }, 'baemin: cookie inject failed — falling back to login flow')
    }
  } else {
    log.warn('baemin: no saved cookies found — must login fresh (may fail at biz-member)')
  }

  const page    = await context.newPage()

  // ── XHR 캡처 (페이지 로드 전 등록) ────────────────────────
  // v1.4: 더 넓은 도메인 커버 (self-api / ceo-api / biz-api / api.baemin)
  // v1.1: shopId 확정 후 extract 시점에 URL 필터 — 다중 매장 leak 방지
  const capturedApiResponses: Array<{ url: string; data: any }> = []
  page.on('response', async (response) => {
    try {
      const url = response.url()
      const ct  = response.headers()['content-type'] || ''
      // baemin 관련 도메인 모두 + JSON content-type
      const isBaeminApi = (url.includes('baemin.com') || url.includes('woowa')) && ct.includes('json')
      const isReviewLike = url.includes('review') || url.includes('feedback') ||
        url.includes('rating') || url.includes('comment')
      const isTarget = isBaeminApi && (isReviewLike || url.includes('/shops/'))
      if (isTarget) {
        const data = await response.json().catch(() => null)
        if (data) {
          // v1.4: 응답 구조 로깅 (첫 5개만) — 실제 필드명 파악
          if (capturedApiResponses.length < 5) {
            const topKeys = typeof data === 'object' && data ? Object.keys(data).slice(0, 10) : []
            log.info({ url: url.slice(0, 120), topKeys }, 'baemin: XHR captured (with shape)')
          } else {
            log.info({ url: url.slice(0, 120) }, 'baemin: XHR captured')
          }
          capturedApiResponses.push({ url, data })
        }
      }
    } catch {}
  })

  try {
    // ── Step 1: CEO_HOME 방문 → 인증 여부 확인 ────────────────
    log.info('baemin: goto CEO_HOME')
    try {
      await page.goto(CEO_HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    } catch (gotoErr: any) {
      log.warn({ err: gotoErr?.message }, 'baemin: goto CEO_HOME error (may still be navigating)')
    }

    // v1.6e: SPA 로딩 시간 충분히 — checkAuth 5번 (총 ~12초) 시도
    let isAuth = false
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2500)
      isAuth = await checkAuth(page, DASHBOARD_KW)
      if (isAuth) break
      // /shops/{N}/ 링크가 있어도 인증 OK
      const hasShopLink = await page.evaluate(() => !!document.querySelector('a[href*="/shops/"]')).catch(() => false)
      if (hasShopLink) {
        log.info({ attempt: i }, 'baemin: shops link detected on CEO_HOME → authenticated')
        isAuth = true
        break
      }
    }
    log.info({ isAuth, url: page.url(), hadCookies: !!cookieJar }, 'baemin: auth check')

    // v1.6: 쿠키 주입해도 미인증 → fresh 로그인 폴스루 (cookie expired 거나 인증 토큰 없음)
    if (!isAuth) {
      log.info('baemin: not authenticated → trying multiple login URLs (v1.6)')

      // v1.6: 여러 login URL 시도 — biz-member 가 ERR_ABORTED 면 다음 시도
      const LOGIN_URL_CANDIDATES = [
        'https://biz-member.baemin.com/login',
        'https://self.baemin.com/login',
        'https://ceo.baemin.com/login',
        'https://biz-member.baemin.com/',
      ]

      let loginPageReady = false
      let alreadyAuthenticated = false
      for (const url of LOGIN_URL_CANDIDATES) {
        try {
          await page.goto(url, { waitUntil: 'commit', timeout: 25_000 })
        } catch (gotoErr: any) {
          log.warn({ url, err: gotoErr?.message?.slice(0, 100) }, 'baemin: goto error')
        }
        await page.waitForTimeout(3000)

        const currentUrl = page.url()
        log.info({ tried: url, landed: currentUrl }, 'baemin: login goto landed')

        // v1.6e: /login 으로 갔는데 다른 곳으로 redirect = 이미 인증된 상태
        // (mypage, dashboard, root 등 어디든 — login 페이지가 아니면 OK)
        const triedLoginUrl = url.includes('/login')
        const landedNotLogin = !currentUrl.includes('/login')
        const isLoggedInPage = (
          (triedLoginUrl && landedNotLogin) ||
          currentUrl.includes('/mypage') ||
          currentUrl.includes('/dashboard') ||
          (currentUrl.includes('/shop') && !currentUrl.includes('/shops/login'))
        )
        if (isLoggedInPage) {
          log.info({ landed: currentUrl }, 'baemin: redirected to logged-in page → already authenticated, skipping login form')
          alreadyAuthenticated = true
          break
        }

        // PW 입력창 보이면 로그인 폼 도달
        const pwExists = await page.$(LOGIN_FORM.pwInput).catch(() => null)
        if (pwExists) { loginPageReady = true; break }

        // PW selector 못 봤어도 기다려보기 (SPA)
        if (currentUrl.includes('login') || currentUrl.includes('member')) {
          const pwInputDelayed = await page.waitForSelector(LOGIN_FORM.pwInput, { timeout: 8000 }).catch(() => null)
          if (pwInputDelayed) { loginPageReady = true; break }
        }
      }

      // v1.6d: 이미 로그인됨 → CEO_HOME 으로 가서 fetch flow 진입 (login form 필요 X)
      if (alreadyAuthenticated) {
        try {
          await page.goto(CEO_HOME, { waitUntil: 'commit', timeout: 25_000 })
        } catch (e: any) {
          log.warn({ err: e?.message }, 'baemin: CEO_HOME goto error after detected auth')
        }
        await page.waitForTimeout(4000)
        await markLoginStatus(svc, userId, 'baemin', 'success', 'authenticated via cookies')
        log.info('baemin: authenticated via stored cookies (no fresh login needed) ✓')
        // login form fill 스킵 → 아래 fetch flow 로
      } else if (!loginPageReady) {
        await dumpPageDiagnostics(page, log, 'baemin-no-login-form')
        await markLoginStatus(svc, userId, 'baemin', 'failed', 'no login form on any URL — Akamai blocking?')
        return { status: 'failed', message: 'baemin: 로그인 폼 도달 실패 — Akamai 차단 또는 프록시 IP 차단' }
      } else {
        // ── login form fill + submit (alreadyAuthenticated 가 아닐 때만) ──
        log.info({ url: page.url() }, 'baemin: on login page')

        const pwInput = await page.waitForSelector(LOGIN_FORM.pwInput, { timeout: 20_000 }).catch(() => null)
        if (!pwInput) {
          await dumpPageDiagnostics(page, log, 'baemin-no-pw-input')
          return { status: 'failed', message: 'baemin: PW 입력창 못 찾음 — UI 변경 가능성' }
        }

        const idInput = await page.$(LOGIN_FORM.idInput)
        if (idInput) {
          await idInput.click()
          await idInput.fill(creds.account_id)
          await page.waitForTimeout(500)
        }

        await pwInput.click()
        await pwInput.fill(creds.password)
        await page.waitForTimeout(500)

        log.info('baemin: submitting login')
        const [navResult] = await Promise.allSettled([
          page.waitForURL((url: any) => !url.href.includes('biz-member'), { timeout: 30_000 }),
          page.click(LOGIN_FORM.loginBtn),
        ])
        await page.waitForTimeout(3000)

        const postUrl = page.url()
        log.info({ postUrl }, 'baemin: post-login URL')

        // v1.6c: biz-member 도 /login 만 실패로 판정 — /mypage, /shop 등은 로그인 성공
        const isStillOnLoginPage = postUrl.includes('biz-member.baemin.com/login')
          && !postUrl.includes('returnUrl')
        if (isStillOnLoginPage) {
          const { failed, reason } = await detectLoginFailure(page)
          await markLoginStatus(svc, userId, 'baemin', 'failed', reason || 'stayed on login page')
          await dumpPageDiagnostics(page, log, 'baemin-login-failed')
          return { status: 'failed', message: `baemin: 로그인 실패 — ${reason || '아이디/비밀번호 또는 IP 차단 확인'}` }
        }

        if (postUrl.includes('captcha') || postUrl.includes('block')) {
          await markLoginStatus(svc, userId, 'baemin', 'captcha', postUrl)
          return { status: 'failed', message: 'baemin: captcha/block 감지' }
        }

        if (!postUrl.includes('self.baemin.com')) {
          log.info({ postUrl }, 'baemin: not on self.baemin.com, redirecting to CEO_HOME')
          try {
            await page.goto(CEO_HOME, { waitUntil: 'commit', timeout: 30_000 })
          } catch (e: any) {
            log.warn({ err: e?.message }, 'baemin: CEO_HOME redirect error (continuing)')
          }
          await page.waitForTimeout(4000)
        }

        let postAuth = false
        for (let attempt = 0; attempt < 3; attempt++) {
          postAuth = await checkAuth(page, DASHBOARD_KW)
          if (postAuth) break
          log.info({ attempt }, 'baemin: post-login auth retry')
          await page.waitForTimeout(3000)
        }
        if (!postAuth) {
          const hasShopLink = await page.evaluate(() => {
            return !!document.querySelector('a[href*="/shops/"]')
          }).catch(() => false)
          if (hasShopLink) {
            log.info('baemin: shops link detected → treating as authenticated')
            postAuth = true
          }
        }
        if (!postAuth) {
          await dumpPageDiagnostics(page, log, 'baemin-post-login-no-dashboard')
          await markLoginStatus(svc, userId, 'baemin', 'failed', 'no dashboard after login')
          return { status: 'failed', message: 'baemin: 로그인 후 대시보드 미확인 — 자격증명 재확인' }
        }

        await markLoginStatus(svc, userId, 'baemin', 'success')
        log.info('baemin: login success ✓')
      }
      // ── login form 분기 끝 ──

      // v1.6c: Worker fresh 로그인 성공 → 쿠키 JSON object 그대로 영속화
      //        Playwright cookies() 의 모든 필드 (domain/path/httpOnly/secure/sameSite/expires) 보존
      //        다음 fetch 시 addCookies() 로 정확히 복원 → 인증 유지
      try {
        const allCookies = await context.cookies()
        const baeminCookies = allCookies.filter((c: any) =>
          (c.domain || '').includes('baemin.com') || (c.domain || '').includes('woowa')
        )
        if (baeminCookies.length > 0) {
          const kek = loadKekHex()
          if (kek) {
            const { randomBytes, createCipheriv } = await import('crypto')
            const cookiesJsonStr = JSON.stringify(baeminCookies)

            // JSON object 영속화 (v1.6c)
            const ivJson = randomBytes(12)
            const cipherJson = createCipheriv('aes-256-gcm', kek, ivJson)
            const encJson = Buffer.concat([cipherJson.update(cookiesJsonStr, 'utf8'), cipherJson.final()])
            const tagJson = cipherJson.getAuthTag()

            // legacy string 도 같이 저장 (backward compat)
            const cookieStr = baeminCookies.map((c: any) => c.name + '=' + c.value).join('; ')
            const ivStr = randomBytes(12)
            const cipherStr = createCipheriv('aes-256-gcm', kek, ivStr)
            const encStr = Buffer.concat([cipherStr.update(cookieStr, 'utf8'), cipherStr.final()])
            const tagStr = cipherStr.getAuthTag()

            const { data: existing } = await svc
              .from('platform_credentials').select('extra_data')
              .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()
            const prevExtra = (existing?.extra_data as any) || {}

            await svc.from('platform_credentials').update({
              extra_data: {
                ...prevExtra,
                // 우선순위 1: JSON object (정확한 영속화)
                baemin_cookies_json_enc: encJson.toString('base64'),
                baemin_cookies_json_iv:  ivJson.toString('base64'),
                baemin_cookies_json_tag: tagJson.toString('base64'),
                // 우선순위 2: legacy string
                baemin_cookie_enc: encStr.toString('base64'),
                baemin_cookie_iv:  ivStr.toString('base64'),
                baemin_cookie_tag: tagStr.toString('base64'),
                cookie_saved_at: new Date().toISOString(),
                cookie_source: 'worker_fresh_login_v1_6c',
              },
            }).eq('user_id', userId).eq('platform', 'baemin')
            log.info({ count: baeminCookies.length }, 'baemin: fresh cookies saved as JSON (v1.6c)')
          }
        }
      } catch (cookieSaveErr: any) {
        log.warn({ err: cookieSaveErr?.message }, 'baemin: cookie save after login failed (non-fatal)')
      }
    }

    if (action === 'health_check') return { status: 'ok', message: 'baemin: login ok' }

    // ── Step 3: 다중 매장 shopId 모두 감지 (v1.5) ────────────
    // /shops/{N}/ 링크를 home 에서 파싱 → 모든 매장 fetch
    const allShopIds: string[] = await page.evaluate(() => {
      const set = new Set<string>()
      const links = Array.from(document.querySelectorAll('a[href*="/shops/"]'))
      for (const a of links) {
        const m = (a as HTMLAnchorElement).href.match(/\/shops\/(\d+)/)
        if (m) set.add(m[1])
      }
      return Array.from(set)
    }).catch(() => [])

    // v1.6i: /v4/store/shops/search XHR 응답에서도 shopIds 추출 (DOM links 보다 정확)
    const apiShopIds = new Set<string>()
    for (const { url, data } of capturedApiResponses) {
      if (url.includes('/v4/store/shops/search')) {
        const shops = (data as any)?.contents || (data as any)?.data || []
        if (Array.isArray(shops)) {
          for (const s of shops) {
            if (s?.shopNo) apiShopIds.add(String(s.shopNo))
            if (s?.id) apiShopIds.add(String(s.id))
            if (s?.shopId) apiShopIds.add(String(s.shopId))
          }
        }
      }
    }
    if (apiShopIds.size > 0) {
      const apiShopArr = Array.from(apiShopIds)
      log.info({ apiShopArr, domShopArr: allShopIds }, 'baemin: shopIds from /v4/shops/search XHR')
      for (const sid of apiShopArr) if (!allShopIds.includes(sid)) allShopIds.push(sid)
    }

    // v1.6b: 'unknown'/'null'/'undefined' 같은 문자열 sentinel 도 무효 처리
    const isValidShopId = (s: any): boolean => {
      if (typeof s !== 'string') return false
      const t = s.trim().toLowerCase()
      return !!t && t !== 'unknown' && t !== 'null' && t !== 'undefined' && /^\d+$/.test(t)
    }
    const explicitShopId = isValidShopId(payload?.shop_no) ? String(payload?.shop_no) : ''
    const credShopId = isValidShopId(creds.platform_store_id) ? String(creds.platform_store_id) : (isValidShopId(storeId) ? storeId : '')
    let shopIdsToFetch: string[] = []
    if (action === 'post_reply') {
      shopIdsToFetch = [explicitShopId || credShopId || allShopIds[0] || ''].filter(Boolean)
    } else {
      // v1.6i: fetch_reviews 는 모든 valid shopId (DOM + API search + explicit + cred 합집합)
      // v1.6i: 14666661 은 배민 default landing 매장 — 사장님 실 매장 아니면 제외 후보 (단, 다른 shopId 가 있을 때만)
      const set = new Set<string>()
      for (const id of allShopIds) if (isValidShopId(id)) set.add(id)
      if (explicitShopId) set.add(explicitShopId)
      if (credShopId) set.add(credShopId)
      // 14666661 외에 다른 shop 이 발견되면 14666661 제외 (default landing shop 으로 간주)
      const ids = Array.from(set)
      if (ids.length > 1 && ids.includes('14666661')) {
        shopIdsToFetch = ids.filter(id => id !== '14666661')
        log.info({ excluded: '14666661', kept: shopIdsToFetch }, 'baemin: default landing shop 14666661 excluded')
      } else {
        shopIdsToFetch = ids
      }
    }

    if (shopIdsToFetch.length === 0) {
      return { status: 'failed', message: 'baemin: shopId 없음 — 매장 미감지 + platform_store_id 미설정' }
    }
    log.info({ shopIdsToFetch, allShopIds, credShopId, explicitShopId }, 'baemin: shops to fetch')

    // v1.6b: allShopIds 감지됐고 cred 의 platform_store_id 가 비어있으면 자동 저장
    // (다음 fetch 부터 cred 에서 바로 사용 가능)
    if (allShopIds.length > 0 && !credShopId) {
      try {
        await svc.from('platform_credentials')
          .update({ platform_store_id: allShopIds[0] })
          .eq('user_id', userId).eq('platform', 'baemin')
        log.info({ savedShopId: allShopIds[0] }, 'baemin: platform_store_id auto-saved from detected shops')
      } catch (saveErr: any) {
        log.warn({ err: saveErr?.message }, 'baemin: platform_store_id auto-save failed (non-fatal)')
      }
    }

    // ── Step 4-6: 각 매장별 리뷰 페이지 순회 + XHR 캡처 + 추출 + 저장 ─
    const daysBack = (typeof payload?.days_back === 'number' && payload.days_back > 0)
      ? Math.min(payload.days_back as number, 365) : 30
    const cutoffMs = Date.now() - daysBack * 86400_000

    let totalReviews = 0
    let totalInserted = 0
    const perShopStats: any[] = []

    // v1.6h: API 요청은 180일 (배민 페이지 기본값) — cutoff 는 daysBack 으로 별도 적용
    // 30일치만 요청하면 매장 활동 적은 경우 빈 응답 → 6개월 fetch 후 cutoff 필터
    const API_FETCH_DAYS = 180
    const toDate = new Date().toISOString().slice(0, 10)
    const fromDate = new Date(Date.now() - API_FETCH_DAYS * 86400_000).toISOString().slice(0, 10)
    log.info({ fromDate, toDate, apiFetchDays: API_FETCH_DAYS, cutoffDaysBack: daysBack }, 'baemin: date range (v1.6h)')

    for (const shopId of shopIdsToFetch) {
      const beforeCaptureCount = capturedApiResponses.length

      const reviewsUrl = REVIEWS_URL.replace('{shopId}', shopId)
      log.info({ reviewsUrl, shopId, fromDate, toDate }, 'baemin: goto reviews page (v1.6f)')

      // v1.6f: networkidle (45s) → domcontentloaded (15s) — SPA 는 networkidle 도달 안 함
      try {
        await page.goto(reviewsUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      } catch (gErr: any) {
        log.warn({ shopId, err: gErr?.message?.slice(0, 100) }, 'baemin: reviews goto error — continuing')
      }
      await page.waitForTimeout(4000)

      // 스크롤 lazy-load
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.scrollBy(0, 800)).catch(() => null)
        await page.waitForTimeout(400)
      }
      await page.waitForTimeout(2000)

      const newCaptured = capturedApiResponses.slice(beforeCaptureCount)
      log.info({ shopId, newCount: newCaptured.length, totalCount: capturedApiResponses.length }, 'baemin: XHR captured this shop')

      let reviews: CollectedReview[] = []

      // ── v1.6g: page.evaluate 로 브라우저 컨텍스트 안에서 fetch (Akamai 부프키) ─────
      // page.context().request.fetch 는 Node.js 에서 호출 → Akamai 가 bot 으로 403
      // page.evaluate 안의 fetch 는 브라우저에서 호출 → Akamai 통과
      try {
        const apiUrlFirst = 'https://self-api.baemin.com/v1/review/shops/' + shopId
          + '/reviews?from=' + fromDate + '&to=' + toDate + '&offset=0&limit=100'
        log.info({ apiUrl: apiUrlFirst }, 'baemin: in-browser fetch (v1.6g)')

        // 페이지네이션 자체도 브라우저 안에서
        const restResult: any = await page.evaluate(async (cfg: any) => {
          const out: any[] = []
          let offset = 0
          let firstShape: any = null
          for (let p = 0; p < 10; p++) {
            const url = cfg.base + '?from=' + cfg.fromDate + '&to=' + cfg.toDate + '&offset=' + offset + '&limit=100'
            try {
              const res = await fetch(url, {
                credentials: 'include',
                headers: {
                  'Accept': 'application/json',
                  'service-channel': 'SELF_SERVICE_PC',
                },
              })
              if (!res.ok) {
                return { __error: 'http ' + res.status, __status: res.status, __out: out, __firstShape: firstShape }
              }
              const j: any = await res.json()
              if (p === 0) firstShape = { topKeys: Object.keys(j || {}).slice(0, 20) }
              const arr = j.reviews || j.contents || j.data?.reviews || j.data || j.list || []
              if (!Array.isArray(arr) || arr.length === 0) break
              if (p === 0 && arr[0]) {
                firstShape.firstItemKeys = Object.keys(arr[0]).slice(0, 30)
                firstShape.firstItemSample = arr[0]
              }
              out.push(...arr)
              if (arr.length < 100) break
              offset += 100
              await new Promise(r => setTimeout(r, 500))
            } catch (e: any) {
              return { __error: String(e?.message || e), __out: out, __firstShape: firstShape }
            }
          }
          return { __out: out, __firstShape: firstShape }
        }, { base: 'https://self-api.baemin.com/v1/review/shops/' + shopId + '/reviews', fromDate, toDate })

        if (restResult?.__firstShape) {
          log.info({
            shape: restResult.__firstShape.topKeys,
            firstItemKeys: restResult.__firstShape.firstItemKeys,
            firstItemSample: restResult.__firstShape.firstItemSample
              ? JSON.stringify(restResult.__firstShape.firstItemSample).slice(0, 500)
              : null,
            rawCount: (restResult.__out || []).length,
          }, 'baemin: REST response shape (v1.6h)')
        }
        if (restResult?.__error) {
          log.warn({ err: restResult.__error, status: restResult.__status }, 'baemin: in-browser fetch error')
        }

        const rawReviews = Array.isArray(restResult?.__out) ? restResult.__out : []
        log.info({ rawCount: rawReviews.length }, 'baemin: REST raw reviews')
        if (rawReviews.length > 0) {
          // extractor 우회 — 직접 normalize 호출 (URL 이 /reviews 면 무조건 review array)
          // 첫 item 의 raw key 들을 보고 mapping
          if (restResult.__firstShape?.firstItemSample) {
            log.info({ sampleKeys: Object.keys(restResult.__firstShape.firstItemSample) }, 'baemin: REST first review keys (for diagnosis)')
          }
          const extracted = extractReviewsFromApiResponse({ reviews: rawReviews }, log)
          for (const r of extracted) {
            if (!reviews.some(x => x.platform_review_id === r.platform_review_id)) {
              reviews.push(r)
            }
          }
          log.info({ shopId, raw: rawReviews.length, extracted: extracted.length }, 'baemin: REST reviews extracted (v1.6g)')
        }
      } catch (restErr: any) {
        log.warn({ err: restErr?.message }, 'baemin: in-browser fetch outer error')
      }

      // ── XHR 캡처 fallback (REST 실패 시) ─────
      if (reviews.length === 0) {
        const shopIdMatcher = '/shops/' + shopId + '/'
        for (const { url, data } of newCaptured) {
          if (!url.includes(shopIdMatcher)) continue

          // v1.6i: /reviews?from= 응답 — 정확히 dump 해서 진짜 구조 파악
          if (url.includes('/reviews?') && url.includes('from=')) {
            const reviewsField = (data as any)?.reviews
            log.info({
              url: url.slice(0, 120),
              topKeys: Object.keys(data || {}).slice(0, 15),
              reviewsType: typeof reviewsField,
              reviewsIsArray: Array.isArray(reviewsField),
              reviewsLen: Array.isArray(reviewsField) ? reviewsField.length :
                (typeof reviewsField === 'object' && reviewsField !== null ? Object.keys(reviewsField).length : 0),
              reviewsSample: Array.isArray(reviewsField) && reviewsField.length > 0
                ? JSON.stringify(reviewsField[0]).slice(0, 600)
                : (typeof reviewsField === 'object' && reviewsField !== null
                    ? JSON.stringify(reviewsField).slice(0, 600)
                    : String(reviewsField)),
              fullResponseSample: JSON.stringify(data).slice(0, 1500),
            }, 'baemin: captured /reviews FULL DUMP (v1.6i)')
          }

          const extracted = extractReviewsFromApiResponse(data, log)
          if (extracted.length > 0) {
            log.info({ url: url.slice(0, 100), count: extracted.length, shopId }, 'baemin: XHR reviews (fallback)')
            for (const r of extracted) {
              if (!reviews.some(x => x.platform_review_id === r.platform_review_id)) {
                reviews.push(r)
              }
            }
          }
        }
      }

      // DOM 폴백
      if (reviews.length === 0) {
        log.info({ shopId }, 'baemin: XHR empty → DOM fallback')
        reviews = await extractReviewsFromDom(page, log)
      }

      // cutoff 필터
      const before = reviews.length
      reviews = reviews.filter((r: any) => {
        if (!r.posted_at) return true
        const t = new Date(r.posted_at).getTime()
        return isNaN(t) || t >= cutoffMs
      })
      if (reviews.length !== before) {
        log.info({ shopId, before, after: reviews.length, daysBack }, 'baemin: cutoff filter applied')
      }

      // 매장 단위 upsert
      log.info({ shopId, count: reviews.length }, 'baemin: upserting for shop')
      const res = await upsertReviews(svc, userId, 'baemin', shopId, reviews)
      log.info({ shopId, ...res }, 'baemin: upserted')
      totalReviews += res.total
      totalInserted += res.inserted
      perShopStats.push({ shopId, total: res.total, inserted: res.inserted })
    }

    // ── Step 7: 답글 등록 (단일 매장만) ───────────────────────
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

    return {
      status: 'ok',
      message: `baemin: shops=${shopIdsToFetch.length} total=${totalReviews} inserted=${totalInserted}`,
      data: { perShopStats, totalReviews, totalInserted, shopIds: shopIdsToFetch },
    }

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

  // v1.6b: /v3/dashboard/review 의 reviewContents 도 후보에 추가
  const candidates = [
    data, data?.data, data?.result, data?.reviews, data?.items,
    data?.content, data?.list, data?.reviewList, data?.contents,
    data?.reviewContents,                                            // /v3/dashboard/review
    data?.data?.reviews, data?.data?.items, data?.data?.list, data?.data?.contents,
    data?.data?.reviewContents,
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
    // v1.6g: REVIEW_FIELDS 체크 → 강한 신호 1개만 있으면 진행 (배민 응답 필드명 unknown)
    // 핵심 신호: 텍스트 + 평점 또는 ID 둘 중 하나만 있어도 review 로 간주
    const looksLikeReview = (
      keys.some(k => ['rating','content','nickname','score','starScore','reviewContent',
        'authorName','reviewId','userId','writerNickname','reviewNo','reviewDateTime',
        'reviewDate','customerNickname','consumerNickname','memberNickname','reviewScore',
        'starRating','comment','reviewText','reviewBody','member','writer','user',
        'createdAt','createdDate','createdDateTime','registeredAt','postedAt'].includes(k)) ||
      // fallback: 텍스트 like 필드 + 숫자 like 필드 둘 다 존재
      (keys.some(k => typeof first[k] === 'string' && (first[k] as string).length > 5) &&
       keys.some(k => typeof first[k] === 'number'))
    )
    if (!looksLikeReview) {
      log.warn({ keysFound: keys.slice(0, 20), arrLen: arr.length }, 'baemin: array found but no review-like fields — skipping')
      continue
    }

    log.info({ keys: keys.slice(0, 20), count: arr.length }, 'baemin: matched review array')

    const results: CollectedReview[] = []
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item || typeof item !== 'object') continue

      const id     = item.reviewId ?? item.reviewNo ?? item.id ?? item.seq ?? null
      if (!id) continue  // v1.2: ID 없는 row 는 가비지로 간주
      // v1.2: 모든 가능한 필드명 시도
      const rating = item.starScore ?? item.rating ?? item.score ?? item.star ?? item.stars
        ?? item.reviewScore ?? item.starRating ?? null
      // v1.6j: 배민 실제 필드 = contents (복수형!) — firstItemKeys 로 확인됨
      const content= item.contents ?? item.reviewContent ?? item.content ?? item.comment ?? item.body
        ?? item.text ?? item.reviewText ?? item.reviewBody ?? item.message ?? null
      const author = item.writer?.nickname ?? item.writer?.name ?? item.writer?.displayName
        ?? item.nickname ?? item.writerNickname ?? item.authorName
        ?? item.userName ?? item.memberNickname ?? item.customerNickname
        ?? item.consumerNickname ?? item.userNickname
        ?? item.member?.nickname ?? item.user?.nickname ?? null
      const rawDate= item.createdDate ?? item.createdAt ?? item.createdDateTime
        ?? item.reviewDate ?? item.reviewDateTime ?? item.registeredAt ?? item.regDateTime
        ?? item.orderDate ?? item.regDate ?? item.writtenAt ?? item.writtenDate
        ?? item.postedAt ?? item.timestamp ?? item.reviewedAt ?? null
      // v1.6j: 배민 실제 reply 필드 = comments (array of {contents, createdAt})
      // 우선순위: comments[0]?.contents > 기존 후보들
      const commentsArr: any[] = Array.isArray(item.comments) ? item.comments : []
      const ownerReplyText = commentsArr.length > 0
        ? (commentsArr[0]?.contents || commentsArr[0]?.comment || commentsArr[0]?.content || (typeof commentsArr[0] === 'string' ? commentsArr[0] : null))
        : null
      const hasReply = !!(ownerReplyText || item.ownerReply ?? item.reply ?? item.ownerComment
        ?? item.replyContent ?? item.hasOwnerReply ?? item.hasComment ?? item.commentExists
        ?? (commentsArr.length > 0))
      const replyContent = ownerReplyText
        ?? item.ownerReply?.content ?? item.ownerReply?.comment ?? item.ownerReply
        ?? item.reply?.content ?? item.reply?.comment ?? item.reply
        ?? item.ownerComment ?? item.replyContent ?? item.ceoComment
        ?? item.ceoReply?.content ?? item.ceoReply ?? null

      // v1.2: 가비지 검증 — 의미 데이터 모두 null 이면 skip
      if (!author && !content && rating === null) continue

      const photoSrc = item.photos ?? item.images ?? item.imageUrls ?? item.reviewImages ?? item.imageList ?? []
      // v1.1: 배민 CDN 도메인만 허용 (다른 업체 이미지 leak 방지)
      const photos: string[] = Array.isArray(photoSrc)
        ? photoSrc
            .map((p: any) => typeof p === 'string' ? p : (p?.url ?? p?.imageUrl ?? p?.src ?? ''))
            .filter(Boolean)
            .map((u: string) => u.startsWith('//') ? 'https:' + u : u)
            .filter(isValidBaeminPhotoUrl)
        : []

      // rating numeric 변환 (string "5" 같은 경우 대응)
      let ratingNum: number | null = null
      if (typeof rating === 'number') ratingNum = Math.min(5, Math.max(1, Math.round(rating)))
      else if (typeof rating === 'string') {
        const n = parseFloat(rating)
        if (!isNaN(n)) ratingNum = Math.min(5, Math.max(1, Math.round(n)))
      }

      results.push({
        platform_review_id: 'baemin-real-' + String(id),
        author_name:   typeof author === 'string' && author.trim() ? author.trim() : null,
        rating:        ratingNum,
        content:       typeof content === 'string' ? content.trim() || null : null,
        photos,
        posted_at:     rawDate ? normalizeBaeminDate(String(rawDate)) : null,
        has_reply:     hasReply,
        reply_content: typeof replyContent === 'string' ? replyContent.trim() || null : null,
        raw_snapshot:  item,
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
