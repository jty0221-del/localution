// ============================================================
// 22차-2 · 네이버 플레이스 조회 공용 라이브러리
// ============================================================
// /api/place/lookup 과 /api/place/targets (snapshot) 양쪽에서 재사용
// 네이버 m.place.naver.com HTML 을 파싱해 PlaceInfo 객체 생성
// ============================================================

export const PLACE_CATEGORIES = [
  'restaurant', 'place', 'cafe', 'hairshop', 'beautyshop',
  'accommodation', 'hospital', 'attraction',
] as const

export type PlaceCategory = typeof PLACE_CATEGORIES[number]

export type PlaceInfo = {
  placeId: string
  category: string
  name: string
  address: string
  roadAddress: string
  categoryName: string
  phone: string
  visitorReviewCount: number | null
  blogReviewCount: number | null
  rating: number | null
  thumbnail: string
  ogDescription: string
  sourceUrl: string
}

function safeNum(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : null
}

function pickFirst(html: string, regex: RegExp): string {
  const m = html.match(regex)
  return m ? m[1] : ''
}

// <meta> 속성 순서 무관 파싱
// 네이버는 <meta id="og:title" property="og:title" content="..." data-isomorphic-meta="true"/>
// 형태로 뿌림 → id/property/name 어느 것이 먼저 와도 매치되도록
export function getMetaContent(html: string, key: string): string {
  const tagRegex = new RegExp(`<meta[^>]*(?:property|name|id)="${key}"[^>]*>`, 'i')
  const tag = html.match(tagRegex)?.[0]
  if (!tag) return ''
  return tag.match(/content="([^"]*)"/i)?.[1] || ''
}

// og:description "방문자리뷰 247 · 블로그리뷰 116" 파싱
export function parseReviewFromOgDesc(desc: string): { visitor: number | null; blog: number | null } {
  const v = desc.match(/방문자리뷰\s*([\d,]+)/)?.[1]?.replace(/,/g, '')
  const b = desc.match(/블로그리뷰\s*([\d,]+)/)?.[1]?.replace(/,/g, '')
  return {
    visitor: v ? Number(v) : null,
    blog: b ? Number(b) : null,
  }
}

export function parsePlaceHtml(
  html: string,
  placeId: string,
  category: string,
  sourceUrl: string,
): PlaceInfo {
  const ogTitle = getMetaContent(html, 'og:title')
  const ogDesc = getMetaContent(html, 'og:description')
  const ogImage = getMetaContent(html, 'og:image')

  const name = ogTitle.replace(/\s*[-:|]\s*네이버.*$/u, '').trim()

  const address = pickFirst(html, /"address"\s*:\s*"([^"\\]+)"/)
  const roadAddress = pickFirst(html, /"roadAddress"\s*:\s*"([^"\\]+)"/)
  const categoryName = pickFirst(html, /"category"\s*:\s*"([^"\\]+)"/)
  const phone = pickFirst(html, /"phone"\s*:\s*"([^"\\]*)"/) ||
                pickFirst(html, /"virtualPhone"\s*:\s*"([^"\\]*)"/)

  const { visitor, blog } = parseReviewFromOgDesc(ogDesc)

  const ratingRaw = pickFirst(html, /"reviewScore"\s*:\s*"?([\d.]+)"?/) ||
                    pickFirst(html, /"rating"\s*:\s*"?([\d.]+)"?/)

  return {
    placeId,
    category,
    name,
    address: roadAddress || address || '',
    roadAddress,
    categoryName,
    phone,
    visitorReviewCount: visitor,
    blogReviewCount: blog,
    rating: safeNum(ratingRaw),
    thumbnail: ogImage,
    ogDescription: ogDesc,
    sourceUrl,
  }
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://m.naver.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    if (html.length < 2000) return null
    if (html.includes('존재하지 않는 업체') || html.includes('서비스 종료')) return null
    return html
  } catch (e) {
    console.warn('[naver-place] fetch failed for', url, e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * placeId 만으로 네이버 플레이스 정보 조회.
 * hint 카테고리가 있으면 먼저 시도하고, 실패 시 전체 카테고리 순회.
 * 상호명(name) 가 비면 다음 카테고리로 fallback.
 */
export async function lookupPlace(placeId: string, hint?: string | null): Promise<PlaceInfo | null> {
  if (!/^\d+$/.test(placeId)) return null

  const tryOrder: string[] = []
  if (hint && (PLACE_CATEGORIES as readonly string[]).includes(hint)) tryOrder.push(hint)
  for (const c of PLACE_CATEGORIES) if (!tryOrder.includes(c)) tryOrder.push(c)

  for (const cat of tryOrder) {
    const url = `https://m.place.naver.com/${cat}/${placeId}/home`
    const html = await tryFetch(url)
    if (!html) continue
    const info = parsePlaceHtml(html, placeId, cat, url)
    if (!info.name) continue
    return info
  }
  return null
}

/**
 * URL/문자열에서 placeId 와 카테고리 힌트 추출.
 * - https://m.place.naver.com/restaurant/1234/home
 * - https://map.naver.com/p/entry/place/1234
 * - https://naver.me/xxx (단축 URL 은 지원 안 함 → null)
 * - "1234" (숫자만)
 */
export function extractPlaceIdAndCategory(raw: string): { id: string | null; category: string | null } {
  const s = raw.trim()
  if (!s) return { id: null, category: null }
  if (/^\d+$/.test(s)) return { id: s, category: null }

  // m.place.naver.com/{category}/{id}
  const mp = s.match(/m\.place\.naver\.com\/([a-z]+)\/(\d+)/i)
  if (mp) {
    const cat = mp[1].toLowerCase()
    return {
      id: mp[2],
      category: (PLACE_CATEGORIES as readonly string[]).includes(cat) ? cat : null,
    }
  }

  // map.naver.com/p/entry/place/{id}
  const me = s.match(/map\.naver\.com\/[^\s]*place\/(\d+)/i)
  if (me) return { id: me[1], category: null }

  // place.naver.com/restaurant/{id}
  const p = s.match(/place\.naver\.com\/([a-z]+)\/(\d+)/i)
  if (p) {
    const cat = p[1].toLowerCase()
    return {
      id: p[2],
      category: (PLACE_CATEGORIES as readonly string[]).includes(cat) ? cat : null,
    }
  }

  // 마지막 fallback: 6자리 이상 숫자 단일 매치
  const n = s.match(/\b(\d{6,})\b/)
  if (n) return { id: n[1], category: null }

  return { id: null, category: null }
}
