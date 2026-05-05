// app/api/platform-reviews/import/route.ts
// ============================================================
// 40차-1: 브라우저에서 직접 파싱한 리뷰 데이터 저장 (Worker/Playwright 우회)
// POST /api/platform-reviews/import
// body: { platform, platform_store_id, reviews: CollectedReview[] }
// → platform_reviews upsert
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function maskAuthor(name: string | null | undefined): string | null {
 if (!name) return null
 const s = String(name).trim()
 if (s.length <= 1) return s + '*'
 if (s.length === 2) return s[0] + '*'
 return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 }
 const userId = auth.userId

 let body: any = {}
 try { body = await req.json() } catch {
 return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
 }

 const { platform, platform_store_id, reviews } = body

 if (!platform || !Array.isArray(reviews) || reviews.length === 0) {
 return NextResponse.json(
 { ok: false, error: 'platform, reviews[] 필수' },
 { status: 400 },
 )
 }

 const VALID = ['baemin', 'yogiyo', 'coupangeats', 'naver_place', 'kakao_map']
 if (!VALID.includes(platform)) {
 return NextResponse.json({ ok: false, error: '지원하지 않는 platform' }, { status: 400 })
 }

 const svc = createServiceClient()

 // user_id가 이 platform에 credentials 있는지 확인
 const { data: cred } = await svc
 .from('platform_credentials')
 .select('id, platform_store_id')
 .eq('user_id', userId)
 .eq('platform', platform)
 .maybeSingle()

 if (!cred) {
 return NextResponse.json(
 { ok: false, error: `${platform} 연결 정보 없음 — /my/platforms 에서 먼저 연결하세요` },
 { status: 400 },
 )
 }

 const storeId = platform_store_id || cred.platform_store_id || 'unknown'
 const now = new Date().toISOString()

 const rows = reviews.map((r: any) => ({
 user_id: userId,
 platform,
 platform_store_id: storeId,
 platform_review_id: String(r.platform_review_id),
 author_name: r.author_name || null,
 author_mask: maskAuthor(r.author_name),
 rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
 content: r.content || null,
 photos: Array.isArray(r.photos) && r.photos.length > 0 ? r.photos : null,
 posted_at: r.posted_at || null,
 collected_at: now,
 has_reply: !!r.has_reply,
 reply_content: r.reply_content || null,
 raw_snapshot: r,
 }))

 const { data, error } = await svc
 .from('platform_reviews')
 .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
 .select('platform_review_id')

 if (error) {
 console.error('[platform-reviews/import]', error)
 return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
 }

 return NextResponse.json({
 ok: true,
 platform,
 inserted: Array.isArray(data) ? data.length : 0,
 total: reviews.length,
 })
}

// CORS preflight (baemin.com → localution.co.kr 크로스 오리진 허용)
export async function OPTIONS() {
 return new NextResponse(null, {
 status: 204,
 headers: {
 'Access-Control-Allow-Origin': 'https://self.baemin.com',
 'Access-Control-Allow-Methods': 'POST, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
 'Access-Control-Allow-Credentials': 'true',
 },
 })
}
