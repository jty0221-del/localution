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

// 30차-9 · 주소에서 최상위 광역(특별시·광역시·도) 추출 + 축약
// "인천광역시 강화군 길상면 ..." → { full: "인천광역시", short: "인천" }
// "경기도 수원시 ..." → { full: "경기도", short: "경기" }
function extractTopRegion(address: string): { full: string; short: string } {
  if (!address) return { full: '', short: '' }
  const m = address.match(/^([가-힣]+(?:특별시|광역시|특별자치시|특별자치도|도))(?=\s|$)/)
  if (!m) return { full: '', short: '' }
  const full = m[1]
  const short = full
    .replace(/서울특별시/, '서울')
    .replace(/부산광역시/, '부산')
    .replace(/대구광역시/, '대구')
    .replace(/인천광역시/, '인천')
    .replace(/광주광역시/, '광주')
    .replace(/대전광역시/, '대전')
    .replace(/울산광역시/, '울산')
    .replace(/세종특별자치시/, '세종')
    .replace(/경기도/, '경기')
    .replace(/강원특별자치도/, '강원')
    .replace(/강원도/, '강원')
    .replace(/충청북도/, '충북')
    .replace(/충청남도/, '충남')
    .replace(/전라북도/, '전북')
    .replace(/전북특별자치도/, '전북')
    .replace(/전라남도/, '전남')
    .replace(/경상북도/, '경북')
    .replace(/경상남도/, '경남')
    .replace(/제주특별자치도/, '제주')
    .replace(/제주도/, '제주')
  return { full, short }
}

// 시/군 추출 + 축약
// "강화군" → { full: "강화군", short: "강화" }
// "수원시" → { full: "수원시", short: "수원" }
function extractCityGun(address: string): { full: string; short: string } {
  if (!address) return { full: '', short: '' }
  const m = address.match(/([가-힣0-9]+(?:시|군))(?=\s|$)/)
  if (!m) return { full: '', short: '' }
  const full = m[1]
  const short = full.replace(/(시|군)$/, '')
  return { full, short }
}

// 구 추출 (서울/광역시의 기초지자체)
function extractGu(address: string): string {
  if (!address) return ''
  const m = address.match(/([가-힣]+구)(?=\s|$)/)
  return m ? m[1] : ''
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

// 30차-12 · /information 페이지 HTML 마크업의 "소개" 섹션 innerText 추출 (최우선)
// 네이버는 SSR 후에 `<h2>...소개</h2>` 섹션을 직접 렌더링하는데, 이 섹션 안의 텍스트가
// 사장님이 직접 작성한 매장 소개 전문이다. JSON "description" 키는 메뉴/피드 설명까지 섞여 있어
// 부정확했으므로 이 경로를 최우선으로 사용.
function extractIntroSectionFromHtml(html: string): string {
  // 앵커: `<div class="place_section_header_title">소개</div></h2>` (class 이름 해시 변동 대비 유연 매칭)
  const anchor = html.match(/place_section_header_title"[^>]*>\s*소개\s*<\/div>\s*<\/h2>/)
  if (!anchor || anchor.index === undefined) return ''
  const tail = html.slice(anchor.index + anchor[0].length)

  // place_section_content 블록 시작
  const contentIdx = tail.indexOf('place_section_content')
  if (contentIdx < 0) return ''
  const openTagEnd = tail.indexOf('>', contentIdx)
  if (openTagEnd < 0) return ''

  // 다음 place_section_header_title 전까지가 현재 섹션 영역
  const rest = tail.slice(openTagEnd + 1)
  const nextHeader = rest.search(/place_section_header_title"/)
  const sectionHtml = nextHeader > 0 ? rest.slice(0, nextHeader) : rest.slice(0, 20000)

  let t = sectionHtml
  // SVG · IMG · PATH 태그 완전 제거 (아이콘 노이즈)
  t = t.replace(/<svg[\s\S]*?<\/svg>/gi, '')
  t = t.replace(/<img[^>]*>/gi, '')
  t = t.replace(/<path[\s\S]*?\/>/gi, '')
  // <br>, <p> 등은 개행으로
  t = t.replace(/<br\s*\/?>/gi, '\n')
  t = t.replace(/<\/(p|div|li)>/gi, '\n')
  // 나머지 태그 전부 제거
  t = t.replace(/<[^>]+>/g, '')
  // HTML 엔티티 디코드
  t = t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
  // 공백 정리
  t = t.replace(/[ \t]+/g, ' ')
  t = t.replace(/\n[ \t]+/g, '\n')
  t = t.replace(/\n{3,}/g, '\n\n')
  t = t.trim()

  if (t.length < 20) return ''
  if (t.length > 2000) t = t.slice(0, 2000)
  return t
}

// 30차-6 · JSON-in-HTML 에서 description 추출 (fallback)
// 마크업에 "소개" 섹션이 없는 경우만 사용. JSON 에 여러 description 키가 공존하므로
// 1) __typename=PBusiness / BusinessIntroduction 같은 블록 우선 매칭
// 2) 못 찾으면 가장 긴 description 값 (메뉴 설명은 50자 안팎, 실제 소개는 100자 이상인 점 활용)
function extractDescriptionFromHtml(html: string): string {
  // 1) 비즈니스 소개 전용 typename 근처 description 우선
  const bizPat = /"__typename"\s*:\s*"(?:PBusiness|BusinessIntroduction|StoreIntroduction|ProfileInformation)"[^{}]{0,500}?"description"\s*:\s*"((?:[^"\\]|\\.)*)"/i
  const bizM = html.match(bizPat)
  if (bizM?.[1]) {
    const v = decodeJsonStr(bizM[1])
    if (v.length >= 20 && v.length <= 2000) return v
  }

  // 2) description 값 전수 수집 → 가장 긴 값 선택 (메뉴 설명 필터링 효과)
  const all: string[] = []
  const reAll = /"description"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let m: RegExpExecArray | null
  while ((m = reAll.exec(html)) !== null) {
    if (m[1]) all.push(m[1])
  }
  if (all.length > 0) {
    const sorted = all.map(decodeJsonStr).filter(s => s.length >= 50 && s.length <= 2000)
    sorted.sort((a, b) => b.length - a.length)
    if (sorted[0]) return sorted[0]
  }

  // 3) introduction / summary 백업
  for (const re of [
    /"introduction"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/,
  ]) {
    const mm = html.match(re)
    if (mm?.[1]) {
      const v = decodeJsonStr(mm[1])
      if (v.length >= 20 && v.length <= 2000) return v
    }
  }
  return ''
}

function decodeJsonStr(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

// 30차-9 · 키워드 자동 추론 (최상위 지역 기반, 동·읍·면 배제)
// · mainKeyword: "최상위 광역축약 + 업종" (예: "인천 카페", "경기 카페", "서울 카페")
//   광역 없을 때만 시/군 축약 fallback
// · subKeywords: 군/시 축약 + leaf, 군/시 풀네임 + leaf, 구 + leaf, 광역 풀네임 + leaf, 단독 leaf, base, 브랜드
//   동·읍·면 단위는 상위노출에 거의 잡히지 않으므로 제외
export function inferKeywords(params: {
  name: string
  address: string
  categoryName: string
}): { mainKeyword: string; subKeywords: string[]; regionKeyword: string } {
  const top = extractTopRegion(params.address)
  const cg = extractCityGun(params.address)
  const gu = extractGu(params.address)
  const { leaf, base } = extractCategoryTokens(params.categoryName)
  const brand = extractBrandToken(params.name)

  // 메인 키워드 = 최상위 광역 축약 + 업종 (예: "인천 카페")
  // 광역이 없으면 시/군 축약 fallback (예: "수원 카페")
  const main = top.short && leaf
    ? `${top.short} ${leaf}`
    : (cg.short && leaf
        ? `${cg.short} ${leaf}`
        : (leaf || top.short || cg.short || ''))

  const subs: string[] = []
  const push = (s: string) => {
    const v = s.trim()
    if (!v || v === main) return
    if (!subs.includes(v)) subs.push(v)
  }

  // 1순위: 시/군 축약 + leaf (예: "강화 카페")
  if (cg.short && leaf) push(`${cg.short} ${leaf}`)
  // 2순위: 시/군 풀네임 + leaf (예: "강화군 카페")
  if (cg.full && cg.full !== cg.short && leaf) push(`${cg.full} ${leaf}`)
  // 3순위: 구 + leaf (서울/광역시 케이스, 예: "마포구 카페")
  if (gu && leaf) push(`${gu} ${leaf}`)
  // 4순위: 광역 풀네임 + leaf (예: "인천광역시 카페")
  if (top.full && top.full !== top.short && leaf) push(`${top.full} ${leaf}`)
  // 5순위: 광역 축약 + base (상위 카테고리, 예: "인천 음식점")
  if (top.short && base && base !== leaf) push(`${top.short} ${base}`)
  // 6순위: 단독 leaf
  if (leaf) push(leaf)
  // 7순위: base 단독
  if (base && base !== leaf) push(base)
  // 8순위: 브랜드
  if (brand) push(brand)
  if (brand && leaf) push(`${brand} ${leaf}`)

  return {
    mainKeyword: main,
    subKeywords: subs.slice(0, 8),
    regionKeyword: top.short || cg.short || ''
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

    // 30차-9 → 30차-12 개선:
    // /information 페이지에 업체 "소개" 섹션 전문·영업시간 상세가 들어있음.
    // [30차-12] JSON description 키는 메뉴 설명·피드 설명·공지까지 섞여 부정확 →
    //          HTML 마크업의 `<h2>소개</h2>` 섹션 innerText 를 최우선으로 추출.
    //          그 다음 JSON description 는 백업(메뉴 설명이 잡히면 버림).
    try {
      const infoUrl = `https://m.place.naver.com/${cat}/${placeId}/information`
      const infoHtml = await tryFetch(infoUrl)
      if (infoHtml) {
        // 1순위: HTML "소개" 섹션 innerText (가장 정확)
        const introSection = extractIntroSectionFromHtml(infoHtml)
        if (introSection && introSection.length > (info.description?.length || 0)) {
          info.description = introSection
        } else {
          // 2순위: JSON description (fallback, 대부분 메뉴 설명이라 잘 안 쓰임)
          const extraDesc = extractDescriptionFromHtml(infoHtml)
          if (extraDesc && extraDesc.length > (info.description?.length || 0)) {
            info.description = extraDesc
          }
        }
        if (!info.businessHours) {
          const extraHours = extractBusinessHoursFromHtml(infoHtml)
          if (extraHours) info.businessHours = extraHours
        }
      }
    } catch (_) {
      // /information fetch 실패해도 /home 결과는 그대로 반환
    }

    // 2000자 초과면 컷 (DB 제약 맞춤)
    if (info.description && info.description.length > 2000) {
      info.description = info.description.slice(0, 2000)
    }

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
