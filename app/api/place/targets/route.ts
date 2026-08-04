// app/api/place/targets/route.ts
// ============================================================
// 22차-2 · 네이버 플레이스 추적 타겟 CRUD
// · GET : 본인 타겟 목록 (+ 최신 스냅샷 조인)
// · POST : URL/placeId 로 타겟 등록 + 초기 스냅샷 저장
// · DELETE: ?target_id=<uuid> 타겟 삭제 (스냅샷 CASCADE)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { extractPlaceIdAndCategory, lookupPlace, type PlaceInfo } from '@/app/lib/naver-place'
import { calcStoreScore } from '@/app/lib/place-score'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ────────────────────────────────────────────────────────────
// GET — 본인 타겟 목록 (최신 스냅샷 조인)
// ────────────────────────────────────────────────────────────
export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const svc = createServiceClient()

 // place_targets_with_latest 뷰: UI 한방 쿼리용
 const { data, error } = await svc
 .from('place_targets_with_latest')
 .select('*')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })

 if (error) {
 // 부차 쿼리 실패 시 단순 타겟만 반환 (격리 원칙)
 const { data: simple } = await svc
 .from('place_targets')
 .select('*')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 return NextResponse.json({ targets: simple ?? [], warning: error.message })
 }

 return NextResponse.json({ targets: data ?? [] })
}

// ────────────────────────────────────────────────────────────
// POST — 신규 등록
// body: { url: string, memo?: string }
// ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 let body: { url?: string; memo?: string } = {}
 try { body = await req.json() } catch {}
 const url = (body.url ?? '').trim()
 if (!url) return NextResponse.json({ error: 'url 필수' }, { status: 400 })

 const { id, category } = extractPlaceIdAndCategory(url)
 if (!id) return NextResponse.json({ error: 'placeId 를 추출할 수 없습니다. 네이버 플레이스 URL 또는 숫자 ID 를 입력하세요.' }, { status: 400 })

 // 네이버 플레이스 조회
 let info: PlaceInfo | null = null
 try {
 info = await lookupPlace(id, category)
 } catch (e) {
 console.warn('[place/targets POST] lookupPlace failed:', e)
 }
 if (!info) {
 return NextResponse.json(
 { error: '네이버 플레이스에서 해당 ID를 찾지 못했습니다. 비공개이거나 ID가 잘못됐을 수 있어요.' },
 { status: 404 },
 )
 }

 const svc = createServiceClient()

 // upsert 타겟 (동일 user_id + place_id 이면 업데이트)
 const { data: target, error: upErr } = await svc
 .from('place_targets')
 .upsert({
 user_id: auth.userId,
 place_id: info.placeId,
 category: info.category,
 category_name: info.categoryName || null,
 name: info.name,
 road_address: info.roadAddress || null,
 phone: info.phone || null,
 thumbnail_url: info.thumbnail || null,
 memo: body.memo ?? null,
 enabled: true,
 updated_at: new Date().toISOString(),
 }, { onConflict: 'user_id,place_id' })
 .select()
 .single()

 if (upErr || !target) {
 return NextResponse.json({ error: upErr?.message || '등록 실패' }, { status: 500 })
 }

 // 초기 스냅샷 저장 (부차 쿼리 — 실패해도 타겟은 유지)
 try {
 await svc.from('place_snapshots').insert({
 target_id: target.id,
 user_id: auth.userId,
 place_id: info.placeId,
 visitor_review_count: info.visitorReviewCount,
 blog_review_count: info.blogReviewCount,
 rating: info.rating,
 place_score: calcStoreScore({
 blogReviewCount: info.blogReviewCount,
 visitorReviewCount: info.visitorReviewCount,
 rating: info.rating,
 }),
 source: 'manual',
 raw_info: info,
 })
 } catch (e) {
 console.warn('[place/targets POST] snapshot insert failed:', e)
 }

 return NextResponse.json({ ok: true, target, info })
}

// ────────────────────────────────────────────────────────────
// DELETE — ?target_id=<uuid>
// ────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const target_id = req.nextUrl.searchParams.get('target_id')?.trim()
 if (!target_id) return NextResponse.json({ error: 'target_id 필수' }, { status: 400 })

 const svc = createServiceClient()

 // 소유권 검증
 const { data: t, error: tErr } = await svc
 .from('place_targets')
 .select('id,user_id')
 .eq('id', target_id)
 .single()
 if (tErr || !t) return NextResponse.json({ error: '타겟을 찾을 수 없습니다.' }, { status: 404 })
 if (t.user_id !== auth.userId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

 const { error: dErr } = await svc
 .from('place_targets')
 .delete()
 .eq('id', target_id)
 if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

 return NextResponse.json({ ok: true })
}
