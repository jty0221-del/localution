// app/api/threads/posts/[id]/route.ts
// 포스트 수정 / 삭제
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_EMAIL = 'jty0221@gmail.com'

async function getOwnerUserId(svc: ReturnType<typeof createServiceClient>): Promise<string> {
  const { data } = await svc
    .from('stores')
    .select('user_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.user_id || OWNER_EMAIL
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const svc = createServiceClient()
  const userId = await getOwnerUserId(svc)
  const { id } = await params

  const { data: existing } = await svc
    .from('threads_posts')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: '포스트를 찾을 수 없습니다.' }, { status: 404 })
  if (!['draft', 'scheduled'].includes(existing.status)) {
    return NextResponse.json({ error: `${existing.status} 상태는 수정할 수 없습니다.` }, { status: 400 })
  }

  const body = await request.json() as {
    text_content?: string
    hashtags?: string[]
    image_url?: string
    scheduled_at?: string | null
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.text_content !== undefined) updates.text_content = body.text_content.trim()
  if (body.hashtags !== undefined) updates.hashtags = body.hashtags
  if (body.image_url !== undefined) updates.image_url = body.image_url || null
  if (body.scheduled_at !== undefined) {
    updates.scheduled_at = body.scheduled_at ? new Date(body.scheduled_at).toISOString() : null
  }
  if (body.image_url !== undefined) {
    updates.media_type = body.image_url ? 'IMAGE' : 'TEXT'
  }

  const { error } = await svc.from('threads_posts').update(updates).eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const svc = createServiceClient()
  const userId = await getOwnerUserId(svc)
  const { id } = await params

  const { data: existing } = await svc
    .from('threads_posts')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: '포스트를 찾을 수 없습니다.' }, { status: 404 })
  if (existing.status === 'published') {
    return NextResponse.json({ error: '발행된 포스트는 삭제할 수 없습니다.' }, { status: 400 })
  }

  await svc.from('threads_posts').delete().eq('id', id).eq('user_id', userId)
  return NextResponse.json({ ok: true })
}
