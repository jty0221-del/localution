// app/api/review-reply/auto-publish/route.ts
// ============================================================
// 41차-10 · 리뷰 자동 발행 (Worker 큐 연동)
// 41차-12 fix: 자격증명 없으면 NO_CREDENTIALS 에러 반환 (수동 모드 제거)
//
//   POST /api/review-reply/auto-publish
//     body: { review_id: string }
//
//   로직:
//     1) 본인 소유 리뷰 + draft_reply 확인
//     2) platform_credentials 조회 → 연동 자격증명 있으면 Worker 모드
//     3) Worker 모드: BullMQ 'post_reply' 잡 enqueue → reply_status='queued'
//     4) 자격증명 없음: 422 NO_CREDENTIALS 반환 → UI에서 계정 연결 안내
//
//   응답:
//     { ok: true, mode: 'worker', reply_status, jobId, note }
//     { ok: false, code: 'NO_CREDENTIALS', error, connect_href }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId!

  let body: any = {}
  try { body = await req.json() } catch {}

  const reviewId = String(body?.review_id || '').trim()
  if (!reviewId) {
    return NextResponse.json({ ok: false, error: 'review_id 필요' }, { status: 400 })
  }

  try {
    const svc = createServiceClient()

    // 1) 리뷰 조회
    const { data: row, error: selErr } = await svc
      .from('platform_reviews')
      .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, has_reply, reply_status')
      .eq('id', reviewId)
      .maybeSingle()

    if (selErr) return NextResponse.json({ ok: false, error: '리뷰 조회 실패: ' + selErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ ok: false, error: '리뷰 없음' }, { status: 404 })
    if (row.user_id !== userId) return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 403 })
    if (row.has_reply) return NextResponse.json({ ok: false, error: '이미 답글이 달린 리뷰예요' }, { status: 409 })

    const draft = String(row.draft_reply || '').trim()
    if (!draft) return NextResponse.json({ ok: false, error: '먼저 초안을 저장해주세요' }, { status: 400 })

    if (['submitting'].includes(String(row.reply_status ?? 'none'))) {
      return NextResponse.json({ ok: false, error: `현재 처리 중(${row.reply_status})이에요. 잠시 후 다시 시도해주세요` }, { status: 409 })
    }

    // 2) 자격증명 확인 (Worker 자동 발행 가능 여부)
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('platform_store_id')
      .eq('user_id', userId)
      .eq('platform', row.platform)
      .maybeSingle()

    const hasCredentials = !!cred
    const storeId = row.platform_store_id || cred?.platform_store_id || null

    // REDIS_URL 없으면 항상 수동 모드
    const redisAvailable = !!process.env.REDIS_URL

    if (hasCredentials && redisAvailable) {
      // 43차-6: storeId 누락 시 enqueue 거부 — 워커가 /place/unknown/review 로 가는 걸 차단
      if (!storeId) {
        return NextResponse.json({
          ok: false,
          code: 'NO_STORE_ID',
          error: `${row.platform} 매장 ID가 등록되지 않았어요. 계정 연결 단계에서 매장을 선택해주세요.`,
          connect_href: `/my/platforms/${row.platform}/connect`,
        }, { status: 422 })
      }

      // ── 3) Worker 모드: BullMQ enqueue ─────────────────────
      const now = new Date().toISOString()
      const jobResult = await enqueuePlatformJob({
        platform: row.platform as any,
        action: 'post_reply',
        userId,
        storeId,
        payload: {
          platform_review_id: row.platform_review_id,
          reply_text: draft,
        },
      })

      if (!jobResult.ok) {
        // 큐 실패 → NO_CREDENTIALS 에러 반환 (수동 모드 없음)
        return NextResponse.json({
          ok: false,
          code: 'QUEUE_FAILED',
          error: `큐 등록 실패(${jobResult.error}). 잠시 후 다시 시도해주세요.`,
        }, { status: 500 })
      }

      // 큐 등록 성공 → reply_status='queued'
      await svc.from('platform_reviews')
        .update({ reply_status: 'queued', reply_queued_at: now, reply_error: null })
        .eq('id', reviewId).eq('user_id', userId)

      return NextResponse.json({
        ok: true,
        mode: 'worker',
        reply_status: 'queued',
        jobId: jobResult.jobId,
        note: 'Worker가 자동으로 답글을 등록해요. 잠시 후 새로고침하면 결과를 확인할 수 있어요.',
      })
    }

    // ── 4) 자격증명 없음 → 연결 필요 에러 반환 ───────────────────────
    return NextResponse.json({
      ok: false,
      code: 'NO_CREDENTIALS',
      error: `${row.platform} 계정이 연결되지 않았어요. 계정을 연결하면 자동으로 답글이 등록됩니다.`,
      connect_href: `/my/platforms/${row.platform}/connect`,
    }, { status: 422 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: '예외: ' + (e?.message ?? String(e)) }, { status: 500 })
  }
}
