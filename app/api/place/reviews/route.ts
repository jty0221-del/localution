// app/api/place/reviews/route.ts
// ============================================================
// 30차-15-B · 저장된 네이버 플레이스 리뷰 조회
//
//   GET /api/place/reviews?platform=naver_place&limit=30&min_rating=1&max_rating=5
//     · 본인 소유 platform_reviews 반환 (posted_at DESC)
//     · 평점 필터 지원 (min_rating / max_rating)
//     · 집계 요약: { count, avg_rating, negative_count, unreplied_count }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId
  const svc = createServiceClient()

  const u = new URL(req.url)
  const platform = u.searchParams.get('platform') || 'naver_place'
  const limit = Math.min(100, Math.max(1, Number(u.searchParams.get('limit') || 30)))
  const minRating = Number(u.searchParams.get('min_rating') || 1)
  const maxRating = Number(u.searchParams.get('max_rating') || 5)

  try {
    let q = svc
      .from('platform_reviews')
      .select(
        'id, platform, platform_store_id, platform_review_id, author_name, author_mask, rating, content, photos, posted_at, collected_at, has_reply, sentiment',
      )
      .eq('user_id', userId)
      .eq('platform', platform)
      .order('posted_at', { ascending: false, nullsFirst: false })
      .order('collected_at', { ascending: false })
      .limit(limit)
    if (minRating >= 1) q = q.gte('rating', minRating)
    if (maxRating <= 5) q = q.lte('rating', maxRating)
    const { data, error } = await q
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB 조회 실패: ' + error.message },
        { status: 500 },
      )
    }

    // 요약 집계 (별도 쿼리 — 필터 없이 전체)
    let summary = { count: 0, avg_rating: null as number | null, negative_count: 0, unreplied_count: 0 }
    try {
      const { data: all } = await svc
        .from('platform_reviews')
        .select('rating, has_reply')
        .eq('user_id', userId)
        .eq('platform', platform)
      if (Array.isArray(all) && all.length > 0) {
        const withRating = all.filter((r) => typeof r.rating === 'number') as { rating: number; has_reply: boolean }[]
        summary.count = all.length
        if (withRating.length > 0) {
          const sum = withRating.reduce((a, b) => a + Number(b.rating), 0)
          summary.avg_rating = Number((sum / withRating.length).toFixed(2))
        }
        summary.negative_count = all.filter((r) => typeof r.rating === 'number' && r.rating <= 3).length
        summary.unreplied_count = all.filter((r) => !r.has_reply).length
      }
    } catch (_) {
      // 집계 실패해도 메인 데이터는 반환 (부차 쿼리 격리 원칙)
    }

    return NextResponse.json({
      ok: true,
      platform,
      reviews: data ?? [],
      summary,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: '예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }
}
