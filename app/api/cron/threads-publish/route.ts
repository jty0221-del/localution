// app/api/cron/threads-publish/route.ts
// 예약 발행 cron — 매분 실행, scheduled_at 도달한 포스트를 BullMQ에 투입
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function isCronAuthorized(req: Request): boolean {
 const secret = process.env.CRON_SECRET
 if (!secret) return true
 const auth = req.headers.get('authorization') || ''
 return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
 if (!isCronAuthorized(req)) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const svc = createServiceClient()

 const { data: duePosts, error } = await svc
 .from('threads_posts')
 .select('id, user_id')
 .eq('status', 'scheduled')
 .lte('scheduled_at', new Date().toISOString())
 .lt('retry_count', 3)
 .limit(50)

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 })
 }

 if (!duePosts || duePosts.length === 0) {
 return NextResponse.json({ ok: true, count: 0 })
 }

 // status='publishing' 으로 즉시 업데이트 (다음 cron tick에 중복 enqueue 방지)
 const ids = duePosts.map(p => p.id)
 await svc
 .from('threads_posts')
 .update({ status: 'publishing', updated_at: new Date().toISOString() })
 .in('id', ids)

 // BullMQ에 투입
 let enqueued = 0
 for (const post of duePosts) {
 const result = await enqueuePlatformJob({
 platform: 'threads',
 action: 'threads_publish',
 userId: post.user_id,
 storeId: post.user_id,
 payload: { post_id: post.id },
 }, { priority: 1 })

 if (result.ok) {
 enqueued++
 } else {
 // enqueue 실패 시 failed 로 복귀
 await svc
 .from('threads_posts')
 .update({
 status: 'failed',
 error_message: `enqueue failed: ${result.error}`,
 updated_at: new Date().toISOString(),
 })
 .eq('id', post.id)
 }
 }

 return NextResponse.json({ ok: true, count: enqueued })
}
