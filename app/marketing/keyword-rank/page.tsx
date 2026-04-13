'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import Sidebar from '../../../components/Sidebar'

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

// ── 목업 데이터 (실제: 네이버 Search API 연동) ─────────
const MOCK_DATA: KeywordGroup[] = [
  {
    id: 1, keyword: '강남 맛집', relatedKw: '강남 맛집 상위노출', placeType: '음식점', volume: 2340,
    rows: [
      { date: '26.04.13', rank: 3,  prev: 5,  blogCount: 380, searchVol: 2340, score: 91.2 },
      { date: '26.04.12', rank: 5,  prev: 4,  blogCount: 375, searchVol: 2280, score: 85.4 },
      { date: '26.04.11', rank: 4,  prev: 7,  blogCount: 371, searchVol: 2310, score: 88.1 },
      { date: '26.04.10', rank: 7,  prev: 6,  blogCount: 365, searchVol: 2290, score: 79.3 },
      { date: '26.04.09', rank: 6,  prev: 9,  blogCount: 360, searchVol: 2200, score: 82.0 },
      { date: '26.04.08', rank: 9,  prev: 11, blogCount: 358, searchVol: 2180, score: 74.5 },
      { date: '26.04.07', rank: 11, prev: 10, blogCount: 352, searchVol: 2150, score: 69.8 },
    ],
  },
  {
    id: 2, keyword: '고강남빌딩 맛집', relatedKw: '강남역 근처 맛집', placeType: '음식점', volume: 310,
    rows: [
      { date: '26.04.13', rank: 1,  prev: 1,  blogCount: 42,  searchVol: 310,  score: 98.4 },
      { date: '26.04.12', rank: 1,  prev: 2,  blogCount: 41,  searchVol: 308,  score: 97.1 },
      { date: '26.04.11', rank: 2,  prev: 1,  blogCount: 40,  searchVol: 305,  score: 94.2 },
      { date: '26.04.10', rank: 1,  prev: 3,  blogCount: 39,  searchVol: 300,  score: 98.0 },
      { date: '26.04.09', rank: 3,  prev: 2,  blogCount: 38,  searchVol: 295,  score: 91.3 },
      { date: '26.04.08', rank: 2,  prev: 4,  blogCount: 37,  searchVol: 290,  score: 94.5 },
      { date: '26.04.07', rank: 4,  prev: 3,  blogCount: 36,  searchVol: 285,  score: 88.6 },
    ],
  },
  {
    id: 3, keyword: '학동역 맛집', relatedKw: '학동역 점심 맛집', placeType: '음식점', volume: 2860,
    rows: [
      { date: '26.04.13', rank: 12, prev: 15, blogCount: 786, searchVol: 2860, score: 67.4 },
      { date: '26.04.12', rank: 15, prev: 13, blogCount: 780, searchVol: 2800, score: 59.2 },
      { date: '26.04.11', rank: 13, prev: 18, blogCount: 775, searchVol: 2820, score: 63.8 },
      { date: '26.04.10', rank: 18, prev: 16, blogCount: 768, searchVol: 2750, score: 54.1 },
      { date: '26.04.09', rank: 16, prev: 21, blogCount: 760, searchVol: 2700, score: 58.3 },
      { date: '26.04.08', rank: 21, prev: 19, blogCount: 755, searchVol: 2680, score: 47.9 },
      { date: '26.04.07', rank: 19, prev: 22, blogCount: 750, searchVol: 2650, score: 52.1 },
    ],
  },
  {
    id: 4, keyword: '여의도 맛집', relatedKw: '여의도 직장인 맛집', placeType: '음식점', volume: 2570,
    rows: [
      { date: '26.04.13', rank: 8,  prev: 10, blogCount: 521, searchVol: 2570, score: 76.2 },
      { date: '26.04.12', rank: 10, prev: 9,  blogCount: 517, searchVol: 2520, score: 71.4 },
      { date: '26.04.11', rank: 9,  prev: 12, blogCount: 512, searchVol: 2540, score: 74.1 },
      { date: '26.04.10', rank: 12, prev: 11, blogCount: 505, searchVol: 2480, score: 66.8 },
      { date: '26.04.09', rank: 11, prev: 14, blogCount: 500, searchVol: 2450, score: 69.3 },
      { date: '26.04.08', rank: 14, prev: 16, blogCount: 495, searchVol: 2420, score: 61.5 },
      { date: '26.04.07', rank: 16, prev: 15, blogCount: 488, searchVol: 2390, score: 57.8 },
    ],
  },
  {
    id: 5, keyword: '강남구 회식', relatedKw: '강남 단체 회식 장소', placeType: '음식점', volume: 196,
    rows: [
      { date: '26.04.13', rank: 2,  prev: 3,  blogCount: 35,  searchVol: 196,  score: 95.1 },
      { date: '26.04.12', rank: 3,  prev: 2,  blogCount: 34,  searchVol: 192,  score: 91.8 },
      { date: '26.04.11', rank: 2,  prev: 4,  blogCount: 33,  searchVol: 194,  score: 94.6 },
      { date: '26.04.10', rank: 4,  prev: 3,  blogCount: 32,  searchVol: 188,  score: 88.2 },
      { date: '26.04.09', rank: 3,  prev: 5,  blogCount: 31,  searchVol: 185,  score: 91.0 },
      { date: '26.04.08', rank: 5,  prev: 4,  blogCount: 30,  searchVol: 180,  score: 84.7 },
      { date: '26.04.07', rank: 4,  prev: 6,  blogCount: 29,  searchVol: 178,  score: 88.3 },
    ],
  },
  {
    id: 6, keyword: '나대서식당 강남', relatedKw: '강남 한식당 추천', placeType: '음식점', volume: 2200,
    rows: [
      { date: '26.04.13', rank: 25, prev: 30, blogCount: 468, searchVol: 2200, score: 41.3 },
      { date: '26.04.12', rank: 30, prev: 27, blogCount: 462, searchVol: 2150, score: 34.8 },
      { date: '26.04.11', rank: 27, prev: 32, blogCount: 455, searchVol: 2170, score: 38.9 },
      { date: '26.04.10', rank: 32, prev: 29, blogCount: 448, searchVol: 2100, score: 31.2 },
      { date: '26.04.09', rank: 29, prev: 35, blogCount: 440, searchVol: 2080, score: 35.6 },
      { date: '26.04.08', rank: 35, prev: 33, blogCount: 435, searchVol: 2050, score: 27.4 },
      { date: '26.04.07', rank: 33, prev: 38, blogCount: 428, searchVol: 2020, score: 30.1 },
    ],
  },
]

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
          <span className="text-sm font-bold text-[#191F28]">📍 {group.keyword}</span>
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
  const [area, setArea]         = useState('강남구')
  const [placeType, setPlaceType] = useState('음식점')
  const [search, setSearch]     = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('26.04.13 오전 1:46')

  const connectedCount = MOCK_DATA.filter(g => g.rows[0].rank !== null && g.rows[0].rank <= 10).length

  const filtered = MOCK_DATA.filter(g =>
    g.keyword.includes(search) || g.relatedKw.includes(search) || search === ''
  )

  const handleScan = useCallback(async () => {
    setScanning(true)
    await new Promise(r => setTimeout(r, 1500))
    setLastUpdated(new Date().toLocaleString('ko-KR'))
    setScanning(false)
  }, [])

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-[220px] flex flex-col min-h-screen">

        {/* 상단 필터 바 */}
        <div className="bg-white border-b border-[#E5E8EB] px-6 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 지역 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#8B95A1] font-medium">지역</span>
              <select value={area} onChange={e => setArea(e.target.value)}
                className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6]">
                <option>강남구</option>
                <option>서초구</option>
                <option>송파구</option>
                <option>마포구</option>
                <option>종로구</option>
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
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60"
              >
                {scanning ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    스캐닝...
                  </>
                ) : '🔍 스캐닝'}
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

        {/* 통계 요약 바 */}
        <div className="bg-white border-b border-[#F2F4F6] px-6 py-2.5">
          <div className="flex items-center gap-6 text-xs">
            <span className="text-[#8B95A1]">
              전체 키워드 <strong className="text-[#191F28]">{MOCK_DATA.length}개</strong> ·
              상위 10위 <strong className="text-[#3182F6]">{connectedCount}개</strong> ({Math.round(connectedCount/MOCK_DATA.length*100)}%)
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#EFF6FF]"/>  <span className="text-[#3182F6]">1~3위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ECFDF5]"/><span className="text-[#12B76A]">4~5위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFFBEB]"/><span className="text-[#F59E0B]">6~10위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFF1F2]"/><span className="text-[#F04452]">11~20위</span></span>
            </div>
          </div>
        </div>

        {/* 키워드 카드 그리드 */}
        <div className="flex-1 p-6">
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
        </div>

        {/* 하단 안내 */}
        <div className="px-6 py-3 bg-white border-t border-[#F2F4F6] text-[11px] text-[#8B95A1]">
          실시간 순위는 <strong className="text-[#3182F6]">네이버 Search API</strong> 키 설정 후 실제 데이터로 전환됩니다.
          현재는 목업 데이터입니다. &nbsp;
          <a href="/settings" className="text-[#3182F6] underline">API 키 설정 →</a>
        </div>
      </main>
    </div>
  )
}
