'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconTrend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  )
}
function IconDiag() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  )
}
function IconInflow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}
function Up() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
}
function Down() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
}
function Flat() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
}

const mockRanks = [
  { keyword: '강남 맛집', rank: 3, prev: 5, volume: 18200 },
  { keyword: '강남 삼겹살', rank: 7, prev: 7, volume: 9400 },
  { keyword: '강남역 고기집', rank: 12, prev: 15, volume: 6700 },
  { keyword: '강남 회식', rank: 2, prev: 4, volume: 4200 },
  { keyword: '강남 점심 맛집', rank: 18, prev: 11, volume: 12300 },
  { keyword: '강남 삼겹살 맛집', rank: 5, prev: 8, volume: 7600 },
]

const mockInflow = [
  { keyword: '강남 맛집', visits: 342, pct: 28.4, change: 12 },
  { keyword: '강남 삼겹살', visits: 218, pct: 18.1, change: -3 },
  { keyword: '강남역 맛집', visits: 187, pct: 15.5, change: 5 },
  { keyword: '강남 고기집', visits: 143, pct: 11.9, change: 0 },
  { keyword: '강남 회식 장소', visits: 98, pct: 8.1, change: 22 },
  { keyword: '강남 점심', visits: 76, pct: 6.3, change: -8 },
  { keyword: '강남역 삼겹살', visits: 61, pct: 5.1, change: 14 },
  { keyword: '강남 고기 맛집', visits: 82, pct: 6.8, change: 3 },
]

const diagData = [
  { category: '기본 정보', items: [
    { label: '업체명', status: 'ok' as const, desc: '정확하게 등록됨', score: 10 },
    { label: '주소', status: 'ok' as const, desc: '정확하게 등록됨', score: 10 },
    { label: '전화번호', status: 'ok' as const, desc: '정확하게 등록됨', score: 10 },
    { label: '영업시간', status: 'warn' as const, desc: '휴일 시간 미등록', score: 5 },
    { label: '메뉴/가격', status: 'warn' as const, desc: '메뉴 이미지 3개 부족', score: 6 },
  ]},
  { category: '사진/영상', items: [
    { label: '대표 사진', status: 'ok' as const, desc: '고화질 1장 등록됨', score: 10 },
    { label: '내부 사진', status: 'warn' as const, desc: '권장 10장 중 4장', score: 4 },
    { label: '음식 사진', status: 'bad' as const, desc: '미등록 — 방문자 전환에 영향', score: 0 },
    { label: '외부/간판 사진', status: 'ok' as const, desc: '등록됨', score: 10 },
  ]},
  { category: '리뷰 관리', items: [
    { label: '리뷰 수', status: 'ok' as const, desc: '127개 (업종 평균 이상)', score: 10 },
    { label: '평균 평점', status: 'ok' as const, desc: '4.6점', score: 10 },
    { label: '사장님 댓글 답변율', status: 'warn' as const, desc: '62% — 80% 이상 권장', score: 6 },
    { label: '최근 리뷰 답변', status: 'bad' as const, desc: '14일 이상 미답변', score: 2 },
  ]},
  { category: 'SNS 연동', items: [
    { label: '인스타그램 연동', status: 'ok' as const, desc: '연동됨', score: 10 },
    { label: '블로그 리뷰 수', status: 'warn' as const, desc: '23개 (30개 이상 권장)', score: 7 },
    { label: '공식 홈페이지', status: 'bad' as const, desc: '미등록', score: 0 },
  ]},
]

// ── 키워드 순위 탭
function RankTab() {
  const [rows, setRows] = useState(mockRanks)
  const [adding, setAdding] = useState(false)
  const [newKw, setNewKw] = useState('')
  const [sort, setSort] = useState<'rank'|'volume'>('rank')

  const sorted = [...rows].sort((a, b) => sort === 'rank' ? a.rank - b.rank : b.volume - a.volume)

  function rankBadge(r: number) {
    if (r <= 3) return <span className="bg-[#3182F6] text-white text-xs font-bold px-2 py-0.5 rounded-full">{r}위</span>
    if (r <= 10) return <span className="bg-[#E8F1FE] text-[#3182F6] text-xs font-bold px-2 py-0.5 rounded-full">{r}위</span>
    return <span className="bg-[#F2F4F6] text-[#8B95A1] text-xs font-bold px-2 py-0.5 rounded-full">{r}위</span>
  }

  function diffEl(curr: number, prev: number) {
    const d = curr - prev
    if (d < 0) return <span className="flex items-center gap-0.5 text-[#2DB400] font-semibold text-xs"><Up/>{Math.abs(d)}</span>
    if (d > 0) return <span className="flex items-center gap-0.5 text-[#F04452] font-semibold text-xs"><Down/>{Math.abs(d)}</span>
    return <span className="flex items-center gap-0.5 text-[#8B95A1] text-xs"><Flat/>-</span>
  }

  function gradeLabel(r: number) {
    if (r <= 3) return <span className="text-xs font-semibold text-[#2DB400]">최상위</span>
    if (r <= 10) return <span className="text-xs font-semibold text-[#3182F6]">상위</span>
    if (r <= 20) return <span className="text-xs font-semibold text-[#F5A623]">중위</span>
    return <span className="text-xs font-semibold text-[#F04452]">하위</span>
  }

  function handleAdd() {
    if (!newKw.trim()) return
    const rank = Math.floor(Math.random() * 25) + 1
    setRows(prev => [...prev, { keyword: newKw, rank, prev: rank + Math.floor(Math.random() * 5) - 2, volume: Math.floor(Math.random() * 12000) + 1000 }])
    setNewKw('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#8B95A1]">정렬:</span>
          <button onClick={() => setSort('rank')} className={['text-xs px-3 py-1.5 rounded-lg font-medium', sort === 'rank' ? 'bg-[#3182F6] text-white' : 'bg-white text-[#8B95A1] border border-[#E5E8EB]'].join(' ')}>순위순</button>
          <button onClick={() => setSort('volume')} className={['text-xs px-3 py-1.5 rounded-lg font-medium', sort === 'volume' ? 'bg-[#3182F6] text-white' : 'bg-white text-[#8B95A1] border border-[#E5E8EB]'].join(' ')}>검색량순</button>
        </div>
        <button onClick={() => setAdding(true)} className="text-xs bg-[#3182F6] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#1B64DA] transition-colors">+ 키워드 추가</button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-4">
          <input value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="키워드 입력 후 Enter" className="flex-1 border border-[#3182F6] rounded-lg px-3 py-2 text-sm outline-none" autoFocus/>
          <button onClick={handleAdd} className="bg-[#3182F6] text-white px-4 py-2 rounded-lg text-sm font-medium">추가</button>
          <button onClick={() => setAdding(false)} className="bg-[#F2F4F6] text-[#8B95A1] px-4 py-2 rounded-lg text-sm">취소</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E5E8EB]">
              <th className="text-left text-xs text-[#8B95A1] font-medium px-5 py-3">키워드</th>
              <th className="text-center text-xs text-[#8B95A1] font-medium px-4 py-3">현재 순위</th>
              <th className="text-center text-xs text-[#8B95A1] font-medium px-4 py-3">변화</th>
              <th className="text-center text-xs text-[#8B95A1] font-medium px-4 py-3">월 검색량</th>
              <th className="text-center text-xs text-[#8B95A1] font-medium px-4 py-3">노출 등급</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b border-[#F2F4F6] hover:bg-[#FAFBFF] transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-[#191F28]">{row.keyword}</td>
                <td className="px-4 py-3.5 text-center">{rankBadge(row.rank)}</td>
                <td className="px-4 py-3.5 text-center">{diffEl(row.rank, row.prev)}</td>
                <td className="px-4 py-3.5 text-center text-sm text-[#4E5968]">{row.volume.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-center">{gradeLabel(row.rank)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#8B95A1] mt-3">* 네이버 플레이스 기준 / 매일 오전 6시 업데이트</p>
    </div>
  )
}

// ── 키워드 점수 분석 탭
interface ScoreResult {
  keyword: string
  totalScore: number
  competition: number
  volume: number
  places: number
  optimizeScore: number
  reviewScore: number
  photoScore: number
  updateScore: number
  relatedKeywords: string[]
}

function ScoreTab() {
  const [keyword, setKeyword] = useState('')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(false)

  function analyze(kw?: string) {
    const q = kw || keyword
    if (!q.trim()) return
    if (kw) setKeyword(kw)
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      setResult({
        keyword: q,
        totalScore: Math.floor(Math.random() * 40) + 40,
        competition: Math.floor(Math.random() * 100),
        volume: Math.floor(Math.random() * 20000) + 500,
        places: Math.floor(Math.random() * 500) + 50,
        optimizeScore: Math.floor(Math.random() * 50) + 30,
        reviewScore: Math.floor(Math.random() * 60) + 20,
        photoScore: Math.floor(Math.random() * 50) + 30,
        updateScore: Math.floor(Math.random() * 70) + 20,
        relatedKeywords: [q + ' 맛집', q + ' 추천', q + ' 맛집 추천', '근처 ' + q, q + ' 저렴한'],
      })
      setLoading(false)
    }, 1200)
  }

  function getGrade(s: number) {
    if (s >= 80) return { label: 'A+', color: '#2DB400', bg: '#F0FBF0' }
    if (s >= 65) return { label: 'B', color: '#3182F6', bg: '#E8F1FE' }
    if (s >= 50) return { label: 'C', color: '#F5A623', bg: '#FEF9E8' }
    return { label: 'D', color: '#F04452', bg: '#FEF0F1' }
  }

  function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#4E5968]">{label}</span>
          <span className="font-semibold text-[#191F28]">{value}점</span>
        </div>
        <div className="h-2 bg-[#F2F4F6] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: value + '%', backgroundColor: color }}/>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 mb-5">
        <p className="text-sm font-semibold text-[#191F28] mb-3">키워드 분석</p>
        <div className="flex gap-3">
          <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="예: 강남 삼겹살, 홍대 카페"
            className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#3182F6] transition-colors"/>
          <button onClick={() => analyze()} disabled={loading}
            className="bg-[#3182F6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60 flex items-center gap-2">
            {loading ? '분석 중...' : <><IconSearch/> 분석하기</>}
          </button>
        </div>
      </div>

      {result && (() => {
        const g = getGrade(result.totalScore)
        const compText = result.competition > 70 ? '매우 높음' : result.competition > 40 ? '보통' : '낮음'
        const compColor = result.competition > 70 ? '#F04452' : result.competition > 40 ? '#F5A623' : '#2DB400'
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 text-center">
                <p className="text-xs text-[#8B95A1] mb-3">종합 노출 점수</p>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-2"
                  style={{ borderColor: g.color, backgroundColor: g.bg }}>
                  <span className="text-2xl font-black" style={{ color: g.color }}>{result.totalScore}</span>
                </div>
                <p className="text-lg font-black" style={{ color: g.color }}>등급 {g.label}</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                <p className="text-xs font-semibold text-[#8B95A1] mb-3">키워드 현황</p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-[#4E5968]">월 검색량</span>
                    <span className="text-xs font-bold text-[#191F28]">{result.volume.toLocaleString()}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[#4E5968]">경쟁 업체 수</span>
                    <span className="text-xs font-bold text-[#191F28]">{result.places}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[#4E5968]">경쟁 강도</span>
                    <span className="text-xs font-bold" style={{ color: compColor }}>{compText}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                <p className="text-xs font-semibold text-[#8B95A1] mb-4">항목별 점수</p>
                <div className="space-y-4">
                  <ScoreBar label="플레이스 최적화" value={result.optimizeScore} color="#3182F6"/>
                  <ScoreBar label="리뷰 점수" value={result.reviewScore} color="#2DB400"/>
                  <ScoreBar label="사진 풍부도" value={result.photoScore} color="#F5A623"/>
                  <ScoreBar label="업데이트 활성도" value={result.updateScore} color="#8B5CF6"/>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                <p className="text-xs font-semibold text-[#8B95A1] mb-3">연관 키워드 추천</p>
                <div className="flex flex-wrap gap-2">
                  {result.relatedKeywords.map((kw, i) => (
                    <button key={i} onClick={() => analyze(kw)}
                      className="text-xs bg-[#F2F4F6] text-[#4E5968] px-3 py-1.5 rounded-lg hover:bg-[#E8F1FE] hover:text-[#3182F6] transition-colors">
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── 플레이스 진단 탭
function DiagTab() {
  const allItems = diagData.flatMap(c => c.items)
  const totalScore = allItems.reduce((s, i) => s + i.score, 0)
  const maxScore = allItems.length * 10
  const pct = Math.round((totalScore / maxScore) * 100)
  const okCount = allItems.filter(i => i.status === 'ok').length
  const warnCount = allItems.filter(i => i.status === 'warn').length
  const badCount = allItems.filter(i => i.status === 'bad').length

  const gradeLabel = pct >= 80 ? '우수' : pct >= 60 ? '보통' : '개선필요'
  const gradeColor = pct >= 80 ? '#2DB400' : pct >= 60 ? '#F5A623' : '#F04452'

  const circumference = 251.2
  const dashArray = ((pct / 100) * circumference).toFixed(1) + ' ' + circumference

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 text-center flex flex-col items-center justify-center">
          <p className="text-xs text-[#8B95A1] mb-2">종합 진단 점수</p>
          <div className="relative w-24 h-24 mb-2">
            <svg viewBox="0 0 100 100" className="w-24 h-24" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#F2F4F6" strokeWidth="10"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke={gradeColor} strokeWidth="10"
                strokeDasharray={dashArray} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#191F28]">{pct}</span>
              <span className="text-xs text-[#8B95A1]">/ 100</span>
            </div>
          </div>
          <span className="text-sm font-bold" style={{ color: gradeColor }}>{gradeLabel}</span>
        </div>
        <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#F0FBF0] rounded-2xl p-5 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[#2DB400]">{okCount}</span>
            <span className="text-xs font-medium text-[#4E5968] mt-1">양호 항목</span>
          </div>
          <div className="bg-[#FEF9E8] rounded-2xl p-5 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[#F5A623]">{warnCount}</span>
            <span className="text-xs font-medium text-[#4E5968] mt-1">주의 항목</span>
          </div>
          <div className="bg-[#FEF0F1] rounded-2xl p-5 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[#F04452]">{badCount}</span>
            <span className="text-xs font-medium text-[#4E5968] mt-1">개선 필요</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {diagData.map((cat, ci) => (
          <div key={ci} className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
            <div className="bg-[#F8F9FA] px-5 py-3 border-b border-[#E5E8EB]">
              <span className="text-sm font-bold text-[#191F28]">{cat.category}</span>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {cat.items.map((item, ii) => {
                const statusMap = {
                  ok: { bg: 'bg-[#F0FBF0]', text: 'text-[#2DB400]', label: '✓ 양호', barColor: '#2DB400' },
                  warn: { bg: 'bg-[#FEF9E8]', text: 'text-[#F5A623]', label: '⚠ 주의', barColor: '#F5A623' },
                  bad: { bg: 'bg-[#FEF0F1]', text: 'text-[#F04452]', label: '✕ 개선필요', barColor: '#F04452' },
                }
                const st = statusMap[item.status]
                return (
                  <div key={ii} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#FAFBFF]">
                    <div className="flex items-center gap-3">
                      <span className={[st.bg, st.text, 'text-xs font-semibold px-2 py-0.5 rounded-lg w-20 text-center'].join(' ')}>{st.label}</span>
                      <div>
                        <p className="text-sm font-medium text-[#191F28]">{item.label}</p>
                        <p className="text-xs text-[#8B95A1]">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: (item.score * 10) + '%', backgroundColor: st.barColor }}/>
                      </div>
                      <span className="text-xs font-semibold text-[#4E5968] w-8 text-right">{item.score}/10</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 유입 분석 탭
function InflowTab() {
  const total = mockInflow.reduce((s, k) => s + k.visits, 0)

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
          <p className="text-xs text-[#8B95A1] mb-1">이번 달 총 유입</p>
          <p className="text-2xl font-black text-[#191F28]">{total.toLocaleString()}<span className="text-base ml-0.5 text-[#8B95A1]">회</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
          <p className="text-xs text-[#8B95A1] mb-1">전월 대비</p>
          <p className="text-2xl font-black text-[#2DB400]">+12.4<span className="text-base ml-0.5 text-[#8B95A1]">%</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
          <p className="text-xs text-[#8B95A1] mb-1">유입 키워드 수</p>
          <p className="text-2xl font-black text-[#8B5CF6]">{mockInflow.length}<span className="text-base ml-0.5 text-[#8B95A1]">개</span></p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="bg-[#F8F9FA] px-5 py-3 border-b border-[#E5E8EB] flex items-center justify-between">
          <span className="text-sm font-bold text-[#191F28]">검색어별 유입 현황</span>
          <span className="text-xs text-[#8B95A1]">2026년 4월 기준</span>
        </div>
        <div className="divide-y divide-[#F2F4F6]">
          {mockInflow.map((row, i) => (
            <div key={i} className="px-5 py-4 hover:bg-[#FAFBFF] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#8B95A1] w-5">{i + 1}</span>
                  <span className="text-sm font-semibold text-[#191F28]">{row.keyword}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={['text-xs font-semibold flex items-center gap-0.5', row.change > 0 ? 'text-[#2DB400]' : row.change < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'].join(' ')}>
                    {row.change > 0 ? <Up/> : row.change < 0 ? <Down/> : <Flat/>}
                    {Math.abs(row.change)}%
                  </span>
                  <span className="text-sm font-bold text-[#191F28]">{row.visits.toLocaleString()}회</span>
                  <span className="text-xs text-[#8B95A1] w-10 text-right">{row.pct}%</span>
                </div>
              </div>
              <div className="ml-7">
                <div className="h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3182F6] rounded-full" style={{ width: row.pct + '%' }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-[#8B95A1] mt-3">* 네이버 플레이스 API 연동 시 실제 데이터로 업데이트됩니다</p>
    </div>
  )
}

// ── 메인
export default function MarketingPage() {
  const [tab, setTab] = useState<'rank'|'score'|'diag'|'inflow'>('rank')

  const tabs = [
    { id: 'rank' as const, label: '키워드 순위', icon: <IconTrend/> },
    { id: 'score' as const, label: '키워드 점수 분석', icon: <IconSearch/> },
    { id: 'diag' as const, label: '플레이스 진단', icon: <IconDiag/> },
    { id: 'inflow' as const, label: '유입 분석', icon: <IconInflow/> },
  ]

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar/>
      <main className="flex-1 ml-[220px] p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-[#191F28]">마케팅 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-1">네이버 플레이스 키워드 순위 · 진단 · 유입 분석을 한 곳에서 관리하세요</p>
          </div>

          <div className="flex gap-1 bg-white border border-[#E5E8EB] rounded-2xl p-1 mb-6 w-fit">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={['flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all', tab === t.id ? 'bg-[#3182F6] text-white shadow-sm' : 'text-[#8B95A1] hover:text-[#191F28]'].join(' ')}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {tab === 'rank' && <RankTab/>}
          {tab === 'score' && <ScoreTab/>}
          {tab === 'diag' && <DiagTab/>}
          {tab === 'inflow' && <InflowTab/>}
        </div>
      </main>
    </div>
  )
}
