import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/baemin-reviews?storeId=...&token=...
 * 배달의민족 리뷰 목록 조회
 *
 * 필요 환경변수 (Vercel에 등록):
 * BAEMIN_CLIENT_ID — 배민 개발자 포털 클라이언트 ID
 * BAEMIN_CLIENT_SECRET — 배민 개발자 포털 클라이언트 Secret
 *
 * 또는 URL 파라미터로 직접 전달:
 * ?storeId={storeId}&token={bearerToken}
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const { searchParams } = req.nextUrl
 const storeId = searchParams.get('storeId') || process.env.BAEMIN_STORE_ID || ''
 const token = searchParams.get('token') || ''
 const isTest = searchParams.get('test') === 'true'
 const clientId = process.env.BAEMIN_CLIENT_ID || ''
 const clientSec = process.env.BAEMIN_CLIENT_SECRET || ''

 if (!storeId) {
 return NextResponse.json({ error: 'storeId 파라미터가 필요합니다' }, { status: 400 })
 }

 // ── 연동 테스트 모드 ──
 if (isTest) {
 // 프로덕션 가드 (2026-04-19)
 // 실제 파트너 API 계약이 체결되기 전까지 production 환경에서는 user-supplied token만으로
 // "연동됨" 상태를 반환하지 않는다. BAEMIN_CLIENT_ID/SECRET 환경변수가 모두 세팅되어야만
 // 정식 연동으로 간주한다. (false-positive 차단)
 const isProd = process.env.NODE_ENV === 'production'
 const hasPartnerCreds = Boolean(clientId && clientSec)

 if (isProd && !hasPartnerCreds) {
 return NextResponse.json({
 error: '배민 파트너 API 연동이 아직 준비 중입니다.\n제휴 심사 완료 후 사용하실 수 있습니다.\n(현재 단계: 파트너 계약 진행 중)',
 helpUrl: 'https://developers.baemin.com',
 pending: true,
 }, { status: 503 })
 }

 if (!token && !clientId) {
 return NextResponse.json({
 error: '배민 API Token 또는 환경변수(BAEMIN_CLIENT_ID)가 없습니다.\n배민사장님광장에서 API를 신청해주세요.',
 helpUrl: 'https://developers.baemin.com'
 }, { status: 401 })
 }
 return NextResponse.json({
 ok: true,
 message: hasPartnerCreds ? '연동 준비 완료' : '연동 준비 완료 (개발 환경)',
 })
 }

 // ── OAuth 토큰 취득 (환경변수 방식) ──
 let bearerToken = token
 if (!bearerToken && clientId && clientSec) {
 try {
 const tokenRes = await fetch('https://auth.baemin.com/oauth/token', {
 method: 'POST',
 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 body: new URLSearchParams({
 grant_type: 'client_credentials',
 client_id: clientId,
 client_secret: clientSec,
 scope: 'review',
 }),
 })
 const tokenData = await tokenRes.json()
 if (!tokenData.access_token) throw new Error('토큰 취득 실패')
 bearerToken = tokenData.access_token
 } catch (e: any) {
 return NextResponse.json({ error: '배민 OAuth 토큰 취득 실패: ' + e.message }, { status: 502 })
 }
 }

 if (!bearerToken) {
 // ── 데모 모드: 환경변수 없을 때 샘플 데이터 반환 ──
 return NextResponse.json({
 reviews: [
 {
 id: 'bm_demo_1', rating: 5,
 author: '테스트고객님',
 date: new Date().toLocaleDateString('ko-KR'),
 text: '배달도 빠르고 음식도 맛있어요! 다음에 또 시킬게요 ',
 menuItems: ['대표 메뉴 A', '사이드 B'],
 replied: false,
 },
 {
 id: 'bm_demo_2', rating: 3,
 author: '익명',
 date: new Date().toLocaleDateString('ko-KR'),
 text: '맛은 좋은데 배달이 조금 늦었어요',
 menuItems: ['메뉴 C'],
 replied: false,
 },
 {
 id: 'bm_demo_3', rating: 5,
 author: '단골손님',
 date: new Date().toLocaleDateString('ko-KR'),
 text: '',
 menuItems: ['대표 메뉴 A'],
 replied: true,
 replyText: '감사합니다! 다음에도 맛있게 드실 수 있도록 최선을 다하겠습니다 ',
 },
 ],
 demo: true,
 message: 'BAEMIN API 키 없음 — 샘플 데이터 표시 중',
 })
 }

 // ── 실제 배민 API 호출 ──
 try {
 const res = await fetch(`https://api.baemin.com/api/v1/stores/${storeId}/reviews?page=0&size=50`, {
 headers: {
 'Authorization': `Bearer ${bearerToken}`,
 'Content-Type': 'application/json',
 },
 })
 if (!res.ok) {
 const errBody = await res.text()
 return NextResponse.json({ error: `배민 API 오류 (${res.status}): ${errBody}` }, { status: res.status })
 }
 const data = await res.json()
 const reviews = (data.content || data.reviews || []).map((r: any) => ({
 id: r.reviewId || r.id,
 rating: r.starRating || r.rating,
 author: r.writerNickname || r.author || '손님',
 date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : '',
 text: r.content || r.text || '',
 menuItems: r.orderMenuNames || [],
 replied: !!(r.replyContent || r.replyText),
 replyText: r.replyContent || r.replyText || '',
 }))
 return NextResponse.json({ reviews })
 } catch (e: any) {
 return NextResponse.json({ error: e.message }, { status: 500 })
 }
}
