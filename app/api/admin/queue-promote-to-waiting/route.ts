// app/api/admin/queue-promote-to-waiting/route.ts
// ============================================================
// 관리자: prioritized 의 naver post_reply 잡을 waiting 으로 변환
//   · worker 가 prioritized 우선순위 안 보는 버그 우회
//   · prioritized 잡 remove → q.add 로 no-priority 새 잡 생성 → waiting 진입
//
// GET ?platform=naver_place  → naver 만 변환
// GET ?dry=1                 → 시뮬레이션
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
  const platformFilter = searchParams.get('platform') || 'naver_place'
  const dry = searchParams.get('dry') === '1'

  const q = getPlatformQueue() as any
  const prioritized = typeof q.getPrioritized === 'function'
    ? await q.getPrioritized(0, 999)
    : []

  const targets = prioritized.filter((j: any) =>
    j.data?.platform === platformFilter &&
    j.data?.action === 'post_reply'
  )

  const sample = targets.slice(0, 10).map((j: any) => ({
    id: j.id,
    platform: j.data?.platform,
    action: j.data?.action,
    userId: String(j.data?.userId || '').slice(0, 12) + '...',
    review_id: j.data?.payload?.platform_review_id,
  }))

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      total_prioritized: prioritized.length,
      targets_count: targets.length,
      sample,
    })
  }

  let converted = 0
  const errors: string[] = []
  for (const j of targets) {
    try {
      const savedData = j.data
      const oldJobId = j.id
      // 1) 기존 prioritized 잡 제거
      await j.remove()
      // 2) 새 잡 추가 — 새 jobId (timestamp suffix) + priority 없음 → waiting 진입
      const newJobId = `wait_${savedData.platform}_${savedData.userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      await q.add(`${savedData.platform}:${savedData.action}`, savedData, {
        jobId: newJobId,
        // priority 의도적으로 안 줌 → waiting 리스트
      })
      converted++
    } catch (e: any) {
      errors.push(`${j.id}: ${e?.message?.slice(0, 80)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    total_prioritized: prioritized.length,
    targets_count: targets.length,
    converted,
    errors: errors.slice(0, 10),
    triggered_by: admin.email,
    message: `${converted}개 잡을 prioritized → waiting 으로 변환. worker 가 곧 pickup.`,
  })
}
