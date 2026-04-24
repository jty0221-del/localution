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
    if (!['none', 'draft', 'failed', 'queued'].includes(String(row.reply_status ?? 'none'))) {
      return NextResponse.json(
        {
          ok: false,
          error: `현재 상태(${row.reply_status})에서는 재등록할 수 없어요`,
        },
        { status: 409 },
      )
    }

    const submittedAt = new Date().toISOString()
    const { data: upd, error: updErr } = await svc
      .from('platform_reviews')
      .update({
        reply_status: 'submitted',
        reply_submitted_at: submittedAt,
        reply_queued_at: submittedAt,
        reply_error: null,
      })
      .eq('id', reviewId)
      .eq('user_id', userId)
      .select('id, reply_status, reply_submitted_at, platform')
      .maybeSingle()

    if (updErr) {
      return NextResponse.json({ ok: false, error: '발행 처리 실패: ' + updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      review_id: reviewId,
      reply_status: upd?.reply_status ?? 'submitted',
      reply_submitted_at: upd?.reply_submitted_at ?? submittedAt,
      platform: upd?.platform ?? row.platform,
      note: '발행 처리됐어요. 클립보드에 복사된 답글을 플랫폼에 붙여넣기 해주세요.',
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: '예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }
}
