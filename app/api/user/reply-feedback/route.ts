// app/api/user/reply-feedback/route.ts
// ============================================================
// v38: AI 답글 피드백 (좋아요/싫어요/수정함) 저장 + 학습 데이터 조회
//
// POST { review_id, feedback: 'good'|'bad'|'edited', reason?, edited_reply? }
// GET  → 사장님 본인의 톤별 만족도
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: any = {}
  try { body = await req.json() } catch {}

  const reviewId = String(body?.review_id || '').trim()
  const feedback = String(body?.feedback || '').trim()
  const reason = String(body?.reason || '').slice(0, 500) || null
  const editedReply = String(body?.edited_reply || '').slice(0, 2000) || null

  if (!reviewId) return NextResponse.json({ ok: false, error: 'review_id 필수' }, { status: 400 })
  if (!['good', 'bad', 'edited'].includes(feedback)) {
    return NextResponse.json({ ok: false, error: 'feedback 은 good/bad/edited' }, { status: 400 })
  }

  const svc = createServiceClient()

  // 리뷰 정보 조회
  const { data: review } = await svc
    .from('platform_reviews')
    .select('platform, platform_review_id, draft_reply, reply_content, content, rating, reply_tone')
    .eq('id', reviewId)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (!review) return NextResponse.json({ ok: false, error: '리뷰 없음 또는 권한 없음' }, { status: 404 })

  const { error } = await svc.from('reply_feedback').insert({
    user_id: auth.userId,
    platform: review.platform,
    platform_review_id: review.platform_review_id,
    draft_reply: review.draft_reply,
    edited_reply: editedReply || review.reply_content,
    feedback,
    tone: review.reply_tone,
    reason,
    review_content: review.content,
    rating: review.rating,
  })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, feedback })
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data } = await svc
    .from('reply_feedback')
    .select('feedback, tone, reason')
    .eq('user_id', auth.userId)
    .limit(2000)

  // 톤별 통계
  const byTone: Record<string, { good: number; bad: number; edited: number; total: number }> = {}
  for (const r of (data || [])) {
    const tone = r.tone || 'unknown'
    if (!byTone[tone]) byTone[tone] = { good: 0, bad: 0, edited: 0, total: 0 }
    byTone[tone].total++
    if (r.feedback === 'good') byTone[tone].good++
    if (r.feedback === 'bad') byTone[tone].bad++
    if (r.feedback === 'edited') byTone[tone].edited++
  }

  // 최근 싫어요 사유
  const recentReasons = (data || [])
    .filter(r => r.feedback === 'bad' && r.reason)
    .slice(-10)
    .map(r => r.reason)

  // 추천 톤 (good 비율 가장 높은 것)
  let recommendedTone: string | null = null
  let bestRatio = 0
  for (const [tone, stats] of Object.entries(byTone)) {
    if (stats.total < 3) continue
    const ratio = stats.good / stats.total
    if (ratio > bestRatio) {
      bestRatio = ratio
      recommendedTone = tone
    }
  }

  return NextResponse.json({
    ok: true,
    total_feedback: data?.length || 0,
    by_tone: Object.entries(byTone).map(([tone, stats]) => ({
      tone,
      ...stats,
      good_ratio: stats.total > 0 ? Math.round((stats.good / stats.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total),
    recent_bad_reasons: recentReasons,
    recommended_tone: recommendedTone,
  })
}
