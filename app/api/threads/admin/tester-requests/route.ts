// app/api/threads/admin/tester-requests/route.ts
// 테스터 신청 목록 조회 + 상태 변경 (어드민 전용)
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireAdmin } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('threads_tester_requests')
    .select('id, user_id, instagram_id, store_name, contact, status, memo, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, requests: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json() as { id: string; status: string; memo?: string }
  if (!body.id || !body.status) {
    return NextResponse.json({ ok: false, error: 'id, status 필수' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { error } = await svc
    .from('threads_tester_requests')
    .update({
      status:     body.status,
      memo:       body.memo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
