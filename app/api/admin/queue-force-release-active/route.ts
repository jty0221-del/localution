// app/api/admin/queue-force-release-active/route.ts
// ============================================================
// 관리자: active 상태로 hang 된 잡 강제 해제
//   · worker 가 처리 중이라고 잘못 마킹 (lock 무한 갱신 중) → slot 점유
//   · job.moveToFailed() 로 강제 failed 처리 → slot 즉시 해제
//   · worker 가 priority 1 잡 (post_reply) 바로 pickup 가능
//
// GET ?action_filter=fetch_reviews&dry=1  → dry-run
// GET ?action_filter=fetch_reviews        → 실제 해제
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const actionFilter = searchParams.get('action_filter') || 'fetch_reviews'
  const dry = searchParams.get('dry') === '1'

  const q = getPlatformQueue() as any
  const active = await q.getActive(0, 50)

  const targets = active.filter((j: any) =>
    !actionFilter || j.data?.action === actionFilter
  )

  const sample = targets.slice(0, 10).map((j: any) => ({
    id: j.id,
    platform: j.data?.platform,
    action: j.data?.action,
    userId: String(j.data?.userId || '').slice(0, 12) + '...',
    processedOn_ago_sec: j.processedOn ? Math.round((Date.now() - j.processedOn) / 1000) : null,
  }))

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      active_total: active.length,
      targets_count: targets.length,
      sample,
    })
  }

  // moveToFailed 또는 remove 시도 — active 상태 강제 해제
  let released = 0
  const errors: string[] = []
  for (const j of targets) {
    try {
      // moveToFailed 가 정석 — worker 의 token 모름 시 force remove
      try {
        await j.moveToFailed(new Error('Force-released by admin: stalled-like state'), '0', false)
        released++
      } catch (innerErr: any) {
        // moveToFailed 실패 시 직접 제거
        await j.remove()
        released++
      }
    } catch (e: any) {
      errors.push(`${j.id}: ${e?.message?.slice(0, 80)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    active_total: active.length,
    targets_count: targets.length,
    released,
    errors: errors.slice(0, 10),
    triggered_by: admin.email,
    message: `${released}개 active 잡 강제 해제. worker 가 곧 priority 1 잡 pickup 시작.`,
  })
}
