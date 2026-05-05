// app/api/review-reply/draft/route.ts
// ============================================================
// 30차-21 · 댓글 초안 저장 (생성 → 수정 → 이대로 등록 2단 플로우의 1단)
//
//   POST /api/review-reply/draft
//     body: { review_id: string, draft: string, tone?: 'warm'|'polite'|'formal' }
//     → platform_reviews 의 draft_reply / reply_status='draft' / reply_tone 업데이트
//     → 본인 user_id 행만 허용
//
//   응답:
//     { ok: true, review_id, reply_status: 'draft', draft_reply, reply_tone }
//     { ok: false, error, status }
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

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const reviewId = String(body?.review_id || '').trim()
  const draft = typeof body?.draft === 'string' ? body.draft.trim() : ''
  const tone = typeof body?.tone === 'string' ? body.tone : null

  if (!reviewId) {
    return NextResponse.json({ ok: false, error: 'review_id 필요' }, { status: 400 })
  }
  if (!draft) {
    return NextResponse.json({ ok: false, error: 'draft 비어있음' }, { status: 400 })
  }
  // v1.6y: 톤 추가 — apologetic (사과), grateful (감사), gourmand (미식), custom (맞춤)
  const VALID_TONES = ['warm', 'polite', 'formal', 'friendly', 'expert', 'witty', 'simple', 'emo', 'mz',
    'apologetic', 'grateful', 'gourmand', 'custom']
  if (tone && !VALID_TONES.includes(tone)) {
    return NextResponse.json({ ok: false, error: 'tone 값 오류' }, { status: 400 })
  }

  try {
    const svc = createServiceClient()

    // 본인 소유 리뷰인지 + 현재 상태 확인
    const { data: row, error: selErr } = await svc
      .from('platform_reviews')
      .select('id, user_id, reply_status, has_reply')
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
    // submitting 중에만 block (queued/submitted는 재생성 허용 — 직접 발행 플로우)
    if (['submitting'].includes(String(row.reply_status))) {
      return NextResponse.json(
        {
          ok: false,
          error: `현재 처리 중(${row.reply_status})이에요. 잠시 후 다시 시도해주세요`,
        },
        { status: 409 },
      )
    }

    const updates: Record<string, any> = {
      draft_reply: draft,
      reply_status: 'draft',
      reply_error: null,
    }
    if (tone) updates.reply_tone = tone

    const { data: upd, error: updErr } = await svc
      .from('platform_reviews')
      .update(updates)
      .eq('id', reviewId)
      .eq('user_id', userId)
      .select('id, draft_reply, reply_status, reply_tone')
      .maybeSingle()

    if (updErr) {
      return NextResponse.json({ ok: false, error: '저장 실패: ' + updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      review_id: reviewId,
      reply_status: upd?.reply_status ?? 'draft',
      draft_reply: upd?.draft_reply ?? draft,
      reply_tone: upd?.reply_tone ?? tone,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: '예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }
}
