// app/api/admin/naver-replies-status/route.ts
// ============================================================
// 관리자: 네이버 답글 상태 종합 진단
//   · DB 의 queued / submitted / failed 카운트
//   · BullMQ 큐 의 naver post_reply 잡 카운트
//   · 가장 오래된 queued 잡 5건 상세
//   · 최근 실패한 잡 5건 + 사유
// ============================================================
import { NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const svc = createServiceClient()
  const now = Date.now()

  // 1) DB 통계 — 네이버만
  const { data: rows } = await svc
    .from('platform_reviews')
    .select('id, user_id, reply_status, reply_queued_at, reply_submitted_at, reply_error, draft_reply, platform_review_id')
    .eq('platform', 'naver_place')
    .in('reply_status', ['queued', 'submitting', 'submitted', 'failed'])
    .order('reply_queued_at', { ascending: false })
    .limit(200)

  const dbStats: Record<string, number> = { queued: 0, submitting: 0, submitted: 0, failed: 0 }
  for (const r of (rows || [])) {
    const s = String(r.reply_status || '')
    if (dbStats[s] !== undefined) dbStats[s]++
  }

  // 2) 가장 오래된 queued / 가장 최근 failed
  const stuck = (rows || [])
    .filter(r => r.reply_status === 'queued' || r.reply_status === 'submitting')
    .map(r => ({
      id: r.id,
      user_id: r.user_id.slice(0, 12) + '...',
      platform_review_id: r.platform_review_id,
      reply_status: r.reply_status,
      queued_at: r.reply_queued_at,
      stuck_minutes: r.reply_queued_at ? Math.round((now - new Date(r.reply_queued_at).getTime()) / 60000) : null,
      has_draft: !!(r.draft_reply && String(r.draft_reply).trim()),
    }))
    .sort((a, b) => (a.queued_at || '').localeCompare(b.queued_at || ''))
    .slice(0, 10)

  const recentFailed = (rows || [])
    .filter(r => r.reply_status === 'failed' && r.reply_error)
    .map(r => ({
      id: r.id,
      user_id: r.user_id.slice(0, 12) + '...',
      platform_review_id: r.platform_review_id,
      reply_error: r.reply_error?.slice(0, 200),
    }))
    .slice(0, 10)

  // 3) BullMQ 큐 상태
  let queueState: any = { error: null }
  try {
    const q = getPlatformQueue()
    const waiting = await q.getWaiting(0, 200)
    const active = await q.getActive(0, 50)
    const failed = await q.getFailed(0, 30)
    const delayed = await q.getDelayed(0, 50)

    const naverWaiting = waiting.filter((j: any) => j.data?.platform === 'naver_place')
    const naverActive = active.filter((j: any) => j.data?.platform === 'naver_place')
    const naverFailed = failed.filter((j: any) => j.data?.platform === 'naver_place')

    queueState = {
      total_waiting: waiting.length,
      total_active: active.length,
      naver_waiting: naverWaiting.length,
      naver_active: naverActive.length,
      naver_failed: naverFailed.length,
      naver_waiting_sample: naverWaiting.slice(0, 5).map((j: any) => ({
        id: j.id,
        action: j.data?.action,
        priority: j.opts?.priority,
        ts: j.timestamp,
        age_minutes: Math.round((now - j.timestamp) / 60000),
      })),
      naver_failed_sample: naverFailed.slice(0, 5).map((j: any) => ({
        id: j.id,
        action: j.data?.action,
        attempts: j.attemptsMade,
        reason: String(j.failedReason || '').slice(0, 200),
      })),
    }
  } catch (e: any) {
    queueState = { error: e?.message || 'queue check failed' }
  }

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    db_stats: dbStats,
    stuck,
    recent_failed: recentFailed,
    queue: queueState,
    diagnosis: stuck.length > 0
      ? '네이버 큐에 ' + stuck.length + '건 정체. /admin/review-health 의 [답글 재시도] 클릭 → priority 1 로 재큐잉'
      : queueState.naver_waiting > 0
      ? '네이버 큐에 ' + queueState.naver_waiting + '건 대기 — 워커가 곧 처리'
      : '대기 잡 없음. 사용자가 클릭한 답글이 있다면 enqueue 자체 실패 가능성 (Vercel logs 확인)',
  })
}
