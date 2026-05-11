// app/api/admin/retry-queued-replies/route.ts
// ============================================================
// 관리자: queued 상태로 멈춰있는 답글 일괄 재시도
//   · platform_reviews.reply_status='queued' && reply_queued_at > N분 전
//   · BullMQ 큐 작업이 사라졌거나 worker 가 처리 못 한 케이스 복구
//
// GET ?platform=naver_place&minutes=3
//   → queued 3분 초과 리뷰 모두 다시 post_reply 큐 등록
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_PLATFORMS: Platform[] = ['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'kakao_map']

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const platformFilter = searchParams.get('platform') || ''
  const minutes = Math.max(1, parseInt(searchParams.get('minutes') || '3', 10))
  const dryRun = searchParams.get('dry') === '1'

  const svc = createServiceClient()
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()

  let q = svc
    .from('platform_reviews')
    .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, reply_status, reply_queued_at, has_reply')
    .eq('reply_status', 'queued')
    .lte('reply_queued_at', cutoff)
    .order('reply_queued_at', { ascending: true })
    .limit(50)

  if (platformFilter && VALID_PLATFORMS.includes(platformFilter as Platform)) {
    q = q.eq('platform', platformFilter)
  }

  const { data: stuck, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!stuck || stuck.length === 0) {
    return NextResponse.json({ ok: true, found: 0, message: `${minutes}분 초과 queued 잡 없음 (정상)` })
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry: true,
      found: stuck.length,
      sample: stuck.slice(0, 10).map(r => ({
        id: r.id,
        platform: r.platform,
        user_id: r.user_id.slice(0, 12) + '...',
        queued_at: r.reply_queued_at,
        has_reply: r.has_reply,
      })),
    })
  }

  const results: any[] = []
  for (const r of stuck) {
    if (r.has_reply) {
      // 이미 답글 있는데 queued 잘못 마킹 → submitted 로 정정
      await svc.from('platform_reviews')
        .update({ reply_status: 'submitted', reply_submitted_at: new Date().toISOString() })
        .eq('id', r.id)
      results.push({ id: r.id, platform: r.platform, action: 'mark_submitted' })
      continue
    }

    if (!r.draft_reply || !String(r.draft_reply).trim()) {
      // 초안 없음 → none 으로 reset
      await svc.from('platform_reviews')
        .update({ reply_status: 'none' })
        .eq('id', r.id)
      results.push({ id: r.id, platform: r.platform, action: 'reset_none' })
      continue
    }

    // 자격증명 + extra 조회
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('platform_store_id, extra_data')
      .eq('user_id', r.user_id).eq('platform', r.platform).maybeSingle()

    if (!cred) {
      await svc.from('platform_reviews')
        .update({ reply_status: 'failed', reply_error: 'platform_credentials 없음 (재연결 필요)' })
        .eq('id', r.id)
      results.push({ id: r.id, platform: r.platform, action: 'mark_failed_no_cred' })
      continue
    }

    const storeId = r.platform_store_id || cred.platform_store_id || 'unknown'
    const extra = (cred.extra_data as any) || {}
    const bizId: string | undefined = r.platform === 'naver_place' ? (extra?.smartplace_biz_id || undefined) : undefined

    const jobPayload: Record<string, string> = {
      platform_review_id: r.platform_review_id,
      reply_text: String(r.draft_reply),
    }
    if (bizId) jobPayload.biz_id = bizId
    if (r.platform === 'baemin' && r.platform_store_id) {
      jobPayload.shop_no = String(r.platform_store_id)
    }

    const enq = await enqueuePlatformJob({
      platform: r.platform as Platform,
      action: 'post_reply',
      userId: r.user_id,
      storeId,
      payload: jobPayload,
    }, { priority: 1 })

    if (enq.ok) {
      await svc.from('platform_reviews')
        .update({ reply_queued_at: new Date().toISOString() })
        .eq('id', r.id)
      results.push({ id: r.id, platform: r.platform, action: 'requeued', jobId: enq.jobId })
    } else {
      results.push({ id: r.id, platform: r.platform, action: 'enqueue_failed', error: enq.error })
    }
  }

  const summary = results.reduce((acc: any, r: any) => {
    acc[r.action] = (acc[r.action] || 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    ok: true,
    found: stuck.length,
    processed: results.length,
    summary,
    sample: results.slice(0, 20),
    triggered_by: admin.email,
  })
}
