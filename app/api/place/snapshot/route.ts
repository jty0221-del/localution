// app/api/place/snapshot/route.ts
// ============================================================
// 22차-3 · 네이버 플레이스 추적 — 수동 새로고침
// · POST { target_id } → 해당 타겟 lookupPlace → snapshots insert
// · 응답: { ok, snapshot, info }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { lookupPlace } from '@/app/lib/naver-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 let body: { target_id?: string } = {}
 try { body = await req.json() } catch {}
 const target_id = (body.target_id ?? '').trim()
 if (!target_id) return NextResponse.json({ error: 'target_id 필수' }, { status: 400 })

 const svc = createServiceClient()

 // 소유권 검증
 const { data: t, error: tErr } = await svc
 .from('place_targets')
 .select('id,user_id,place_id,category,name')
 .eq('id', target_id)
 .single()
 if (tErr || !t) return NextResponse.json({ error: '타겟을 찾을 수 없습니다.' }, { status: 404 })
 if (t.user_id !== auth.userId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

 // 네이버 플레이스 재조회
 const info = await lookupPlace(t.place_id, t.category)
 if (!info) {
 return NextResponse.json(
 { error: '네이버 플레이스 조회 실패. 잠시 후 다시 시도해 주세요.' },
 { status: 502 },
 )
 }

 // 타겟 메타 업데이트 (이름/업종 변경 대응) — 부차 처리
 try {
 await svc
 .from('place_targets')
 .update({
 category_name: info.categoryName || null,
 name: info.name,
 road_address: info.roadAddress || null,
 phone: info.phone || null,
 thumbnail_url: info.thumbnail || null,
 updated_at: new Date().toISOString(),
 })
 .eq('id', target_id)
 } catch (e) {
 console.warn('[place/snapshot POST] target meta update failed:', e)
 }

 // 스냅샷 insert
 const { data: snap, error: sErr } = await svc
 .from('place_snapshots')
 .insert({
 target_id,
 user_id: auth.userId,
 place_id: info.placeId,
 visitor_review_count: info.visitorReviewCount,
 blog_review_count: info.blogReviewCount,
 rating: info.rating,
 source: 'manual',
 raw_info: info,
 })
 .select()
 .single()

 if (sErr || !snap) {
 return NextResponse.json({ error: sErr?.message || '스냅샷 저장 실패' }, { status: 500 })
 }

 return NextResponse.json({ ok: true, snapshot: snap, info })
}
