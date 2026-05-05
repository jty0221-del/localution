import { NextResponse } from 'next/server'
import crypto from 'crypto'

// 쿠팡이츠 EatApp Partner API
// 공식 API 제공 — WING(https://wing.coupang.com)에서 API 키 발급 필요
// 환경변수: COUPANG_VENDOR_ID, COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY

const COUPANG_API_BASE = 'https://api-gateway.coupang.com'

function generateHmacSignature(method: string, path: string, secretKey: string) {
 const datetime = new Date().toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z'
 const message = datetime + method + path
 const hmac = crypto.createHmac('sha256', secretKey)
 hmac.update(message)
 return { signature: hmac.digest('hex'), datetime }
}

export async function GET() {
 const vendorId = process.env.COUPANG_VENDOR_ID
 const accessKey = process.env.COUPANG_ACCESS_KEY
 const secretKey = process.env.COUPANG_SECRET_KEY

 if (!vendorId || !accessKey || !secretKey) {
 return NextResponse.json(
 { error: 'COUPANG_VENDOR_ID, COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY 환경변수를 설정해 주세요.',
 guide: 'https://wing.coupang.com → 계정관리 → API 키 발급',
 steps: [
 '1. https://wing.coupang.com 로그인',
 '2. 상단 메뉴 > 계정관리 > API 키 관리',
 '3. Access Key, Secret Key 발급',
 '4. VendorID 확인 (매장 관리 > 기본 정보)',
 '5. Vercel 환경변수에 추가',
 ]
 },
 { status: 503 }
 )
 }

 const path = `/v2/providers/eats_api/apis/api/v1/vendors/${vendorId}/reviews`
 const { signature, datetime } = generateHmacSignature('GET', path, secretKey)

 try {
 const res = await fetch(COUPANG_API_BASE + path, {
 headers: {
 'Authorization': `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
 'Content-Type': 'application/json',
 },
 })

 if (!res.ok) {
 const errText = await res.text()
 return NextResponse.json(
 { error: '쿠팡이츠 API 오류', details: errText, status: res.status },
 { status: res.status }
 )
 }

 const data = await res.json()
 // EatApp API 응답 형식에 맞게 변환
 const reviews = (data.data || []).map((r: any) => ({
 id: String(r.reviewId || r.id),
 rating: r.rating || 0,
 content: r.content || '',
 author: r.authorName || '익명',
 orderedMenu: r.orderMenus?.join(', ') || '',
 createdAt: r.createdAt?.slice(0, 10) || '',
 replied: !!r.reply,
 replyContent: r.reply?.content || '',
 }))

 return NextResponse.json({ platform: 'coupang', reviews, total: reviews.length })
 } catch (e) {
 return NextResponse.json({ error: '쿠팡이츠 API 연결 실패', details: String(e) }, { status: 500 })
 }
}

export async function POST(request: Request) {
 const { reviewId, content } = await request.json()
 const vendorId = process.env.COUPANG_VENDOR_ID
 const accessKey = process.env.COUPANG_ACCESS_KEY
 const secretKey = process.env.COUPANG_SECRET_KEY

 if (!vendorId || !accessKey || !secretKey) {
 return NextResponse.json({ error: '환경변수 없음' }, { status: 503 })
 }

 const path = `/v2/providers/eats_api/apis/api/v1/vendors/${vendorId}/reviews/${reviewId}/reply`
 const { signature, datetime } = generateHmacSignature('POST', path, secretKey)

 try {
 const res = await fetch(COUPANG_API_BASE + path, {
 method: 'POST',
 headers: {
 'Authorization': `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ content }),
 })
 if (res.ok) {
 return NextResponse.json({ success: true, reviewId })
 }
 return NextResponse.json({ error: '답글 등록 실패' }, { status: res.status })
 } catch (e) {
 return NextResponse.json({ error: String(e) }, { status: 500 })
 }
}
