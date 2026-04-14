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

// ── 네이버 플레이스 메타 스크랩 (업종 자동 감지) ─────────────
async function fetchPlaceMeta(placeId: string) {
  const categories = ['restaurant', 'place', 'business', 'beauty', 'hospital']
  for (const cat of categories) {
    try {
      const url = `https://m.place.naver.com/${cat}/${placeId}/home`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        redirect: 'follow',
      })
      if (!res.ok) continue
      const html = await res.text()
      if (html.includes('페이지를 찾을 수 없') || html.length < 500) continue

      const nameMatch = html.match(/<title>([^|<\n]+)/)
      const name = nameMatch ? nameMatch[1].trim() : ''
      if (!name) continue

      const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/)
      const desc = descMatch ? descMatch[1].trim() : ''

      return { name, desc, url: `https://m.place.naver.com/place/${placeId}/home` }
    } catch {
      continue
    }
  }
  return null
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
        // place_id 추출 실패 → 이름 검색 fallback
        if (!input || input.trim().length < 2) {
          return NextResponse.json({ error: '네이버 플레이스 URL 또는 Place ID를 입력해 주세요' }, { status: 400 })
        }
        const searchData = await searchNaverLocal(input.trim())
        if (searchData && searchData.items?.length > 0) {
          const first = searchData.items[0]
          const foundId = extractPlaceId(first.link || '')
          return NextResponse.json({
            placeId: foundId || first.link,
            verified: true,
            name: (first.title || '').replace(/<[^>]+>/g, ''),
            desc: first.roadAddress || first.address || '',
            url: first.link || '',
          })
        }
        return NextResponse.json({ error: 'Place ID를 찾을 수 없습니다. 네이버 플레이스 URL을 직접 붙여넣으세요.' }, { status: 400 })
      }

      const meta = await fetchPlaceMeta(placeId)
      // 스크랩 실패해도 placeId는 저장 가능하게 반환
      return NextResponse.json({
        placeId,
        verified: true,
        name: meta?.name || `네이버 매장 (${placeId})`,
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

  // 네이버 플레이스 리뷰는 공식 API 없음 (Business Profile API 승인 필요)
  // mock 리뷰를 반환하면 알림 오탐이 발생하므로 빈 배열 반환
  return NextResponse.json({
    placeId,
    source: 'unavailable',
    reviews: [],
    stats: { total: 0, avg: 0, replied: 0 },
    notice: '네이버 플레이스 리뷰는 공식 API 미지원으로 현재 조회 불가합니다.',
  })
}
