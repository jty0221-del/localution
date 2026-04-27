'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'

interface BizContext {
  region: string
  regionGu: string
  category: string
  placeType: string
  businessName: string
}

const DEFAULT_CTX: BizContext = {
  region: '강남', regionGu: '강남구', category: '맛집', placeType: '음식점', businessName: '내 가게',
}

const KEYWORD_PATTERNS: Record<string, string[]> = {
  '맛집':     ['맛집', '회식', '점심', '데이트', '저녁'],
  '카페':     ['카페', '브런치', '디저트', '스터디카페', '감성카페'],
  '네일샵':   ['네일', '젤네일', '패디큐어', '네일아트', '속눈썹'],
  '치과':     ['치과', '임플란트', '교정', '라미네이트', '스케일링'],
  '미용실':   ['미용실', '염색', '펌', '남자컷', '헤어컷'],
  '동물병원': ['동물병원', '건강검진', '예방접종', '중성화', '강아지'],
  '학원':     ['학원', '과외', '입시학원', '영어학원', '수학학원'],
  '피트니스': ['헬스장', 'PT', '필라테스', '요가', '크로스핏'],
  '병원':     ['병원', '의원', '진료', '예약', '상담'],
  '의원':     ['의원', '진료', '예약', '상담', '치료'],
}

function getSuffixes(category: string): string[] {
  return KEYWORD_PATTERNS[category] || KEYWORD_PATTERNS['맛집']
}

function inferCategoryFromName(name: string): string | null {
  if (!name) return null
  if (/카페|커피|베이커리|브런치/.test(name)) return '카페'
  if (/치과/.test(name)) return '치과'
  if (/네일/.test(name)) return '네일샵'
  if (/미용실|헤어샵|헤어|살롱/.test(name)) return '미용실'
  if (/동물병원/.test(name)) return '동물병원'
  if (/학원/.test(name)) return '학원'
  if (/헬스|피트니스|요가|필라테스/.test(name)) return '피트니스'
  if (/의원|한의원|정형외과|치과|병원/.test(name)) return '병원'
  return null
}

function inferPlaceType(cat: string): string {
  if (/카페|커피/.test(cat)) return '카페'
  if (/치과|병원|의원|한의원/.test(cat)) return '의료'
  if (/네일|미용|헤어|뷰티|살롱/.test(cat)) return '뷰티'
  if (/학원|교습/.test(cat)) return '교육'
  if (/헬스|피트니스|요가|필라테스/.test(cat)) return '운동'
  return '음식점'
}

function readBizContext(): BizContext {
  if (typeof window === 'undefined') return DEFAULT_CTX
  try {
    const raw1 = localStorage.getItem('localution.store_info')
    const raw2 = localStorage.getItem('localution_store')
    const p: Record<string, string> = raw1 ? JSON.parse(raw1) : raw2 ? JSON.parse(raw2) : {}

    const addrSrc = [p?.location, p?.address, p?.branch, p?.storeName, p?.name].filter(Boolean).join(' ')
    let region = DEFAULT_CTX.region
    let regionGu = DEFAULT_CTX.regionGu
    const gu = addrSrc.match(/([가-힣]{1,4})(구|군)/)
    if (gu) { region = gu[1]; regionGu = gu[1] + gu[2] }
    else {
      const known = ['해운대','광안리','서면','강남','서초','홍대','합정','이태원','성수','건대','일산','분당','판교','송도','동탄','광교','수원','안양','평촌','인천','부평','부천','대구','동성로','수성','광주','상무','대전','둔산','울산','청주','전주','제주','서귀포','창원','마산','포항','경주','천안','아산','세종','강릉','춘천','원주']
      for (const k of known) {
        if (addrSrc.includes(k)) { region = k; regionGu = k + '구'; break }
      }
    }

    const businessName = p?.name || p?.storeName || DEFAULT_CTX.businessName
    const category = p?.category || p?.industry || inferCategoryFromName(businessName) || DEFAULT_CTX.category
    return { region, regionGu, category, placeType: inferPlaceType(category), businessName }
  } catch {
    return DEFAULT_CTX
  }
}

const AREA_OPTIONS = [
  '강남구','서초구','송파구','마포구','종로구','용산구','성동구','영등포구','동작구','관악구',
  '해운대구','수영구','부산진구','남구(부산)','중구(부산)','연제구',
  '수성구','달서구','중구(대구)',
  '연수구(인천)','남동구','부평구',
  '서구(광주)','동구(광주)','광산구',
  '유성구','서구(대전)','중구(대전)',
  '남구(울산)','중구(울산)',
  '분당구','수원 영통','수원 장안','고양 일산동구','고양 일산서구','성남 분당','용인 수지','용인 기흥','안양 동안','부천 원미',
  '제주시','서귀포시','청주 상당','천안 서북','전주 완산',
]

interface RankResult {
  keyword: string
  relatedKw: string
  placeType: string
  rank: number | null
  prevRank: number | null
  loading: boolean
  error?: string
  matchedTitle?: string
  scannedAt?: string
}

function getRankColor(rank: number | null): string {
  if (rank === null) return 'text-[#8B95A1]'
  if (rank <= 3)  return 'text-[#3182F6] font-black'
  if (rank <= 5)  return 'text-[#12B76A] font-bold'
  if (rank <= 10) return 'text-[#F59E0B] font-bold'
  if (rank <= 20) return 'text-[#F04452] font-semibold'
  return 'text-[#8B95A1] font-medium'
}

function getRankBg(rank: number | null): string {
  if (rank === null) return ''
  if (rank <= 3)  return 'bg-[#EFF6FF]'
  if (rank <= 5)  return 'bg-[#ECFDF5]'
  if (rank <= 10) return 'bg-[#FFFBEB]'
  if (rank <= 20) return 'bg-[#FFF1F2]'
  return ''
}

// 로컬스토리지에서 이전 순위 이력 로드
function loadHistory(): Record<string, number[]> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('localution.rank_history') || '{}')
  } catch { return {} }
}

function saveHistory(keyword: string, rank: number | null) {
  if (typeof window === 'undefined' || rank === null) return
  try {
    const h = loadHistory()
    if (!h[keyword]) h[keyword] = []
    h[keyword] = [rank, ...h[keyword]].slice(0, 7)
    localStorage.setItem('localution.rank_history', JSON.stringify(h))
  } catch {}
}

function RankCard({ result, onRefresh }: { result: RankResult; onRefresh: () => void }) {
  const diff = result.prevRank !== null && result.rank !== null ? result.prevRank - result.rank : null

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6] hover:border-[#3182F6] transition-colors">
      <div className="px-4 py-3 border-b border-[#F2F4F6] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-medium">{result.placeType}</span>
          <span className="text-sm font-bold text-[#191F28]">📍 {result.keyword}</span>
          <span className="text-[11px] text-[#3182F6] font-medium">→ {result.relatedKw}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {result.loading ? (
            <span className="w-5 h-5 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {result.rank !== null ? (
                <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${getRankBg(result.rank)} ${getRankColor(result.rank)}`}>
                  {result.rank}위
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F2F4F6] text-[#8B95A1]">
                  {result.error ? '오류' : '100위 밖'}
                </span>
              )}
              {diff !== null && (
                <span className={`text-[11px] font-bold ${diff > 0 ? 'text-[#12B76A]' : diff < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
                  {diff > 0 ? '▲' + diff : diff < 0 ? '▼' + Math.abs(diff) : '–'}
                </span>
              )}
              <button
                onClick={onRefresh}
                className="text-[11px] text-[#8B95A1] hover:text-[#3182F6] transition-colors px-1.5 py-0.5 rounded"
                title="개별 새로고침"
              >
                ↻
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-3 text-xs">
        {result.loading ? (
          <p className="text-[#8B95A1] animate-pulse">네이버 검색 중...</p>
        ) : result.rank !== null ? (
          <div className="space-y-1">
            <p className="text-[#4E5968]">
              <span className="text-[#8B95A1]">매칭 업체: </span>
              <span className="font-medium text-[#191F28]">{result.matchedTitle || '—'}</span>
            </p>
            {result.prevRank !== null && (
              <p className="text-[#8B95A1]">직전 순위: {result.prevRank}위</p>
            )}
            {result.scannedAt && (
              <p className="text-[#8B95A1]">측정 시각: {result.scannedAt}</p>
            )}
          </div>
        ) : (
          <p className="text-[#8B95A1]">
            {result.error
              ? '⚠ ' + result.error
              : '검색 결과 100위 이내에 업체가 없습니다.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default function KeywordRankPage() {
  const [ctx, setCtx] = useState<BizContext>(DEFAULT_CTX)
  const [area, setArea] = useState(DEFAULT_CTX.regionGu)
  const [placeType, setPlaceType] = useState(DEFAULT_CTX.placeType)
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [results, setResults] = useState<RankResult[]>([])

  useEffect(() => {
    const c = readBizContext()
    setCtx(c)
    setArea(c.regionGu)
    setPlaceType(c.placeType)
    const onChange = () => {
      const nc = readBizContext()
      setCtx(nc)
      setArea(nc.regionGu)
      setPlaceType(nc.placeType)
    }
    window.addEventListener('localution:user-change', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('localution:user-change', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  // 컨텍스트가 바뀌면 키워드 목록 재생성
  const keywords = useMemo(() => {
    const suffixes = getSuffixes(ctx.category)
    const { region, businessName, placeType: pt } = ctx
    return [
      { keyword: region + ' ' + suffixes[0], relatedKw: region + ' ' + suffixes[0] + ' 추천', placeType: pt },
      { keyword: businessName + ' ' + region, relatedKw: region + ' ' + suffixes[0] + ' 상위노출', placeType: pt },
      { keyword: region + '역 ' + suffixes[0], relatedKw: region + '역 ' + suffixes[2], placeType: pt },
      { keyword: region + ' ' + suffixes[3], relatedKw: region + ' ' + suffixes[3] + ' 추천', placeType: pt },
      { keyword: region + ' ' + suffixes[1], relatedKw: region + ' ' + suffixes[1] + ' 장소', placeType: pt },
      { keyword: region + ' ' + suffixes[4], relatedKw: region + ' ' + suffixes[4] + ' 추천', placeType: pt },
    ]
  }, [ctx])

  // 초기 렌더링 시 결과 초기화
  useEffect(() => {
    const history = loadHistory()
    setResults(keywords.map(kw => ({
      ...kw,
      rank: null,
      prevRank: history[kw.keyword]?.[0] ?? null,
      loading: false,
    })))
  }, [keywords])

  // 단일 키워드 순위 조회
  const fetchRank = useCallback(async (keyword: string, businessName: string): Promise<{ rank: number | null; matchedTitle?: string; error?: string }> => {
    try {
      const res = await fetch(
        '/api/naver-rank?keyword=' + encodeURIComponent(keyword) + '&businessName=' + encodeURIComponent(businessName)
      )
      const data = await res.json()
      return { rank: data.rank ?? null, matchedTitle: data.matchedTitle, error: data.error }
    } catch {
      return { rank: null, error: '네트워크 오류' }
    }
  }, [])

  // 개별 키워드 새로고침
  const refreshOne = useCallback(async (idx: number) => {
    const kw = results[idx]
    if (!kw) return
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, loading: true } : r))
    const { rank, matchedTitle, error } = await fetchRank(kw.keyword, ctx.businessName)
    saveHistory(kw.keyword, rank)
    const history = loadHistory()
    setResults(prev => prev.map((r, i) => i === idx ? {
      ...r,
      loading: false,
      prevRank: history[kw.keyword]?.[1] ?? null,
      rank,
      matchedTitle,
      error,
      scannedAt: new Date().toLocaleString('ko-KR'),
    } : r))
  }, [results, ctx.businessName, fetchRank])

  // 전체 스캐닝
  const handleScan = useCallback(async () => {
    if (scanning) return
    setScanning(true)

    // 전체 loading 상태로
    setResults(prev => prev.map(r => ({ ...r, loading: true })))

    const history = loadHistory()

    // 병렬 호출
    const fetches = keywords.map(kw => fetchRank(kw.keyword, ctx.businessName))
    const allResults = await Promise.all(fetches)

    const now = new Date().toLocaleString('ko-KR')
    setResults(keywords.map((kw, i) => {
      const { rank, matchedTitle, error } = allResults[i]
      saveHistory(kw.keyword, rank)
      return {
        ...kw,
        rank,
        prevRank: history[kw.keyword]?.[0] ?? null,
        matchedTitle,
        error,
        loading: false,
        scannedAt: now,
      }
    }))

    setLastUpdated(now)
    setScanning(false)
  }, [scanning, keywords, ctx.businessName, fetchRank])

  const top10Count = results.filter(r => r.rank !== null && r.rank <= 10).length
  const filtered = results.filter(r =>
    search === '' || r.keyword.includes(search) || r.relatedKw.includes(search)
  )

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-16 md:pt-0 min-w-0">
        <PageHeader
          icon="📈"
          title="키워드 순위"
          subtitle="네이버 검색에서 내 업체가 몇 위인지 — 지역별 실시간 확인"
          variant="sky"
        />

        {/* 필터 바 */}
        <div className="bg-white border-b border-[#E5E8EB] px-6 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#8B95A1] font-medium">지역</span>
              <select value={area} onChange={e => setArea(e.target.value)}
                className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6]">
                {!AREA_OPTIONS.includes(area) && <option value={area}>{area} (내 매장)</option>}
                {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#8B95A1] font-medium">플레이스</span>
              <select value={placeType} onChange={e => setPlaceType(e.target.value)}
                className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6]">
                <option>음식점</option><option>카페</option><option>미용실</option>
                <option>병원</option><option>쇼핑</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="키워드 검색..."
                className="w-full text-sm border border-[#E5E8EB] rounded-lg px-3 py-1.5 bg-white text-[#191F28] focus:outline-none focus:border-[#3182F6]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleScan} disabled={scanning}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60">
                {scanning ? (
                  <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />스캐닝...</>
                ) : '🔍 스캐닝'}
              </button>
            </div>
            {lastUpdated && (
              <span className="text-[11px] text-[#8B95A1] ml-auto">마지막 업데이트: {lastUpdated}</span>
            )}
          </div>
        </div>

        {/* 업체명 안내 */}
        <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-2.5">
          <p className="text-[11px] text-[#1D4ED8]">
            🔍 <strong>측정 업체:</strong> {ctx.businessName}
            &nbsp;·&nbsp;
            <strong>지역:</strong> {ctx.region}
            &nbsp;·&nbsp;
            업체명·지역은 <a href="/settings" className="underline">설정 → 매장 정보</a>에서 변경 가능합니다.
          </p>
        </div>

        {/* 통계 바 */}
        <div className="bg-white border-b border-[#F2F4F6] px-6 py-2.5">
          <div className="flex items-center gap-6 text-xs">
            <span className="text-[#8B95A1]">
              키워드 <strong className="text-[#191F28]">{results.length}개</strong>
              {results.some(r => r.rank !== null) && (
                <> · 상위 10위 <strong className="text-[#3182F6]">{top10Count}개</strong></>
              )}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#EFF6FF]"/><span className="text-[#3182F6]">1~3위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ECFDF5]"/><span className="text-[#12B76A]">4~5위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFFBEB]"/><span className="text-[#F59E0B]">6~10위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFF1F2]"/><span className="text-[#F04452]">11~20위</span></span>
            </div>
          </div>
        </div>

        {/* 카드 그리드 */}
        <div className="flex-1 p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8B95A1]">
              <p className="text-lg font-bold mb-1">검색 결과 없음</p>
              <p className="text-sm">다른 키워드로 검색해 보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filtered.map((result, i) => (
                <RankCard key={result.keyword} result={result} onRefresh={() => refreshOne(i)} />
              ))}
            </div>
          )}

          {/* 스캐닝 전 안내 */}
          {!scanning && results.every(r => r.rank === null && !r.error) && (
            <div className="mt-6 flex flex-col items-center gap-3 text-[#8B95A1]">
              <p className="text-sm">🔍 상단의 <strong className="text-[#3182F6]">스캐닝</strong> 버튼을 눌러 실제 네이버 순위를 확인하세요</p>
              <p className="text-xs">업체명이 맞지 않으면 <a href="/settings" className="text-[#3182F6] underline">설정 → 매장 정보</a>에서 수정해 주세요</p>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  )
}
