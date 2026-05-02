// app/api/menu/import-status/route.ts
// ============================================================
// 메뉴 임포트 작업 상태 폴링
//   GET /api/menu/import-status?id=xxx
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const id = req.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('menu_imports')
    .select('id, status, items, error_code, error_message, created_at, updated_at, completed_at')
    .eq('id', id)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: 'db_error', message: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })

  // 너무 오래 걸리면 (60초 이상 running) timeout 처리
  if (data.status === 'running' || data.status === 'queued') {
    const ageMs = Date.now() - new Date(data.created_at).getTime()
    if (ageMs > 120_000) {
      await svc.from('menu_imports').update({
        status: 'failed',
        error_code: 'timeout',
        error_message: '워커가 120초 안에 응답하지 않았어요. 다시 시도해주세요.',
        completed_at: new Date().toISOString(),
      }).eq('id', id)
      return NextResponse.json({
        ok: true,
        status: 'failed',
        error_code: 'timeout',
        error_message: '워커가 120초 안에 응답하지 않았어요. 다시 시도해주세요.',
      })
    }
  }

  return NextResponse.json({ ok: true, ...data })
}
