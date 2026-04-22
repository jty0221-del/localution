// app/api/place/kakao/collect/route.ts
// ============================================================
// 31차-3 · 카카오맵 공개 리뷰 수집 엔드포인트 (로그인 불필요 공개 경로)
//
//   POST /api/place/kakao/collect
//     body(optional): { place_id?: string }
//     · place_id 미지정시 platform_credentials → stores 순서로 자동 탐색
//     · place-api.map.kakao.com/places/panel3 JSON 파싱 → platform_reviews UPSERT
//     · 응답: { ok, place_id, inserted, updated, total, reviews[] }
//
// 주의:
//   · 로그인 기반 비공개 리뷰 전체 수집은 KakaoMapAdapter (Railway Worker) 전담.
//   · 본 라우트는 panel3 임베디드 최근 3~5건만 수집. cron 으로 주기 호출.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { fetchKakaoVisitorReviews, lookupKakaoPlace } from '@/app/lib/kakao-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UpsertRow = {
  user_id: string
  platform: 'kakao_map'
  platform_store_id: string
  platform_review_id: string
  author_name: string | null
  author_mask: string | null
  rating: number | null
  content: string | null
  photos: string[] | null
  posted_at: string | null
  collected_at: string
  has_reply: boolean
  raw_snapshot: unknown
}

function maskAuthor(name: string | null | undefined): string | null {
  if (!name) return null
  const s = String(name).trim()
  if (s.length <= 1) return s + '*'
  if (s.length === 2) return s[0] + '*'
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId
  const svc = createServiceClient()

  // 1) place_id 결정: body 우선, 없으면 자동 탐색
  let placeId: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.place_id && /^\d+$/.test(String(body.place_id))) placeId = String(body.place_id)
  } catch {
    // body 없음
  }

  if (!placeId) {
    // (a) platform_credentials.platform_store_id (kakao_map)
    try {
      const { data } = await svc
        .from('platform_credentials')
        .select('platform_store_id')
        .eq('user_id', userId)
        .eq('platform', 'kakao_map')
        .maybeSingle()
      if (data?.platform_store_id && /^\d+$/.test(String(data.platform_store_id))) {
        placeId = String(data.platform_store_id)
      }
    } catch (_) {}
  }

  if (!placeId) {
    // (b) stores.kakao_place_id (있는 경우)
    try {
      const { data } = await svc
        .from('stores')
        .select('kakao_place_id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (Array.isArray(data) && data[0]?.kakao_place_id) {
        placeId = String(data[0].kakao_place_id)
      }
    } catch (_) {}
  }

  if (!placeId) {
    return NextResponse.json(
      { ok: false, error: '연결된 카카오맵이 없어요. 먼저 /my/platforms 에서 연결해 주세요.' },
      { status: 400 },
    )
  }

  // 2) 공개 리뷰 수집
  const reviews = await fetchKakaoVisitorReviews(placeId)
  if (reviews.length === 0) {
    return NextResponse.json({
      ok: true,
      place_id: placeId,
      inserted: 0,
      updated: 0,
      total: 0,
      reviews: [],
      note: 'panel3 응답에 리뷰가 없어요. 리뷰가 0건이거나 차단됐을 수 있어요.',
    })
  }

  // 3) platform_reviews UPSERT (platform + platform_review_id 유니크)
  const now = new Date().toISOString()
  const rows: UpsertRow[] = reviews.map((r) => ({
    user_id: userId,
    platform: 'kakao_map' as const,
    platform_store_id: placeId!,
    platform_review_id: r.reviewId,
    author_name: r.authorName ?? null,
    author_mask: maskAuthor(r.authorName),
    rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
    content: r.body,
    photos: r.photos.length > 0 ? r.photos : null,
    posted_at: r.postedAt,
    collected_at: now,
    has_reply: false,
    raw_snapshot: r,
  }))

  let inserted = 0
  try {
    const { data, error } = await svc
      .from('platform_reviews')
      .upsert(rows, {
        onConflict: 'platform,platform_review_id',
        ignoreDuplicates: false,
      })
      .select('platform_review_id')
    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB 저장 실패: ' + error.message },
        { status: 500 },
      )
    }
    inserted = Array.isArray(data) ? data.length : 0
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'upsert 예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }

  // 4) (옵션) summary 가 있으면 stores.kakao_place_rating 등 갱신은 별도 라우트에서
  return NextResponse.json({
    ok: true,
    place_id: placeId,
    inserted,
    updated: 0,
    total: reviews.length,
    reviews: reviews.map((r) => ({
      id: r.reviewId,
      author: r.authorName,
      rating: r.rating,
      body: r.body.slice(0, 200),
      posted_at: r.postedAt,
      photos: r.photos.length,
    })),
  })
}

// GET — 단순 lookup (verify 용도, body 없음)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const input = url.searchParams.get('place') ?? url.searchParams.get('id') ?? ''
  if (!input.trim()) {
    return NextResponse.json({ ok: false, error: 'place 또는 id 파라미터 필요' }, { status: 400 })
  }

  const summary = await lookupKakaoPlace(input.trim())
  if (!summary) {
    return NextResponse.json(
      { ok: false, error: '카카오맵에서 해당 장소를 찾지 못했어요.' },
      { status: 404 },
    )
  }
  return NextResponse.json({ ok: true, ...summary })
}
