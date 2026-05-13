// app/api/user/negative-reviews/route.ts
// ============================================================
// v38: 미답변 부정 리뷰 (1~2점) 우선순위 큐
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORM_LABELS: Record<string, string> = {
  naver_place: '네이버',
  kakao_map: '카카오',
  baemin: '배민',
  yogiyo: '요기요',
  coupangeats: '쿠팡',
  google: '구글',
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()

  // 1~2점 미답변 우선
  const { data: critical } = await svc
    .from('platform_reviews')
    .select('id, platform, platform_store_id, platform_review_id, author_mask, rating, content, posted_at, draft_reply, reply_status')
    .eq('user_id', auth.userId)
    .eq('has_reply', false)
    .lte('rating', 2)
    .gte('rating', 1)
    .order('posted_at', { ascending: false })
    .limit(10)

  // 3점 미답변 (warning)
  const { data: warning } = await svc
    .from('platform_reviews')
    .select('id, platform, rating, content, posted_at, author_mask')
    .eq('user_id', auth.userId)
    .eq('has_reply', false)
    .eq('rating', 3)
    .order('posted_at', { ascending: false })
    .limit(5)

  const formatted = (critical || []).map(r => ({
    id: r.id,
    platform: r.platform,
    platform_label: PLATFORM_LABELS[r.platform] || r.platform,
    rating: r.rating,
    content_preview: (r.content || '').slice(0, 120),
    author: r.author_mask || '익명',
    posted_at: r.posted_at,
    has_draft: !!(r.draft_reply && String(r.draft_reply).trim()),
    review_admin_href: `/review-admin/${r.platform === 'naver_place' ? 'naver' : r.platform === 'kakao_map' ? 'kakao' : r.platform === 'coupangeats' ? 'coupang' : r.platform}`,
  }))

  return NextResponse.json({
    ok: true,
    critical_count: formatted.length,
    warning_count: warning?.length || 0,
    critical: formatted,
    warning_sample: (warning || []).slice(0, 3).map(r => ({
      platform: r.platform,
      platform_label: PLATFORM_LABELS[r.platform] || r.platform,
      rating: r.rating,
      content_preview: (r.content || '').slice(0, 60),
      posted_at: r.posted_at,
    })),
  })
}
