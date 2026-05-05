import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/yogiyo-reviews?storeId=...&token=...
 * 요기요 리뷰 목록 조회
 *
 * 요기요는 공개 API 없음 → 파트너 계약 후 개별 발급
 * 파트너 문의: partner@yogiyo.co.kr
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const { searchParams } = req.nextUrl
 const storeId = searchParams.get('storeId') || process.env.YOGIYO_STORE_ID || ''
 const token = searchParams.get('token') || process.env.YOGIYO_API_KEY || ''
 const isTest = searchParams.get('test') === 'true'

 if (!storeId) {
 return NextResponse.json({ error: 'storeId 파라미터 필요' }, { status: 400 })
 }

 if (isTest) {
 // 프로덕션 가드 (2026-04-19)
 // 요기요는 공식 공개 API가 없으므로 production 에서는 YOGIYO_API_KEY 환경변수가
 // 반드시 세팅되어 있어야만 "연동 준비 완료"로 간주한다. user-supplied token 만으로는
 // 실제 파트너 계약이 성사된 것으로 볼 수 없음 → false-positive 차단.
 const isProd = process.env.NODE_ENV === 'production'
 const hasPartnerKey = Boolean(process.env.YOGIYO_API_KEY)

 if (isProd && !hasPartnerKey) {
 return NextResponse.json({
 error: '요기요 파트너 API 연동이 아직 준비 중입니다.\n공식 API 발급 완료 후 사용하실 수 있습니다.\n(현재 단계: 파트너 계약 진행 중)',
 helpUrl: 'https://ceo.yogiyo.co.kr',
 pending: true,
 }, { status: 503 })
 }

 if (!token) {
 return NextResponse.json({
 error: '요기요 API Key가 없습니다.\n파트너 계약 후 발급받으세요.\n문의: partner@yogiyo.co.kr',
 helpUrl: 'https://ceo.yogiyo.co.kr'
 }, { status: 401 })
 }
 return NextResponse.json({
 ok: true,
 message: hasPartnerKey ? '연동 준비 완료' : '연동 준비 완료 (개발 환경)',
 })
 }

 // ── API Key 없으면 데모 데이터 ──
 if (!token) {
 return NextResponse.json({
 reviews: [
 {
 id: 'yy_demo_1', rating: 5,
 author: '리뷰어123',
 date: new Date().toLocaleDateString('ko-KR'),
 text: '음식이 너무 맛있어요! 포장도 꼼꼼하게 해주셨어요 ',
 menuItems: ['대표메뉴'],
 replied: false,
 },
 {
 id: 'yy_demo_2', rating: 2,
 author: '손님',
 date: new Date().toLocaleDateString('ko-KR'),
 text: '양이 생각보다 적네요. 맛은 괜찮았어요',
 menuItems: ['메뉴B'],
 replied: false,
 },
 ],
 demo: true,
 message: '요기요 API Key 없음 — 샘플 데이터',
 })
 }

 // ── 실제 요기요 파트너 API 호출 ──
 try {
 const res = await fetch(`https://partner-api.yogiyo.co.kr/api/v1/restaurants/${storeId}/reviews?page=1&size=50`, {
 headers: {
 'Authorization': `Bearer ${token}`,
 'X-Partner-Token': token,
 'Content-Type': 'application/json',
 },
 })
 if (!res.ok) {
 const err = await res.text()
 return NextResponse.json({ error: `요기요 API 오류 (${res.status}): ${err}` }, { status: res.status })
 }
 const data = await res.json()
 const reviews = (data.reviews || data.data || []).map((r: any) => ({
 id: r.reviewId || r.id,
 rating: r.starRating || r.rating,
 author: r.author || r.nickName || '손님',
 date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : '',
 text: r.content || '',
 menuItems: r.menuNames || [],
 replied: !!(r.reply || r.replyContent),
 replyText: r.reply || r.replyContent || '',
 }))
 return NextResponse.json({ reviews })
 } catch (e: any) {
 return NextResponse.json({ error: e.message }, { status: 500 })
 }
}
