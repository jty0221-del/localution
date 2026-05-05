import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/naver-place?url=https://place.naver.com/...
 * 네이버 플레이스 페이지에서 업체 기본 정보를 추출합니다.
 *
 * 반환:
 * { name, category, address, phone, description, mainKeyword }
 */

// 43차-3: 입력 검증 — 길이 상한 + URL 스킴/호스트 화이트리스트
const MAX_QUERY_LEN = 80
const MAX_URL_LEN = 2048
const ALLOWED_HOSTS = new Set([
 'place.naver.com',
 'm.place.naver.com',
 'map.naver.com',
 'm.map.naver.com',
])

function isAllowedNaverUrl(raw: string): boolean {
 if (raw.length > MAX_URL_LEN) return false
 let u: URL
 try { u = new URL(raw) } catch { return false }
 if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
 return ALLOWED_HOSTS.has(u.hostname.toLowerCase())
}

export async function GET(req: NextRequest) {
 const url = req.nextUrl.searchParams.get('url') || ''
 const searchQuery = req.nextUrl.searchParams.get('q') || ''

 // ── 네이버 Local Search API 사용 (검색어 기반) ──
 if (searchQuery) {
 if (searchQuery.length > MAX_QUERY_LEN) {
 return NextResponse.json({ ok: false, error: `검색어가 너무 깁니다 (최대 ${MAX_QUERY_LEN}자)` }, { status: 400 })
 }

 const clientId = process.env.NAVER_CLIENT_ID || ''
 const clientSecret = process.env.NAVER_CLIENT_SECRET || ''

 if (clientId && clientSecret) {
 try {
 const encoded = encodeURIComponent(searchQuery)
 const res = await fetch(
 `https://openapi.naver.com/v1/search/local.json?query=${encoded}&display=5&sort=random`,
 {
 headers: {
 'X-Naver-Client-Id': clientId,
 'X-Naver-Client-Secret': clientSecret,
 },
 }
 )
 const data = await res.json()
 const items = data?.items || []

 return NextResponse.json({
 ok: true,
 source: 'naver_api',
 results: items.map((it: any) => ({
 name: it.title?.replace(/<[^>]+>/g, '') || '',
 category: it.category || '',
 address: it.roadAddress || it.address || '',
 phone: it.telephone || '',
 mapx: it.mapx,
 mapy: it.mapy,
 link: it.link || '',
 })),
 })
 } catch (e) {
 console.error('[naver-place] API 오류:', e)
 }
 }
 // API 키 없으면 빈 결과 반환
 return NextResponse.json({ ok: false, error: 'NAVER_CLIENT_ID/SECRET 환경변수가 없습니다.', results: [] })
 }

 // ── URL 기반 scraping ──
 if (!url) {
 return NextResponse.json({ ok: false, error: 'url 또는 q 파라미터가 필요합니다' }, { status: 400 })
 }
 if (!isAllowedNaverUrl(url)) {
 return NextResponse.json({ ok: false, error: '허용되지 않는 URL 입니다 (네이버 플레이스/지도만 가능)' }, { status: 400 })
 }

 try {
 // 네이버 place.naver.com 에서 placeId 추출
 const placeIdMatch = url.match(/place\.naver\.com\/(?:restaurant|place|beauty|hospital|shopping|facility)\/([0-9]+)/i)
 || url.match(/\/([0-9]{5,})\//)
 const placeId = placeIdMatch?.[1]

 if (!placeId) {
 return NextResponse.json({ ok: false, error: '유효한 네이버 플레이스 URL이 아닙니다' }, { status: 400 })
 }

 // 네이버 플레이스 API (공개 엔드포인트)
 const apiUrl = `https://place.map.naver.com/place/main/v2/${placeId}`
 const res = await fetch(apiUrl, {
 headers: {
 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
 'Referer': 'https://map.naver.com/',
 },
 next: { revalidate: 3600 },
 })

 if (!res.ok) {
 return NextResponse.json({ ok: false, error: `네이버 응답 오류: ${res.status}` }, { status: 502 })
 }

 const json = await res.json()
 const place = json?.result?.place || json?.place || {}
 const basic = place?.basicInfo || place || {}

 const name = basic?.name || basic?.placeName || ''
 const category = basic?.category?.cate1Name || basic?.categories?.[0] || ''
 const address = basic?.roadAddress || basic?.jibunAddress || ''
 const phone = basic?.phone || basic?.tel || ''
 const description = basic?.dscr || basic?.homepageContents || ''
 const region = address.split(' ').slice(0, 2).join(' ')
 const mainKeyword = category.split('>').pop()?.trim() || category

 return NextResponse.json({
 ok: true,
 source: 'naver_place',
 placeId,
 name, category, address, phone,
 description, region, mainKeyword,
 })
 } catch (err: any) {
 return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
 }
}
