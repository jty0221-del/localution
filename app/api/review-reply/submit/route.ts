// app/api/review-reply/submit/route.ts
// ============================================================
// 30차-21 · "이대로 등록하기" → Worker 큐 등록
//
//   POST /api/review-reply/submit
//     body: { review_id: string }
//     → platform_reviews.reply_status='queued' + reply_queued_at=now()
//     → Railway Worker (23차-4 NaverPlaceAdapter) 가 polling 으로 픽업해서 실제 submit
//
//   조건:
//     - 본인 소유 리뷰
//     - draft_reply 가 비어있지 않음
//     - 현재 reply_status 가 'none' 또는 'draft' 또는 'failed' 일 때만 재큐잉 가능
//     - has_reply=true (이미 답글 달림) 이면 거부
//
//   응답:
//     { ok: true, review_id, reply_status: 'queued', reply_queued_at, note }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

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
      .select('id, user_id, platform, has_reply, draft_reply, reply_status')
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

    // 현재 네이버 어댑터는 Worker stub 상태 (23차-4 미완) → 사용자에게 투명하게 알림
    const note =
      row.platform === 'naver_place'
        ? 'Worker 대기열에 등록됐어요. 네이버 어댑터(23차-4)가 완성되면 자동 등록이 시작됩니다.'
        : '큐에 등록됐어요. Worker 가 처리할 때까지 기다려 주세요.'

    return NextResponse.json({
      ok: true,
      review_id: reviewId,
      reply_status: upd?.reply_status ?? 'queued',
      reply_queued_at: upd?.reply_queued_at ?? queuedAt,
      platform: upd?.platform ?? row.platform,
      note,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: '예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }
}
