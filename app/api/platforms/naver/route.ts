import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── 네이버 플레이스 URL → Place ID 추출 ──────────────────────
function extractPlaceId(input: string): string | null {
  if (!input) return null
  const s = input.trim()

  // 이미 숫자만: 플레이스 ID로 간주
  if (/^\d{5,}$/.test(s)) return s

  // https://map.naver.com/p/entry/place/1234567890
  // https://m.place.naver.com/place/1234567890/home
  // https://place.map.kakao.com/... (카카오는 거름)
  const patterns = [
    /place\/(\d{5,})/,
    /entry\/place\/(\d{5,})/,
    /placeId=(\d{5,})/,
    /\/(\d{5,})(?:\/|\?|$)/,
  ]
  for (const p of patterns) {
    const m = s.match(p)
    if (m && m[1]) return m[1]
  }
  return null
}

// ── 네이버 로컬 검색 API로 매장 정보 조회 ────────────────────
async function searchNaverLocal(query: string) {
  const clientId = process.env.NAVER_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })
  if (!res.ok) return null
  return res.json()
}

// ── 네이버 플레이스 페이지 메타 스크랩 (비공식) ───────────────
async function fetchPlaceMeta(placeId: string) {
  try {
    const url = `https://m.place.naver.com/restaurant/${placeId}/home`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    })
    if (!res.ok) return null
    const html = await res.text()

    const nameMatch = html.match(/<title>([^|]+)/)
    const name = nameMatch ? nameMatch[1].trim() : ''

    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)
    const desc = descMatch ? descMatch[1].trim() : ''

    return { name, desc, url }
  } catch {
    return null
  }
}

// ── POST /api/platforms/naver  (action: extract | verify | search) ─────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, input, query, storeId } = body

    // 1) URL → Place ID 추출
    if (action === 'extract') {
      const placeId = extractPlaceId(input || '')
      if (!placeId) {
        return NextResponse.json(
          { error: '유효한 네이버 플레이스 URL 또는 ID가 아닙니다' },
          { status: 400 }
        )
      }
      return NextResponse.json({ placeId })
    }

    // 2) Place ID 검증 + 메타 조회
    if (action === 'verify') {
      const placeId = extractPlaceId(input || '')
      if (!placeId) {
        return NextResponse.json({ error: 'Place ID를 찾을 수 없습니다' }, { status: 400 })
      }
      const meta = await fetchPlaceMeta(placeId)
      return NextResponse.json({
        placeId,
        verified: !!meta,
        name: meta?.name || '',
        desc: meta?.desc || '',
        url: `https://m.place.naver.com/place/${placeId}/home`,
      })
    }

    // 3) 매장명 검색
    if (action === 'search') {
      if (!query) return NextResponse.json({ error: '검색어 필요' }, { status: 400 })
      const data = await searchNaverLocal(query)
      if (!data) {
        return NextResponse.json(
          { error: 'NAVER_CLIENT_ID/SECRET 환경변수가 설정되지 않았습니다' },
          { status: 500 }
        )
      }
      const items = (data.items || []).map((item: any) => ({
        title: (item.title || '').replace(/<[^>]+>/g, ''),
        address: item.address,
        roadAddress: item.roadAddress,
        category: item.category,
        telephone: item.telephone,
        link: item.link,
      }))
      return NextResponse.json({ items })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err) {
    console.error('naver platform error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ── GET /api/platforms/naver?placeId=xxxx  (리뷰 가져오기 스텁) ─────────
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) {
    return NextResponse.json({ error: 'placeId 필요' }, { status: 400 })
  }

  // TODO: 네이버 플레이스 리뷰는 공식 API가 없어 Selenium/스크래핑 필요
  // 현재는 목업 데이터 반환
  return NextResponse.json({
    placeId,
    source: 'mock',
    reviews: [
      {
        id: `n-${placeId}-1`,
        rating: 5,
        author: '김**',
        date: '2026-04-10',
        text: '분위기도 좋고 음식도 맛있어요. 재방문 의사 100%!',
        replied: false,
      },
      {
        id: `n-${placeId}-2`,
        rating: 4,
        author: '이**',
        date: '2026-04-08',
        text: '가성비 좋은 편이고 주차도 편했어요.',
        replied: true,
      },
    ],
    stats: { total: 127, avg: 4.6, replied: 89 },
  })
}
