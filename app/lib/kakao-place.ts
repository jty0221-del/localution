// app/lib/kakao-place.ts
// ============================================================
// 31차-3 · 카카오맵 공개 리뷰 수집기
//
//   - place-api.map.kakao.com/places/panel3/{placeId} 에서 JSON 추출
//   - 요청시 `pf: web` 헤더 필수 (없으면 406 Not Acceptable)
//   - 응답 경로:
//       kakaomap_review.score_set.{review_count, average_score}
//       kakaomap_review.reviews[{review_id, star_rating, contents, photos, registered_at, meta.owner.nickname}]
//       summary.{name, address, regions, phone_numbers, category, point}
//
//   - 본 라이브러리는 공개 SSR JSON 만 긁음 → 로그인 불필요
//   - 로그인 기반 비공개/전체 리뷰 수집은 Railway Worker KakaoMapAdapter 전담 (추후)
// ============================================================
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const HDR = {
  'User-Agent': UA,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  pf: 'web',
} as const

export type KakaoVisitorReview = {
  reviewId: string
  authorName: string | null
  rating: number | null
  body: string
  visitedAt: string | null
  postedAt: string | null
  photos: string[]
  raw?: unknown
}

export type KakaoPlaceSummary = {
  placeId: string
  name: string | null
  address: string | null
  roadAddress: string | null
  region: string | null
  phone: string | null
  category: string | null
  rating: number | null
  reviewCount: number
  url: string
  lat: number | null
  lng: number | null
}

// ─────────────────────────────────────────────
// 내부 유틸
// ─────────────────────────────────────────────
function parseDateKST(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  // "2026-04-21 18:42:38" 형식 → KST 로 해석
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+09:00`
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m2) {
    const d = new Date(`${s}T00:00:00+09:00`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

export function extractKakaoPlaceId(input: string): string | null {
  if (!input) return null
  const s = String(input).trim()
  // 단독 숫자
  if (/^\d+$/.test(s)) return s
  // place.map.kakao.com/616380187 또는 ?id=... 또는 #...
  const m = s.match(/place\.map\.kakao\.com\/(\d+)/)
  if (m) return m[1]
  const m2 = s.match(/[?&#]id=(\d+)/)
  if (m2) return m2[1]
  const last = s.match(/\/(\d{4,})(?:[\/\?#].*)?$/)
  if (last) return last[1]
  return null
}

async function fetchPanel3(placeId: string): Promise<any | null> {
  const url = `https://place-api.map.kakao.com/places/panel3/${placeId}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...HDR,
        Referer: `https://place.map.kakao.com/${placeId}`,
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn('[kakao-place] panel3 non-ok', placeId, res.status)
      return null
    }
    return await res.json()
  } catch (e) {
    console.warn('[kakao-place] panel3 fetch failed', placeId, e instanceof Error ? e.message : e)
    return null
  }
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * 카카오맵 장소 메타정보 + 평점 + 리뷰 수 조회.
 * 허브 대시보드 "연동 검증" 용도 (verify).
 */
export async function lookupKakaoPlace(input: string): Promise<KakaoPlaceSummary | null> {
  const placeId = extractKakaoPlaceId(input)
  if (!placeId) return null

  const data = await fetchPanel3(placeId)
  if (!data) return null

  const summary = data.summary ?? {}
  const review = data.kakaomap_review ?? {}
  const score = review.score_set ?? {}
  const addr = summary.address ?? {}
  const region = summary.regions ?? {}
  const firstPhone = Array.isArray(summary.phone_numbers) ? summary.phone_numbers[0] : null
  const point = summary.point ?? {}
  const category =
    typeof summary.category === 'string'
      ? summary.category
      : summary.category?.name ?? summary.category?.main ?? null

  return {
    placeId,
    name: summary.name ?? null,
    address: addr.lot_number_address ?? addr.address ?? addr.full ?? null,
    roadAddress: addr.new_address ?? addr.road_address ?? null,
    region: [region.depth1_name, region.depth2_name, region.depth3_name].filter(Boolean).join(' ') || null,
    phone: firstPhone ?? null,
    category,
    rating: typeof score.average_score === 'number' ? score.average_score : null,
    reviewCount: typeof score.review_count === 'number' ? score.review_count : 0,
    url: `https://place.map.kakao.com/${placeId}`,
    lat: typeof point.y === 'number' ? point.y : point.y ? Number(point.y) : null,
    lng: typeof point.x === 'number' ? point.x : point.x ? Number(point.x) : null,
  }
}

// v1.6v: 단일 review item 정규화 (panel3 + main/v 양쪽 호환)
function normalizeKakaoReview(r: any): KakaoVisitorReview | null {
  if (!r || typeof r !== 'object') return null
  if (r.status && r.status !== 'S') return null

  const reviewId = r.review_id != null ? String(r.review_id) : (r.id != null ? String(r.id) : null)
  if (!reviewId) return null

  const owner = r?.meta?.owner ?? r?.user ?? r?.author ?? {}
  const authorName: string | null =
    typeof owner.nickname === 'string' && owner.nickname.trim().length > 0
      ? owner.nickname.trim()
      : (typeof r.author_name === 'string' ? r.author_name.trim() : null)

  const rating =
    typeof r.star_rating === 'number' && r.star_rating >= 1 && r.star_rating <= 5
      ? r.star_rating
      : (typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null)

  const body: string = typeof r.contents === 'string' ? r.contents
    : (typeof r.content === 'string' ? r.content : (typeof r.body === 'string' ? r.body : ''))

  const photos: string[] = Array.isArray(r.photos)
    ? r.photos
        .map((p: any) => (typeof p?.url === 'string' ? p.url : (typeof p === 'string' ? p : null)))
        .filter((x: string | null): x is string => !!x && x.startsWith('http'))
    : []

  return {
    reviewId,
    authorName,
    rating,
    body,
    visitedAt: null,
    postedAt: parseDateKST(r.registered_at || r.created_at || r.updated_at || r.date || null),
    photos,
    raw: r,
  }
}

// v1.6v: main/v 페이지네이션 endpoint — 전체 리뷰 가져오기
async function fetchKakaoReviewsPage(placeId: string, page: number, order: string = 'RECENT'): Promise<{ reviews: any[]; hasNext: boolean }> {
  const candidates = [
    // 가장 가능성 높은 endpoint
    `https://place-api.map.kakao.com/places/main/v/${placeId}/reviews?order=${order}&pageSize=20&page=${page}`,
    // legacy fallback
    `https://place-api.map.kakao.com/places/main/v/${placeId}/reviews?order=${order}&page=${page}`,
    // 다른 path 시도
    `https://place.map.kakao.com/main/v/${placeId}/reviews?order=${order}&page=${page}`,
  ]
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { ...HDR, Referer: `https://place.map.kakao.com/${placeId}` },
        cache: 'no-store',
      })
      if (!res.ok) continue
      const data = await res.json().catch(() => null)
      if (!data) continue
      // 응답 shape 다양 가능 — array 찾기
      const reviews =
        data?.reviews
        || data?.items
        || data?.list
        || data?.data?.reviews
        || data?.kakaomap_review?.reviews
        || (Array.isArray(data) ? data : [])
      if (!Array.isArray(reviews)) continue
      const hasNext = !!(data?.has_next ?? data?.hasNext ?? data?.is_end === false ?? (reviews.length >= 20))
      return { reviews, hasNext }
    } catch { /* try next */ }
  }
  return { reviews: [], hasNext: false }
}

/**
 * 카카오맵 방문자 리뷰 수집 — 페이지네이션 지원
 * v1.6v: panel3 (3-5건) + main/v?page=N (전체) 합쳐서 dedupe
 */
export async function fetchKakaoVisitorReviews(placeId: string): Promise<KakaoVisitorReview[]> {
  if (!/^\d+$/.test(placeId)) return []

  const seen = new Set<string>()
  const out: KakaoVisitorReview[] = []

  // 1차: panel3 (보장된 3-5건)
  const panelData = await fetchPanel3(placeId)
  if (panelData?.kakaomap_review?.reviews && Array.isArray(panelData.kakaomap_review.reviews)) {
    for (const r of panelData.kakaomap_review.reviews) {
      const norm = normalizeKakaoReview(r)
      if (norm && !seen.has(norm.reviewId)) {
        seen.add(norm.reviewId)
        out.push(norm)
      }
    }
  }

  // 2차: main/v 페이지네이션 (전체 리뷰)
  const MAX_PAGES = 50  // 1000건 상한
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { reviews, hasNext } = await fetchKakaoReviewsPage(placeId, page)
    if (reviews.length === 0) break
    let added = 0
    for (const r of reviews) {
      const norm = normalizeKakaoReview(r)
      if (norm && !seen.has(norm.reviewId)) {
        seen.add(norm.reviewId)
        out.push(norm)
        added++
      }
    }
    if (added === 0) break  // 더 이상 새 리뷰 없음
    if (!hasNext) break
    // rate limit 회피
    await new Promise(r => setTimeout(r, 400))
  }

  return out
}
