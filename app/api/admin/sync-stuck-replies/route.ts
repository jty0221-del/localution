// app/api/admin/sync-stuck-replies/route.ts
// ============================================================
// 관리자: DB-큐 동기화 — 오래된 queued 잡 정리
//   · BullMQ 에 실제 잡 없는데 DB 만 queued 상태인 케이스
//   · 1시간+ 정체 → failed 로 마킹 (사용자가 재시도 가능하게)
//
// GET ?platform=naver_place&min_hours=1&dry=1
//   dry=1 → 실행 X, 대상만 표시
//   dry=0 → 실제 update
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || ''
  const minHours = Math.max(1, parseInt(searchParams.get('min_hours') || '1', 10))
  const dry = searchParams.get('dry') !== '0'  // 기본 dry-run

  const svc = createServiceClient()
  const cutoff = new Date(Date.now() - minHours * 3600 * 1000).toISOString()

  let q = svc
    .from('platform_reviews')
    .select('id, user_id, platform, reply_status, reply_queued_at, has_reply, draft_reply')
    .eq('reply_status', 'queued')
    .lte('reply_queued_at', cutoff)
    .limit(500)
  if (platform) q = q.eq('platform', platform)
  const { data: stuck, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // BullMQ 큐의 active+waiting jobs 의 review_id 목록 (실제 처리 중인 것)
  let activeReviewIds = new Set<string>()
  try {
    const queue = getPlatformQueue()
    const [waiting, active] = await Promise.all([
      queue.getWaiting(0, 999),
      queue.getActive(0, 99),
    ])
    for (const j of [...waiting, ...active]) {
      const rid = j.data?.payload?.platform_review_id
      if (rid) activeReviewIds.add(String(rid))
    }
  } catch {}

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      found: stuck?.length || 0,
      active_in_queue: activeReviewIds.size,
      sample: (stuck || []).slice(0, 10).map((r: any) => ({
        id: r.id,
        platform: r.platform,
        user_id: r.user_id.slice(0, 12) + '...',
        queued_at: r.reply_queued_at,
        in_queue: false,  // 우리는 review_id 가 아닌 platform_review_id 비교
      })),
      hint: 'dry-run 모드. 실제 처리하려면 ?dry=0 추가',
    })
  }

  let updated = 0
  for (const r of (stuck || [])) {
    if (r.has_reply) {
      await svc.from('platform_reviews')
        .update({ reply_status: 'submitted', reply_submitted_at: new Date().toISOString() })
        .eq('id', r.id)
      updated++
      continue
    }
    await svc.from('platform_reviews')
      .update({
        reply_status: 'failed',
        reply_error: '큐 분실 — ' + minHours + '시간+ 정체 (자동 정리). 재시도 가능',
      })
      .eq('id', r.id)
    updated++
  }

  return NextResponse.json({
    ok: true,
    found: stuck?.length || 0,
    updated,
    triggered_by: admin.email,
    message: `${updated}건 정리 완료 (failed 마킹). 사용자가 [다시 시도] 버튼으로 재시도 가능`,
  })
}
