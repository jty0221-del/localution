// app/api/user/reply-history/route.ts
// ============================================================
// v38: 사장님 본인 답글 발행 history 검색
//   ?platform=naver_place&status=submitted&q=감사&days=30
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORM_LABELS: Record<string, string> = {
  naver_place: '네이버', kakao_map: '카카오', baemin: '배민',
  yogiyo: '요기요', coupangeats: '쿠팡', google: '구글',
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || ''
  const status = searchParams.get('status') || 'submitted'
  const q = (searchParams.get('q') || '').trim()
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get('days') || '30', 10)))
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '20', 10)))

  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

  const svc = createServiceClient()
  let query = svc
    .from('platform_reviews')
    .select('id, platform, platform_review_id, author_mask, content, rating, posted_at, reply_status, reply_content, reply_submitted_at, draft_reply, reply_error', { count: 'exact' })
    .eq('user_id', auth.userId)
    .gte('reply_submitted_at', since)
    .order('reply_submitted_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (platform) query = query.eq('platform', platform)
  if (status && status !== 'all') query = query.eq('reply_status', status)
  if (q) query = query.or(`content.ilike.%${q}%,reply_content.ilike.%${q}%,draft_reply.ilike.%${q}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    total: count || 0,
    offset,
    limit,
    items: (data || []).map(r => ({
      id: r.id,
      platform: r.platform,
      platform_label: PLATFORM_LABELS[r.platform] || r.platform,
      review_id: r.platform_review_id,
      author: r.author_mask || '익명',
      review_content: r.content,
      rating: r.rating,
      posted_at: r.posted_at,
      reply_status: r.reply_status,
      reply_content: r.reply_content || r.draft_reply,
      reply_at: r.reply_submitted_at,
      reply_error: r.reply_error,
    })),
  })
}
