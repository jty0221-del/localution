// app/api/review-reply/submit/route.ts
// ============================================================
// 30차-21 · "이대로 등록하기" → Worker 큐 등록
// 36차   · BullMQ post_reply enqueue 전환
//
//   POST /api/review-reply/submit
//     body: { review_id: string }
//     → platform_reviews.reply_status='queued' + reply_queued_at=now()
//     → baemin/yogiyo/coupangeats: BullMQ post_reply 잡 즉시 enqueue
//     → naver_place/kakao_map: DB queued 만 (공개 수집기 경로 분리)
//
//   조건:
//     - 본인 소유 리뷰
//     - draft_reply 가 비어있지 않음
//     - 현재 reply_status 가 'none' 또는 'draft' 또는 'failed' 일 때만 재큐잉 가능
//     - has_reply=true (이미 답글 달림) 이면 거부
//
//   응답:
//     { ok: true, review_id, reply_status: 'queued', reply_queued_at, jobId?, note }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

const WORKER_REPLY_PLATFORMS: Platform[] = ['baemin', 'yogiyo', 'coupangeats']

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId

  let body: any = {}
  try { body = await req.json() } catch {}

  const reviewId = String(body?.review_id || '').trim()
  if (!reviewId) {
    return NextResponse.json({ ok: false, error: 'review_id 필요' }, { status: 400 })
  }

  try {
    const svc = createServiceClient()

    const { data: row, error: selErr } = await svc
      .from('platform_reviews')
      .select('id, user_id, platform, platform_review_id, has_reply, draft_reply, reply_status')
      .eq('id', reviewId)
      .maybeSingle()

    if (selErr) {
      return NextResponse.json({ ok: false, error: '리뷰 조회 실패: ' + selErr.message }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ ok: false, error: '리뷰 없음' }, { status: 404 })
    }
    if (row.user_id !== userId) {
      return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 403 })
    }
    if (row.has_reply) {
      return NextResponse.json(
        { ok: false, error: '이미 답글이 달린 리뷰예요' },
        { status: 409 },
      )
    }
    if (!row.draft_reply || !String(row.draft_reply).trim()) {
      return NextResponse.json(
        { ok: false, error: '먼저 초안을 저장해주세요' },
        { status: 400 },
      )
    }
    if (!['none', 'draft', 'failed'].includes(String(row.reply_status ?? 'none'))) {
      return NextResponse.json(
        {
          ok: false,
          error: `현재 상태(${row.reply_status})에서는 재등록할 수 없어요`,
        },
        { status: 409 },
      )
    }

    const queuedAt = new Date().toISOString()
    const { data: upd, error: updErr } = await svc
      .from('platform_reviews')
      .update({
        reply_status: 'queued',
        reply_queued_at: queuedAt,
        reply_error: null,
      })
      .eq('id', reviewId)
      .eq('user_id', userId)
      .select('id, reply_status, reply_queued_at, platform')
      .maybeSingle()

    if (updErr) {
      return NextResponse.json({ ok: false, error: '큐잉 실패: ' + updErr.message }, { status: 500 })
    }

    const platform = (upd?.platform ?? row.platform) as Platform
    let jobId: string | undefined
    let note: string

    // baemin/yogiyo/coupangeats: BullMQ post_reply 잡 즉시 enqueue
    if (WORKER_REPLY_PLATFORMS.includes(platform) && row.platform_review_id && row.draft_reply) {
      const enqResult = await enqueuePlatformJob(
        {
          platform,
          action: 'post_reply',
          userId,
          storeId: 'default',
          payload: {
            platform_review_id: String(row.platform_review_id),
            reply_text: String(row.draft_reply),
            review_db_id: reviewId,
          },
        },
        {
          jobId: `reply:${reviewId}`,
          priority: 1,
        },
      )

      if (enqResult.ok) {
        jobId = enqResult.jobId
        note = `Worker 에 답글 등록 요청을 전달했어요. 1~3분 안에 자동으로 ${platform} 에 등록됩니다. (jobId: ${jobId})`
      } else {
        // enqueue 실패 — DB 는 queued 상태로 유지, 사용자에게 안내
        console.error('[submit] enqueue failed:', enqResult.error)
        note = `큐에 등록됐지만 Worker 전달에 실패했어요 (${enqResult.error}). Worker 가 DB 에서 직접 픽업합니다.`
      }
    } else if (platform === 'naver_place') {
      note = '네이버 플레이스 자동 등록은 준비 중이에요. 지금은 "복사 → 스마트플레이스 직접 붙여넣기"로 등록해 주세요.'
    } else if (platform === 'kakao_map') {
      note = '카카오맵 자동 등록은 준비 중이에요.'
    } else {
      note = '큐에 등록됐어요. Worker 가 처리할 때까지 기다려 주세요.'
    }

    return NextResponse.json({
      ok: true,
      review_id: reviewId,
      reply_status: upd?.reply_status ?? 'queued',
      reply_queued_at: upd?.reply_queued_at ?? queuedAt,
      platform,
      jobId,
      note,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: '예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }
}
