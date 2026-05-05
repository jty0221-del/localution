'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { TrendingUp, Search, AlertTriangle, RefreshCw } from 'lucide-react'

// ── 업체 컨텍스트 (업종·지역·상호) ─────────────────────
interface BizContext {
  region: string       // '강남', '부평', '해운대' 등
  regionGu: string     // '강남구', '부평구' 등 (드롭다운 표시용)
  category: string     // '맛집', '네일샵', '치과' 등
  placeType: string    // 테이블 뱃지 — '음식점', '뷰티', '의료' 등
  businessName: string // 업체명
}

const DEFAULT_CTX: BizContext = {
  region: '강남', regionGu: '강남구', category: '맛집', placeType: '음식점', businessName: '내 가게',
}

// 키워드 패턴 (업종별 접미어 5개)
const KEYWORD_PATTERNS: Record<string, string[]> = {
  '맛집':     ['맛집', '회식', '점심', '데이트', '저녁'],
  '카페':     ['카페', '브런치', '디저트', '스터디카페', '감성카페'],
  '네일샵':   ['네일', '젤네일', '페디큐어', '네일아트', '속눈썹'],
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

// 프로필에서 업체 컨텍스트 추출
function readBizContext(): BizContext {
  if (typeof window === 'undefined') return DEFAULT_CTX
  try {
    const raw1 = localStorage.getItem('localution.store_info')
    const raw2 = localStorage.getItem('localution_store')
    const p: any = raw1 ? JSON.parse(raw1) : raw2 ? JSON.parse(raw2) : {}

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

// 지역 드롭다운 옵션 (전국 주요 지역)
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

// ── 타입 ──────────────────────────────────────────────
interface RankRow {
  date: string
  rank: number | null
  prev: number | null
  blogCount: number
  searchVol: number
  score: number
}

interface KeywordGroup {
  id: number
  keyword: string
  relatedKw: string
  placeType: string
  volume: number
  rows: RankRow[]
}

// ── 날짜 동적 생성 (오늘 기준 최근 7일) ─────────
function recentDates(n = 7): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const yy = String(d.getFullYear()).slice(2)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yy}.${mm}.${dd}`)
  }
  return dates
}
const RECENT = recentDates()

// ── 목업 데이터 (실제: 네이버 Search API 연동) ─────────
// 6가지 순위 프로필 (상위권~중하위권까지 다양한 경쟁 시나리오)
const ROW_TEMPLATES = [
  // 1. 주력 대형 키워드 — 상승 중 (3→5→4→7…)
  { volume: 2340, rows: [
    { date: RECENT[0], rank: 3,  prev: 5,  blogCount: 380, searchVol: 2340, score: 91.2 },
    { date: RECENT[1], rank: 5,  prev: 4,  blogCount: 375, searchVol: 2280, score: 85.4 },
    { date: RECENT[2], rank: 4,  prev: 7,  blogCount: 371, searchVol: 2310, score: 88.1 },
    { date: RECENT[3], rank: 7,  prev: 6,  blogCount: 365, searchVol: 2290, score: 79.3 },
    { date: RECENT[4], rank: 6,  prev: 9,  blogCount: 360, searchVol: 2200, score: 82.0 },
    { date: RECENT[5], rank: 9,  prev: 11, blogCount: 358, searchVol: 2180, score: 74.5 },
    { date: RECENT[6], rank: 11, prev: 10, blogCount: 352, searchVol: 2150, score: 69.8 },
  ]},
  // 2. 브랜드 키워드 — 1위 고정
  { volume: 310, rows: [
    { date: RECENT[0], rank: 1,  prev: 1,  blogCount: 42,  searchVol: 310,  score: 98.4 },
    { date: RECENT[1], rank: 1,  prev: 2,  blogCount: 41,  searchVol: 308,  score: 97.1 },
    { date: RECENT[2], rank: 2,  prev: 1,  blogCount: 40,  searchVol: 305,  score: 94.2 },
    { date: RECENT[3], rank: 1,  prev: 3,  blogCount: 39,  searchVol: 300,  score: 98.0 },
    { date: RECENT[4], rank: 3,  prev: 2,  blogCount: 38,  searchVol: 295,  score: 91.3 },
    { date: RECENT[5], rank: 2,  prev: 4,  blogCount: 37,  searchVol: 290,  score: 94.5 },
    { date: RECENT[6], rank: 4,  prev: 3,  blogCount: 36,  searchVol: 285,  score: 88.6 },
  ]},
  // 3. 대형 경쟁 키워드 — 중위권 (12~21위)
  { volume: 2860, rows: [
    { date: RECENT[0], rank: 12, prev: 15, blogCount: 786, searchVol: 2860, score: 67.4 },
    { date: RECENT[1], rank: 15, prev: 13, blogCount: 780, searchVol: 2800, score: 59.2 },
    { date: RECENT[2], rank: 13, prev: 18, blogCount: 775, searchVol: 2820, score: 63.8 },
    { date: RECENT[3], rank: 18, prev: 16, blogCount: 768, searchVol: 2750, score: 54.1 },
    { date: RECENT[4], rank: 16, prev: 21, blogCount: 760, searchVol: 2700, score: 58.3 },
    { date: RECENT[5], rank: 21, prev: 19, blogCount: 755, searchVol: 2680, score: 47.9 },
    { date: RECENT[6], rank: 19, prev: 22, blogCount: 750, searchVol: 2650, score: 52.1 },
  ]},
  // 4. 중형 키워드 — 중상위권 (8~16위)
  { volume: 2570, rows: [
    { date: RECENT[0], rank: 8,  prev: 10, blogCount: 521, searchVol: 2570, score: 76.2 },
    { date: RECENT[1], rank: 10, prev: 9,  blogCount: 517, searchVol: 2520, score: 71.4 },
    { date: RECENT[2], rank: 9,  prev: 12, blogCount: 512, searchVol: 2540, score: 74.1 },
    { date: RECENT[3], rank: 12, prev: 11, blogCount: 505, searchVol: 2480, score: 66.8 },
    { date: RECENT[4], rank: 11, prev: 14, blogCount: 500, searchVol: 2450, score: 69.3 },
    { date: RECENT[5], rank: 14, prev: 16, blogCount: 495, searchVol: 2420, score: 61.5 },
    { date: RECENT[6], rank: 16, prev: 15, blogCount: 488, searchVol: 2390, score: 57.8 },
  ]},
  // 5. 롱테일 키워드 — 상위권 (2~5위)
  { volume: 196, rows: [
    { date: RECENT[0], rank: 2,  prev: 3,  blogCount: 35,  searchVol: 196,  score: 95.1 },
    { date: RECENT[1], rank: 3,  prev: 2,  blogCount: 34,  searchVol: 192,  score: 91.8 },
    { date: RECENT[2], rank: 2,  prev: 4,  blogCount: 33,  searchVol: 194,  score: 94.6 },
    { date: RECENT[3], rank: 4,  prev: 3,  blogCount: 32,  searchVol: 188,  score: 88.2 },
    { date: RECENT[4], rank: 3,  prev: 5,  blogCount: 31,  searchVol: 185,  score: 91.0 },
    { date: RECENT[5], rank: 5,  prev: 4,  blogCount: 30,  searchVol: 180,  score: 84.7 },
    { date: RECENT[6], rank: 4,  prev: 6,  blogCount: 29,  searchVol: 178,  score: 88.3 },
  ]},
  // 6. 대형 경쟁 키워드 — 하위권 (25~38위, 개선 필요)
  { volume: 2200, rows: [
    { date: RECENT[0], rank: 25, prev: 30, blogCount: 468, searchVol: 2200, score: 41.3 },
    { date: RECENT[1], rank: 30, prev: 27, blogCount: 462, searchVol: 2150, score: 34.8 },
    { date: RECENT[2], rank: 27, prev: 32, blogCount: 455, searchVol: 2170, score: 38.9 },
    { date: RECENT[3], rank: 32, prev: 29, blogCount: 448, searchVol: 2100, score: 31.2 },
    { date: RECENT[4], rank: 29, prev: 35, blogCount: 440, searchVol: 2080, score: 35.6 },
    { date: RECENT[5], rank: 35, prev: 33, blogCount: 435, searchVol: 2050, score: 27.4 },
    { date: RECENT[6], rank: 33, prev: 38, blogCount: 428, searchVol: 2020, score: 30.1 },
  ]},
] as const

// 업체 컨텍스트 기반으로 6개 키워드 그룹을 동적 생성
function buildMockData(ctx: BizContext): KeywordGroup[] {
  const suffixes = getSuffixes(ctx.category) // 5개 접미어
  const { region, businessName, placeType } = ctx
  // 키워드 슬롯 6개 × 의미
  const specs = [
    { id: 1, keyword: `${region} ${suffixes[0]}`,           relatedKw: `${region} ${suffixes[0]} 상위노출`,     tpl: 0 }, // 주력
    { id: 2, keyword: `${businessName} ${region}`,          relatedKw: `${region} ${suffixes[0]} 추천`,         tpl: 1 }, // 브랜드
    { id: 3, keyword: `${region}역 ${suffixes[0]}`,         relatedKw: `${region}역 ${suffixes[2]}`,            tpl: 2 }, // 역세권
    { id: 4, keyword: `${region} ${suffixes[3]}`,           relatedKw: `${region} ${suffixes[3]} 추천`,         tpl: 3 }, // 중형
    { id: 5, keyword: `${region} ${suffixes[1]}`,           relatedKw: `${region} ${suffixes[1]} 장소`,         tpl: 4 }, // 롱테일
    { id: 6, keyword: `${region} ${suffixes[4]}`,           relatedKw: `${region} ${suffixes[4]} 추천`,         tpl: 5 }, // 대형 하위
  ]
  return specs.map(s => ({
    id: s.id,
    keyword: s.keyword,
    relatedKw: s.relatedKw,
    placeType,
    volume: ROW_TEMPLATES[s.tpl].volume,
    rows: ROW_TEMPLATES[s.tpl].rows as unknown as RankRow[],
  }))
}

// ── 순위 색상 ─────────────────────────────────────────
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

function getDiff(rank: number | null, prev: number | null) {
  if (rank === null || prev === null) return null
  return prev - rank // 양수 = 상승
}

// ── 키워드 카드 ───────────────────────────────────────
function KeywordCard({ group }: { group: KeywordGroup }) {
  const latest = group.rows[0]
  const diff = getDiff(latest.rank, latest.prev)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6] hover:border-[#3182F6] transition-colors">
      {/* 카드 헤더 */}
      <div className="px-4 py-3 border-b border-[#F2F4F6] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-medium">{group.placeType}</span>
          <span className="text-sm font-bold text-[#191F28]">{group.keyword}</span>
          <span className="text-[11px] text-[#3182F6] font-medium">→ {group.relatedKw}</span>
          <span className="text-[11px] text-[#8B95A1]">검색 {group.volume.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 최신 순위 뱃지 */}
          {latest.rank !== null && (
            <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${getRankBg(latest.rank)} ${getRankColor(latest.rank)}`}>
              {latest.rank}위
            </span>
          )}
          {diff !== null && (
            <span className={`text-[11px] font-bold ${diff > 0 ? 'text-[#12B76A]' : diff < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
              {diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : '–'}
            </span>
          )}
        </div>
      </div>

      {/* 순위 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F8F9FA] text-[#8B95A1]">
              <th className="text-left px-3 py-2 font-medium">날짜</th>
              <th className="text-center px-2 py-2 font-medium">순위</th>
              <th className="text-center px-2 py-2 font-medium">전주</th>
              <th className="text-right px-2 py-2 font-medium">블로그 수</th>
              <th className="text-right px-2 py-2 font-medium">검색량</th>
              <th className="text-right px-3 py-2 font-medium">최종점수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F8F9FA]">
            {group.rows.map((row, i) => {
              const d = getDiff(row.rank, row.prev)
              return (
                <tr key={i} className={`hover:bg-[#FAFBFF] transition-colors ${i === 0 ? 'bg-[#FAFBFF]' : ''}`}>
                  <td className="px-3 py-2 text-[#8B95A1]">{row.date}</td>
                  <td className={`px-2 py-2 text-center font-bold ${getRankColor(row.rank)}`}>
                    {row.rank ?? '—'}
                  </td>
                  <td className="px-2 py-2 text-center text-[#8B95A1]">{row.prev ?? '—'}</td>
                  <td className="px-2 py-2 text-right text-[#4E5968]">{row.blogCount.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right text-[#4E5968]">{row.searchVol.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${row.score >= 80 ? 'text-[#12B76A]' : row.score >= 60 ? 'text-[#F59E0B]' : 'text-[#F04452]'}`}>
                    {row.score.toFixed(1)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────
export default function KeywordRankPage() {
  const [ctx, setCtx]           = useState<BizContext>(DEFAULT_CTX)
  const [area, setArea]         = useState(DEFAULT_CTX.regionGu)
  const [placeType, setPlaceType] = useState(DEFAULT_CTX.placeType)
  const [search, setSearch]     = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('26.04.13 오전 1:46')

  // 프로필 기반으로 업체 컨텍스트 + 지역·업종 동적 설정
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

  // 업체 컨텍스트가 바뀌면 mock 데이터도 재생성
  const mockData = useMemo(() => buildMockData(ctx), [ctx])

  const connectedCount = mockData.filter(g => g.rows[0].rank !== null && g.rows[0].rank <= 10).length

  const filtered = mockData.filter(g =>
    g.keyword.includes(search) || g.relatedKw.includes(search) || search === ''
  )

  const handleScan = useCallback(async () => {
    setScanning(true)
    await new Promise(r => setTimeout(r, 1500))
    setLastUpdated(new Date().toLocaleString('ko-KR'))
    setScanning(false)
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<TrendingUp size={28} className="text-white" strokeWidth={2.5} />}
          title="키워드 순위"
          subtitle="네이버 검색에서 내 업체가 몇 위인지 — 위치별·디바이스별 실시간"
          variant="sky"
        />

        {/* 상단 필터 바 */}
        <div className="bg-white border-b border-[#E5E8EB] px-4 md:px-6 py-3 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex items-center gap-2.5 md:gap-3 flex-wrap">
            {/* 지역 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#8B95A1] font-medium">지역</span>
              <select value={area} onChange={e => setArea(e.target.value)}
                className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6]">
                {/* 현재 area가 옵션에 없으면 자동 추가 (프로필 주소 기반) */}
                {!AREA_OPTIONS.includes(area) && <option value={area}>{area} (내 매장)</option>}
                {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* 업종 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#8B95A1] font-medium">플레이스</span>
              <select value={placeType} onChange={e => setPlaceType(e.target.value)}
                className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6]">
                <option>음식점</option>
                <option>카페</option>
                <option>미용실</option>
                <option>병원</option>
                <option>쇼핑</option>
              </select>
            </div>

            {/* 검색창 */}
            <div className="flex-1 min-w-[200px]">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="키워드 검색..."
                className="w-full text-sm border border-[#E5E8EB] rounded-lg px-3 py-1.5 bg-white text-[#191F28] focus:outline-none focus:border-[#3182F6]"
              />
            </div>

            {/* 버튼 그룹 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60"
              >
                {scanning ? (
                  <>
                    <RefreshCw size={13} strokeWidth={2.5} className="animate-spin" />
                    스캐닝...
                  </>
                ) : (
                  <>
                    <Search size={13} strokeWidth={2.5} />
                    스캐닝
                  </>
                )}
              </button>
              <button className="px-4 py-1.5 rounded-lg border border-[#E5E8EB] text-sm font-medium text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                분석
              </button>
              <button className="px-4 py-1.5 rounded-lg border border-[#E5E8EB] text-sm font-medium text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                전체검색
              </button>
            </div>

            {/* 업데이트 시간 */}
            <span className="text-[11px] text-[#8B95A1] ml-auto">마지막 업데이트: {lastUpdated}</span>
          </div>
        </div>

        {/* 데모 안내 배너 */}
        <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 md:px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-start gap-2">
            <AlertTriangle size={13} className="text-[#92400E] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-[11px] text-[#92400E] leading-relaxed">
              <strong>아래는 예시 데이터입니다</strong> · 네이버 Search API 또는 selfrank·키워드마스터 같은 외부 순위 측정 서비스를 연동하면 내 매장의 실제 키워드 순위로 교체됩니다.
            </p>
          </div>
        </div>

        {/* 통계 요약 바 */}
        <div className="bg-white border-b border-[#F2F4F6] px-4 md:px-6 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center gap-3 md:gap-6 text-xs flex-wrap">
            <span className="text-[#8B95A1]">
              전체 키워드 <strong className="text-[#191F28]">{mockData.length}개</strong> ·
              상위 10위 <strong className="text-[#3182F6]">{connectedCount}개</strong> ({Math.round(connectedCount/mockData.length*100)}%)
            </span>
            <div className="flex items-center gap-3 md:gap-4 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#EFF6FF]"/>  <span className="text-[#3182F6]">1~3위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ECFDF5]"/><span className="text-[#12B76A]">4~5위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFFBEB]"/><span className="text-[#F59E0B]">6~10위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFF1F2]"/><span className="text-[#F04452]">11~20위</span></span>
            </div>
          </div>
        </div>

        {/* 키워드 카드 그리드 */}
        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8B95A1]">
              <p className="text-lg font-bold mb-1">검색 결과 없음</p>
              <p className="text-sm">다른 키워드로 검색해 보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filtered.map(group => (
                <KeywordCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </main>

        {/* 하단 안내 */}
        <div className="px-4 md:px-6 py-3 bg-white border-t border-[#F2F4F6]">
          <p className="max-w-6xl mx-auto text-[11px] text-[#8B95A1]">
            실시간 순위는 <strong className="text-[#3182F6]">네이버 Search API</strong> 키 설정 후 실제 데이터로 전환됩니다.
            현재는 목업 데이터입니다. &nbsp;
            <a href="/settings" className="text-[#3182F6] underline">API 키 설정 →</a>
          </p>
        </div>
        <Footer />
      </div>
    </div>
  )
}
