// app/api/threads/posts/[id]/publish/route.ts
// 포스트 즉시 발행 트리거 (BullMQ enqueue)
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { id } = await params

  const { data: post } = await svc
    .from('threads_posts')
    .select('status')
    .eq('id', id)
    .eq('user_id', auth.userId)
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
    userId: auth.userId,
    storeId: auth.userId,
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
