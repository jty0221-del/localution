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

  // 3) 네트워크 응답 가로채기 — 메뉴 GraphQL/JSON 찾기
  page.on('response', async (resp) => {
    try {
      const url = resp.url()
      if (!url.includes('graphql') && !url.includes('menu') && !url.includes('Menu')) return
      const ct = resp.headers()['content-type'] || ''
      if (!ct.includes('json')) return

      const json = await resp.json().catch(() => null)
      if (!json) return

      networkLog.push({ url: url.slice(0, 120), status: resp.status() })

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

  // 4) 메뉴 페이지 접근
  const menuUrl = bookingBusinessId
    ? `${SMARTPLACE_BASE}/bizes/place/${placeId}/details?bookingBusinessId=${bookingBusinessId}&menu=price`
    : `${SMARTPLACE_BASE}/bizes/place/${placeId}/details?menu=price`

  log.info({ menuUrl }, 'naver-menu: navigating to menu page')

  try {
    await page.goto(menuUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null)

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

    // "전체보기" 버튼 클릭 시도
    try {
      const seeAllBtn = await page.locator('text=/전체보기/').first()
      if (await seeAllBtn.isVisible({ timeout: 3000 })) {
        await seeAllBtn.click({ timeout: 3000 })
        await page.waitForTimeout(2000)
        log.info('naver-menu: clicked 전체보기')
      }
    } catch (_) {}

    // 추가 대기 (lazy load)
    await page.waitForTimeout(3000)

    // 5) DOM 폴백 — 응답에서 못 잡았으면 DOM 에서 직접 추출
    if (capturedMenus.length === 0) {
      log.info('naver-menu: no captured menus from network, trying DOM scrape')
      try {
        const domMenus = await page.evaluate(() => {
          const items: any[] = []
          // 다양한 메뉴 박스 셀렉터 시도
          const selectors = [
            '[class*="menu_box"]',
            '[class*="MenuItem"]',
            '[class*="menuList"] > li',
            '[class*="menu-item"]',
            'li[class*="menu"]',
          ]
          let nodes: NodeListOf<Element> | null = null
          for (const s of selectors) {
            const found = document.querySelectorAll(s)
            if (found.length > 0) { nodes = found; break }
          }
          if (!nodes) return []

          nodes.forEach((node: any) => {
            const nameEl = node.querySelector('[class*="name"], [class*="Name"], [class*="title"]') as HTMLElement
            const priceEl = node.querySelector('[class*="price"], [class*="Price"], em') as HTMLElement
            const imgEl = node.querySelector('img') as HTMLImageElement
            const descEl = node.querySelector('[class*="desc"], [class*="Desc"]') as HTMLElement

            const name = nameEl?.textContent?.trim()
            const priceText = priceEl?.textContent?.trim()
            if (name && priceText) {
              items.push({
                name,
                price: priceText,
                image_url: imgEl?.src || null,
                description: descEl?.textContent?.trim() || null,
              })
            }
          })
          return items
        })

        for (const d of domMenus) {
          capturedMenus.push({
            name_ko: String(d.name).slice(0, 80),
            price: parseInt(String(d.price).replace(/[^0-9]/g, ''), 10) || 0,
            image_url: d.image_url,
            desc_ko: d.description?.slice(0, 200) || null,
          })
        }
        log.info({ count: domMenus.length }, 'naver-menu: DOM scrape result')
      } catch (e: any) {
        log.warn({ err: e?.message }, 'naver-menu: DOM scrape failed')
      }
    }
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

  await context.close()
  if (usingFreshBrowser && menuBrowser) {
    try { await menuBrowser.close() } catch (_) {}
  }

  // 6) 결과 저장
  if (capturedMenus.length === 0) {
    await updateImport({
      status: 'failed',
      error_code: 'no_menus_found',
      error_message: '메뉴가 등록되지 않았거나 페이지에서 찾을 수 없어요. 네이버 플레이스에 메뉴를 등록한 후 다시 시도해주세요.',
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
