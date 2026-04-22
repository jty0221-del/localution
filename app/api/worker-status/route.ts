// app/api/worker-status/route.ts
// ============================================================
// 37차-4 · Worker 큐 상태 확인 (디버깅용)
//   GET /api/worker-status → waiting/active/completed/failed count
// ============================================================
import { NextResponse } from 'next/server'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const q = getPlatformQueue()
    const statsPromise = Promise.all([
      q.getWaitingCount(),
      q.getActiveCount(),
      q.getCompletedCount(),
      q.getFailedCount(),
      q.getDelayedCount(),
    ])
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis query timeout (5s)')), 5_000),
    )
    const [waiting, active, completed, failed, delayed] = await Promise.race([
      statsPromise,
      timeout,
    ])
    return NextResponse.json({
      ok: true,
      queue: 'platform-jobs',
      counts: { waiting, active, completed, failed, delayed },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 503 },
    )
  }
}
