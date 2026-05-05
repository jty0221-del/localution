// app/api/place/history/route.ts
// ============================================================
// 22차-3 · 네이버 플레이스 추적 — 스냅샷 이력 조회
// · GET ?target_id=<uuid>&limit=90&days=30
// · 응답: { target, snapshots: [...] } (ts ASC 정렬 — 차트용)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const target_id = req.nextUrl.searchParams.get('target_id')?.trim()
 const limitRaw = req.nextUrl.searchParams.get('limit')
 const daysRaw = req.nextUrl.searchParams.get('days')
 const limit = Math.min(Math.max(parseInt(limitRaw ?? '90', 10) || 90, 1), 365)
 const days = Math.min(Math.max(parseInt(daysRaw ?? '30', 10) || 30, 1), 365)

 if (!target_id) return NextResponse.json({ error: 'target_id 필수' }, { status: 400 })

 const svc = createServiceClient()

 // 소유권 확인
 const { data: t, error: tErr } = await svc
 .from('place_targets')
 .select('id,user_id,place_id,category,category_name,name,road_address,phone,thumbnail_url,memo,enabled,created_at')
 .eq('id', target_id)
 .single()
 if (tErr || !t) return NextResponse.json({ error: '타겟을 찾을 수 없습니다.' }, { status: 404 })
 if (t.user_id !== auth.userId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

 // 최근 days 일 이내
 const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

 const { data: snaps, error: sErr } = await svc
 .from('place_snapshots')
 .select('id,ts,visitor_review_count,blog_review_count,rating,photo_count,save_count,place_score,source,note')
 .eq('target_id', target_id)
 .gte('ts', fromDate)
 .order('ts', { ascending: true })
 .limit(limit)

 if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

 return NextResponse.json({
 target: {
 id: t.id,
 place_id: t.place_id,
 category: t.category,
 category_name:t.category_name,
 name: t.name,
 road_address: t.road_address,
 phone: t.phone,
 thumbnail_url:t.thumbnail_url,
 memo: t.memo,
 enabled: t.enabled,
 created_at: t.created_at,
 },
 snapshots: snaps ?? [],
 params: { days, limit },
 })
}
