import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  구글 비즈니스 플랫폼 연동 API — Plan B (Places API)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  사용 API:
 *    - Google Places API (Find Place / Place Details / Text Search)
 *    - 리뷰는 최대 5개까지만 제공 (Google 정책 제한)
 *    - 답글 작성 불가 (Business Profile API 승인 후 별도 엔드포인트)
 *
 *  env:
 *    GOOGLE_PLACES_API_KEY  (필수)
 *
 *  엔드포인트:
 *    POST /api/platforms/google
 *      - action: 'extract'  → URL/입력에서 place_id 추출
 *      - action: 'verify'   → URL/place_id → 매장 상세 검증
 *      - action: 'search'   → 키워드 검색 (Text Search)
 *    GET  /api/platforms/google?placeId=xxx  → 리뷰 5개 + 평점/리뷰수
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

// ── 1) URL → Place ID 추출 ─────────────────────────────────
function extractPlaceId(input: string): string | null {
  if (!input) return null
  const s = input.trim()

  // 이미 place_id 형식
  if (/^ChIJ[A-Za-z0-9_-]{20,}$/.test(s)) return s
  if (/^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(s)) return s

  // URL 패턴
  const patterns = [
    /[?&]place_id=([^&]+)/,
    /\/place\/[^/]+\/data=.*!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i,
    /!1s(ChIJ[A-Za-z0-9_-]{20,})/,
  ]
  for (const p of patterns) {
    const m = s.match(p)
    if (m?.[1]) return decodeURIComponent(m[1])
  }
  return null
}

// ── 2) Find Place From Text (URL 없이 이름만 받았을 때) ──
async function findPlaceByText(query: string, apiKey: string) {
  const url = `${PLACES_BASE}/findplacefromtext/json?input=${encodeURIComponent(
    query,
  )}&inputtype=textquery&fields=place_id,name,formatted_address,rating,user_ratings_total&language=ko&key=${apiKey}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data: any = await res.json()
  if (data.status !== 'OK' || !data.candidates?.length) return null
  return data.candidates[0]
}

// ── 3) Place Details ───────────────────────────────────────
interface PlaceDetail {
  placeId: string
  name: string
  address: string
  phone: string
  category: string
  rating: number | null
  reviewCount: number
  url: string
  reviews: Array<{
    id: string
    rating: number
    author: string
    date: string
    text: string
    replied: boolean
  }>
}

async function fetchPlaceDetail(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetail | null> {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'types',
    'rating',
    'user_ratings_total',
    'url',
    'website',
    'reviews',
  ].join(',')

  const url = `${PLACES_BASE}/details/json?place_id=${encodeURIComponent(
    placeId,
  )}&fields=${fields}&language=ko&reviews_sort=newest&key=${apiKey}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data: any = await res.json()
  if (data.status !== 'OK' || !data.result) return null

  const r = data.result
  const reviews = Array.isArray(r.reviews)
    ? r.reviews.map((rv: any, i: number) => ({
        id: `g-${placeId}-${i}`,
        rating: Number(rv.rating ?? 0),
        author: String(rv.author_name ?? '익명'),
        date: rv.time
          ? new Date(rv.time * 1000).toISOString().slice(0, 10)
          : String(rv.relative_time_description ?? ''),
        text: String(rv.text ?? ''),
        replied: false,
      }))
    : []

  // types 배열 → 한글 카테고리
  const typeMap: Record<string, string> = {
    restaurant: '음식점',
    cafe: '카페',
    bakery: '베이커리',
    bar: '주점',
    beauty_salon: '미용실',
    hair_care: '미용실',
    store: '매장',
    food: '음식점',
    meal_takeaway: '포장음식',
    meal_delivery: '배달음식',
  }
  let category = ''
  if (Array.isArray(r.types)) {
    for (const t of r.types) {
      if (typeMap[t]) { category = typeMap[t]; break }
    }
    if (!category && r.types[0]) category = String(r.types[0]).replace(/_/g, ' ')
  }

  return {
    placeId: r.place_id,
    name: r.name || '',
    address: r.formatted_address || '',
    phone: r.formatted_phone_number || r.international_phone_number || '',
    category,
    rating: typeof r.rating === 'number' ? r.rating : null,
    reviewCount: Number(r.user_ratings_total ?? 0),
    url:
      r.url ||
      `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`,
    reviews,
  }
}

// ── 4) Text Search (키워드 검색) ───────────────────────────
async function textSearch(query: string, apiKey: string) {
  const url = `${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(
    query,
  )}&language=ko&region=kr&key=${apiKey}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { error: 'Places Text Search 요청 실패' as const }
  const data: any = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return { error: `Places API: ${data.status}` as const }
  }
  return {
    items: (data.results || []).slice(0, 10).map((d: any) => ({
      placeId: d.place_id,
      name: d.name,
      address: d.formatted_address,
      rating: d.rating ?? null,
      reviewCount: d.user_ratings_total ?? 0,
      url: `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(d.place_id)}`,
    })),
  }
}

// ═══════════════════════════════════════════════════════════
//  POST /api/platforms/google
// ═══════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY 환경변수가 없습니다' },
        { status: 500 },
      )
    }

    const body = await req.json()
    const { action, input, query } = body

    // ── 1) URL → place_id 추출 ────────────────────────
    if (action === 'extract') {
      const placeId = extractPlaceId(input || '')
      if (!placeId) {
        return NextResponse.json(
          { error: '유효한 구글 맵 URL 또는 place_id가 아닙니다' },
          { status: 400 },
        )
      }
      return NextResponse.json({ placeId })
    }

    // ── 2) 매장 검증 + 상세 ──────────────────────────
    if (action === 'verify') {
      let placeId = extractPlaceId(input || '')

      // URL/place_id 추출 실패 시 → Find Place 텍스트 검색으로 fallback
      if (!placeId) {
        const candidate = await findPlaceByText(input || '', apiKey)
        if (candidate?.place_id) placeId = candidate.place_id
      }

      if (!placeId) {
        return NextResponse.json(
          {
            error:
              '구글 place_id를 찾지 못했습니다. 매장명 또는 구글 맵 URL 전체를 입력해 주세요.',
          },
          { status: 400 },
        )
      }

      const detail = await fetchPlaceDetail(placeId, apiKey)
      if (!detail) {
        return NextResponse.json(
          { error: '구글 Place Details 조회 실패. 매장이 존재하는지 확인해 주세요.' },
          { status: 502 },
        )
      }

      return NextResponse.json({
        platform: 'google',
        placeId: detail.placeId,
        googlePlaceId: detail.placeId,
        name: detail.name || `(이름 조회 실패) ${detail.placeId}`,
        address: detail.address,
        phone: detail.phone,
        category: detail.category,
        rating: detail.rating,
        reviewCount: detail.reviewCount,
        url: detail.url,
        source: 'places-api',
        verified: true,
      })
    }

    // ── 3) 키워드 검색 ────────────────────────────────
    if (action === 'search') {
      if (!query) return NextResponse.json({ error: '검색어 필요' }, { status: 400 })
      const result = await textSearch(query, apiKey)
      if ('error' in result) {
        return NextResponse.json(
          { items: [], warn: result.error },
          { status: 200 },
        )
      }
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err) {
    console.error('google platform error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════
//  GET /api/platforms/google?placeId=xxx   → 리뷰 5개
// ═══════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_PLACES_API_KEY 환경변수가 없습니다' },
      { status: 500 },
    )
  }

  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) {
    return NextResponse.json({ error: 'placeId 필요' }, { status: 400 })
  }

  const detail = await fetchPlaceDetail(placeId, apiKey)
  if (!detail) {
    return NextResponse.json({ error: '구글 Place Details 조회 실패' }, { status: 502 })
  }

  return NextResponse.json({
    placeId: detail.placeId,
    source: 'places-api',
    name: detail.name,
    reviews: detail.reviews,
    stats: {
      total: detail.reviewCount,
      avg: detail.rating ?? 0,
      replied: 0,
    },
    notice:
      'Places API는 리뷰 최대 5개만 제공합니다. 전체 조회는 Business Profile API 승인 후 가능합니다.',
  })
}
