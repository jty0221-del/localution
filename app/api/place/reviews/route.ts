// app/api/place/reviews/route.ts
// ============================================================
// 30차-15-B · 저장된 네이버 플레이스 리뷰 조회
//
//   GET /api/place/reviews?platform=naver_place&limit=30&min_rating=1&max_rating=5&period=7|30|all&unreplied_only=1
//     · 본인 소유 platform_reviews 반환 (posted_at DESC)
//     · 평점 필터 지원 (min_rating / max_rating)
//     · 기간 필터 (30차-23): period=7/30/all (posted_at 기준, all = 전체)
//     · 미답변만 (30차-23): unreplied_only=1 → has_reply=false
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
  // 30차-23: 대량 조회 허용 (기본 200, 상한 1000)
  const limit = Math.min(1000, Math.max(1, Number(u.searchParams.get('limit') || 200)))
  // 30차-17: 네이버 공개 GraphQL 은 rating=null 이 표준 (키워드 리뷰).
  //   기본 min_rating=1 이면 gte('rating',1) 필터가 null 행을 전부 제외해 리뷰가 0건으로 보임.
  //   → 쿼리파라미터로 "명시적으로 값이 있을 때만" 필터 적용.
  const minRatingRaw = u.searchParams.get('min_rating')
  const maxRatingRaw = u.searchParams.get('max_rating')
  const minRating = minRatingRaw !== null ? Number(minRatingRaw) : null
  const maxRating = maxRatingRaw !== null ? Number(maxRatingRaw) : null

  // 30차-23: 기간 필터 (period=7 / 30 / all)
  const periodRaw = (u.searchParams.get('period') || 'all').toLowerCase()
  const periodDays = periodRaw === '7' ? 7 : periodRaw === '30' ? 30 : null
  const unrepliedOnly = ['1', 'true', 'yes'].includes((u.searchParams.get('unreplied_only') || '').toLowerCase())

  try {
    let q = svc
      .from('platform_reviews')
      .select(
        // 30차-21: 초안/큐 컬럼 7개 추가 — UI 가 상태 배지/편집박스 렌더링에 사용
        // 68차-2: reply_content 추가 — 쿠팡/배민/요기요 사장님 답글 본문 표시
        'id, platform, platform_store_id, platform_review_id, author_name, author_mask, rating, content, photos, posted_at, collected_at, has_reply, sentiment, draft_reply, reply_status, reply_tone, reply_queued_at, reply_submitted_at, reply_error, reply_attempts, raw_snapshot, reply_content',
      )
      .eq('user_id', userId)
      .eq('platform', platform)
      .order('posted_at', { ascending: false, nullsFirst: false })
      .order('collected_at', { ascending: false })
      .limit(limit)
    if (typeof minRating === 'number' && !Number.isNaN(minRating) && minRating >= 1) {
      q = q.gte('rating', minRating)
    }
    if (typeof maxRating === 'number' && !Number.isNaN(maxRating) && maxRating <= 5) {
      q = q.lte('rating', maxRating)
    }
    if (periodDays) {
      const since = new Date(Date.now() - periodDays * 86400000).toISOString()
      q = q.gte('posted_at', since)
    }
    if (unrepliedOnly) {
      q = q.eq('has_reply', false)
    }
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
        summary.unreplied_count = all.filter((r) => !r.has_reply && r.reply_status !== 'submitted').length
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
