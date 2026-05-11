// app/api/admin/force-publish-reply/route.ts
// ============================================================
// 관리자: 특정 리뷰의 답글을 강제로 worker 큐에 발행
//   · review_id 입력 → DB 의 draft_reply 사용
//   · platform_credentials / stores 어디서든 storeId 찾아 enqueue
//   · 결과: 큐 등록 성공/실패 + jobId 즉시 반환
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const reviewId = searchParams.get('review_id') || ''
  if (!reviewId) return NextResponse.json({ ok: false, error: 'review_id 필수' }, { status: 400 })

  const svc = createServiceClient()
  const { data: row } = await svc
    .from('platform_reviews')
    .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, reply_status, has_reply')
    .eq('id', reviewId)
    .maybeSingle()

  if (!row) return NextResponse.json({ ok: false, error: '리뷰 없음' }, { status: 404 })
  if (!row.draft_reply) return NextResponse.json({ ok: false, error: '초안 없음 (draft_reply 비어있음)' }, { status: 400 })

  // 매장 ID 찾기 — 어디서든 가능
  let storeId = row.platform_store_id || ''
  let extraData: any = null
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('platform_store_id, extra_data')
    .eq('user_id', row.user_id).eq('platform', row.platform).maybeSingle()
  if (cred) {
    storeId = storeId || cred.platform_store_id || ''
    extraData = cred.extra_data
  }
  if (!storeId && row.platform === 'naver_place') {
    const { data: storeRow } = await svc
      .from('stores').select('naver_place_id')
      .eq('user_id', row.user_id).limit(1).maybeSingle()
    storeId = storeRow?.naver_place_id || ''
  }

  if (!storeId) {
    return NextResponse.json({ ok: false, error: '매장 ID 못 찾음 — platform_credentials / stores 모두 없음' }, { status: 400 })
  }

  // enqueue
  const bizId = row.platform === 'naver_place' && extraData?.smartplace_biz_id ? String(extraData.smartplace_biz_id) : undefined
  const jobPayload: Record<string, string> = {
    platform_review_id: row.platform_review_id,
    reply_text: String(row.draft_reply),
  }
  if (bizId) jobPayload.biz_id = bizId
  if (row.platform === 'baemin' && row.platform_store_id) jobPayload.shop_no = String(row.platform_store_id)

  const enq = await enqueuePlatformJob({
    platform: row.platform as any,
    action: 'post_reply',
    userId: row.user_id,
    storeId: String(storeId),
    payload: jobPayload,
  }, { priority: 1 })

  if (!enq.ok) {
    return NextResponse.json({ ok: false, error: '큐 등록 실패: ' + enq.error })
  }

  await svc.from('platform_reviews')
    .update({ reply_status: 'queued', reply_queued_at: new Date().toISOString(), reply_error: null })
    .eq('id', reviewId)

  return NextResponse.json({
    ok: true,
    jobId: enq.jobId,
    platform: row.platform,
    user_id: row.user_id.slice(0, 12) + '...',
    store_id: storeId,
    review_id: row.platform_review_id,
    triggered_by: admin.email,
    message: `${row.platform} post_reply 큐 등록 완료. Worker 가 1~2분 내 처리.`,
  })
}
