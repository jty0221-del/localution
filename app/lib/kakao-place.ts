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

/**
 * 카카오맵 최근 방문자 리뷰 수집.
 * panel3 응답에 내장된 kakaomap_review.reviews 를 파싱.
 * (로그인 불필요 · 최근 3~5건 내외 · 더 많은 수집은 Worker 어댑터에서)
 */
export async function fetchKakaoVisitorReviews(placeId: string): Promise<KakaoVisitorReview[]> {
  if (!/^\d+$/.test(placeId)) return []

  const data = await fetchPanel3(placeId)
  if (!data) return []

  const reviews = data?.kakaomap_review?.reviews
  if (!Array.isArray(reviews)) return []

  const out: KakaoVisitorReview[] = []
  for (const r of reviews) {
    if (!r || typeof r !== 'object') continue
    if (r.status && r.status !== 'S') continue // 삭제/숨김 건 스킵

    const reviewId = r.review_id != null ? String(r.review_id) : null
    if (!reviewId) continue

    const owner = r?.meta?.owner ?? {}
    const authorName: string | null =
      typeof owner.nickname === 'string' && owner.nickname.trim().length > 0
        ? owner.nickname.trim()
        : null

    const rating =
      typeof r.star_rating === 'number' && r.star_rating >= 1 && r.star_rating <= 5
        ? r.star_rating
        : null

    const body: string = typeof r.contents === 'string' ? r.contents : ''

    const photos: string[] = Array.isArray(r.photos)
      ? r.photos
          .map((p: any) => (typeof p?.url === 'string' ? p.url : null))
          .filter((x: string | null): x is string => !!x && x.startsWith('http'))
      : []

    out.push({
      reviewId,
      authorName,
      rating,
      body,
      visitedAt: null,
      postedAt: parseDateKST(r.registered_at || r.updated_at || null),
      photos,
      raw: r,
    })
  }
  return out
}
