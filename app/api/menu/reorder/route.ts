// app/api/menu/reorder/route.ts
// ============================================================
// 메뉴 순서 재정렬 (사장님 전용)
//   POST /api/menu/reorder  body: { ids: string[] }
//   · 받은 ID 배열 순서대로 display_order 0, 1, 2, ... 부여
//   · 본인 매장 메뉴만 가능 (user_id 검증)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string') : []
  if (ids.length === 0) return NextResponse.json({ ok: false, error: 'no_ids' }, { status: 400 })

  const svc = createServiceClient()

  // 본인 메뉴인지 검증
  const { data: own } = await svc
    .from('menu_items')
    .select('id')
    .eq('user_id', auth.userId)
    .in('id', ids)
  const ownSet = new Set((own || []).map((r: any) => r.id))
  const validIds = ids.filter(id => ownSet.has(id))
  if (validIds.length === 0) return NextResponse.json({ ok: false, error: 'no_valid_items' }, { status: 400 })

  // 순서대로 display_order 부여 (0부터)
  const updates = validIds.map((id, idx) =>
    svc
      .from('menu_items')
      .update({ display_order: idx, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', auth.userId)
  )

  const results = await Promise.all(updates)
  const failed = results.filter(r => r.error).length
  if (failed > 0) {
    return NextResponse.json({ ok: false, error: 'partial_fail', failed_count: failed }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: validIds.length })
}
