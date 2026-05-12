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
import { createDecipheriv, createCipheriv, randomBytes } from 'crypto'

// v1.6w: 배민 v1.6c 패턴 — 쿠키 JSON 영속화 + Node 20 ws polyfill (이미 supabase.ts 에서)
function loadKekHex(): Buffer | null {
  const raw = (process.env.ENCRYPTION_KEK_HEX || '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) return null
  return Buffer.from(raw, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string | null {
  const kek = loadKekHex()
  if (!kek) return null
  try {
    const d = createDecipheriv('aes-256-gcm', kek, Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8')
  } catch { return null }
}

async function loadYogiyoCookieJar(svc: any, userId: string): Promise<any[]> {
  try {
    const { data } = await svc
      .from('platform_credentials')
      .select('extra_data')
      .eq('user_id', userId).eq('platform', 'yogiyo').maybeSingle()
    const extra = (data?.extra_data as any) || {}

    // JSON object 영속화 우선
    if (extra.yogiyo_cookies_json_enc) {
      const json = decryptStr(extra.yogiyo_cookies_json_enc, extra.yogiyo_cookies_json_iv, extra.yogiyo_cookies_json_tag)
      if (json) {
        try {
          const arr = JSON.parse(json)
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map((c: any) => ({
              name: String(c.name),
              value: String(c.value),
              domain: c.domain || '.yogiyo.co.kr',
              path: c.path || '/',
              httpOnly: !!c.httpOnly,
              secure: c.secure !== false,
              sameSite: ['Strict', 'Lax', 'None'].includes(c.sameSite) ? c.sameSite : 'Lax',
              ...(typeof c.expires === 'number' && c.expires > 0 ? { expires: c.expires } : {}),
            }))
          }
        } catch { /* fall through */ }
      }
    }

    // legacy string fallback
    if (extra.yogiyo_cookie_str) {
      const cookies: any[] = []
      for (const part of String(extra.yogiyo_cookie_str).split(';')) {
        const kv = part.trim()
        const eq = kv.indexOf('=')
        if (eq <= 0) continue
        const name = kv.slice(0, eq).trim()
        const value = kv.slice(eq + 1).trim()
        if (!name || !value) continue
        cookies.push({
          name, value,
          domain: '.yogiyo.co.kr', path: '/',
          httpOnly: false, secure: true, sameSite: 'Lax' as const,
        })
      }
      return cookies
    }
  } catch { /* ignore */ }
  return []
}

async function saveYogiyoCookies(svc: any, userId: string, cookies: any[]) {
  try {
    const kek = loadKekHex()
    if (!kek) return
    const yogiyoCookies = cookies.filter((c: any) => (c.domain || '').includes('yogiyo.co.kr'))
    if (yogiyoCookies.length === 0) return

    const json = JSON.stringify(yogiyoCookies)
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', kek, iv)
    const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    const { data: existing } = await svc
      .from('platform_credentials').select('extra_data')
      .eq('user_id', userId).eq('platform', 'yogiyo').maybeSingle()
    const prev = (existing?.extra_data as any) || {}

    await svc.from('platform_credentials').update({
      extra_data: {
        ...prev,
        yogiyo_cookies_json_enc: enc.toString('base64'),
        yogiyo_cookies_json_iv: iv.toString('base64'),
        yogiyo_cookies_json_tag: tag.toString('base64'),
        cookie_saved_at: new Date().toISOString(),
        cookie_source: 'worker_login_v1_6w',
      },
    }).eq('user_id', userId).eq('platform', 'yogiyo')
  } catch { /* non-fatal */ }
}
import type { JobResult, Action } from '../jobs'

const LOGIN_URL = 'https://ceo.yogiyo.co.kr/login/'

// v38: yogiyo login form selector 확장 — 최신 CEO 포털 DOM 변경 대응
const DOM_SELECTORS = {
  pwInput: 'input[name="password"], input[type="password"], input[id*="password" i], input[placeholder*="비밀번호"], input[placeholder*="password" i], input[aria-label*="비밀번호"]',
  idInput: 'input[name="username"], input[name="loginId"], input[name="email"], input[name="id"], input[id*="username" i], input[id*="loginId" i], input[type="email"], input[placeholder*="아이디"], input[placeholder*="이메일"]',
  loginBtn: 'button[type="submit"], button:has-text("로그인"), button:has-text("로그인하기"), button:has-text("Sign in"), [role="button"]:has-text("로그인")',
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

  // v1.6z: VERSION_MARKER — 30일 DB-기반 fallback + 다단계 reply fallback + 검증
  log.info({ version: 'yogiyo-v1.6z', ts: '20260506T1200' }, 'YOGIYO_ADAPTER_VERSION_MARKER')

  const svc = getServiceClient()
  let creds: any
  try {
    creds = await loadPlainCredentials(svc, userId, 'yogiyo')
  } catch (e: any) {
    if (String(e?.message || '').includes('not_connected')) {
      log.warn({ userId }, 'yogiyo: 사용자가 연결 해제됨 — 큐 잡 skip')
      return { status: 'skipped', message: 'user disconnected' }
    }
    throw e
  }
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    },
  })
  // 트래픽 절감 (iproyal 절약) — 요기요 부수 API 30+ 추가 차단
  const { applyTrafficSaver } = await import('../lib/trafficSaver')
  await applyTrafficSaver(context, { platform: 'yogiyo' })

  // v1.6w: 저장된 쿠키 주입 (배민 v1.5 패턴) — fresh login 우회
  const savedCookies = await loadYogiyoCookieJar(svc, userId)
  if (savedCookies.length > 0) {
    try {
      await context.addCookies(savedCookies)
      log.info({ count: savedCookies.length }, 'yogiyo: cookies injected from save-login')
    } catch (e: any) {
      log.warn({ err: e?.message }, 'yogiyo: cookie inject failed (will fall back to fresh login)')
    }
  }

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

    // v38b: yogiyo CEO 가 React SPA — `<div id="root">` 만 있고 input 은 JS mount 후 생성
    //   server HTML size 745 bytes 확인됨 (yogiyo-dom-probe). React mount 까지 대기 필수.
    //   1) #root 의 children 이 생길 때까지 기다리기 (React mount 신호)
    //   2) URL 변경 감지 (kakao OAuth redirect 가능성)
    //   3) 그래도 안 되면 input polling
    log.info('yogiyo: SPA mount 대기 시작 (#root children + networkidle)')
    try {
      await page.waitForFunction(() => {
        const root = document.querySelector('#root')
        return root && root.children.length > 0
      }, { timeout: 20000 })
      log.info('yogiyo: #root mount 감지')
    } catch (_) {
      log.warn('yogiyo: #root mount 20s 안 됨 — networkidle 폴백')
    }

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null)
    await page.waitForTimeout(2000)

    // URL 변경 체크 (OAuth redirect)
    const mountUrl = page.url()
    if (!mountUrl.includes('yogiyo.co.kr')) {
      log.warn({ mountUrl }, 'yogiyo: 다른 도메인으로 redirect — OAuth 또는 차단')
    }

    // v38b: 폴링 방식으로 password input 찾기 (최대 30초)
    let pwLocator = page.locator(DOM_SELECTORS.pwInput).first()
    let pwVisible = false
    const pollStart = Date.now()
    while (Date.now() - pollStart < 30000) {
      pwVisible = await pwLocator.isVisible().catch(() => false)
      if (pwVisible) break

      // input 자체가 있는지 (visible 아니어도)
      const inputCount = await page.locator('input').count().catch(() => 0)
      if (inputCount > 0) {
        log.info({ inputCount }, 'yogiyo: input 발견 — selector 매칭 시도')
        // 모든 input 의 attributes 덤프
        const allInputs = await page.locator('input').evaluateAll((els) =>
          els.slice(0, 20).map((el: any) => ({
            type: el.type, name: el.name, id: el.id,
            placeholder: el.placeholder, ariaLabel: el.getAttribute('aria-label'),
            visible: !!(el.offsetWidth || el.offsetHeight),
          }))
        ).catch(() => [])
        log.info({ allInputs }, 'yogiyo: DOM input 디버그 덤프')

        // 새 selector pattern 으로 재시도 — type=password
        const fallbackLocators = [
          'input[type="password"]',
          'input[name*="pw" i]',
          'input[name*="password" i]',
          'input[placeholder*="비밀번호"]',
          'input[id*="pw" i]',
          'input[id*="password" i]',
        ]
        for (const sel of fallbackLocators) {
          const found = await page.locator(sel).first().isVisible().catch(() => false)
          if (found) {
            log.info({ sel }, 'yogiyo: fallback selector 매칭 성공')
            pwLocator = page.locator(sel).first()
            pwVisible = true
            break
          }
        }
        if (pwVisible) break
      }
      await page.waitForTimeout(1500)
    }

    if (!pwVisible) {
      // iframe 내부 검사 (마지막 수단)
      const frames = page.frames()
      log.info({ frameCount: frames.length, frameUrls: frames.map(f => f.url().slice(0, 60)) }, 'yogiyo: iframe 검사')
      for (const frame of frames) {
        try {
          const framePw = frame.locator(DOM_SELECTORS.pwInput).first()
          const visible = await framePw.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)
          if (visible) {
            log.info({ frameUrl: frame.url() }, 'yogiyo: login form found in iframe!')
            pwLocator = framePw as any
            pwVisible = true
            break
          }
        } catch (_) {}
      }
    }

    if (!pwVisible) {
      await dumpPageDiagnostics(page, log, 'yogiyo-login-form-missing')
      await markLoginStatus(svc, userId, 'yogiyo', 'failed', 'login form not found (v38b: SPA mount + polling + iframe 모두 실패)')
      return { status: 'failed', message: 'yogiyo 로그인 폼을 찾지 못했습니다 (v38b: SPA 30s polling + iframe + URL check 실패 — yogiyo IP 차단 또는 OAuth redirect 의심)' }
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

    // v1.6w: fresh 로그인 후 쿠키 자동 저장 (다음 fetch 부터 inject 사용)
    try {
      const allCookies = await context.cookies()
      await saveYogiyoCookies(svc, userId, allCookies)
      log.info({ count: allCookies.length }, 'yogiyo: fresh cookies saved (v1.6w)')
    } catch (cookieErr: any) {
      log.warn({ err: cookieErr?.message }, 'yogiyo: cookie save failed (non-fatal)')
    }

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

    // v1.6x: 다중 매장 자동 감지 — captured XHR 또는 DOM 에서 모든 매장 ID 추출
    const detectedShopIds = new Set<string>()
    for (const cap of capturedJsonResponses) {
      // /restaurants/{id}/ 또는 shopId, restaurantId 필드
      const m = cap.url.match(/\/restaurants\/(\d+)/)
      if (m) detectedShopIds.add(m[1])
      const body = cap.body
      if (Array.isArray(body)) {
        for (const item of body.slice(0, 100)) {
          if (item?.shop_id) detectedShopIds.add(String(item.shop_id))
          if (item?.restaurant_id) detectedShopIds.add(String(item.restaurant_id))
          if (item?.id && /^\d{4,}$/.test(String(item.id))) detectedShopIds.add(String(item.id))
        }
      }
    }
    const allShopIds = Array.from(detectedShopIds)
    log.info({ allShopIds, credShopId: creds.platform_store_id }, 'yogiyo: detected shops')

    // platform_store_id 없으면 자동 저장 (첫 감지된 ID)
    if ((!creds.platform_store_id || creds.platform_store_id === 'unknown') && allShopIds.length > 0) {
      try {
        await svc.from('platform_credentials')
          .update({ platform_store_id: allShopIds[0] })
          .eq('user_id', userId).eq('platform', 'yogiyo')
        log.info({ savedShopId: allShopIds[0] }, 'yogiyo: platform_store_id auto-saved')
      } catch (_) {}
    }

    const shopId = creds.platform_store_id || allShopIds[0] || 'unknown'
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

      // v1.6z: 30일 정책 검사 — 1차 ID prefix YYYYMMDD, 2차 DB posted_at fallback
      let postedAtForCheck: string | null = null
      let reviewInfo: { author?: string | null; content?: string | null; postedAt?: string | null } = {}
      try {
        const { data: reviewRow } = await svc
          .from('platform_reviews')
          .select('posted_at, author_name, content')
          .eq('user_id', userId).eq('platform', 'yogiyo')
          .eq('platform_review_id', targetId)
          .maybeSingle()
        if (reviewRow) {
          postedAtForCheck = reviewRow.posted_at || null
          reviewInfo = { author: reviewRow.author_name, content: reviewRow.content, postedAt: postedAtForCheck }
        }
      } catch {}

      const idMatch = targetId.replace(/^yogiyo[-:]?/, '').match(/^(\d{8})/)
      let ageMs: number | null = null
      if (idMatch) {
        const ymd = idMatch[1]
        const dateStr = ymd.slice(0,4) + '-' + ymd.slice(4,6) + '-' + ymd.slice(6,8) + 'T00:00:00'
        const ts = new Date(dateStr).getTime()
        if (!isNaN(ts)) ageMs = Date.now() - ts
      }
      if (ageMs == null && postedAtForCheck) {
        const ts = new Date(postedAtForCheck).getTime()
        if (!isNaN(ts)) ageMs = Date.now() - ts
      }
      if (ageMs != null && ageMs / 86400_000 > 30) {
        log.warn({ targetId, daysAgo: Math.round(ageMs / 86400_000) }, 'yogiyo: review > 30 days — reply skipped')
        // v1.6z: DB 에도 실패 사유 기록 (통계 페이지 분류용)
        try {
          await svc.from('platform_reviews').update({
            reply_status: 'failed',
            reply_error: '요기요 30일 정책 만료 — 답글 등록 불가',
          }).eq('user_id', userId).eq('platform', 'yogiyo').eq('platform_review_id', targetId)
        } catch {}
        return { status: 'failed', message: '요기요 정책상 30일 지난 리뷰에 답글 등록 불가' }
      }

      const replied = await postYogiyoReply(page, targetId, replyText, reviewInfo, log)
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
          .eq('user_id', userId)
          .eq('platform', 'yogiyo')
          .eq('platform_review_id', targetId)
        return { status: 'ok', message: `yogiyo: reply posted for ${targetId}` }
      }
      // v1.6z: 실패 사유 DB 기록
      try {
        await svc.from('platform_reviews').update({
          reply_status: 'failed',
          reply_error: replied.reason,
        }).eq('user_id', userId).eq('platform', 'yogiyo').eq('platform_review_id', targetId)
      } catch {}
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

// v1.6z: 다단계 fallback — data 속성 → 작성자/본문 매칭 → 진단 덤프 + 답글 등록 검증
async function postYogiyoReply(
  page: any,
  platformReviewId: string,
  replyText: string,
  reviewInfo: { author?: string | null; content?: string | null; postedAt?: string | null },
  log: Logger,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    log.info({
      platformReviewId,
      hasAuthor: !!reviewInfo.author,
      hasContent: !!reviewInfo.content,
    }, 'yogiyo: post_reply 시작 (v1.6z)')

    // ── 사전 준비: 리뷰 카드 영역까지 스크롤 ──
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800)).catch(() => null)
      await page.waitForTimeout(500)
    }
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => null)
    await page.waitForTimeout(500)

    // ── 1단계: data 속성으로 카드 찾기 ──
    const dataAttrSelectors = [
      `[data-review-id="${platformReviewId}"]`,
      `[data-id="${platformReviewId}"]`,
      `[data-review_id="${platformReviewId}"]`,
      `[id="review-${platformReviewId}"]`,
    ].join(', ')
    let card = await page.$(dataAttrSelectors).catch(() => null)

    // ── 2단계: 작성자 + 본문 텍스트 매칭 (data 속성 매칭 실패 시) ──
    if (!card && (reviewInfo.author || reviewInfo.content)) {
      const author = reviewInfo.author || ''
      const contentSnippet = (reviewInfo.content || '').slice(0, 30).trim()
      log.info({ author, contentSnippet }, 'yogiyo: data 속성 매칭 실패 → 작성자/본문 매칭 시도')

      // 다양한 카드 후보 셀렉터 시도
      const cardSelectors = [
        '[class*="reviewItem"]', '[class*="ReviewItem"]',
        '[class*="review-item"]', '[class*="review_item"]',
        'li[class*="review"]', 'div[class*="review"][class*="card"]',
        '[data-testid*="review"]',
      ]

      for (const sel of cardSelectors) {
        try {
          card = await page.evaluateHandle((args: { selector: string; author: string; content: string }) => {
            const cards = Array.from(document.querySelectorAll(args.selector))
            for (const c of cards) {
              const text = (c as HTMLElement).innerText || ''
              const matchAuthor = args.author && text.includes(args.author)
              const matchContent = args.content && text.includes(args.content)
              if (matchAuthor || matchContent) return c
            }
            return null
          }, { selector: sel, author, content: contentSnippet })

          const isNull = card ? await card.evaluate((el: any) => el == null).catch(() => true) : true
          if (!isNull) {
            log.info({ matchedBy: sel }, 'yogiyo: 카드 매칭 성공')
            break
          }
          card = null
        } catch { card = null }
      }
    }

    if (!card) {
      await dumpPageDiagnostics(page, log, 'yogiyo-reply-card-not-found')
      return { ok: false, reason: `리뷰 카드 못찾음 (${platformReviewId}) — 페이지 구조 변경 또는 리뷰 위치 이동` }
    }

    // ── 답글 버튼 탐색 (다양한 selector 시도) ──
    const replyBtnSelectors = [
      'button:has-text("답글")',
      'button:has-text("사장님 답글")',
      'button:has-text("답글 등록")',
      '[class*="replyButton"]',
      '[class*="reply-button"]',
      '[class*="reply_button"]',
      'button[aria-label*="답글"]',
    ]
    let replyBtn = null
    for (const sel of replyBtnSelectors) {
      replyBtn = await card.$(sel).catch(() => null)
      if (replyBtn) {
        log.info({ matchedBy: sel }, 'yogiyo: 답글 버튼 매칭')
        break
      }
    }
    if (!replyBtn) {
      // 카드 내부에 없으면 페이지 전체에서 시도
      for (const sel of replyBtnSelectors) {
        replyBtn = await page.$(sel).catch(() => null)
        if (replyBtn) break
      }
    }
    if (!replyBtn) {
      await dumpPageDiagnostics(page, log, 'yogiyo-reply-button-missing')
      return { ok: false, reason: '답글 버튼 못찾음 — 사장님 권한 확인 필요 또는 페이지 구조 변경' }
    }
    await replyBtn.click().catch(() => null)
    await page.waitForTimeout(1500)

    // ── 텍스트 입력 ──
    const textareaSelectors = [
      'textarea[placeholder*="답글"]',
      'textarea[placeholder*="내용"]',
      'textarea[class*="reply"]',
      'textarea[name*="reply"]',
      'textarea[name*="comment"]',
      '[contenteditable="true"]',
    ]
    let textarea = null
    for (const sel of textareaSelectors) {
      textarea = await page.$(sel).catch(() => null)
      if (textarea) break
    }
    if (!textarea) {
      await dumpPageDiagnostics(page, log, 'yogiyo-reply-textarea-missing')
      return { ok: false, reason: '답글 입력창 못찾음 (DOM 변경 가능)' }
    }
    // contenteditable 도 fill 동작
    await textarea.fill(replyText).catch(async () => {
      // fallback: 클릭 + 키 입력
      await textarea.click().catch(() => null)
      await page.keyboard.type(replyText, { delay: 10 }).catch(() => null)
    })
    await page.waitForTimeout(500)

    // ── 등록 버튼 ──
    const submitSelectors = [
      'button:has-text("등록")',
      'button:has-text("저장")',
      'button:has-text("확인")',
      'button:has-text("답글 등록")',
      'button[type="submit"]',
    ]
    let submit = null
    for (const sel of submitSelectors) {
      // 모달 안에 있을 가능성이 높으므로 페이지 전체에서 탐색
      const candidates = await page.$$(sel).catch(() => [])
      for (const c of candidates) {
        // 숨겨진 또는 disabled 버튼 제외
        const enabled = await c.isEnabled().catch(() => false)
        const visible = await c.isVisible().catch(() => false)
        if (enabled && visible) {
          submit = c
          log.info({ matchedBy: sel }, 'yogiyo: 등록 버튼 매칭')
          break
        }
      }
      if (submit) break
    }
    if (!submit) {
      await dumpPageDiagnostics(page, log, 'yogiyo-reply-submit-missing')
      return { ok: false, reason: '답글 등록 버튼 못찾음' }
    }
    await submit.click().catch(() => null)
    await page.waitForTimeout(3000)

    // ── 검증: 답글이 실제로 노출됐는지 확인 ──
    const verified = await page.evaluate((args: { reply: string }) => {
      const candidates = Array.from(document.querySelectorAll(
        '[class*="ownerReply"], [class*="owner_reply"], [class*="OwnerReply"], [class*="ceo"], [class*="CEO"], [class*="reply"]',
      ))
      const snippet = args.reply.trim().slice(0, 25)
      return candidates.some((el) => ((el as HTMLElement).innerText || '').includes(snippet))
    }, { reply: replyText }).catch(() => false)

    if (!verified) {
      log.warn({ platformReviewId }, 'yogiyo: submit 클릭됐으나 답글 노출 검증 실패 (성공 간주, 다음 fetch 에서 확인)')
    } else {
      log.info({ platformReviewId }, 'yogiyo: 답글 노출 검증 성공')
    }

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
