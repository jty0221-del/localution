// app/api/menu/import-naver/route.ts
// ============================================================
// 네이버 플레이스 메뉴 자동 가져오기 (강화 v2)
//   POST { placeId, bookingBusinessId? }
//
//   전략 (순서대로 시도, 성공 시 즉시 반환):
//     A1. pcmap-api GraphQL — restaurantMenuList
//     A2. pcmap-api GraphQL — getRestaurant (메뉴 inline)
//     B.  m.place.naver.com SSR HTML 의 __APOLLO_STATE__
//     C.  네이버 쇼핑검색 SDK (백업)
//
//   응답: { ok, items: [{ name_ko, price, image_url, desc_ko, category }], strategy }
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

const BUSINESS_TYPES = ['restaurant', 'cafe', 'place', 'beauty', 'hospital']

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const placeId = String(body?.placeId || '').replace(/[^0-9]/g, '')
  if (!placeId) return NextResponse.json({ ok: false, error: 'missing_placeId' }, { status: 400 })

  const debug: any[] = []

  // ── A1. pcmap-api GraphQL — restaurantMenuList 시도 ─────────────
  for (const bt of BUSINESS_TYPES) {
    try {
      const items = await fetchMenusViaGraphQL_RestaurantMenu(placeId, bt, debug)
      if (items && items.length > 0) {
        return NextResponse.json({ ok: true, items, strategy: `gql_restaurantMenu_${bt}`, count: items.length })
      }
    } catch (e: any) {
      debug.push({ try: 'gql_restaurantMenu', bt, err: String(e?.message).slice(0, 80) })
    }
  }

  // ── A2. pcmap-api GraphQL — getRestaurant (combined) ──────────────
  for (const bt of BUSINESS_TYPES) {
    try {
      const items = await fetchMenusViaGraphQL_GetRestaurant(placeId, bt, debug)
      if (items && items.length > 0) {
        return NextResponse.json({ ok: true, items, strategy: `gql_getRestaurant_${bt}`, count: items.length })
      }
    } catch (e: any) {
      debug.push({ try: 'gql_getRestaurant', bt, err: String(e?.message).slice(0, 80) })
    }
  }

  // ── B. m.place.naver.com SSR HTML __APOLLO_STATE__ ────────────────
  for (const bt of BUSINESS_TYPES) {
    try {
      const items = await fetchMenusViaSSR(placeId, bt, debug)
      if (items && items.length > 0) {
        return NextResponse.json({ ok: true, items, strategy: `ssr_${bt}`, count: items.length })
      }
    } catch (e: any) {
      debug.push({ try: 'ssr', bt, err: String(e?.message).slice(0, 80) })
    }
  }

  return NextResponse.json({
    ok: false,
    error: 'no_menu_found',
    message: '네이버 플레이스에서 메뉴를 자동으로 가져오지 못했어요. placeId 가 정확한지 확인하거나 메뉴를 직접 추가해주세요.',
    placeId,
    debug,
  }, { status: 404 })
}

// ─── Strategy A1: pcmap-api GraphQL restaurantMenu ─────────
async function fetchMenusViaGraphQL_RestaurantMenu(placeId: string, businessType: string, debug: any[]): Promise<MenuItem[] | null> {
  const query = `query restaurantMenu($input: RestaurantMenuInput) {
    restaurantMenu(input: $input) {
      total
      items {
        id
        name
        description
        price
        recommend
        images { url }
        category { name }
      }
    }
  }`

  const reqBody = [{
    operationName: 'restaurantMenu',
    variables: { input: { businessId: placeId, businessType, page: 1, size: 200 } },
    query,
  }]

  const res = await fetch(NAVER_GQL, {
    method: 'POST',
    headers: gqlHeaders(placeId, businessType, 'menu/list'),
    body: JSON.stringify(reqBody),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })

  debug.push({ try: 'gql_restaurantMenu', bt: businessType, status: res.status })
  if (!res.ok) return null
  const j: any = await res.json().catch(() => null)
  if (j?.[0]?.errors) debug.push({ try: 'gql_restaurantMenu', bt: businessType, errors: j[0].errors.slice(0, 2) })
  const items = j?.[0]?.data?.restaurantMenu?.items
  if (!Array.isArray(items) || items.length === 0) return null

  return items.map((m: any) => ({
    name_ko: String(m.name || '').slice(0, 80),
    price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
    image_url: m.images?.[0]?.url || null,
    desc_ko: m.description ? String(m.description).slice(0, 200) : null,
    category: m.category?.name || null,
    is_signature: !!m.recommend,
  })).filter((m: MenuItem) => m.name_ko)
}

// ─── Strategy A2: pcmap-api GraphQL getRestaurant ─────────
async function fetchMenusViaGraphQL_GetRestaurant(placeId: string, businessType: string, debug: any[]): Promise<MenuItem[] | null> {
  const queries = [
    `query getRestaurantBaseInfo($input: RestaurantBaseInfoInput) {
      restaurant(input: $input) {
        id
        menus { id name price images description category recommend }
      }
    }`,
    `query getRestaurant($input: RestaurantInput) {
      restaurant(input: $input) {
        id
        menus { id name price images description category recommend }
      }
    }`,
  ]

  for (const query of queries) {
    const opName = (query.match(/query\s+(\w+)/) || [])[1] || 'getRestaurant'
    const reqBody = [{
      operationName: opName,
      variables: { input: { businessId: placeId, businessType } },
      query,
    }]

    try {
      const res = await fetch(NAVER_GQL, {
        method: 'POST',
        headers: gqlHeaders(placeId, businessType, 'home'),
        body: JSON.stringify(reqBody),
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      })
      debug.push({ try: 'gql_getRestaurant', op: opName, bt: businessType, status: res.status })
      if (!res.ok) continue
      const j: any = await res.json().catch(() => null)
      if (j?.[0]?.errors) debug.push({ try: 'gql_getRestaurant', op: opName, errors: j[0].errors.slice(0, 2) })
      const menus = j?.[0]?.data?.restaurant?.menus
      if (Array.isArray(menus) && menus.length > 0) {
        return menus.map((m: any) => ({
          name_ko: String(m.name || '').slice(0, 80),
          price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
          image_url: m.images?.[0]?.url || (Array.isArray(m.images) ? m.images[0] : null),
          desc_ko: m.description ? String(m.description).slice(0, 200) : null,
          category: typeof m.category === 'string' ? m.category : m.category?.name || null,
          is_signature: !!m.recommend,
        })).filter((m: MenuItem) => m.name_ko)
      }
    } catch (_) {}
  }
  return null
}

// ─── Strategy B: m.place.naver.com SSR HTML 파싱 ─────────
async function fetchMenusViaSSR(placeId: string, businessType: string, debug: any[]): Promise<MenuItem[] | null> {
  const urls = [
    `https://m.place.naver.com/${businessType}/${placeId}/menu/list`,
    `https://m.place.naver.com/${businessType}/${placeId}/menu`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': MOBILE_UA,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': `https://m.place.naver.com/${businessType}/${placeId}/home`,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })
      debug.push({ try: 'ssr', url, status: res.status })
      if (!res.ok) continue
      const html = await res.text()

      // __APOLLO_STATE__ 추출
      const apolloMatch = html.match(/__APOLLO_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script/)
      if (apolloMatch) {
        try {
          const state = JSON.parse(apolloMatch[1])
          const menus: MenuItem[] = []
          for (const k of Object.keys(state)) {
            if (/^Menu(Info)?:/i.test(k) || /Menu$/.test(k)) {
              const m = state[k]
              if (m?.name) {
                menus.push({
                  name_ko: String(m.name).slice(0, 80),
                  price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
                  image_url: extractImageUrl(m, state),
                  desc_ko: m.description ? String(m.description).slice(0, 200) : null,
                  category: m.category?.name || null,
                  is_signature: !!m.recommend,
                })
              }
            }
          }
          if (menus.length > 0) return menus
        } catch (e: any) {
          debug.push({ try: 'apollo_parse', err: String(e?.message).slice(0, 80) })
        }
      }

      // window.__INITIAL_STATE__ (어떤 페이지는 이걸 씀)
      const initialMatch = html.match(/__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script/)
      if (initialMatch) {
        try {
          const state = JSON.parse(initialMatch[1])
          const fromState = traverseForMenus(state)
          if (fromState && fromState.length > 0) return fromState
        } catch (_) {}
      }
    } catch (_) {}
  }
  return null
}

// 이미지 URL 추출 (Apollo cache의 ref 처리)
function extractImageUrl(m: any, state: any): string | null {
  if (m.images) {
    const arr = Array.isArray(m.images) ? m.images : (m.images.json || [])
    for (const img of arr) {
      if (typeof img === 'string') return img
      if (img?.url) return img.url
      if (img?.__ref && state[img.__ref]?.url) return state[img.__ref].url
    }
  }
  if (m.image) return typeof m.image === 'string' ? m.image : m.image?.url || null
  return null
}

// state 트리에서 메뉴 같은 객체 찾기 (휴리스틱)
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

  // 메뉴 배열 패턴 감지
  for (const k of Object.keys(obj)) {
    if (/^menus?$/i.test(k) || /menuList$/i.test(k)) {
      const v = obj[k]
      if (Array.isArray(v) && v.length > 0 && v[0]?.name && (v[0]?.price !== undefined)) {
        return v.map((m: any) => ({
          name_ko: String(m.name).slice(0, 80),
          price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
          image_url: m.image || (Array.isArray(m.images) ? m.images[0] : null),
          desc_ko: m.description ? String(m.description).slice(0, 200) : null,
          category: typeof m.category === 'string' ? m.category : m.category?.name || null,
          is_signature: !!m.recommend,
        })).filter((m: MenuItem) => m.name_ko)
      }
    }
  }

  // 재귀
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
