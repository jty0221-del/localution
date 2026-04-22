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
  let sectionHtml = nextHeader > 0 ? rest.slice(0, nextHeader) : rest.slice(0, 20000)

  // 30차-15-E: 다음 섹션 헤더 직전에서 잘린 미완성 태그(`<div class="`) 꼬리 제거
  //   nextHeader 가 `<div class="place_section_header_title"` 태그 한가운데를 자를 수 있어
  //   뒤에 `<div class="` 같은 비공식 태그 문자열이 남고, 이후 `<[^>]+>` 치환으로는 없어지지 않아
  //   최종 텍스트 꼬리에 `<div class="` 리터럴이 노출되는 버그가 있었음.
  //   → 마지막 `<` 이후 `>` 없으면 해당 `<` 부터 절삭.
  const lastLt = sectionHtml.lastIndexOf('<')
  if (lastLt >= 0 && sectionHtml.indexOf('>', lastLt) < 0) {
    sectionHtml = sectionHtml.slice(0, lastLt)
  }

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
// · subKeywords: 중복 없이 의미가 다른 최대 4개 — 37차-2 간소화
//   (풀네임 variant 제거: "강화군 카페" 같이 "강화 카페"와 실질 동일한 항목 컷)
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
  // 2순위: 구 + leaf (서울/광역시 케이스, 예: "마포구 카페")
  if (gu && leaf) push(`${gu} ${leaf}`)
  // 3순위: 브랜드 + leaf (예: "스타벅스 카페")
  if (brand && leaf) push(`${brand} ${leaf}`)
  // 4순위: 단독 leaf (long-tail)
  if (leaf) push(leaf)

  return {
    mainKeyword: main,
    subKeywords: subs.slice(0, 4),
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

// ============================================================
// 30차-15-B · 네이버 플레이스 방문자 리뷰 공개 수집기
// ------------------------------------------------------------
// 소스: m.place.naver.com/{cat}/{placeId}/review/visitor (SSR HTML)
// 로그인 불필요, 공개 리뷰만 수집. 첫 페이지 기본 10개.
//
// 전략: naver 는 클래스명이 해시(pui__Xxxxx)로 변동하므로 HTML 선택자 대신
//        SSR 에 박혀 있는 Apollo 캐시(__APOLLO_STATE__ / __NEXT_DATA__ / 본문 속 JSON)
//        를 정규식으로 긁어 VisitorReviewItem 구조체를 복원한다.
// ============================================================
export type VisitorReview = {
  reviewId: string            // platform_review_id (naver 내 고유)
  authorName: string | null
  rating: number | null       // 1~5
  body: string                // 리뷰 본문
  visitedAt: string | null    // YYYY-MM-DD or ISO
  postedAt: string | null     // ISO
  photos: string[]            // 첨부 사진 URL
  raw?: unknown               // 디버깅용 원본
}

function decodeJsonStringField(s: string): string {
  try {
    // JSON.parse 로 이스케이프 해석 (JSON 문자열로 감싸서)
    return JSON.parse('"' + s.replace(/"/g, '\\"').replace(/\\"/g, '\\"') + '"')
  } catch {
    return s
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  }
}

/**
 * Apollo/Apollo-like 캐시 JSON 에서 VisitorReviewItem 추출.
 * 네이버는 `"VisitorReviewItem:{id}": { "id":"...", "body":"...", "rating":5, "visitedDate":"...", ... }`
 * 꼴로 객체를 뿌린다. 각 객체는 한 줄일수도, 여러줄일수도 있으므로 밸런스 카운팅으로 잘라낸다.
 */
function extractApolloReviews(html: string): VisitorReview[] {
  const results: VisitorReview[] = []
  const keyRegex = /"VisitorReviewItem:([^"]+)"\s*:\s*\{/g
  let m: RegExpExecArray | null
  while ((m = keyRegex.exec(html)) !== null) {
    const startIdx = m.index + m[0].length - 1 // 여는 { 위치
    // 중괄호 균형 맞추기
    let depth = 0
    let i = startIdx
    let inStr = false
    let esc = false
    for (; i < html.length; i++) {
      const ch = html[i]
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0) { i++; break } }
    }
    if (depth !== 0) continue
    const objStr = html.slice(startIdx, i)
    const parsed = parseReviewObject(objStr, m[1])
    if (parsed) results.push(parsed)
  }
  return results
}

/**
 * VisitorReviewItem JSON 문자열 하나를 VisitorReview 로 변환.
 * 필드명이 플랫폼마다 다르므로 여러 후보를 시도.
 */
function parseReviewObject(objStr: string, fallbackId: string): VisitorReview | null {
  const pick = (re: RegExp): string | null => {
    const mm = objStr.match(re)
    return mm?.[1] ?? null
  }
  const pickNum = (re: RegExp): number | null => {
    const mm = objStr.match(re)
    if (!mm?.[1]) return null
    const n = Number(mm[1])
    return Number.isFinite(n) ? n : null
  }
  const rawBody =
    pick(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    pick(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    ''
  if (!rawBody) return null // 본문 없는 건 리뷰 아님 (예: 숨겨진 리뷰)

  const body = decodeJsonStringField(rawBody).trim()
  if (body.length < 2) return null

  const rating =
    pickNum(/"rating"\s*:\s*(\d+)/) ||
    pickNum(/"ratingScore"\s*:\s*(\d+)/) ||
    null

  const authorRaw =
    pick(/"nickname"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    pick(/"author"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    pick(/"userName"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    null
  const authorName = authorRaw ? decodeJsonStringField(authorRaw) : null

  const visitedRaw =
    pick(/"visited(?:Date|At)?"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    pick(/"visitDate"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    null
  const visitedAt = visitedRaw ? decodeJsonStringField(visitedRaw) : null

  const postedRaw =
    pick(/"created(?:At|Date)?"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    pick(/"registeredAt"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    null
  const postedAt = postedRaw ? decodeJsonStringField(postedRaw) : null

  // 사진: "thumbnail":"..." / "url":"..." 여러 개 — 간단하게 URL 배열 수집
  const photos: string[] = []
  const picRe = /"(?:thumbnail|thumbnailUrl|url|original)"\s*:\s*"(https?:\/\/[^"\\]+)"/g
  let pm: RegExpExecArray | null
  while ((pm = picRe.exec(objStr)) !== null) {
    if (!photos.includes(pm[1])) photos.push(pm[1])
  }

  const reviewId =
    pick(/"id"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    pick(/"reviewId"\s*:\s*"((?:[^"\\]|\\.)*)"/) ||
    fallbackId
  const cleanId = String(reviewId).replace(/^VisitorReviewItem:/, '')

  return {
    reviewId: cleanId,
    authorName,
    rating,
    body,
    visitedAt,
    postedAt,
    photos: photos.slice(0, 6),
  }
}

// ============================================================
// 30차-16 · 네이버 방문자 리뷰 수집 — GraphQL 전환
// ------------------------------------------------------------
// 네이버가 m.place.naver.com SSR 에서 "VisitorReviewItem:" Apollo 캐시를
// 더 이상 내리지 않음(CSR 전환). 2026-04 기준 SSR 스크래핑은 영구 0건.
//
// 대신 공식 CSR 이 사용하는 pcmap-api.place.naver.com/graphql 엔드포인트로
// 직접 POST 해서 리뷰 수집한다.
//
// 스키마 (실측 확인, 2026-04-22):
//   POST https://pcmap-api.place.naver.com/graphql
//   Body: [{
//     operationName: "getVisitorReviews",
//     variables: { input: { businessId, businessType, item:"0", page, size,
//                           isPhotoUsed:false, includeContent:true, getReactions:true } },
//     query: "...visitorReviews(input:$input){ total items{id rating body visited visitedDate
//             created author{id nickname} originType userIdno media{type thumbnail videoId trailerUrl}}}"
//   }]
//   Response: [{ data: { visitorReviews: { total, items: [...] } } }]
//
// rating 은 네이버가 2022년 이후 대부분 null. 별점 표시는 영수증 리뷰 속성이 기준.
// ============================================================

const NAVER_GRAPHQL_URL = 'https://pcmap-api.place.naver.com/graphql'
const VISITOR_REVIEWS_QUERY =
  'query getVisitorReviews($input: VisitorReviewsInput) { visitorReviews(input: $input) { total items { id rating body visited visitedDate created author { id nickname } originType userIdno media { type thumbnail videoId trailerUrl } } } }'

type GraphQLReviewItem = {
  id: string
  rating: number | null
  body: string | null
  visited: string | null
  visitedDate: string | null
  created: string | null
  author: { id: string | null; nickname: string | null } | null
  originType: string | null
  userIdno: string | null
  media: Array<{ type: string | null; thumbnail: string | null; videoId: string | null; trailerUrl: string | null }> | null
}

async function fetchVisitorReviewsGraphQL(
  placeId: string,
  businessType: string,
  size: number = 20,
): Promise<VisitorReview[] | null> {
  const body = [
    {
      operationName: 'getVisitorReviews',
      variables: {
        input: {
          businessId: placeId,
          businessType,
          item: '0',
          page: 1,
          size,
          isPhotoUsed: false,
          includeContent: true,
          getReactions: true,
        },
      },
      query: VISITOR_REVIEWS_QUERY,
    },
  ]
  try {
    const res = await fetch(NAVER_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': '*/*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Content-Type': 'application/json',
        'Origin': 'https://m.place.naver.com',
        'Referer': `https://m.place.naver.com/${businessType}/${placeId}/review/visitor`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const j = (await res.json()) as Array<{
      data?: { visitorReviews?: { total: number; items: GraphQLReviewItem[] } }
      errors?: unknown
    }>
    const d = j?.[0]?.data?.visitorReviews
    if (!d) return null
    if (!Array.isArray(d.items)) return []
    if (d.items.length === 0) return [] // businessType 미스매치 or 리뷰 0건 → 다음 카테고리 시도

    return d.items.map((it): VisitorReview => {
      const body = (it.body ?? '').trim()
      const photos = Array.isArray(it.media)
        ? it.media
            .map((m) => m?.thumbnail || m?.trailerUrl)
            .filter((u): u is string => typeof u === 'string' && u.length > 0)
            .slice(0, 6)
        : []
      return {
        reviewId: String(it.id),
        authorName: it.author?.nickname ?? null,
        rating: typeof it.rating === 'number' ? it.rating : null,
        body,
        visitedAt: it.visitedDate || it.visited || null,
        postedAt: it.created || null,
        photos,
      }
    })
  } catch (e) {
    console.warn(
      '[naver-place] GraphQL fetch failed',
      placeId,
      businessType,
      e instanceof Error ? e.message : e,
    )
    return null
  }
}

/**
 * 본 함수: placeId 하나에서 최근 방문자 리뷰 수집.
 * - hint 카테고리(businessType) 우선, 실패 시 전체 순회
 * - 30차-16 부터 GraphQL 우선, 구 SSR 파서는 fallback 으로만 유지 (회귀 대응)
 */
export async function fetchVisitorReviews(
  placeId: string,
  hint?: string | null,
): Promise<VisitorReview[]> {
  if (!/^\d+$/.test(placeId)) return []

  const tryOrder: string[] = []
  if (hint && (PLACE_CATEGORIES as readonly string[]).includes(hint)) tryOrder.push(hint)
  for (const c of PLACE_CATEGORIES) if (!tryOrder.includes(c)) tryOrder.push(c)

  // 1) GraphQL 우선 시도
  for (const cat of tryOrder) {
    const reviews = await fetchVisitorReviewsGraphQL(placeId, cat)
    if (reviews && reviews.length > 0) return reviews
    // null = 네트워크/스키마 오류, [] = 카테고리 미스매치 or 리뷰 없음 → 다음 카테고리 계속
  }

  // 2) Fallback — 구 SSR Apollo 파서 (네이버가 SSR 을 되돌릴 경우 대비)
  for (const cat of tryOrder) {
    const url = `https://m.place.naver.com/${cat}/${placeId}/review/visitor`
    const html = await tryFetch(url)
    if (!html) continue
    const reviews = extractApolloReviews(html)
    if (reviews.length > 0) return reviews
  }

  return []
}
