// app/api/user/review-stats/route.ts
// ============================================================
// v38: 사장님 dashboard 답글 통계 위젯용 API
//   · 오늘/이번주/이번달/누적 답글 발행
//   · 미답변 / 평균 별점
//   · 플랫폼별 분포
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()

  const now = new Date()
  const todayKstStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStart = todayKstStart.toISOString()

  const weekStart = new Date(todayKstStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // 답글 발행 통계 (submitted 만 카운트)
  const [todayRes, weekRes, monthRes, totalRes] = await Promise.all([
    svc.from('platform_reviews').select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId).eq('reply_status', 'submitted')
      .gte('reply_submitted_at', todayStart),
    svc.from('platform_reviews').select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId).eq('reply_status', 'submitted')
      .gte('reply_submitted_at', weekStart.toISOString()),
    svc.from('platform_reviews').select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId).eq('reply_status', 'submitted')
      .gte('reply_submitted_at', monthStart.toISOString()),
    svc.from('platform_reviews').select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId).eq('reply_status', 'submitted'),
  ])

  // 미답변 리뷰
  const { count: unrepliedCount } = await svc
    .from('platform_reviews').select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId).eq('has_reply', false)

  // 별점 평균 (최근 30일)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { data: ratings } = await svc
    .from('platform_reviews')
    .select('rating, platform')
    .eq('user_id', auth.userId)
    .not('rating', 'is', null)
    .gte('posted_at', thirtyDaysAgo)
    .limit(2000)

  let avgRating: number | null = null
  let totalReviews = 0
  const byPlatform: Record<string, { count: number; rating_sum: number }> = {}
  for (const r of (ratings || [])) {
    if (typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5) {
      totalReviews++
      if (!byPlatform[r.platform]) byPlatform[r.platform] = { count: 0, rating_sum: 0 }
      byPlatform[r.platform].count++
      byPlatform[r.platform].rating_sum += r.rating
    }
  }
  if (totalReviews > 0) {
    const sum = Object.values(byPlatform).reduce((s, x) => s + x.rating_sum, 0)
    avgRating = Math.round((sum / totalReviews) * 10) / 10
  }

  const platformBreakdown: Array<{ platform: string; count: number; avg_rating: number | null }> = Object.entries(byPlatform).map(([p, v]) => ({
    platform: p,
    count: v.count,
    avg_rating: v.count > 0 ? Math.round((v.rating_sum / v.count) * 10) / 10 : null,
  })).sort((a, b) => b.count - a.count)

  // 부정 리뷰 (1-2점) 미답변
  const { count: negativeUnreplied } = await svc
    .from('platform_reviews').select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId).eq('has_reply', false)
    .lte('rating', 2).gte('rating', 1)

  // v38: Threads 자동발행 통계 (이번 달)
  let threadsStats: { this_month: number; all_time: number } | null = null
  try {
    const { count: threadsThisMonth } = await svc
      .from('threads_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('status', 'published')
      .gte('published_at', monthStart.toISOString())
    const { count: threadsAllTime } = await svc
      .from('threads_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('status', 'published')
    threadsStats = {
      this_month: threadsThisMonth || 0,
      all_time: threadsAllTime || 0,
    }
  } catch (_) { /* threads_posts 테이블 없으면 skip */ }

  return NextResponse.json({
    ok: true,
    replies: {
      today: todayRes.count || 0,
      this_week: weekRes.count || 0,
      this_month: monthRes.count || 0,
      all_time: totalRes.count || 0,
    },
    unreplied: {
      total: unrepliedCount || 0,
      negative: negativeUnreplied || 0,
    },
    ratings_30d: {
      total_reviews: totalReviews,
      avg_rating: avgRating,
      by_platform: platformBreakdown,
    },
    threads: threadsStats,
    generated_at: new Date().toISOString(),
  })
}
