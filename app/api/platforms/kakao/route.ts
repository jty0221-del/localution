import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── 카카오맵 URL → Place ID 추출 ────────────────────────────
function extractKakaoId(input: string): string | null {
 if (!input) return null
 const s = input.trim()

 // 이미 숫자 ID
 if (/^\d{5,}$/.test(s)) return s

 // https://place.map.kakao.com/1234567890
 // https://map.kakao.com/link/map/장소명,위도,경도
 const patterns = [
 /place\.map\.kakao\.com\/(\d{5,})/,
 /map\.kakao\.com\/link\/to\/[^,]+,[\d.]+,[\d.]+\/(\d{5,})/,
 /kakaomap\.com.*\/(\d{7,})/,
 /\/(\d{7,})(?:\/|\?|$)/,
 ]
 for (const p of patterns) {
 const m = s.match(p)
 if (m?.[1]) return m[1]
 }
 return null
}

// ── 카카오 로컬 검색 API ─────────────────────────────────────
async function searchKakaoLocal(query: string, x?: string, y?: string) {
 const apiKey = process.env.KAKAO_REST_API_KEY
 if (!apiKey) return { error: 'KAKAO_REST_API_KEY 환경변수가 없습니다' }

 let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`
 if (x && y) url += `&x=${x}&y=${y}&radius=2000`

 const res = await fetch(url, {
 headers: { Authorization: `KakaoAK ${apiKey}` },
 })
 if (!res.ok) return { error: '카카오 API 요청 실패' }
 const data = await res.json()

 return {
 items: (data.documents || []).map((d: any) => ({
 kakaoId: d.id,
 name: d.place_name,
 address: d.road_address_name || d.address_name,
 phone: d.phone,
 category: d.category_name,
 url: d.place_url,
 x: d.x,
 y: d.y,
 })),
 }
}

// ── 카카오 Place 상세 (장소 URL 스크랩) ─────────────────────
async function fetchKakaoMeta(kakaoId: string) {
 try {
 const url = `https://place.map.kakao.com/${kakaoId}`
 const res = await fetch(url, {
 headers: {
 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
 },
 })
 if (!res.ok) return null
 const html = await res.text()
 const nameMatch = html.match(/<title>([^|<]+)/)
 const name = nameMatch?.[1]?.trim() || ''
 return { kakaoId, name, url }
 } catch {
 return null
 }
}

// ── POST /api/platforms/kakao ────────────────────────────────
export async function POST(req: NextRequest) {
 try {
 const body = await req.json()
 const { action, input, query } = body

 // 1) URL → ID 추출
 if (action === 'extract') {
 const kakaoId = extractKakaoId(input || '')
 if (!kakaoId) return NextResponse.json({ error: '유효한 카카오맵 URL이 아닙니다' }, { status: 400 })
 return NextResponse.json({ kakaoId })
 }

 // 2) ID 검증
 if (action === 'verify') {
 const kakaoId = extractKakaoId(input || '') || input?.trim()
 if (!kakaoId) return NextResponse.json({ error: 'ID를 찾을 수 없습니다' }, { status: 400 })
 const meta = await fetchKakaoMeta(kakaoId)
 return NextResponse.json({
 kakaoId,
 verified: !!meta,
 name: meta?.name || '(조회 실패)',
 url: `https://place.map.kakao.com/${kakaoId}`,
 })
 }

 // 3) 키워드 검색
 if (action === 'search') {
 if (!query) return NextResponse.json({ error: '검색어 필요' }, { status: 400 })
 const result = await searchKakaoLocal(query)
 if ('error' in result) {
 // 목업
 return NextResponse.json({
 items: [{ kakaoId: '123456789', name: query + ' (목업)', address: 'KAKAO_REST_API_KEY 설정 필요', phone: '', category: '음식점', url: 'https://place.map.kakao.com/123456789' }],
 mock: true,
 })
 }
 return NextResponse.json(result)
 }

 return NextResponse.json({ error: 'unknown action' }, { status: 400 })
 } catch (err) {
 console.error('kakao platform error:', err)
 return NextResponse.json({ error: '서버 오류' }, { status: 500 })
 }
}

// ── GET /api/platforms/kakao?kakaoId=xxx (리뷰 목업) ──────────
export async function GET(req: NextRequest) {
 const kakaoId = req.nextUrl.searchParams.get('kakaoId')
 if (!kakaoId) return NextResponse.json({ error: 'kakaoId 필요' }, { status: 400 })

 // 카카오맵 리뷰는 공식 API 미제공 → Selenium 연동 예정
 return NextResponse.json({
 kakaoId,
 source: 'mock',
 reviews: [
 { id: `k-${kakaoId}-1`, rating: 5, author: '박**', date: '2026-04-12', text: '맛도 좋고 사장님도 친절해요!', replied: false },
 { id: `k-${kakaoId}-2`, rating: 4, author: '최**', date: '2026-04-07', text: '분위기 좋아요. 또 올게요.', replied: false },
 ],
 stats: { total: 64, avg: 4.4, replied: 38 },
 })
}
