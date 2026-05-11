// app/api/admin/queue-enqueue-test/route.ts
// ============================================================
// 진단: enqueuePlatformJob → 즉시 getJob() 으로 실재 여부 확인
//   · BullMQ silent drop 가설 검증
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const startedAt = Date.now()

  // 1) 가짜 테스트 잡 enqueue (실제 처리 안 되도록 platform='kakao_map' + action 사용)
  //    payload 에 noop 마커 추가 → 워커가 받아도 skip
  const fakeJobId = `enqueue-test-${Date.now()}`
  const enq = await enqueuePlatformJob({
    platform: 'naver_place',
    action: 'post_reply',
    userId: '__ENQUEUE_TEST__',
    storeId: '0000000000',
    payload: {
      platform_review_id: '__test_only__',
      reply_text: 'test',
      _noop: true,
    },
  }, { jobId: fakeJobId, priority: 1 })

  const enqueueElapsed = Date.now() - startedAt

  if (!enq.ok) {
    return NextResponse.json({
      ok: false,
      step: 'enqueue_failed',
      error: enq.error,
      enqueue_ms: enqueueElapsed,
    })
  }

  // 2) 즉시 getJob — 잡이 실제로 Redis 에 들어갔는지 확인
  const q = getPlatformQueue()
  const job = await q.getJob(enq.jobId)
  const lookupElapsed = Date.now() - startedAt

  // 3) 큐 카운트
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
    q.getDelayedCount(),
  ])

  // 4) 정리: 테스트 잡 제거
  let removed = false
  try {
    if (job) {
      await job.remove()
      removed = true
    }
  } catch (e) {}

  return NextResponse.json({
    ok: true,
    enqueue_returned: enq,
    enqueue_ms: enqueueElapsed,
    job_found_immediately: !!job,
    job_state: job ? await job.getState() : null,
    lookup_ms: lookupElapsed,
    queue_counts: { waiting, active, completed, failed, delayed },
    removed,
    diagnosis: !job
      ? 'BullMQ SILENT DROP — enqueuePlatformJob 가 jobId 반환하지만 Redis 에 잡 없음. Vercel↔Redis 연결 또는 BullMQ 버전 문제.'
      : 'BullMQ 정상 — 잡이 enqueue 되어 Redis 에 존재. 워커가 받지 못하는 문제는 다른 곳.',
  })
}
