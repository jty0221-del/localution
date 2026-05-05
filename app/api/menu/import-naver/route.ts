// app/api/menu/import-naver/route.ts
// ============================================================
// 옵션 A: 워커 인프라로 네이버 메뉴 가져오기
// POST /api/menu/import-naver
// body: { placeId, bookingBusinessId? }
//
// 1. menu_imports 테이블에 row 생성 (status: queued)
// 2. BullMQ 에 fetch_menu 잡 enqueue
// 3. import_id 반환
// 4. 클라이언트가 /api/menu/import-status?id=xxx 로 폴링
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const placeId = String(body?.placeId || '').replace(/[^0-9]/g, '')
 const bookingBusinessId = body?.bookingBusinessId ? String(body.bookingBusinessId).replace(/[^0-9]/g, '') : null

 if (!placeId) return NextResponse.json({ ok: false, error: 'missing_placeId' }, { status: 400 })

 const svc = createServiceClient()

 // 사장님 매장 정보
 const { data: store } = await svc
 .from('stores')
 .select('id, slug')
 .eq('user_id', auth.userId)
 .maybeSingle()

 // menu_imports 행 생성
 const { data: importRow, error: insertErr } = await svc
 .from('menu_imports')
 .insert({
 user_id: auth.userId,
 store_id: store?.id || null,
 place_id: placeId,
 booking_business_id: bookingBusinessId,
 status: 'queued',
 })
 .select('id')
 .single()

 if (insertErr || !importRow) {
 return NextResponse.json({
 ok: false,
 error: 'insert_failed',
 message: 'menu_imports 테이블이 없거나 권한 문제. SQL 마이그레이션 실행 필요.',
 detail: insertErr?.message,
 }, { status: 500 })
 }

 // 워커 잡 enqueue
 const enq = await enqueuePlatformJob({
 platform: 'naver_place',
 action: 'fetch_menu',
 userId: auth.userId,
 storeId: store?.id || placeId,
 payload: {
 import_id: importRow.id,
 place_id: placeId,
 booking_business_id: bookingBusinessId,
 },
 }, { priority: 2 })

 if (!enq.ok) {
 await svc.from('menu_imports').update({
 status: 'failed',
 error_code: 'enqueue_failed',
 error_message: enq.error,
 completed_at: new Date().toISOString(),
 }).eq('id', importRow.id)
 return NextResponse.json({ ok: false, error: 'enqueue_failed', message: enq.error }, { status: 500 })
 }

 await svc.from('menu_imports').update({ job_id: enq.jobId }).eq('id', importRow.id)

 return NextResponse.json({
 ok: true,
 import_id: importRow.id,
 job_id: enq.jobId,
 status: 'queued',
 message: '워커가 네이버에서 메뉴를 가져오는 중입니다. 잠시 후 자동으로 표시돼요.',
 })
}
