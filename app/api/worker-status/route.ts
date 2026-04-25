// app/api/worker-status/route.ts — 37차-5 Worker 큐 상태 확인
// 43차-3: 관리자 전용 (큐 깊이 노출이 DoS 타게팅·내부 정보 누출 위험)
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })
  }

  const url = process.env.REDIS_URL
  if (!url) {
    return NextResponse.json({ ok: false, error: 'REDIS_URL 환경변수 없음' }, { status: 503 })
  }

  try {
    const { Queue } = await import('bullmq')
    const IORedis = (await import('ioredis')).default

    const conn = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000,
      lazyConnect: true,
    })

    await Promise.race([
      conn.connect(),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('connect timeout')), 5000)),
    ])

    const q = new Queue('platform-jobs', { connection: conn })

    const counts = await Promise.race([
      q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('query timeout')), 5000)),
    ])

    await q.close()
    await conn.quit().catch(() => null)

    return NextResponse.json({ ok: true, queue: 'platform-jobs', counts })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 503 })
  }
}
