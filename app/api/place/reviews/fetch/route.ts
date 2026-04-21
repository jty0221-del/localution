// app/api/place/reviews/fetch/route.ts
// ============================================================
// 30차-15-B · 네이버 방문자 리뷰 수집 엔드포인트 (로그인 불필요 공개 경로)
//
//   POST /api/place/reviews/fetch
//     body(optional): { place_id?: string, category?: string }
//     · place_id 미지정시 /api/stores/me 로직 따라 현재 유저의 naver_place
//       연결 매장 place_id 자동 탐색 (platform_credentials → place_targets → stores)
//     · m.place.naver.com HTML 파싱 → platform_reviews UPSERT(platform, platform_review_id)
//     · 응답: { ok, place_id, inserted, updated, total, reviews[] }
//
// 주의:
//   · 로그인 기반 비공개 리뷰 수집은 23차-4 NaverPlaceAdapter(Railway Worker) 전담.
//   · 이 엔드포인트는 공개 SSR HTML 만 긁어 즉시 보여주는 "지금 수집" 용도.
//   · 30차-15-D 에서 cron 으로 4시간마다 전 유저 루프 돌림.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { fetchVisitorReviews } from '@/app/lib/naver-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UpsertRow = {
  user_id: string
  platform: 'naver_place'
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

function parseDateSafely(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  // YYYY-MM-DD / YYYY.MM.DD / YYYY-MM-DDTHH:mm:ss(.xxx)(Z|+09:00)
  const isoOk = /^\d{4}-\d{2}-\d{2}/.test(s)
  const dotted = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  try {
    if (dotted) {
      const iso = `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}T00:00:00+09:00`
      const d = new Date(iso)
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
    if (isoOk) {
      const d = new Date(s.length === 10 ? s + 'T00:00:00+09:00' : s)
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
  } catch {
    return null
  }
  return null
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
  let hint: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.place_id && /^\d+$/.test(String(body.place_id))) placeId = String(body.place_id)
    if (body?.category) hint = String(body.category)
  } catch {
    // body 없음 — 자동 탐색 경로
  }

  if (!placeId) {
    // (a) platform_credentials.platform_store_id
    try {
      const { data } = await svc
        .from('platform_credentials')
        .select('platform_store_id')
        .eq('user_id', userId)
        .eq('platform', 'naver_place')
        .maybeSingle()
      if (data?.platform_store_id && /^\d+$/.test(String(data.platform_store_id))) {
        placeId = String(data.platform_store_id)
      }
    } catch (_) {}
  }

  if (!placeId) {
    // (b) place_targets (순위 추적 등록)
    try {
      const { data } = await svc
        .from('place_targets')
        .select('place_id, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (Array.isArray(data) && data[0]?.place_id) {
        placeId = String(data[0].place_id)
        hint = data[0].category ?? hint
      }
    } catch (_) {}
  }

  if (!placeId) {
    // (c) stores.naver_place_id
    try {
      const { data } = await svc
        .from('stores')
        .select('naver_place_id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (Array.isArray(data) && data[0]?.naver_place_id) {
        placeId = String(data[0].naver_place_id)
      }
    } catch (_) {}
  }

  if (!placeId) {
    return NextResponse.json(
      { ok: false, error: '연결된 네이버 플레이스가 없어요. 먼저 /my/platforms 에서 연결해 주세요.' },
      { status: 400 },
    )
  }

  // 2) 공개 리뷰 수집
  const reviews = await fetchVisitorReviews(placeId, hint)
  if (reviews.length === 0) {
    return NextResponse.json({
      ok: true,
      place_id: placeId,
      inserted: 0,
      updated: 0,
      total: 0,
      reviews: [],
      note: 'SSR HTML 에서 리뷰를 찾지 못함. 리뷰가 0건이거나 파싱 패턴 변경 가능성.',
    })
  }

  // 3) platform_reviews UPSERT (platform + platform_review_id 유니크)
  const now = new Date().toISOString()
  const rows: UpsertRow[] = reviews.map((r) => ({
    user_id: userId,
    platform: 'naver_place' as const,
    platform_store_id: placeId!,
    platform_review_id: r.reviewId,
    author_name: r.authorName ?? null,
    author_mask: maskAuthor(r.authorName),
    rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
    content: r.body,
    photos: r.photos.length > 0 ? r.photos : null,
    posted_at: parseDateSafely(r.postedAt) || parseDateSafely(r.visitedAt),
    collected_at: now,
    has_reply: false,
    raw_snapshot: r,
  }))

  let inserted = 0
  let updated = 0
  try {
    // 유니크 인덱스(platform, platform_review_id) 기반 upsert — 기존 행은 update
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
    // upsert 는 insert/update 구분을 바로 주지 않음 → 휴리스틱: collected_at 이 now 와 근접한 행 수
    inserted = Array.isArray(data) ? data.length : 0
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'upsert 예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    place_id: placeId,
    inserted,
    updated,
    total: reviews.length,
    reviews: reviews.map((r) => ({
      id: r.reviewId,
      author: r.authorName,
      rating: r.rating,
      body: r.body.slice(0, 200),
      visited_at: r.visitedAt,
      posted_at: r.postedAt,
      photos: r.photos.length,
    })),
  })
}
