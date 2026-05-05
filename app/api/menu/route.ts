// app/api/menu/route.ts
// ============================================================
// 사장님 — 메뉴 CRUD
// GET /api/menu → 본인 매장 모든 메뉴
// POST /api/menu → 메뉴 추가 (단건 또는 배열)
// PUT /api/menu → 메뉴 수정 (id + fields)
// DELETE /api/menu?id=xxx → 메뉴 삭제 (soft: active=false)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const { data: store } = await svc
 .from('stores')
 .select('id, slug, name')
 .eq('user_id', auth.userId)
 .maybeSingle()

 const { data: items } = await svc
 .from('menu_items')
 .select('*')
 .eq('user_id', auth.userId)
 .eq('active', true)
 .order('display_order', { ascending: true })
 .order('created_at', { ascending: true, nullsFirst: false })
 .order('id', { ascending: true })

 return NextResponse.json({ ok: true, items: items || [], store })
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const list = Array.isArray(body?.items) ? body.items : [body]
 const svc = createServiceClient()
 const { data: store } = await svc
 .from('stores')
 .select('id, slug')
 .eq('user_id', auth.userId)
 .maybeSingle()

 const rows = list.map((it: any) => ({
 user_id: auth.userId,
 store_id: store?.id || null,
 store_slug: store?.slug || null,
 category: it.category ? String(it.category).slice(0, 40) : null,
 name_ko: String(it.name_ko || '').slice(0, 80),
 name_en: it.name_en ? String(it.name_en).slice(0, 80) : null,
 name_ja: it.name_ja ? String(it.name_ja).slice(0, 80) : null,
 name_zh: it.name_zh ? String(it.name_zh).slice(0, 80) : null,
 desc_ko: it.desc_ko ? String(it.desc_ko).slice(0, 200) : null,
 desc_en: it.desc_en ? String(it.desc_en).slice(0, 200) : null,
 desc_ja: it.desc_ja ? String(it.desc_ja).slice(0, 200) : null,
 desc_zh: it.desc_zh ? String(it.desc_zh).slice(0, 200) : null,
 price: parseInt(String(it.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
 image_url: it.image_url || null,
 is_signature: !!it.is_signature,
 is_new: !!it.is_new,
 is_soldout: !!it.is_soldout,
 display_order: parseInt(String(it.display_order || '0'), 10) || 0,
 active: true,
 updated_at: new Date().toISOString(),
 })).filter((r: any) => r.name_ko)

 if (rows.length === 0) return NextResponse.json({ ok: false, error: 'no_valid_items' }, { status: 400 })

 const { data, error } = await svc.from('menu_items').insert(rows).select('id')
 if (error) return NextResponse.json({ ok: false, error: 'insert_failed', message: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, count: data?.length || 0 })
}

export async function PUT(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 if (!body?.id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })

 const svc = createServiceClient()
 const update: any = { updated_at: new Date().toISOString() }
 for (const k of ['category','name_ko','name_en','name_ja','name_zh','desc_ko','desc_en','desc_ja','desc_zh','image_url']) {
 if (body[k] !== undefined) update[k] = body[k] ? String(body[k]).slice(0, 200) : null
 }
 if (body.price !== undefined) update.price = parseInt(String(body.price).replace(/[^0-9]/g, ''), 10) || 0
 if (body.display_order !== undefined) update.display_order = parseInt(String(body.display_order), 10) || 0
 for (const k of ['is_signature','is_new','is_soldout']) {
 if (body[k] !== undefined) update[k] = !!body[k]
 }

 const { error } = await svc
 .from('menu_items')
 .update(update)
 .eq('id', body.id)
 .eq('user_id', auth.userId)

 if (error) return NextResponse.json({ ok: false, error: 'update_failed', message: error.message }, { status: 500 })
 return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const id = req.nextUrl.searchParams.get('id')
 if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })

 const svc = createServiceClient()
 const { error } = await svc
 .from('menu_items')
 .update({ active: false, updated_at: new Date().toISOString() })
 .eq('id', id)
 .eq('user_id', auth.userId)

 if (error) return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 })
 return NextResponse.json({ ok: true })
}
