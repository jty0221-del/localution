import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/naver-place-reviews?placeId=123456789
 *
 * 네이버 플레이스 공개 API에서 업체의 리뷰 수를 가져옵니다.
 * - 블로그 리뷰 수 (blogReviewCount)
 * - 방문자 리뷰 수 (visitorReviewCount) = 영수증리뷰 + 예약자리뷰
 */
export async function GET(req: NextRequest) {
 const placeId = req.nextUrl.searchParams.get('placeId') || ''
 if (!/^[0-9]{5,15}$/.test(placeId)) {
 return NextResponse.json({ ok: false, error: '유효하지 않은 placeId' }, { status: 400 })
 }

 try {
 // 네이버 플레이스 공개 JSON API (모바일 웹 기반)
 const apiUrl = 'https://place.map.naver.com/place/main/v2/' + placeId
 const res = await fetch(apiUrl, {
 headers: {
 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
 'Referer': 'https://map.naver.com/',
 'Accept': 'application/json',
 },
 next: { revalidate: 1800 },
 })

 if (!res.ok) {
 return NextResponse.json({ ok: false, error: 'Naver Place ' + res.status })
 }

 const json = await res.json()
 const place = json?.result?.place || json?.place || {}
 const rv = place?.visitorReviews || place?.reviewInfo || {}
 const blog = place?.blogReviews || place?.blogReviewInfo || {}

 // 경로가 API 버전마다 다를 수 있어 여러 경로 시도
 const visitorCount =
 rv?.totalCount ??
 rv?.count ??
 place?.visitorReviewCount ??
 place?.reviewStat?.totalCount ??
 null

 const blogCount =
 blog?.totalCount ??
 blog?.count ??
 place?.blogReviewCount ??
 place?.blogCafeReviewCount ??
 null

 return NextResponse.json({
 ok: true,
 placeId,
 blogReviewCount: blogCount ?? null,
 visitorReviewCount: visitorCount ?? null,
 _raw_keys: Object.keys(place).slice(0, 20), // 디버그용
 })
 } catch (err) {
 console.error('[naver-place-reviews]', err)
 return NextResponse.json({ ok: false, error: '파싱 실패' })
 }
}
