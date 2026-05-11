// app/api/admin/queue-remove-stale/route.ts
// ============================================================
// 관리자: prioritized 의 stale 잡 제거 (1시간+ 묵은 priority 1 잡)
//   · 큐 블로킹 해소 — newer post_reply 가 빨리 처리되게
//
// GET ?max_age_hours=1  → 1시간+ 묵은 prioritized 제거
// GET ?dry=1  → 시뮬레이션
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const dry = searchParams.get('dry') === '1'
  const maxAgeHours = Math.max(0.5, parseFloat(searchParams.get('max_age_hours') || '1'))
  const cutoffMs = Date.now() - maxAgeHours * 3600 * 1000

  const q = getPlatformQueue() as any
  const prioritized = typeof q.getPrioritized === 'function'
    ? await q.getPrioritized(0, 999)
    : []

  const stale = prioritized.filter((j: any) => (j.timestamp || 0) < cutoffMs)
  const sample = stale.slice(0, 10).map((j: any) => ({
    id: j.id,
    platform: j.data?.platform,
    action: j.data?.action,
    userId: String(j.data?.userId || '').slice(0, 12) + '...',
    age_hours: Math.round((Date.now() - (j.timestamp || 0)) / 3600 / 1000 * 10) / 10,
  }))

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      total_prioritized: prioritized.length,
      stale_count: stale.length,
      cutoff_iso: new Date(cutoffMs).toISOString(),
      sample,
    })
  }

  let removed = 0
  for (const j of stale) {
    try { await j.remove(); removed++ } catch (_) {}
  }

  return NextResponse.json({
    ok: true,
    total_prioritized: prioritized.length,
    stale_found: stale.length,
    removed,
    triggered_by: admin.email,
    message: `${maxAgeHours}시간+ 묵은 prioritized 잡 ${removed}개 제거. 신규 priority 1 잡 더 빨리 처리됨.`,
  })
}
