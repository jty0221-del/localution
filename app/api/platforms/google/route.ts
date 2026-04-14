import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Google Maps URL → Place ID 추출 ─────────────────────────
function extractPlaceId(input: string): string | null {
  if (!input) return null
  const s = input.trim()

  // 이미 Place ID 형태 (ChIJ...)
  if (/^ChIJ[A-Za-z0-9_-]{20,}$/.test(s)) return s

  // URL 내 place_id 쿼리 파라미터
  const qMatch = s.match(/[?&]place_id=([^&]+)/)
  if (qMatch) return qMatch[1]

  // /maps/place/.../data=...!0x<hex>!8m
  // !1s 다음에 Place ID가 올 수 있음
  const dataMatch = s.match(/!1s(ChIJ[A-Za-z0-9_-]{20,})/)
  if (dataMatch) return dataMatch[1]

  // google.com/maps/place/매장명/data=
  // 또는 maps.app.goo.gl 단축 URL (별도 처리 필요)
  return null
}

// ── Google Place Search (텍스트 검색) ────────────────────────
async function searchGooglePlace(query: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return { error: 'GOOGLE_MAPS_API_KEY 환경변수가 없습니다' }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ko&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return { error: 'Google API 요청 실패' }
  const data = await res.json()
  if (data.status !== 'OK') return { error: `Google: ${data.status}` }

  return {
    items: (data.results || []).slice(0, 5).map((r: any) => ({
      placeId: r.place_id,
      name: r.name,
      address: r.formatted_address,
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      types: r.types,
    })),
  }
}

// ── Google Place Details 조회 ─────────────────────────────────
async function getPlaceDetails(placeId: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return { error: 'GOOGLE_MAPS_API_KEY 환경변수가 없습니다' }

  const fields = 'place_id,name,formatted_address,formatted_phone_number,rating,user_ratings_total,reviews,website,url,opening_hours'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=ko&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return { error: 'Google API 요청 실패' }
  const data = await res.json()
  if (data.status !== 'OK') return { error: `Google: ${data.status}` }

  const r = data.result
  return {
    placeId: r.place_id,
    name: r.name,
    address: r.formatted_address,
    phone: r.formatted_phone_number || '',
    rating: r.rating || 0,
    reviewCount: r.user_ratings_total || 0,
    website: r.website || '',
    url: r.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    reviews: (r.reviews || []).slice(0, 5).map((rv: any) => ({
      id: `g-${placeId}-${rv.time}`,
      author: rv.author_name,
      rating: rv.rating,
      text: rv.text,
      date: new Date(rv.time * 1000).toISOString().slice(0, 10),
      authorPhoto: rv.profile_photo_url,
      replied: false,
    })),
  }
}

// ── POST /api/platforms/google ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, input, query } = body

    // 1) URL → Place ID 추출
    if (action === 'extract') {
      const placeId = extractPlaceId(input || '')
      if (!placeId) {
        return NextResponse.json(
          { error: '유효한 Google Maps URL이 아닙니다. 직접 매장명으로 검색해 주세요.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ placeId })
    }

    // 2) Place ID 검증 + 상세정보
    if (action === 'verify') {
      const placeId = extractPlaceId(input || '') || input?.trim()
      if (!placeId) {
        return NextResponse.json({ error: 'Place ID를 찾을 수 없습니다' }, { status: 400 })
      }
      const detail = await getPlaceDetails(placeId)
      if ('error' in detail) {
        // API 키 없을 때 목업 반환
        return NextResponse.json({
          placeId,
          verified: true,
          name: '(목업) 매장명',
          address: 'Google Maps API 키 필요',
          rating: 0,
          reviewCount: 0,
          url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          mock: true,
          error: (detail as any).error,
        })
      }
      return NextResponse.json({ ...detail, verified: true })
    }

    // 3) 매장명 텍스트 검색
    if (action === 'search') {
      if (!query) return NextResponse.json({ error: '검색어 필요' }, { status: 400 })
      const result = await searchGooglePlace(query)
      if ('error' in result) {
        // API 키 없을 때 목업
        return NextResponse.json({
          items: [
            { placeId: 'ChIJ_MOCK_GOOGLE_PLACE_ID', name: query + ' (목업)', address: 'Google Maps API 키 설정 필요', rating: 4.5, userRatingsTotal: 120 }
          ],
          mock: true,
        })
      }
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err) {
    console.error('google platform error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ── GET /api/platforms/google?placeId=xxx  (리뷰 조회) ────────
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) return NextResponse.json({ error: 'placeId 필요' }, { status: 400 })

  const detail = await getPlaceDetails(placeId)
  if ('error' in detail) {
    // 목업
    return NextResponse.json({
      placeId,
      source: 'mock',
      reviews: [
        { id: `g-${placeId}-1`, rating: 5, author: 'John D.', date: '2026-04-11', text: 'Great place! Food was amazing.', replied: false },
        { id: `g-${placeId}-2`, rating: 4, author: 'Sarah K.', date: '2026-04-09', text: 'Nice atmosphere, will come back.', replied: true },
      ],
      stats: { total: 98, avg: 4.5, replied: 62 },
    })
  }
  return NextResponse.json({
    placeId,
    source: 'google',
    reviews: detail.reviews,
    stats: { total: detail.reviewCount, avg: detail.rating, replied: 0 },
  })
}
