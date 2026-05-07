// app/api/admin/queue-clear-failed/route.ts
// ============================================================
// 관리자: 큐의 모든 failed 잡 일괄 정리 (전체 사용자)
//
// GET ?platform=coupangeats (선택)
//   · platform 미지정 시 전체 platform failed 정리
//   · stalled active 도 함께 정리 (?force=1)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const url = new URL(req.url)
  const platformFilter = url.searchParams.get('platform') || ''
  const force = url.searchParams.get('force') === '1'

  const q = getPlatformQueue()
  const removed = { failed: 0, delayed: 0, active_force: 0 }
  const errors: string[] = []

  // 1) failed 모두 정리
  const failed = await q.getFailed(0, 999)
  for (const j of failed) {
    if (platformFilter && j.data?.platform !== platformFilter) continue
    try {
      await j.remove()
      removed.failed++
    } catch (e: any) {
      errors.push(`failed ${j.id}: ${e?.message}`)
    }
  }

  // 2) delayed 정리
  const delayed = await q.getDelayed(0, 999)
  for (const j of delayed) {
    if (platformFilter && j.data?.platform !== platformFilter) continue
    try {
      await j.remove()
      removed.delayed++
    } catch (e: any) {
      errors.push(`delayed ${j.id}: ${e?.message}`)
    }
  }

  // 3) ?force=1: active 도 정리 (stalled 의심)
  if (force) {
    const active = await q.getActive(0, 99)
    for (const j of active) {
      if (platformFilter && j.data?.platform !== platformFilter) continue
      try {
        await j.remove()
        removed.active_force++
      } catch (e: any) {
        errors.push(`active ${j.id}: ${e?.message}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    triggered_by: admin.email,
    platform_filter: platformFilter || 'all',
    removed,
    errors: errors.slice(0, 10),
    message: `failed ${removed.failed}개, delayed ${removed.delayed}개${force ? `, active ${removed.active_force}개` : ''} 정리 완료`,
  })
}
