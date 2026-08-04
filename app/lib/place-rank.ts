// app/lib/place-rank.ts
// ============================================================
// 네이버 플레이스 키워드 순위 측정 — 단일 출처
//
// 기존 app/api/naver-rank/route.ts 의 한계를 보완한 재구현:
//   · 기존: 지역검색 오픈API + 상호명 문자열 매칭
//     - 지역검색 API 는 start 파라미터 최대 1, display 최대 5
//       → 구조적으로 상위 5위까지만 확인 가능
//     - 상호명 매칭은 "OO점" 지점명·띄어쓰기 차이로 오탐 발생
//   · 신규: placeId 로 매칭(정확) + 다중 전략 순차 시도(깊은 순위)
//
// 주의:
//   map.naver.com / m.place.naver.com 은 비공식 엔드포인트다.
//   네이버가 응답 구조를 바꾸면 파싱이 깨질 수 있으므로
//   전략별로 실패를 격리하고 method 를 응답에 남겨 진단 가능하게 한다.
//   Vercel 데이터센터 IP 가 차단되면 worker(프록시 경유)로 이관해야 한다.
// ============================================================

export type RankMethod = 'map_api' | 'mobile_list' | 'local_openapi' | 'none'

export type PlaceRankResult = {
  /** 1-base 순위. 미노출이면 null */
  rank: number | null
  /** 스캔한 후보 총 개수 (네이버가 알려준 전체 건수 또는 파싱된 개수) */
  total: number
  /** 어떤 전략으로 측정했는지 — 운영 진단용 */
  method: RankMethod
  /** 매칭된 업체명 (검증용) */
  matchedName: string | null
  /** 전략별 실패 사유 누적 — 전부 실패했을 때만 의미 있음 */
  errors: string[]
}

export type ScanRankParams = {
  keyword: string
  /** 우선 매칭 기준. 있으면 상호명보다 훨씬 정확 */
  placeId?: string | null
  /** placeId 로 못 찾을 때 폴백 매칭 */
  businessName?: string | null
  /** 이 순위까지만 스캔 (기본 100) */
  maxRank?: number
}

const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'

const FETCH_TIMEOUT_MS = 9000

function stripHtml(s: string): string {
  return String(s || '').replace(/<[^>]*>/g, '').trim()
}

/** 상호명 비교용 정규화 — 공백·특수문자 제거, 소문자 */
function normalizeName(s: string): string {
  return stripHtml(s)
    .toLowerCase()
    .replace(/[\s\-_.,()[\]]/g, '')
}

/**
 * 상호명 매칭. placeId 가 없을 때만 사용하는 폴백이라
 * 오탐을 줄이기 위해 양방향 포함 + 최소 길이 조건을 건다.
 */
function nameMatches(candidate: string, target: string): boolean {
  const c = normalizeName(candidate)
  const t = normalizeName(target)
  if (!c || !t) return false
  if (t.length < 2) return false
  if (t === '내가게' || t === '내매장') return false
  return c.includes(t) || t.includes(c)
}

/** 후보 1건 — 전략별 파서가 이 형태로 정규화해서 반환 */
type Candidate = { placeId: string | null; name: string }

function findIndex(list: Candidate[], placeId?: string | null, businessName?: string | null): number {
  // 1순위: placeId 완전 일치
  if (placeId) {
    const idx = list.findIndex(c => c.placeId && c.placeId === placeId)
    if (idx >= 0) return idx
  }
  // 2순위: 상호명 매칭
  if (businessName) {
    const idx = list.findIndex(c => nameMatches(c.name, businessName))
    if (idx >= 0) return idx
  }
  return -1
}

async function fetchJson(url: string, referer: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA_MOBILE,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        Referer: referer,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function fetchHtml(url: string, referer: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA_MOBILE,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        Referer: referer,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    if (html.length < 1000) return null
    return html
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────
// 전략 1: map.naver.com 통합검색 JSON
//   가장 깊은 순위까지 확인 가능 (한 번에 수십 건)
// ─────────────────────────────────────────────
async function strategyMapApi(params: ScanRankParams): Promise<PlaceRankResult | null> {
  const { keyword, placeId, businessName, maxRank = 100 } = params
  const collected: Candidate[] = []
  let total = 0
  const PER = 50

  for (let page = 1; collected.length < maxRank; page++) {
    const url =
      'https://map.naver.com/p/api/search/allSearch' +
      `?query=${encodeURIComponent(keyword)}&type=place&searchCoord=&page=${page}&displayCount=${PER}`
    const json = await fetchJson(url, 'https://map.naver.com/')
    if (!json) break

    const place = json?.result?.place
    const list: any[] = Array.isArray(place?.list) ? place.list : []
    if (!list.length) break

    total = Number(place?.totalCount) || total || collected.length + list.length

    for (const it of list) {
      collected.push({
        placeId: it?.id != null ? String(it.id) : null,
        name: String(it?.name || it?.title || ''),
      })
    }

    // 더 받을 게 없으면 종료
    if (list.length < PER) break
    if (page >= Math.ceil(maxRank / PER)) break
  }

  if (!collected.length) return null

  const idx = findIndex(collected, placeId, businessName)
  return {
    rank: idx >= 0 ? idx + 1 : null,
    total: total || collected.length,
    method: 'map_api',
    matchedName: idx >= 0 ? collected[idx].name : null,
    errors: [],
  }
}

// ─────────────────────────────────────────────
// 전략 2: m.place.naver.com 검색 결과 HTML
//   Apollo state 에 박힌 placeId 등장 순서로 순위 추정
// ─────────────────────────────────────────────
async function strategyMobileList(params: ScanRankParams): Promise<PlaceRankResult | null> {
  const { keyword, placeId, businessName } = params
  const url = `https://m.place.naver.com/place/list?query=${encodeURIComponent(keyword)}`
  const html = await fetchHtml(url, 'https://m.naver.com/')
  if (!html) return null

  // "PlaceSummary:12345" / "id":"12345" 형태로 등장하는 placeId 를 순서대로 수집
  const ids: string[] = []
  const seen = new Set<string>()
  const re = /"id"\s*:\s*"(\d{6,})"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const id = m[1]
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  if (!ids.length) return null

  const candidates: Candidate[] = ids.map(id => ({ placeId: id, name: '' }))
  const idx = findIndex(candidates, placeId, null)

  // 이 전략은 상호명을 못 뽑으므로 placeId 매칭만 신뢰한다.
  if (idx < 0 && !placeId && businessName) return null

  return {
    rank: idx >= 0 ? idx + 1 : null,
    total: ids.length,
    method: 'mobile_list',
    matchedName: null,
    errors: [],
  }
}

// ─────────────────────────────────────────────
// 전략 3: 네이버 지역검색 오픈API (공식)
//   start 최대 1 · display 최대 5 → 상위 5위까지만.
//   앞의 두 전략이 모두 막혔을 때의 최후 폴백.
// ─────────────────────────────────────────────
async function strategyLocalOpenApi(params: ScanRankParams): Promise<PlaceRankResult | null> {
  const { keyword, placeId, businessName } = params
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const url =
      'https://openapi.naver.com/v1/search/local.json' +
      `?query=${encodeURIComponent(keyword)}&display=5&start=1&sort=random`
    const res = await fetch(url, {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const items: any[] = Array.isArray(data?.items) ? data.items : []
    if (!items.length) return null

    const candidates: Candidate[] = items.map(it => ({
      placeId: String(it?.link || '').match(/\/(\d{5,})(?:\/|$|\?)/)?.[1] || null,
      name: stripHtml(it?.title || ''),
    }))

    const idx = findIndex(candidates, placeId, businessName)
    return {
      rank: idx >= 0 ? idx + 1 : null,
      total: Number(data?.total) || items.length,
      method: 'local_openapi',
      matchedName: idx >= 0 ? candidates[idx].name : null,
      errors: [],
    }
  } catch {
    return null
  }
}

/**
 * 키워드 순위 측정 — 전략을 순서대로 시도하고 첫 성공을 반환.
 *
 * "성공" 판정은 `순위를 찾았을 때`가 아니라 `후보 목록을 받아왔을 때`다.
 * 후보를 받았는데 우리 매장이 없으면 그건 진짜 미노출(rank=null)이므로
 * 다음 전략으로 넘어가지 않는다.
 */
export async function scanPlaceRank(params: ScanRankParams): Promise<PlaceRankResult> {
  const keyword = String(params.keyword || '').trim()
  if (!keyword) {
    return { rank: null, total: 0, method: 'none', matchedName: null, errors: ['keyword_required'] }
  }
  if (!params.placeId && !params.businessName) {
    return { rank: null, total: 0, method: 'none', matchedName: null, errors: ['placeId_or_name_required'] }
  }

  const errors: string[] = []
  const strategies: Array<[RankMethod, (p: ScanRankParams) => Promise<PlaceRankResult | null>]> = [
    ['map_api', strategyMapApi],
    ['mobile_list', strategyMobileList],
    ['local_openapi', strategyLocalOpenApi],
  ]

  for (const [name, fn] of strategies) {
    try {
      const r = await fn({ ...params, keyword })
      if (r) return { ...r, errors }
      errors.push(`${name}:empty`)
    } catch (e) {
      errors.push(`${name}:${e instanceof Error ? e.message : 'error'}`)
    }
  }

  return { rank: null, total: 0, method: 'none', matchedName: null, errors }
}
