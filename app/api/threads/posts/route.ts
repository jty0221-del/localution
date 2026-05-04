// app/api/threads/posts/route.ts
// Threads 포스트 목록 조회 / 신규 생성
import { NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const userId = auth.userId ?? auth.email
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(Number(searchParams.get('limit') || '20'), 100)
  const offset = Number(searchParams.get('offset') || '0')

  const svc = createServiceClient()
  let query = svc
    .from('threads_posts')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, posts: data ?? [], total: count ?? 0 })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const userId = auth.userId ?? auth.email
  const body = await request.json() as {
    text_content?: string
    hashtags?: string[]
    image_url?: string
    scheduled_at?: string
    source?: string
    card_news_topic?: string
  }

  if (!body.text_content?.trim()) {
    return NextResponse.json({ error: '본문을 입력해주세요.' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Threads 계정 연결 여부 확인
  const { data: account } = await svc
    .from('threads_accounts')
    .select('threads_user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!account) {
    return NextResponse.json({ error: 'Threads 계정이 연결되지 않았습니다.' }, { status: 400 })
  }

  const mediaType = body.image_url ? 'IMAGE' : 'TEXT'
  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null
  const isImmediate = !scheduledAt || scheduledAt <= new Date()

  const { data: post, error: insertErr } = await svc
    .from('threads_posts')
    .insert({
      user_id: userId,
      text_content: body.text_content.trim(),
      hashtags: body.hashtags ?? [],
      image_url: body.image_url ?? null,
      media_type: mediaType,
      status: isImmediate ? 'publishing' : 'scheduled',
      scheduled_at: scheduledAt?.toISOString() ?? null,
      source: body.source ?? 'manual',
      card_news_topic: body.card_news_topic ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !post) {
    return NextResponse.json({ error: insertErr?.message || 'DB 오류' }, { status: 500 })
  }

  if (isImmediate) {
    await enqueuePlatformJob({
      platform: 'threads',
      action: 'threads_publish',
      userId,
      storeId: userId,
      payload: { post_id: post.id },
    }, { priority: 1 })
  }

  return NextResponse.json({ ok: true, post_id: post.id, immediate: isImmediate })
}
