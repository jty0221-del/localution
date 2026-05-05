// app/api/qr-codes/route.ts
// ============================================================
// 사장님 — QR 코드 CRUD
// GET /api/qr-codes → 본인 QR 코드 목록
// POST /api/qr-codes → 신규 QR 코드 생성
// PUT /api/qr-codes → QR 코드 수정 (id + 변경 필드)
// DELETE /api/qr-codes?id=xxx → 삭제 (hard delete)
// · localStorage(localution.qr_list) 대체
// · 본인 매장 QR만 접근
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
 const { data, error } = await svc
 .from('qr_codes')
 .select('id, name, purpose, review_url, scans, reviews, active, created_at, updated_at')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 .limit(500)

 if (error) return NextResponse.json({ ok: false, error: 'fetch_failed', message: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, qr_codes: data || [] })
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const name = String(body?.name || '').slice(0, 80).trim()
 const purpose = String(body?.purpose || 'review').slice(0, 30)
 const reviewUrl = body?.review_url ? String(body.review_url).slice(0, 500) : null

 if (!name) return NextResponse.json({ ok: false, error: 'missing_name' }, { status: 400 })

 const svc = createServiceClient()
 const { data, error } = await svc
 .from('qr_codes')
 .insert({
 user_id: auth.userId,
 name,
 purpose,
 review_url: reviewUrl,
 scans: 0,
 reviews: 0,
 active: true,
 })
 .select('id, name, purpose, review_url, scans, reviews, active, created_at')
 .single()

 if (error) return NextResponse.json({ ok: false, error: 'insert_failed', message: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, qr_code: data })
}

export async function PUT(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 if (!body?.id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })

 const update: any = {}
 if (body.name !== undefined) update.name = String(body.name).slice(0, 80)
 if (body.purpose !== undefined) update.purpose = String(body.purpose).slice(0, 30)
 if (body.review_url !== undefined) update.review_url = body.review_url ? String(body.review_url).slice(0, 500) : null
 if (body.scans !== undefined) update.scans = parseInt(String(body.scans), 10) || 0
 if (body.reviews !== undefined) update.reviews = parseInt(String(body.reviews), 10) || 0
 if (body.active !== undefined) update.active = !!body.active

 const svc = createServiceClient()
 const { error } = await svc
 .from('qr_codes')
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
 .from('qr_codes')
 .delete()
 .eq('id', id)
 .eq('user_id', auth.userId)

 if (error) return NextResponse.json({ ok: false, error: 'delete_failed', message: error.message }, { status: 500 })
 return NextResponse.json({ ok: true })
}
