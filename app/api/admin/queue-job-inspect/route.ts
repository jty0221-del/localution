// app/api/admin/queue-job-inspect/route.ts
// ============================================================
// 관리자: BullMQ 잡 전체 inspect (completed/failed/waiting 사라진 잡 추적)
//
// GET ?jobId=6835  → 특정 잡 상태 확인
// GET ?platform=naver_place  → 해당 플랫폼 최근 잡 inspect
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  const platform = searchParams.get('platform')

  const q = getPlatformQueue()

  // 특정 jobId 직접 조회
  if (jobId) {
    const job = await q.getJob(jobId)
    if (!job) {
      return NextResponse.json({ ok: true, found: false, message: `jobId ${jobId} 못 찾음 (already cleaned 또는 잘못된 ID)` })
    }
    const state = await job.getState()
    return NextResponse.json({
      ok: true,
      found: true,
      jobId,
      state,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
    })
  }

  // 플랫폼별 최근 잡 종합 inspect
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    q.getWaiting(0, 50),
    q.getActive(0, 50),
    q.getCompleted(0, 30),
    q.getFailed(0, 30),
    q.getDelayed(0, 50),
  ])

  function summarize(jobs: any[], state: string) {
    return jobs
      .filter(j => !platform || j.data?.platform === platform)
      .slice(0, 10)
      .map(j => ({
        id: j.id,
        state,
        platform: j.data?.platform,
        action: j.data?.action,
        userId: String(j.data?.userId || '').slice(0, 12) + '...',
        platform_review_id: j.data?.payload?.platform_review_id,
        timestamp: j.timestamp,
        processedOn: j.processedOn,
        finishedOn: j.finishedOn,
        failedReason: String(j.failedReason || '').slice(0, 200),
        returnvalue: j.returnvalue,
      }))
  }

  return NextResponse.json({
    ok: true,
    platform: platform || 'all',
    counts: {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    },
    waiting: summarize(waiting, 'waiting'),
    active: summarize(active, 'active'),
    completed: summarize(completed, 'completed'),
    failed: summarize(failed, 'failed'),
  })
}
