// ============================================================
// 22차-2 · 네이버 플레이스 조회 공용 라이브러리
// 30차-6 · PlaceInfo 확장 (description / 메인·서브 키워드 / 영업시간)
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

  // 30차-6 확장 필드
  description: string            // 업체 설명(소개) — description / introduction 원본
  mainKeyword: string            // 자동 추론 대표 키워드 (예: "마포 카페")
  subKeywords: string[]          // 서브 키워드 후보 배열
  businessHours: string          // 영업시간 원문 (예: "매일 10:00 - 22:00")
  regionKeyword: string          // 주소 기반 "지역 + 업종" 키워드 (예: "합정동 카페")
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

// 주소에서 행정구역(동/읍/면) 추출
// "서울특별시 마포구 합정동 123-45" → "합정동"
// "경상북도 포항시 북구 두호동" → "두호동"
// 실패 시 구/군 단위 반환
function extractRegionName(address: string): string {
  if (!address) return ''
  // 동/읍/면/가/리 패턴 우선
  const m1 = address.match(/([가-힣0-9]+(?:동|읍|면|가|리))(?=\s|$|\d|[,])/)
  if (m1) return m1[1]
  // 구/군 단위 fallback
  const m2 = address.match(/([가-힣]+(?:구|군))(?=\s|$)/)
  if (m2) return m2[1]
  // 시 단위 fallback
  const m3 = address.match(/([가-힣]+시)(?=\s|$)/)
  if (m3) return m3[1]
  return ''
}

// 카테고리명에서 마지막 업종 추출 + 상위 업종
// "음식점 > 카페 > 브런치카페" → { leaf: "브런치카페", base: "카페" }
function extractCategoryTokens(categoryName: string): { leaf: string; base: string } {
  if (!categoryName) return { leaf: '', base: '' }
  const parts = categoryName.split('>').map(s => s.trim()).filter(Boolean)
  const leaf = parts[parts.length - 1] || ''
  const base = parts.length >= 2 ? parts[parts.length - 2] : leaf
  return { leaf, base }
}

// 상호명에서 브랜드 토큰 추출 (맨 앞 단어)
// "스타벅스 합정점" → "스타벅스"
function extractBrandToken(name: string): string {
  if (!name) return ''
  const first = name.split(/\s+/)[0]
  return first && first.length >= 2 ? first : ''
}

// 30차-6 · JSON-in-HTML 에서 description/영업시간 추출
// 네이버 SSR 에서 쓰는 주요 키 후보: description / introduction / summary / bsnsHours / businessHours
function extractDescriptionFromHtml(html: string): string {
  const candidates = [
    /"description"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"introduction"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/,
  ]
  for (const re of candidates) {
    const m = html.match(re)
    if (m?.[1]) {
      const raw = m[1]
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, '')
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/\s+/g, ' ')
        .trim()
      if (raw.length >= 8 && raw.length <= 2000) return raw
    }
  }
  return ''
}

function extractBusinessHoursFromHtml(html: string): string {
  const candidates = [
    /"bsnsHours"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"businessHours"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"openHour"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"bizHourInfo"\s*:\s*"((?:[^"\\]|\\.)*)"/,
  ]
  for (const re of candidates) {
    const m = html.match(re)
    if (m?.[1]) {
      const raw = m[1]
        .replace(/\\n/g, ' / ')
        .replace(/\\r/g, '')
        .replace(/\\"/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
      if (raw.length >= 3 && raw.length <= 500) return raw
    }
  }
  return ''
}

// 키워드 자동 추론
// · mainKeyword: "지역명 + 업종leaf" (예: "합정동 카페")
// · subKeywords: leaf 단독, base 단독, 구/군 + leaf, 브랜드 + leaf, og:description 에서 키워드형 명사 추출
export function inferKeywords(params: {
  name: string
  address: string
  categoryName: string
}): { mainKeyword: string; subKeywords: string[]; regionKeyword: string } {
  const region = extractRegionName(params.address)
  const { leaf, base } = extractCategoryTokens(params.categoryName)
  const brand = extractBrandToken(params.name)

  const main = region && leaf ? `${region} ${leaf}` : leaf || region || ''

  const subs: string[] = []
  const push = (s: string) => {
    const v = s.trim()
    if (!v || v === main) return
    if (!subs.includes(v)) subs.push(v)
  }

  if (leaf) push(leaf)
  if (base && base !== leaf) push(base)
  if (region && base && base !== leaf) push(`${region} ${base}`)

  // 구/군 단위도 추출해서 보조 키워드에 포함
  const gu = params.address.match(/([가-힣]+(?:구|군))(?=\s|$)/)?.[1]
  if (gu && leaf) push(`${gu} ${leaf}`)

  // 시 + leaf
  const si = params.address.match(/([가-힣]+시)(?=\s|$)/)?.[1]
  if (si && leaf) push(`${si} ${leaf}`)

  if (brand) push(brand)
  if (brand && leaf) push(`${brand} ${leaf}`)

  return { mainKeyword: main, subKeywords: subs.slice(0, 6), regionKeyword: region && leaf ? `${region} ${leaf}` : '' }
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

  // 30차-6 확장 필드
  const description = extractDescriptionFromHtml(html)
  const businessHours = extractBusinessHoursFromHtml(html)

  const finalAddress = roadAddress || address || ''
  const { mainKeyword, subKeywords, regionKeyword } = inferKeywords({
    name,
    address: finalAddress,
    categoryName,
  })

  return {
    placeId,
    category,
    name,
    address: finalAddress,
    roadAddress,
    categoryName,
    phone,
    visitorReviewCount: visitor,
    blogReviewCount: blog,
    rating: safeNum(ratingRaw),
    thumbnail: ogImage,
    ogDescription: ogDesc,
    sourceUrl,

    description,
    mainKeyword,
    subKeywords,
    businessHours,
    regionKeyword,
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
