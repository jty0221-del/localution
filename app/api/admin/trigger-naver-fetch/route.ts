// app/api/admin/trigger-naver-fetch/route.ts
// ============================================================
// 관리자: 특정 사용자의 네이버 리뷰 즉시 수집
//
// GET ?user_id=<uuid>
//   1) platform_credentials 에서 platform_store_id 조회
//   2) fetchVisitorReviews 호출
//   3) platform_reviews 에 upsert
//   4) 결과 즉시 반환 (큐 안 거침)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { fetchVisitorReviews } from '@/app/lib/naver-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function maskAuthor(name: string | null | undefined): string | null {
  if (!name) return null
  const s = String(name).trim()
  if (s.length <= 1) return s + '*'
  if (s.length === 2) return s[0] + '*'
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || ''
  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })

  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('platform_store_id, platform_store_name')
    .eq('user_id', userId).eq('platform', 'naver_place')
    .maybeSingle()

  if (!cred) return NextResponse.json({ ok: false, error: '네이버 플레이스 연결 없음' }, { status: 404 })
  const placeId = cred.platform_store_id
  if (!placeId) return NextResponse.json({ ok: false, error: 'place_id 누락' }, { status: 400 })
  if (!/^\d+$/.test(String(placeId))) {
    return NextResponse.json({ ok: false, error: 'place_id 형식 오류 (숫자만 가능)', place_id: placeId }, { status: 400 })
  }

  // 매장 카테고리 hint
  const { data: store } = await svc
    .from('stores').select('category').eq('user_id', userId).maybeSingle()
  const hint = store?.category || null

  const t0 = Date.now()
  const reviews = await fetchVisitorReviews(String(placeId), hint)
  const elapsed = Date.now() - t0

  if (reviews.length === 0) {
    return NextResponse.json({
      ok: true,
      place_id: placeId,
      elapsed_ms: elapsed,
      fetched: 0,
      saved: 0,
      message: '리뷰 0건 — place 가 실제 리뷰 없거나 비공개, 또는 place_id 잘못됨',
    })
  }

  // platform_reviews 에 upsert
  const now = new Date().toISOString()
  const rows = reviews.map(r => ({
    user_id: userId,
    platform: 'naver_place',
    platform_store_id: String(placeId),
    platform_review_id: r.reviewId,
    author_name: r.authorName || null,
    author_mask: maskAuthor(r.authorName),
    rating: r.rating ?? null,
    content: r.body || null,
    photos: Array.isArray(r.photos) && r.photos.length > 0 ? r.photos : null,
    posted_at: r.postedAt || r.visitedAt || null,
    collected_at: now,
    has_reply: r.hasOwnerReply,
    reply_content: r.ownerReplyBody || null,
  }))

  const { error: upErr, count } = await svc
    .from('platform_reviews')
    .upsert(rows, { onConflict: 'platform,platform_review_id', count: 'exact', ignoreDuplicates: false })

  if (upErr) {
    return NextResponse.json({
      ok: false,
      place_id: placeId,
      fetched: reviews.length,
      saved: 0,
      error: 'DB upsert 실패: ' + upErr.message,
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    place_id: placeId,
    store_name: cred.platform_store_name,
    elapsed_ms: elapsed,
    fetched: reviews.length,
    saved: count ?? reviews.length,
    triggered_by: admin.email,
    message: `${reviews.length}건 수집 + DB 저장 완료`,
  })
}
