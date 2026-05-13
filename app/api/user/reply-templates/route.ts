// app/api/user/reply-templates/route.ts
// ============================================================
// v38: 답글 템플릿 CRUD
//   GET    → 본인 템플릿 목록
//   POST   → 추가
//   PATCH  → 수정
//   DELETE → 삭제
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
    .from('reply_templates')
    .select('id, label, body, trigger_keywords, rating_match, use_count, is_pinned, created_at')
    .eq('user_id', auth.userId)
    .order('is_pinned', { ascending: false })
    .order('use_count', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, templates: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: any = {}
  try { body = await req.json() } catch {}
  const label = String(body?.label || '').trim().slice(0, 50)
  const text = String(body?.body || '').trim().slice(0, 1000)
  const trigger = Array.isArray(body?.trigger_keywords) ? body.trigger_keywords.slice(0, 10).map((k: any) => String(k).slice(0, 30)) : []
  const ratingMatch = body?.rating_match ? Math.min(5, Math.max(1, parseInt(body.rating_match, 10))) : null
  const isPinned = !!body?.is_pinned

  if (!label || !text) return NextResponse.json({ ok: false, error: 'label / body 필수' }, { status: 400 })

  const svc = createServiceClient()
  const { data, error } = await svc.from('reply_templates').insert({
    user_id: auth.userId,
    label,
    body: text,
    trigger_keywords: trigger.length > 0 ? trigger : null,
    rating_match: ratingMatch,
    is_pinned: isPinned,
  }).select().single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, template: data })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: any = {}
  try { body = await req.json() } catch {}
  const id = String(body?.id || '').trim()
  if (!id) return NextResponse.json({ ok: false, error: 'id 필수' }, { status: 400 })

  const patch: any = { updated_at: new Date().toISOString() }
  if (typeof body.label === 'string') patch.label = body.label.trim().slice(0, 50)
  if (typeof body.body === 'string') patch.body = body.body.trim().slice(0, 1000)
  if (Array.isArray(body.trigger_keywords)) patch.trigger_keywords = body.trigger_keywords.slice(0, 10)
  if (body.rating_match !== undefined) patch.rating_match = body.rating_match ? Math.min(5, Math.max(1, parseInt(body.rating_match, 10))) : null
  if (typeof body.is_pinned === 'boolean') patch.is_pinned = body.is_pinned
  if (typeof body.increment_use === 'boolean' && body.increment_use) {
    // RPC 없이 직접 처리: 현재값 + 1
    const svc = createServiceClient()
    const { data } = await svc.from('reply_templates').select('use_count').eq('id', id).eq('user_id', auth.userId).maybeSingle()
    patch.use_count = (data?.use_count || 0) + 1
  }

  const svc = createServiceClient()
  const { error } = await svc.from('reply_templates').update(patch).eq('id', id).eq('user_id', auth.userId)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id) return NextResponse.json({ ok: false, error: 'id 필수' }, { status: 400 })

  const svc = createServiceClient()
  const { error } = await svc.from('reply_templates').delete().eq('id', id).eq('user_id', auth.userId)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
