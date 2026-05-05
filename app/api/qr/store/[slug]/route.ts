// app/api/qr/store/[slug]/route.ts
// ============================================================
// QR 손님 페이지용 공개 매장 정보 조회 API
// GET /api/qr/store/{slug}
//
// · 인증 불필요 — 손님이 QR 스캔 후 진입하는 페이지에서 호출
// · 공개 정보만 반환 (매장명, 주소, 카테고리, 네이버 URL 등)
// · 민감 정보 차단 (사장님 ID/PW, 토큰, 이메일 등 절대 안 나감)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// CORS — QR 페이지가 다른 origin에서도 호출 가능하게 (PWA, 카메라 앱 등)
const CORS_HEADERS = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'GET, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
 return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(_req: NextRequest, ctx: { params: { slug: string } }) {
 const slug = String(ctx.params.slug || '').trim()
 if (!slug) {
 return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS_HEADERS })
 }

 const svc = createServiceClient()

 // stores 테이블 조회 — 공개 안전 컬럼만 select
 const { data, error } = await svc
 .from('stores')
 .select('id, slug, name, category, address, location, naver_url, naver_place_url, naver_place_id, description, cover_color, reward_type, reward_value')
 .eq('slug', slug)
 .maybeSingle()

 if (error) {
 return NextResponse.json({ ok: false, error: 'db_error', message: error.message.slice(0, 100) }, { status: 500, headers: CORS_HEADERS })
 }
 if (!data) {
 return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404, headers: CORS_HEADERS })
 }

 // m.place.naver.com URL 에서 외부 placeId 추출 — 손님이 네이버 리뷰 페이지로 이동할 때 사용
 const naverUrl: string = data.naver_url || data.naver_place_url || ''
 let externalPlaceId: string | null = null
 if (naverUrl) {
 const m = naverUrl.match(/place\/(\d{5,})/)
 if (m) externalPlaceId = m[1]
 }

 return NextResponse.json({
 ok: true,
 store: {
 slug: data.slug,
 name: data.name,
 category: data.category || null,
 address: data.address || data.location || null,
 naverUrl,
 naverPlaceId: data.naver_place_id || null, // SmartPlace 내부 ID
 naverExternalPlaceId: externalPlaceId, // m.place.naver.com 외부 ID
 description: data.description || null,
 coverColor: data.cover_color || '#3182F6',
 reward: data.reward_type ? { type: data.reward_type, value: data.reward_value || null } : null,
 },
 }, { headers: CORS_HEADERS })
}
