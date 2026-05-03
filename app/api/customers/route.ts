// app/api/customers/route.ts
// ============================================================
// 사장님 — 고객 CRUD (cookie 인증 기반)
//   · 스탬프카드/QR 등에서 자동 등록된 고객 + 사장님 직접 등록
//   · GET   /api/customers              → list
//   · POST  /api/customers              → add
//   · PUT   /api/customers              → update (id 필수)
//   · DELETE /api/customers?id=xxx      → remove
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CustomerRow = {
  id: string
  legacy_id: string | null
  name: string
  phone: string | null
  memo: string
  tags: string[] | null
  visits_count: number
  total_spend_krw: number
  last_visit_at: string | null
}

function rowToCustomer(r: CustomerRow) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? '',
    visits: r.visits_count ?? 0,
    totalSpend: r.total_spend_krw ?? 0,
    lastVisit: r.last_visit_at ? r.last_visit_at.slice(0, 10) : '',
    tags: (r.tags ?? []) as string[],
    memo: r.memo ?? '',
  }
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('customers')
    .select('id, legacy_id, name, phone, memo, tags, visits_count, total_spend_krw, last_visit_at')
    .eq('user_id', auth.userId)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    customers: (data || []).map(rowToCustomer),
    total: (data || []).length,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const name = String(body?.name || '').trim().slice(0, 60)
  const phone = String(body?.phone || '').replace(/[^0-9]/g, '').slice(0, 11) || null
  const memo = String(body?.memo || '').slice(0, 500)
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: any) => typeof t === 'string').slice(0, 10) : []

  if (!name) return NextResponse.json({ ok: false, error: 'missing_name' }, { status: 400 })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('customers')
    .insert({
      user_id: auth.userId,
      name,
      phone,
      memo,
      tags,
      visits_count: 0,
      total_spend_krw: 0,
    })
    .select('id, legacy_id, name, phone, memo, tags, visits_count, total_spend_krw, last_visit_at')
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, customer: rowToCustomer(data) })
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || '')
  if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })

  const patch: Record<string, any> = {}
  if (body?.name !== undefined) patch.name = String(body.name).slice(0, 60)
  if (body?.phone !== undefined) patch.phone = String(body.phone).replace(/[^0-9]/g, '').slice(0, 11) || null
  if (body?.memo !== undefined) patch.memo = String(body.memo).slice(0, 500)
  if (Array.isArray(body?.tags)) patch.tags = body.tags.filter((t: any) => typeof t === 'string').slice(0, 10)
  if (typeof body?.visits === 'number') patch.visits_count = body.visits
  if (typeof body?.totalSpend === 'number') patch.total_spend_krw = body.totalSpend
  patch.updated_at = new Date().toISOString()

  const svc = createServiceClient()
  const { error } = await svc
    .from('customers')
    .update(patch)
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const id = req.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })

  const svc = createServiceClient()
  const { error } = await svc
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
