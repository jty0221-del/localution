// worker/src/adapters/naver-menu.ts
// ============================================================
// 네이버 메뉴 가져오기 (Option A — Playwright + 사장님 인증 세션)
//
// 흐름:
//   1) loadCookieData() 로 저장된 네이버 쿠키 로드
//   2) Playwright context 에 쿠키 주입
//   3) new.smartplace.naver.com/bizes/place/{placeId}/details?menu=price 접근
//   4) 메뉴 GraphQL 응답 가로채기 (page.on('response'))
//   5) menu_imports 테이블에 결과 저장
//
// 입력 payload: { import_id, place_id, booking_business_id? }
// ============================================================
import { chromium, type Browser } from 'playwright'
import type { Logger } from 'pino'
import { getServiceClient } from '../lib/supabase'
import { loadPlainCredentials, loadCookieData } from '../lib/credentials'

const SMARTPLACE_BASE = 'https://new.smartplace.naver.com'

type MenuItem = {
  name_ko: string
  price: number
  image_url?: string | null
  desc_ko?: string | null
  category?: string | null
  is_signature?: boolean
}

export interface MenuOptions {
  userId: string
  storeId: string
  browser: Browser
  log: Logger
}

export async function runNaverMenu(
  opts: MenuOptions,
  payload?: Record<string, unknown>,
): Promise<{ status: 'ok' | 'failed'; message?: string; data?: any }> {
  const { userId, browser, log } = opts
  const importId = String(payload?.import_id || '')
  const placeId = String(payload?.place_id || '').replace(/[^0-9]/g, '')
  const bookingBusinessId = payload?.booking_business_id ? String(payload.booking_business_id) : null

  if (!importId || !placeId) {
    return { status: 'failed', message: 'missing_import_id_or_place_id' }
  }

  const svc = getServiceClient()

  async function updateImport(patch: Record<string, any>) {
    try {
      await svc.from('menu_imports').update({
        ...patch,
        updated_at: new Date().toISOString(),
      }).eq('id', importId)
    } catch (e) {
      log.warn({ err: String((e as any)?.message) }, 'menu_imports update failed')
    }
  }

  await updateImport({ status: 'running' })

  // 1) 쿠키 로드
  let cookieJson: string | null = null
  try {
    cookieJson = await loadCookieData(svc, userId)
  } catch (e: any) {
    await updateImport({
      status: 'failed',
      error_code: 'no_cookies',
      error_message: '저장된 네이버 세션이 없어요. 매장 연결 페이지에서 다시 로그인해주세요.',
      completed_at: new Date().toISOString(),
    })
    return { status: 'failed', message: 'no_cookies' }
  }

  if (!cookieJson) {
    await updateImport({
      status: 'failed',
      error_code: 'no_cookies',
      error_message: '저장된 네이버 세션이 없어요. 매장 연결 페이지에서 다시 로그인해주세요.',
      completed_at: new Date().toISOString(),
    })
    return { status: 'failed', message: 'no_cookies' }
  }

  // 2) 프록시 우회용 별도 Chromium 인스턴스 launch
  // 메뉴는 사장님 인증 쿠키로 접근하므로 프록시 불필요 (오히려 ERR_TUNNEL_CONNECTION_FAILED 유발)
  let menuBrowser: Browser | null = null
  let usingFreshBrowser = false
  try {
    menuBrowser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    })
    usingFreshBrowser = true
    log.info('naver-menu: launched fresh chromium (no proxy) for menu fetch')
  } catch (e: any) {
    log.warn({ err: e?.message }, 'naver-menu: fresh chromium launch failed, falling back to shared browser')
    menuBrowser = browser
  }

  const context = await menuBrowser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    bypassCSP: true,
  })

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  })

  // 쿠키 파싱 + 주입
  try {
    const cookies = JSON.parse(cookieJson)
    if (Array.isArray(cookies)) {
      await context.addCookies(cookies.map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain || '.naver.com',
        path: c.path || '/',
        expires: c.expires || c.expirationDate || -1,
        httpOnly: !!c.httpOnly,
        secure: !!c.secure,
        sameSite: c.sameSite === 'Strict' ? 'Strict' : c.sameSite === 'Lax' ? 'Lax' : 'None',
      })))
      log.info({ cookieCount: cookies.length }, 'naver-menu: cookies injected')
    }
  } catch (e: any) {
    log.warn({ err: e?.message }, 'naver-menu: cookie parse failed, continuing without')
  }

  const page = await context.newPage()
  const capturedMenus: MenuItem[] = []
  const networkLog: any[] = []

  // 3) 네트워크 응답 가로채기 — 모든 JSON 응답 검사 (smartplace partner API 구조 미지정)
  const allJsonUrls: string[] = []
  page.on('response', async (resp) => {
    try {
      const url = resp.url()
      const ct = resp.headers()['content-type'] || ''

      // JSON 응답만 (HTML/CSS/img 제외)
      if (!ct.includes('json')) return
      // 명백한 무관 URL 필터 (analytics, ads 등)
      if (url.includes('google-analytics') || url.includes('doubleclick') || url.includes('analytics')) return

      allJsonUrls.push(url.slice(0, 200))

      const json = await resp.json().catch(() => null)
      if (!json) return

      networkLog.push({
        url: url.slice(0, 200),
        status: resp.status(),
        sample: JSON.stringify(json).slice(0, 300),
      })

      const found = extractMenusDeep(json)
      if (found && found.length > 0) {
        for (const m of found) {
          if (!capturedMenus.find(x => x.name_ko === m.name_ko)) {
            capturedMenus.push(m)
          }
        }
        log.info({ url: url.slice(0, 80), count: found.length, total: capturedMenus.length }, 'naver-menu: captured from response')
      }
    } catch (_) {}
  })

  // 4) 사장님 실제 흐름 그대로: home → 매장 링크 클릭 → SNB 메뉴 클릭
  const snblnbResponses: any[] = []

  // snblnb 응답 추가 캡처 (전체)
  page.on('response', async (resp) => {
    try {
      if (resp.url().includes('snblnb') || resp.url().includes('SnbLnb')) {
        const j = await resp.json().catch(() => null)
        if (j) snblnbResponses.push(j)
      }
    } catch (_) {}
  })

  try {
    // STEP 1: smartplace home 진입
    await page.goto(`${SMARTPLACE_BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null)
    await page.waitForTimeout(5000)

    // 로그인 리다이렉트 확인
    const homeUrl = page.url()
    if (homeUrl.includes('nid.naver.com/nidlogin') || homeUrl.includes('login.naver.com')) {
      await context.close()
      if (usingFreshBrowser && menuBrowser) { try { await menuBrowser.close() } catch (_) {} }
      await updateImport({
        status: 'failed',
        error_code: 'session_expired',
        error_message: '네이버 세션이 만료됐어요. 매장 연결 페이지에서 다시 로그인해주세요.',
        completed_at: new Date().toISOString(),
      })
      return { status: 'failed', message: 'session_expired' }
    }

    log.info({ homeUrl }, 'naver-menu: smartplace home loaded')

    // STEP 2: home 에서 placeId 매칭 링크 찾기
    const businessLink = await page.evaluate((pid) => {
      const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]
      const match = links.find(a => a.href.includes(`/place/${pid}`) || a.href.includes(`placeId=${pid}`) || a.href.includes(`/${pid}`))
      return match?.href || null
    }, placeId)

    log.info({ businessLink }, 'naver-menu: matched business link')

    if (businessLink) {
      // STEP 3: 매장 페이지로 이동
      await page.goto(businessLink, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null)
      await page.waitForTimeout(5000)
      log.info({ url: page.url(), bodyLen: await page.evaluate(() => document.body?.innerText?.length || 0) }, 'naver-menu: business page loaded')

      // STEP 4: SNB/페이지 안에서 "메뉴" 링크 찾아 클릭
      const menuClicked = await page.evaluate(() => {
        const allEls = Array.from(document.querySelectorAll('a, button, [role="button"], [role="link"], [role="tab"]'))
        // 메뉴 텍스트 패턴
        const menuPatterns = ['메뉴', '메뉴 가격', '메뉴 정보', '메뉴 관리', 'Menu']
        for (const el of allEls as HTMLElement[]) {
          const text = (el.innerText || el.textContent || '').trim()
          if (menuPatterns.some(p => text === p || text.startsWith(p))) {
            // href 가 있으면 click 시 React Router 가 처리
            el.click()
            return { clicked: true, text, href: (el as HTMLAnchorElement).href || null }
          }
        }
        return { clicked: false }
      })

      log.info({ menuClicked }, 'naver-menu: menu link click result')

      if (menuClicked.clicked) {
        await page.waitForTimeout(3000)
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null)
        await page.waitForTimeout(3000)
        log.info({ url: page.url() }, 'naver-menu: after menu click')
      } else {
        // 메뉴 링크 못 찾았으면 직접 goto 시도 (다양한 URL)
        const candidateUrls = [
          `${SMARTPLACE_BASE}/bizes/place/${placeId}/menu`,
          `${SMARTPLACE_BASE}/bizes/place/${placeId}/menus`,
          `${SMARTPLACE_BASE}/bizes/place/${placeId}/menu/price`,
        ]
        for (const u of candidateUrls) {
          try {
            await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 })
            await page.waitForTimeout(3000)
            const bodyLen = await page.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0)
            log.info({ tryUrl: u, finalUrl: page.url(), bodyLen }, 'naver-menu: fallback URL')
            if (bodyLen > 500 && !page.url().endsWith('/')) break
          } catch (_) {}
        }
      }
    } else {
      log.warn({ placeId }, 'naver-menu: could not find business link in home page')

      // 폴백: 직접 goto
      const directUrl = bookingBusinessId
        ? `${SMARTPLACE_BASE}/bizes/place/${placeId}?bookingBusinessId=${bookingBusinessId}`
        : `${SMARTPLACE_BASE}/bizes/place/${placeId}`
      await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(5000)
    }

    log.info({ finalUrl: page.url() }, 'naver-menu: navigation phase complete')

    // 로그인 페이지로 리다이렉트 확인
    const currentUrl = page.url()
    if (currentUrl.includes('nid.naver.com/nidlogin') || currentUrl.includes('login')) {
      await context.close()
  if (usingFreshBrowser && menuBrowser) {
    try { await menuBrowser.close() } catch (_) {}
  }
      await updateImport({
        status: 'failed',
        error_code: 'session_expired',
        error_message: '네이버 세션이 만료됐어요. 매장 연결 페이지에서 다시 로그인해주세요.',
        completed_at: new Date().toISOString(),
      })
      return { status: 'failed', message: 'session_expired' }
    }

    // 페이지 인터랙티브 대기 (smartplace SPA)
    log.info('naver-menu: waiting for SPA hydration...')
    await page.waitForTimeout(8000)  // 초기 GraphQL (placeBusiness, getSnbLnb) 대기

    // 메뉴 페이지가 비어있으면 — 메뉴 탭 클릭 시도
    const menuTabTexts = ['메뉴 가격', '메뉴', '메뉴 정보', '대표메뉴', '메뉴 관리']
    for (const btnText of menuTabTexts) {
      if (capturedMenus.length > 0) break
      try {
        const tab = page.locator(`text=/^${btnText}$/`).first()
        if (await tab.isVisible({ timeout: 2000 })) {
          await tab.click({ timeout: 2000 })
          await page.waitForTimeout(3000)
          log.info({ btnText }, 'naver-menu: clicked menu tab')
          break
        }
      } catch (_) {}
    }

    // "전체보기" 또는 유사 버튼 클릭
    const allButtonTexts = ['전체보기', '전체 메뉴', '더보기', '전체', '메뉴 전체']
    for (const btnText of allButtonTexts) {
      try {
        const btn = page.locator(`text=/${btnText}/`).first()
        if (await btn.isVisible({ timeout: 1500 })) {
          await btn.click({ timeout: 2000 })
          await page.waitForTimeout(2500)
          log.info({ btnText }, 'naver-menu: clicked button')
          break
        }
      } catch (_) {}
    }

    // 추가 스크롤 (lazy load 트리거)
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await page.waitForTimeout(2000)
    } catch (_) {}

    // 본문이 채워질 때까지 폴링 (SPA hydration 대기)
    const startedHydration = Date.now()
    let lastBodyLen = 0
    while (Date.now() - startedHydration < 30_000) {
      const bodyLen = await page.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0)
      if (bodyLen > 500 && bodyLen === lastBodyLen) {
        log.info({ bodyLen }, 'naver-menu: body text stabilized')
        break
      }
      lastBodyLen = bodyLen
      await page.waitForTimeout(2000)

      // 메뉴 캡처됐으면 즉시 종료
      if (capturedMenus.length > 0) break
    }

    log.info({ bodyLen: lastBodyLen, captured: capturedMenus.length }, 'naver-menu: hydration phase complete')

    // 최종 대기 (응답 listener 추가 시간)
    await page.waitForTimeout(2000)

    // 5) DOM 폴백 — 응답에서 못 잡았으면 DOM 에서 직접 추출
    if (capturedMenus.length === 0) {
      log.info('naver-menu: no captured menus from network, trying DOM scrape')
      try {
        const { domMenus, domDebug } = await page.evaluate(() => {
          const debug: any = {
            url: window.location.href,
            title: document.title,
            bodyTextLen: document.body?.innerText?.length || 0,
          }
          const items: any[] = []

          // 광범위한 셀렉터 시도
          const selectorGroups = [
            ['[class*="menu_box"]', '[class*="MenuItem"]', '[class*="menuList"] > li', '[class*="menu-item"]'],
            ['li[class*="menu"]', 'div[class*="menu"][class*="item"]'],
            ['[role="row"]', 'tr', 'tbody > tr'],
            ['[data-testid*="menu"]', '[data-test*="menu"]'],
            ['li', 'div[class*="item"]'],
          ]

          let nodes: Element[] = []
          for (const group of selectorGroups) {
            for (const s of group) {
              const found = Array.from(document.querySelectorAll(s))
              // 메뉴처럼 생긴 노드만 (가격/원 텍스트 포함)
              const candidates = found.filter(n => {
                const t = n.textContent || ''
                return /\d{3,7}[\s,]?원/.test(t) || /₩[\s]?\d/.test(t)
              })
              if (candidates.length > 0) {
                nodes = candidates
                debug.matchedSelector = s
                debug.matchedCount = candidates.length
                break
              }
            }
            if (nodes.length > 0) break
          }

          // 폴백: 가격 패턴 가진 모든 부모 요소 추출
          if (nodes.length === 0) {
            const allEls = Array.from(document.querySelectorAll('div, li, article, section'))
            const candidates = allEls.filter(n => {
              const txt = n.textContent || ''
              if (txt.length > 500) return false  // 너무 큰 컨테이너 제외
              return /\d{3,7}[\s,]?원/.test(txt)
            })
            // 중복/포함 관계 제거 (가장 작은 단위만)
            nodes = candidates.filter(n => !candidates.some(other => other !== n && other.contains(n)))
            debug.fallbackUsed = true
            debug.fallbackCount = nodes.length
          }

          nodes.forEach((node: any) => {
            const nameEl = node.querySelector('[class*="name"], [class*="Name"], [class*="title"], [class*="Title"], strong, b, h3, h4')
            const priceMatch = (node.textContent || '').match(/(\d{1,3}(?:,\d{3})*|\d+)\s?원/)
            const imgEl = node.querySelector('img') as HTMLImageElement
            const descEl = node.querySelector('[class*="desc"], [class*="Desc"], p')

            let name = nameEl?.textContent?.trim()
            // name 이 없으면 첫 줄에서 추출
            if (!name) {
              const lines = (node.textContent || '').split('\n').map((s: string) => s.trim()).filter(Boolean)
              name = lines[0]?.slice(0, 60)
            }

            if (name && priceMatch) {
              items.push({
                name: name.slice(0, 80),
                price: priceMatch[0],
                image_url: imgEl?.src || null,
                description: descEl?.textContent?.trim().slice(0, 200) || null,
              })
            }
          })

          // 중복 제거 (이름 기준)
          const seen = new Set()
          const unique = items.filter(it => {
            if (seen.has(it.name)) return false
            seen.add(it.name)
            return true
          })

          debug.extractedCount = unique.length
          debug.htmlLen = document.documentElement.outerHTML.length
          return { domMenus: unique, domDebug: debug }
        })

        log.info({ domDebug }, 'naver-menu: DOM scrape result')
        networkLog.push({ dom: domDebug })

        for (const d of domMenus) {
          capturedMenus.push({
            name_ko: String(d.name).slice(0, 80),
            price: parseInt(String(d.price).replace(/[^0-9]/g, ''), 10) || 0,
            image_url: d.image_url,
            desc_ko: d.description?.slice(0, 200) || null,
          })
        }
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver-menu: DOM scrape failed')
      }
    }

    // 디버그용: 캡처된 모든 JSON URL 로그
    log.info({ jsonUrlCount: allJsonUrls.length, urls: allJsonUrls.slice(0, 30) }, 'naver-menu: all captured JSON URLs')
  } catch (e: any) {
    log.error({ err: e?.message }, 'naver-menu: navigation failed')
    await context.close()
  if (usingFreshBrowser && menuBrowser) {
    try { await menuBrowser.close() } catch (_) {}
  }
    await updateImport({
      status: 'failed',
      error_code: 'navigation_failed',
      error_message: '메뉴 페이지 접근에 실패했어요. ' + (e?.message || '').slice(0, 80),
      completed_at: new Date().toISOString(),
    })
    return { status: 'failed', message: 'navigation_failed' }
  }

  // close 전 URL 캡처
  let finalUrlSaved = ''
  try { finalUrlSaved = page.url() } catch (_) {}

  await context.close()
  if (usingFreshBrowser && menuBrowser) {
    try { await menuBrowser.close() } catch (_) {}
  }

  // 6) 결과 저장
  if (capturedMenus.length === 0) {
    // 디버그 정보를 error_message 에 포함 (UI 에서 보여서 진단 가능)
    const debugSummary = JSON.stringify({
      jsonResponseCount: allJsonUrls.length,
      finalUrl: finalUrlSaved,
      sampleUrls: allJsonUrls.filter(u => u.includes('graphql') || u.includes('menu') || u.includes('place') || u.includes('biz')).slice(0, 12),
      domDebug: networkLog.find(x => x.dom)?.dom,
      snblnb: snblnbResponses[0] ? JSON.stringify(snblnbResponses[0]).slice(0, 800) : null,
    }).slice(0, 2200)

    await updateImport({
      status: 'failed',
      error_code: 'no_menus_found',
      error_message: '메뉴를 추출하지 못했어요. 디버그: ' + debugSummary,
      completed_at: new Date().toISOString(),
    })
    return { status: 'failed', message: 'no_menus_found', data: { networkLog } }
  }

  await updateImport({
    status: 'success',
    items: capturedMenus,
    completed_at: new Date().toISOString(),
  })

  log.info({ count: capturedMenus.length }, 'naver-menu: success')
  return { status: 'ok', message: `imported ${capturedMenus.length} menus`, data: { count: capturedMenus.length } }
}

// JSON 트리에서 메뉴 객체 깊이 우선 탐색
function extractMenusDeep(obj: any, depth = 0): MenuItem[] | null {
  if (!obj || depth > 10 || typeof obj !== 'object') return null

  if (Array.isArray(obj)) {
    // 배열 내 객체가 메뉴 모양인지 검사
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      const first = obj[0]
      // 메뉴 항목의 특징: name + price 모두 있음
      if (first.name && (first.price !== undefined || first.priceText)) {
        const items = obj
          .map(o => mapMenuObj(o))
          .filter((m): m is MenuItem => !!m && !!m.name_ko)
        if (items.length > 0) return items
      }
    }
    // 재귀 검색
    for (const v of obj) {
      const r = extractMenusDeep(v, depth + 1)
      if (r) return r
    }
    return null
  }

  // object — 메뉴 keyword 가진 필드 우선 탐색
  for (const k of Object.keys(obj)) {
    if (/^menus?$|menuList|menuItems|item/i.test(k)) {
      const r = extractMenusDeep(obj[k], depth + 1)
      if (r) return r
    }
  }
  for (const k of Object.keys(obj)) {
    const r = extractMenusDeep(obj[k], depth + 1)
    if (r) return r
  }
  return null
}

function mapMenuObj(m: any): MenuItem | null {
  if (!m || typeof m !== 'object' || !m.name) return null
  const name = String(m.name).trim()
  if (!name || name.length > 100) return null
  const price = parseInt(String(m.price ?? m.priceText ?? '0').replace(/[^0-9]/g, ''), 10) || 0

  let image_url: string | null = null
  if (m.image) image_url = typeof m.image === 'string' ? m.image : (m.image.url || null)
  else if (Array.isArray(m.images) && m.images.length > 0) {
    const first = m.images[0]
    image_url = typeof first === 'string' ? first : (first?.url || null)
  } else if (m.imageUrl) image_url = String(m.imageUrl)
  else if (m.thumbnail) image_url = String(m.thumbnail)

  return {
    name_ko: name.slice(0, 80),
    price,
    image_url,
    desc_ko: m.description ? String(m.description).slice(0, 200) : null,
    category: typeof m.category === 'string' ? m.category : (m.category?.name || null),
    is_signature: !!(m.recommend || m.isRecommend || m.featured),
  }
}
