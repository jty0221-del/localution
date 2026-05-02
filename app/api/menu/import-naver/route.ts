// app/api/menu/import-naver/route.ts
// ============================================================
// 네이버 플레이스 메뉴 자동 가져오기 (v3 — 스키마 검증 기반)
//   POST { placeId, bookingBusinessId? }
//
//   네이버 GraphQL 스키마 힌트 (introspection 결과):
//     · RestaurantMenuInput ❌ 존재 안함
//     · BrandMenusInput ✅ 존재  (operation: brandMenus)
//     · restaurantList ✅ (Query field)
//
//   전략 (순서대로 시도):
//     A. GraphQL — restaurant(input) { menus } — 흔한 필드 패턴
//     B. GraphQL — brandMenus(input) — 가맹점/브랜드 메뉴
//     C. m.place.naver.com SSR HTML __APOLLO_STATE__ 파싱
//     D. m.place.naver.com 페이지 DOM 텍스트 패턴 추출 (Last resort)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NAVER_GQL = 'https://pcmap-api.place.naver.com/graphql'
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'

type MenuItem = {
  name_ko: string
  price: number
  image_url?: string | null
  desc_ko?: string | null
  category?: string | null
  is_signature?: boolean
}

const BUSINESS_TYPES = ['restaurant', 'cafe', 'place', 'beauty']

// GET 디버그용 — ?placeId=10441797 으로 직접 호출
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId') || ''
  if (!placeId) return NextResponse.json({ ok: false, error: 'missing_placeId' }, { status: 400 })
  return runImport(placeId)
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const placeId = String(body?.placeId || '').replace(/[^0-9]/g, '')
  if (!placeId) return NextResponse.json({ ok: false, error: 'missing_placeId' }, { status: 400 })

  return runImport(placeId)
}

async function runImport(placeId: string) {
  placeId = placeId.replace(/[^0-9]/g, '')
  if (!placeId) return NextResponse.json({ ok: false, error: 'invalid_placeId' }, { status: 400 })

  const debug: any[] = []

  // ── A. GraphQL — restaurant(input) { menus { ... } } ────────────
  for (const bt of BUSINESS_TYPES) {
    const items = await tryGqlRestaurantWithMenus(placeId, bt, debug)
    if (items && items.length > 0) {
      return NextResponse.json({ ok: true, items, strategy: `restaurant_${bt}`, count: items.length })
    }
  }

  // ── B. GraphQL — brandMenus(input) ──────────────────────────────
  const brandItems = await tryGqlBrandMenus(placeId, debug)
  if (brandItems && brandItems.length > 0) {
    return NextResponse.json({ ok: true, items: brandItems, strategy: 'brandMenus', count: brandItems.length })
  }

  // ── C. SSR Apollo State ──────────────────────────────
  for (const bt of BUSINESS_TYPES) {
    const items = await fetchMenusViaSSR(placeId, bt, debug)
    if (items && items.length > 0) {
      return NextResponse.json({ ok: true, items, strategy: `ssr_${bt}`, count: items.length })
    }
  }

  // ── D. SmartOrder API (배달의민족 류 주문 메뉴) ───────────────────
  const smartOrderItems = await trySmartOrderApi(placeId, debug)
  if (smartOrderItems && smartOrderItems.length > 0) {
    return NextResponse.json({ ok: true, items: smartOrderItems, strategy: 'smartOrder', count: smartOrderItems.length })
  }

  return NextResponse.json({
    ok: false,
    error: 'no_menu_found',
    message: '네이버 플레이스에서 메뉴를 자동으로 가져오지 못했어요. placeId 가 정확한지 확인하거나 메뉴를 직접 추가해주세요.',
    placeId,
    debug,
  }, { status: 404 })
}

// ─── A. restaurant(input) { menus } ─────────────────────
async function tryGqlRestaurantWithMenus(placeId: string, businessType: string, debug: any[]): Promise<MenuItem[] | null> {
  // 가능한 input type 시도 (네이버 스키마는 input 타입이 다양함)
  const inputTypes = ['RestaurantInput', 'PlaceInput', 'BusinessInput']
  for (const inputType of inputTypes) {
    const query = `query getRestaurantWithMenus($input: ${inputType}) {
      restaurant(input: $input) {
        id
        name
        menus {
          id name description price recommend new
          images { url }
        }
      }
    }`

    try {
      const res = await fetch(NAVER_GQL, {
        method: 'POST',
        headers: gqlHeaders(placeId, businessType, 'menu/list'),
        body: JSON.stringify([{
          operationName: 'getRestaurantWithMenus',
          variables: { input: { businessId: placeId, businessType } },
          query,
        }]),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      debug.push({ try: 'gql_restaurant', inputType, bt: businessType, status: res.status })
      if (!res.ok) continue
      const j: any = await res.json().catch(() => null)
      if (j?.[0]?.errors) {
        debug.push({ try: 'gql_restaurant', inputType, errors: j[0].errors.slice(0, 2).map((e: any) => e.message?.slice(0, 100)) })
        continue
      }
      const menus = j?.[0]?.data?.restaurant?.menus
      if (Array.isArray(menus) && menus.length > 0) {
        return menus.map((m: any) => mapMenu(m)).filter((m: MenuItem) => m.name_ko)
      }
    } catch (e: any) {
      debug.push({ try: 'gql_restaurant', inputType, err: String(e?.message).slice(0, 80) })
    }
  }
  return null
}

// ─── B. brandMenus ─────────────────────────────────────
async function tryGqlBrandMenus(placeId: string, debug: any[]): Promise<MenuItem[] | null> {
  const query = `query brandMenus($input: BrandMenusInput) {
    brandMenus(input: $input) {
      total
      items {
        id name description price
        images { url }
      }
    }
  }`

  try {
    const res = await fetch(NAVER_GQL, {
      method: 'POST',
      headers: gqlHeaders(placeId, 'restaurant', 'menu/list'),
      body: JSON.stringify([{
        operationName: 'brandMenus',
        variables: { input: { businessId: placeId, page: 1, size: 200 } },
        query,
      }]),
      signal: AbortSignal.timeout(8000),
    })
    debug.push({ try: 'brandMenus', status: res.status })
    if (!res.ok) return null
    const j: any = await res.json().catch(() => null)
    if (j?.[0]?.errors) {
      debug.push({ try: 'brandMenus', errors: j[0].errors.slice(0, 2).map((e: any) => e.message?.slice(0, 100)) })
      return null
    }
    const items = j?.[0]?.data?.brandMenus?.items
    if (Array.isArray(items) && items.length > 0) {
      return items.map((m: any) => mapMenu(m)).filter((m: MenuItem) => m.name_ko)
    }
  } catch (e: any) {
    debug.push({ try: 'brandMenus', err: String(e?.message).slice(0, 80) })
  }
  return null
}

// ─── C. SSR HTML __APOLLO_STATE__ ─────────────────────
async function fetchMenusViaSSR(placeId: string, businessType: string, debug: any[]): Promise<MenuItem[] | null> {
  const urls = [
    `https://m.place.naver.com/${businessType}/${placeId}/menu/list`,
    `https://m.place.naver.com/${businessType}/${placeId}/menu`,
    `https://m.place.naver.com/${businessType}/${placeId}/home`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': MOBILE_UA,
          'Accept': 'text/html,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': 'https://m.place.naver.com/',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })
      debug.push({ try: 'ssr', url, status: res.status, len: res.headers.get('content-length') })
      if (!res.ok) continue
      const html = await res.text()
      if (html.length < 500) continue
      if (html.includes('서비스 이용이 제한')) {
        debug.push({ try: 'ssr', err: 'rate_limited' })
        continue
      }

      const items = extractMenusFromHtml(html, debug)
      if (items && items.length > 0) return items
    } catch (e: any) {
      debug.push({ try: 'ssr', url, err: String(e?.message).slice(0, 80) })
    }
  }
  return null
}

// HTML 에서 메뉴 추출 — 괄호 깊이 카운팅으로 정확히 JSON 추출
function extractMenusFromHtml(html: string, debug: any[]): MenuItem[] | null {
  // 다양한 패턴 시도
  const markers = [
    '__APOLLO_STATE__',
    'window.__APOLLO_STATE__',
    '__INITIAL_STATE__',
    'window.__INITIAL_STATE__',
    '__NEXT_DATA__',
    '__PRELOADED_STATE__',
  ]

  for (const marker of markers) {
    const startStr = marker + '='
    const idx = html.indexOf(startStr)
    if (idx === -1) continue

    // = 다음의 첫 { 위치 찾기
    let braceStart = idx + startStr.length
    while (braceStart < html.length && /\s/.test(html[braceStart])) braceStart++
    if (html[braceStart] !== '{') continue

    // 깊이 카운팅으로 매칭 } 찾기 (문자열 안의 } 무시)
    let depth = 0
    let inString = false
    let escape = false
    let end = -1
    for (let i = braceStart; i < html.length; i++) {
      const c = html[i]
      if (escape) { escape = false; continue }
      if (c === '\\') { escape = true; continue }
      if (c === '"') { inString = !inString; continue }
      if (inString) continue
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) { end = i + 1; break }
      }
    }
    if (end === -1) continue

    const jsonStr = html.slice(braceStart, end)
    try {
      const state = JSON.parse(jsonStr)
      // 평면 검색: state 의 key 들 중 Menu 패턴
      const menus: MenuItem[] = []
      const seen = new Set<string>()

      const visit = (obj: any, depth = 0) => {
        if (!obj || depth > 8 || typeof obj !== 'object') return
        if (Array.isArray(obj)) {
          for (const v of obj) visit(v, depth + 1)
          return
        }
        // 메뉴 객체 패턴 감지: name + price 가 모두 있으면 후보
        if (obj.name && (obj.price !== undefined || obj.priceText) && !obj.email && !obj.phone) {
          const key = String(obj.name) + '|' + (obj.price || obj.priceText || '')
          if (!seen.has(key)) {
            seen.add(key)
            menus.push(mapMenu(obj, state))
          }
        }
        for (const k of Object.keys(obj)) visit(obj[k], depth + 1)
      }
      visit(state)

      debug.push({ try: marker, found: menus.length, jsonLen: jsonStr.length })
      const valid = menus.filter(m => m.name_ko && m.name_ko.length > 0)
      if (valid.length > 0) return valid
    } catch (e: any) {
      debug.push({ try: marker, err: String(e?.message).slice(0, 80), jsonLen: jsonStr.length })
    }
  }

  // Fallback: HTML 자체에서 메뉴 박스 추출 (DOM 패턴)
  const domMenus = extractMenusFromDom(html)
  if (domMenus.length > 0) {
    debug.push({ try: 'dom_pattern', found: domMenus.length })
    return domMenus
  }

  return null
}

// HTML DOM 패턴에서 메뉴 추출 (Apollo state 가 막혔을 때 fallback)
function extractMenusFromDom(html: string): MenuItem[] {
  const menus: MenuItem[] = []
  // 네이버 플레이스 메뉴 박스 패턴: <li class="..."><div class="lPzHi">메뉴명</div>...<em>가격</em>
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g
  let match
  while ((match = liRegex.exec(html)) !== null) {
    const block = match[1]
    if (!block || block.length < 50) continue
    const nameM = block.match(/class="[^"]*lPzHi[^"]*"[^>]*>([^<]+)</)
        || block.match(/class="[^"]*menu[^"]*name[^"]*"[^>]*>([^<]+)</i)
    const priceM = block.match(/<em[^>]*>([\d,]+)/) || block.match(/(\d{3,7})원/)
    const imgM = block.match(/<img[^>]+src="([^"]+)"/)
    const descM = block.match(/class="[^"]*menu[^"]*desc[^"]*"[^>]*>([^<]+)</i)
    if (nameM) {
      menus.push({
        name_ko: nameM[1].trim().slice(0, 80),
        price: priceM ? parseInt(priceM[1].replace(/,/g, ''), 10) || 0 : 0,
        image_url: imgM?.[1] || null,
        desc_ko: descM?.[1]?.trim().slice(0, 200) || null,
      })
    }
  }
  return menus
}

// ─── D. SmartOrder API (배달주문 메뉴) ──────────────────
async function trySmartOrderApi(placeId: string, debug: any[]): Promise<MenuItem[] | null> {
  try {
    const url = `https://pcmap.place.naver.com/restaurant/${placeId}/smartOrderList`
    const res = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://m.place.naver.com/',
      },
      signal: AbortSignal.timeout(10000),
    })
    debug.push({ try: 'smartOrder', status: res.status })
    if (!res.ok) return null
    const html = await res.text()
    if (html.includes('서비스 이용이 제한')) {
      debug.push({ try: 'smartOrder', err: 'rate_limited' })
      return null
    }
    return extractMenusFromHtml(html, debug)
  } catch (e: any) {
    debug.push({ try: 'smartOrder', err: String(e?.message).slice(0, 80) })
    return null
  }
}

// ─── 공용 ───────────────────────────────────
function mapMenu(m: any, state?: any): MenuItem {
  const img = m.image
    || (Array.isArray(m.images) ? (typeof m.images[0] === 'string' ? m.images[0] : m.images[0]?.url || (m.images[0]?.__ref && state?.[m.images[0].__ref]?.url)) : null)
    || (m.images?.url || null)
  return {
    name_ko: String(m.name || '').slice(0, 80),
    price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
    image_url: img,
    desc_ko: m.description ? String(m.description).slice(0, 200) : null,
    category: typeof m.category === 'string' ? m.category : m.category?.name || null,
    is_signature: !!(m.recommend || m.isRecommend),
  }
}

function traverseForMenus(obj: any, depth = 0): MenuItem[] | null {
  if (!obj || depth > 6) return null
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = traverseForMenus(v, depth + 1)
      if (r) return r
    }
    return null
  }
  if (typeof obj !== 'object') return null

  for (const k of Object.keys(obj)) {
    if (/^menus?$/i.test(k) || /menuList$/i.test(k) || /menuItems$/i.test(k)) {
      const v = obj[k]
      if (Array.isArray(v) && v.length > 0 && v[0]?.name && (v[0]?.price !== undefined)) {
        return v.map((m: any) => mapMenu(m)).filter((m: MenuItem) => m.name_ko)
      }
    }
  }

  for (const k of Object.keys(obj)) {
    const r = traverseForMenus(obj[k], depth + 1)
    if (r) return r
  }
  return null
}

function gqlHeaders(placeId: string, businessType: string, refererPath: string) {
  return {
    'User-Agent': MOBILE_UA,
    'Accept': '*/*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://m.place.naver.com',
    'Referer': `https://m.place.naver.com/${businessType}/${placeId}/${refererPath}`,
  }
}
