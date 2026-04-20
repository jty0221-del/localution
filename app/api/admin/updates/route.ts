// app/api/admin/updates/route.ts
// ============================================================
// 앱 업데이트 내역 — 관리자 CRUD
//   · GET    전체 (active 무관) + sort_order
//   · POST   추가
//   · PATCH  ?id=<uuid> 수정 (body 에 변경분)
//   · DELETE ?id=<uuid>
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CATEGORIES = ['feature', 'fix', 'notice', 'beta'] as const
type Category = typeof VALID_CATEGORIES[number]

function normalizeCategory(v: unknown): Category {
  return VALID_CATEGORIES.includes(v as Category) ? (v as Category) : 'feature'
}

// ---------- GET ----------
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('app_updates')
    .select('*')
    .order('released_at', { ascending: false })
    .order('sort_order', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updates: data ?? [] })
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const title       = String(body.title ?? '').trim()
  const summary     = String(body.summary ?? '').trim()
  const released_at = String(body.released_at ?? '').trim() // YYYY-MM-DD
  if (!title || !summary || !released_at) {
    return NextResponse.json({ error: 'title/summary/released_at 필수' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(released_at)) {
    return NextResponse.json({ error: 'released_at 은 YYYY-MM-DD 형식' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('app_updates')
    .insert({
      title,
      summary,
      highlight:   typeof body.highlight === 'string' && body.highlight ? body.highlight : null,
      category:    normalizeCategory(body.category),
      released_at,
      active:      body.active === false ? false : true,
      sort_order:  Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0,
      cover_url:   typeof body.cover_url === 'string' && body.cover_url ? body.cover_url : null,
      link_url:    typeof body.link_url === 'string' && body.link_url ? body.link_url : null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ update: data })
}

// ---------- PATCH ----------
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string')       patch.title       = body.title.trim()
  if (typeof body.summary === 'string')     patch.summary     = body.summary.trim()
  if (typeof body.highlight === 'string')   patch.highlight   = body.highlight || null
  if (body.highlight === null)              patch.highlight   = null
  if (typeof body.category === 'string')    patch.category    = normalizeCategory(body.category)
  if (typeof body.released_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.released_at)) {
    patch.released_at = body.released_at
  }
  if (typeof body.active === 'boolean')     patch.active      = body.active
  if (Number.isFinite(body.sort_order))     patch.sort_order  = Number(body.sort_order)
  if (typeof body.cover_url === 'string')   patch.cover_url   = body.cover_url || null
  if (body.cover_url === null)              patch.cover_url   = null
  if (typeof body.link_url === 'string')    patch.link_url    = body.link_url || null
  if (body.link_url === null)               patch.link_url    = null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 필드가 없습니다' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('app_updates')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: '해당 항목이 없습니다' }, { status: 404 })
  return NextResponse.json({ update: data })
}

// ---------- DELETE ----------
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 })

  const svc = createServiceClient()
  const { error, count } = await svc
    .from('app_updates')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: '해당 항목이 없습니다' }, { status: 404 })
  return NextResponse.json({ ok: true, deleted: count })
}
