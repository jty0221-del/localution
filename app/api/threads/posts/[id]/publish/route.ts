// app/api/threads/posts/[id]/publish/route.ts
// 포스트 즉시 발행 트리거 (BullMQ enqueue)
import { NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const userId = auth.userId ?? auth.email
  const { id } = await params
  const svc = createServiceClient()

  const { data: post } = await svc
    .from('threads_posts')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!post) return NextResponse.json({ error: '포스트를 찾을 수 없습니다.' }, { status: 404 })
  if (!['draft', 'scheduled', 'failed'].includes(post.status)) {
    return NextResponse.json({ error: `${post.status} 상태는 발행할 수 없습니다.` }, { status: 400 })
  }

  await svc
    .from('threads_posts')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', id)

  const result = await enqueuePlatformJob({
    platform: 'threads',
    action: 'threads_publish',
    userId,
    storeId: userId,
    payload: { post_id: id },
  }, { priority: 1 })

  if (!result.ok) {
    await svc
      .from('threads_posts')
      .update({ status: 'failed', error_message: result.error, updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, job_id: result.jobId })
}
