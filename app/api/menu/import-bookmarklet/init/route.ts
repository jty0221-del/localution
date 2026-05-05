// app/api/menu/import-bookmarklet/init/route.ts
// ============================================================
// 북마클릿 모드 초기화
// POST → import_id + token 생성
// 사장님이 token 을 북마클릿으로 네이버 페이지에서 사용
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()

 const { data: store } = await svc
 .from('stores')
 .select('id')
 .eq('user_id', auth.userId)
 .maybeSingle()

 // 32 bytes hex token
 const token = randomBytes(24).toString('hex')

 const { data: importRow, error } = await svc
 .from('menu_imports')
 .insert({
 user_id: auth.userId,
 store_id: store?.id || null,
 place_id: null,
 booking_business_id: null,
 status: 'awaiting_bookmarklet',
 job_id: token,
 })
 .select('id')
 .single()

 if (error || !importRow) {
 return NextResponse.json({
 ok: false,
 error: 'insert_failed',
 message: 'menu_imports 테이블이 없거나 권한 문제. SQL 마이그레이션 실행 필요.',
 detail: error?.message,
 }, { status: 500 })
 }

 return NextResponse.json({
 ok: true,
 import_id: importRow.id,
 token,
 expires_in_minutes: 30,
 })
}
