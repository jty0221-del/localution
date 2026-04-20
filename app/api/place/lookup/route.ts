import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── 네이버 플레이스 URL 카테고리 후보 ─────────────────
const CATEGORIES = [
  'restaurant', 'place', 'cafe', 'hairshop', 'beautyshop',
  'accommodation', 'hospital', 'attraction',
]

type PlaceInfo = {
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

// <meta> 속성 순서 무관 파싱 (네이버는 id=...가 property=...보다 먼저 옴)
function getMetaContent(html: string, key: string): string {
  const tagRegex = new RegExp(`<meta[^>]*(?:property|name|id)="${key}"[^>]*>`, 'i')
  const tag = html.match(tagRegex)?.[0]
  if (!tag) return ''
  const content = tag.match(/content="([^"]*)"/i)?.[1] || ''
  return content
}

// og:description "방문자리뷰 247 · 블로그리뷰 116" 에서 숫자 추출
function parseReviewFromOgDesc(desc: string): { visitor: number | null; blog: number | null } {
  const v = desc.match(/방문자리뷰\s*([\d,]+)/)?.[1]?.replace(/,/g, '')
  const b = desc.match(/블로그리뷰\s*([\d,]+)/)?.[1]?.replace(/,/g, '')
  return {
    visitor: v ? Number(v) : null,
    blog: b ? Number(b) : null,
  }
}

function parsePlaceHtml(html: string, placeId: string, category: string, sourceUrl: string): PlaceInfo {
  // og 태그 (속성 순서 무관)
  const ogTitle = getMetaContent(html, 'og:title')
  const ogDesc = getMetaContent(html, 'og:description')
  const ogImage = getMetaContent(html, 'og:image')

  // 상호명: og:title에서 " : 네이버" / " - 네이버" / " | 네이버" 꼬리 제거
  const name = ogTitle
    .replace(/\s*[-:|]\s*네이버.*$/u, '')
    .trim()

  // 임베드 JSON 에서 핵심 필드 회수
  // 네이버는 JSON 여러 카피를 뿌리므로 첫 매치 신뢰
  const address = pickFirst(html, /"address"\s*:\s*"([^"\\]+)"/)
  const roadAddress = pickFirst(html, /"roadAddress"\s*:\s*"([^"\\]+)"/)
  const categoryName = pickFirst(html, /"category"\s*:\s*"([^"\\]+)"/)
  const phone = pickFirst(html, /"phone"\s*:\s*"([^"\\]*)"/) ||
                pickFirst(html, /"virtualPhone"\s*:\s*"([^"\\]*)"/)

  // og:description 에서 방문자/블로그 리뷰수 파싱 (JSON 필드보다 확실)
  const { visitor, blog } = parseReviewFromOgDesc(ogDesc)

  // 평점 (있을 경우)
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
      // 네이버 응답 기본 5초, 네트워크 튐 대비 8초 cap
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    if (html.length < 2000) return null
    if (html.includes('존재하지 않는 업체') || html.includes('서비스 종료')) return null
    return html
  } catch (e) {
    console.warn('[place/lookup] fetch failed for', url, e instanceof Error ? e.message : e)
    return null
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const hintCategory = req.nextUrl.searchParams.get('category')

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 })
  }

  // 카테고리 우선순위: hint → 기본 순서
  const tryOrder: string[] = []
  if (hintCategory && CATEGORIES.includes(hintCategory)) tryOrder.push(hintCategory)
  for (const c of CATEGORIES) if (!tryOrder.includes(c)) tryOrder.push(c)

  for (const cat of tryOrder) {
    const url = `https://m.place.naver.com/${cat}/${id}/home`
    const html = await tryFetch(url)
    if (!html) continue
    const info = parsePlaceHtml(html, id, cat, url)
    // 상호명이 안 잡힌 경우는 카테고리 miss 가능성 → 다음 시도
    if (!info.name) continue
    return NextResponse.json({ ok: true, info })
  }

  return NextResponse.json(
    { ok: false, error: 'not_found', message: '네이버 플레이스에서 해당 ID를 찾지 못했습니다. 비공개 업체이거나 ID가 잘못됐을 수 있어요.' },
    { status: 404 },
  )
}
