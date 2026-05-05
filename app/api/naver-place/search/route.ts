import { NextRequest, NextResponse } from 'next/server'

// HTML 태그 제거 (네이버 API가 <b>강조</b> 태그를 포함해서 반환함)
function stripHtml(str: string) {
 return str.replace(/<[^>]*>/g, '').trim()
}

// 네이버 플레이스 URL에서 검색 키워드 추출
function extractQueryFromUrl(input: string): string {
 try {
 // naver.me 단축 URL → 매장명을 직접 검색
 if (input.includes('naver.me') || input.includes('place.naver.com') || input.includes('map.naver.com')) {
 // URL에서 검색 가능한 텍스트 추출
 const decoded = decodeURIComponent(input)
 const match = decoded.match(/search\/([^/\?&]+)/)
 if (match) return match[1]
 // place URL에서 place ID 추출 (향후 Place API 연동 시 사용)
 const placeMatch = decoded.match(/place\/(\d+)/)
 if (placeMatch) return placeMatch[1]
 return decoded // 파싱 실패 시 원본 반환
 }
 return input
 } catch {
 return input
 }
}

export async function GET(req: NextRequest) {
 const { searchParams } = new URL(req.url)
 const rawQuery = searchParams.get('query') || ''

 if (!rawQuery.trim()) {
 return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 })
 }

 // 환경변수 체크
 const clientId = process.env.NAVER_CLIENT_ID
 const clientSecret = process.env.NAVER_CLIENT_SECRET

 if (!clientId || !clientSecret) {
 // 개발 환경에서 키 미설정 시 목업 데이터 반환 (UI 테스트용)
 const mockData = {
 items: [
 {
 title: rawQuery.includes('http') ? '연동할 매장 이름' : rawQuery,
 link: 'https://map.naver.com',
 category: '카페·베이커리',
 description: '',
 telephone: '02-0000-0000',
 address: '서울시 마포구 합정동 123-4',
 roadAddress: '서울시 마포구 합정로 12',
 mapx: '126.901234',
 mapy: '37.549876',
 }
 ],
 _mock: true,
 _message: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수를 설정해주세요',
 }
 return NextResponse.json(mockData)
 }

 // 네이버 지역검색 API 호출
 const query = extractQueryFromUrl(rawQuery)
 const naverUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`

 try {
 const res = await fetch(naverUrl, {
 headers: {
 'X-Naver-Client-Id': clientId,
 'X-Naver-Client-Secret': clientSecret,
 },
 // Next.js 캐시 비활성화 (항상 최신 결과)
 cache: 'no-store',
 })

 if (!res.ok) {
 const errText = await res.text()
 console.error('[Naver API Error]', res.status, errText)
 return NextResponse.json(
 { error: `네이버 API 오류 (${res.status}): API 키를 확인해주세요` },
 { status: 502 }
 )
 }

 const data = await res.json()

 // HTML 태그 제거 후 반환
 const items = (data.items || []).map((item: Record<string, string>) => ({
 ...item,
 title: stripHtml(item.title),
 category: stripHtml(item.category),
 }))

 return NextResponse.json({
 total: data.total,
 items,
 })
 } catch (err) {
 console.error('[Naver API Fetch Error]', err)
 return NextResponse.json(
 { error: '네이버 API 연결에 실패했습니다' },
 { status: 500 }
 )
 }
}
