// app/api/admin/queue-status/route.ts
// ============================================================
// BullMQ 큐 상태 확인 (post_reply 처리 안 되는 문제 진단)
//   GET → { active, waiting, delayed, failed, completed, post_reply_count }
//   · 사장님 화면에서 "답글 발행 안 됨" 진단 시 호출
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  try {
    const q = getPlatformQueue()
    const counts = await q.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed')

    // 대기 중인 job 의 platform/action 분포
    const waiting = await q.getWaiting(0, 50)
    const active = await q.getActive(0, 5)
    const delayed = await q.getDelayed(0, 50)
    const failed = await q.getFailed(0, 10)

    const breakdown = (jobs: any[]) => {
      const dist: Record<string, number> = {}
      for (const j of jobs) {
        const key = `${j.data?.platform}:${j.data?.action}`
        dist[key] = (dist[key] || 0) + 1
      }
      return dist
    }

    // 사장님 자신의 job 만 필터
    const myWaiting = waiting.filter((j: any) => j.data?.userId === auth.userId)
    const myActive = active.filter((j: any) => j.data?.userId === auth.userId)
    const myFailed = failed.filter((j: any) => j.data?.userId === auth.userId)

    return NextResponse.json({
      ok: true,
      counts,
      waiting_breakdown: breakdown(waiting),
      active_breakdown: breakdown(active),
      my_jobs: {
        waiting: myWaiting.length,
        active: myActive.length,
        failed: myFailed.length,
        waiting_detail: myWaiting.slice(0, 10).map((j: any) => ({
          id: j.id,
          platform: j.data?.platform,
          action: j.data?.action,
          priority: j.opts?.priority,
          delay: j.opts?.delay,
          ts: j.timestamp,
        })),
        failed_detail: myFailed.slice(0, 5).map((j: any) => ({
          id: j.id,
          action: j.data?.action,
          failedReason: String(j.failedReason || '').slice(0, 200),
          attemptsMade: j.attemptsMade,
        })),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'queue check failed' }, { status: 500 })
  }
}
