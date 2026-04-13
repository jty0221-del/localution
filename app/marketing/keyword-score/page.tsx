'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'

// ── 키워드별 점수 분석 데이터 ─────────────────────────
interface KeywordScore {
  keyword: string
  totalScore: number
  factors: {
    label: string
    score: number
    max: number
    tip: string
  }[]
  searchVol: number
  competition: '낮음' | '보통' | '높음'
  currentRank: number | null
  trend: 'up' | 'down' | 'stable'
}

const KEYWORD_SCORES: KeywordScore[] = [
  {
    keyword: '강남 맛집',
    totalScore: 72,
    searchVol: 2340,
    competition: '높음',
    currentRank: 3,
    trend: 'up',
    factors: [
      { label: '제목 키워드 포함', score: 95, max: 100, tip: '매장명에 주요 키워드가 잘 포함되어 있습니다' },
      { label: '소개글 키워드 밀도', score: 45, max: 100, tip: '소개글에 키워드를 2~3회 더 자연스럽게 추가하세요' },
      { label: '리뷰 키워드 언급', score: 88, max: 100, tip: '고객 리뷰에서 해당 키워드가 자주 언급됩니다' },
      { label: '블로그 노출 빈도', score: 62, max: 100, tip: '해당 키워드로 블로그 체험단을 진행하면 효과적입니다' },
      { label: '카테고리 일치도', score: 90, max: 100, tip: '업종 카테고리가 키워드와 잘 매칭됩니다' },
      { label: '최근 활동 점수', score: 55, max: 100, tip: '최근 2주간 사진/소식 업로드가 부족합니다' },
    ],
  },
  {
    keyword: '강남구 회식',
    totalScore: 91,
    searchVol: 196,
    competition: '낮음',
    currentRank: 2,
    trend: 'up',
    factors: [
      { label: '제목 키워드 포함', score: 100, max: 100, tip: '매장명에 키워드가 포함되어 있습니다' },
      { label: '소개글 키워드 밀도', score: 82, max: 100, tip: '소개글에 회식/단체석 키워드가 적절히 포함됨' },
      { label: '리뷰 키워드 언급', score: 94, max: 100, tip: '리뷰에서 "회식" 키워드가 빈번히 언급됩니다' },
      { label: '블로그 노출 빈도', score: 88, max: 100, tip: '블로그에서 해당 키워드로 꾸준히 노출 중' },
      { label: '카테고리 일치도', score: 95, max: 100, tip: '카테고리 매칭 우수' },
      { label: '최근 활동 점수', score: 85, max: 100, tip: '최근 활동이 활발합니다' },
    ],
  },
  {
    keyword: '학동역 맛집',
    totalScore: 48,
    searchVol: 2860,
    competition: '높음',
    currentRank: 12,
    trend: 'up',
    factors: [
      { label: '제목 키워드 포함', score: 60, max: 100, tip: '매장명에 "학동역" 키워드가 직접 포함되지 않음' },
      { label: '소개글 키워드 밀도', score: 30, max: 100, tip: '소개글에 "학동역" 관련 키워드가 매우 부족합니다' },
      { label: '리뷰 키워드 언급', score: 52, max: 100, tip: '리뷰에서 해당 키워드 언급이 적은 편입니다' },
      { label: '블로그 노출 빈도', score: 35, max: 100, tip: '해당 키워드 블로그 글이 매우 부족합니다' },
      { label: '카테고리 일치도', score: 78, max: 100, tip: '카테고리는 부분 일치' },
      { label: '최근 활동 점수', score: 40, max: 100, tip: '최근 활동 점수가 낮습니다. 주 2회 이상 업로드 권장' },
    ],
  },
  {
    keyword: '여의도 맛집',
    totalScore: 58,
    searchVol: 2570,
    competition: '높음',
    currentRank: 8,
    trend: 'down',
    factors: [
      { label: '제목 키워드 포함', score: 50, max: 100, tip: '"여의도" 키워드가 매장명에 없습니다. 소개글 보강 필요' },
      { label: '소개글 키워드 밀도', score: 42, max: 100, tip: '소개글에 "여의도" 키워드를 3~4회 추가하세요' },
      { label: '리뷰 키워드 언급', score: 65, max: 100, tip: '리뷰에서 "여의도" 언급 비율이 보통입니다' },
      { label: '블로그 노출 빈도', score: 55, max: 100, tip: '해당 키워드 블로그 글이 부족합니다' },
      { label: '카테고리 일치도', score: 82, max: 100, tip: '카테고리 일치도 양호' },
      { label: '최근 활동 점수', score: 48, max: 100, tip: '최근 사진/소식 업데이트가 부족합니다' },
    ],
  },
  {
    keyword: '강남 한식당',
    totalScore: 65,
    searchVol: 1450,
    competition: '보통',
    currentRank: 7,
    trend: 'stable',
    factors: [
      { label: '제목 키워드 포함', score: 80, max: 100, tip: '매장명에 "한식" 관련 키워드 부분 포함' },
      { label: '소개글 키워드 밀도', score: 55, max: 100, tip: '소개글에 "한식당" 키워드를 1~2회 추가하면 좋습니다' },
      { label: '리뷰 키워드 언급', score: 72, max: 100, tip: '리뷰에서 한식 관련 키워드가 적당히 언급됩니다' },
      { label: '블로그 노출 빈도', score: 50, max: 100, tip: '"강남 한식당" 키워드 블로그 체험단 진행 권장' },
      { label: '카테고리 일치도', score: 88, max: 100, tip: '한식 카테고리와 잘 매칭됩니다' },
      { label: '최근 활동 점수', score: 52, max: 100, tip: '최근 2주간 업데이트 필요' },
    ],
  },
]

// ── 점수 색상 헬퍼 ────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return '#12B76A'
  if (s >= 60) return '#F59E0B'
  return '#F04452'
}
function scoreLabel(s: number) {
  if (s >= 80) return '우수'
  if (s >= 60) return '보통'
  return '개선 필요'
}
function scoreBg(s: number) {
  if (s >= 80) return 'bg-[#ECFDF5]'
  if (s >= 60) return 'bg-[#FFFBEB]'
  return 'bg-[#FFF1F2]'
}

// ── 경쟁도 뱃지 ──────────────────────────────────────
function CompBadge({ level }: { level: string }) {
  const cls = level === '높음' ? 'bg-[#FFF1F2] text-[#F04452]' : level === '보통' ? 'bg-[#FFFBEB] text-[#F59E0B]' : 'bg-[#ECFDF5] text-[#12B76A]'
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{level}</span>
}

// ── 개별 키워드 카드 ──────────────────────────────────
function ScoreCard({ data }: { data: KeywordScore }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6] hover:border-[#3182F6] transition-colors">
      {/* 카드 헤더 */}
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 text-left hover:bg-[#FAFBFF] transition-colors">
        <div className="flex items-center gap-4">
          {/* 종합 점수 */}
          <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${scoreBg(data.totalScore)}`}>
            <span className="text-lg font-black" style={{ color: scoreColor(data.totalScore) }}>{data.totalScore}</span>
            <span className="text-[8px] font-bold" style={{ color: scoreColor(data.totalScore) }}>{scoreLabel(data.totalScore)}</span>
          </div>

          {/* 키워드 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-[#191F28]">{data.keyword}</span>
              <CompBadge level={data.competition} />
              {data.trend === 'up' && <span className="text-[10px] text-[#12B76A] font-bold">▲ 상승세</span>}
              {data.trend === 'down' && <span className="text-[10px] text-[#F04452] font-bold">▼ 하락세</span>}
              {data.trend === 'stable' && <span className="text-[10px] text-[#8B95A1] font-bold">— 유지</span>}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#8B95A1]">
              <span>월간 검색량 <strong className="text-[#191F28]">{data.searchVol.toLocaleString()}</strong></span>
              <span>현재 순위 <strong className={data.currentRank && data.currentRank <= 5 ? 'text-[#3182F6]' : data.currentRank && data.currentRank <= 10 ? 'text-[#F59E0B]' : 'text-[#F04452]'}>{data.currentRank ?? '—'}위</strong></span>
            </div>
            {/* 미니 요소별 바 */}
            <div className="flex gap-1 mt-2">
              {data.factors.map((f, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full bg-[#F2F4F6] overflow-hidden" title={`${f.label}: ${f.score}점`}>
                  <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: scoreColor(f.score) }} />
                </div>
              ))}
            </div>
          </div>

          <span className={`text-xs text-[#8B95A1] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* 상세 요소별 분석 */}
      {open && (
        <div className="border-t border-[#F2F4F6] px-5 py-4 space-y-3">
          {data.factors.map((f, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#191F28]">{f.label}</span>
                <span className="text-xs font-bold" style={{ color: scoreColor(f.score) }}>{f.score} / {f.max}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F2F4F6] overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all" style={{ width: `${f.score}%`, background: scoreColor(f.score) }} />
              </div>
              <p className="text-[11px] text-[#8B95A1]">💡 {f.tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────
export default function KeywordScorePage() {
  const [sortBy, setSortBy] = useState<'score' | 'volume' | 'rank'>('score')

  const sorted = [...KEYWORD_SCORES].sort((a, b) => {
    if (sortBy === 'score') return b.totalScore - a.totalScore
    if (sortBy === 'volume') return b.searchVol - a.searchVol
    return (a.currentRank ?? 999) - (b.currentRank ?? 999)
  })

  const avgScore = Math.round(KEYWORD_SCORES.reduce((s, k) => s + k.totalScore, 0) / KEYWORD_SCORES.length)
  const highCount = KEYWORD_SCORES.filter(k => k.totalScore >= 80).length
  const lowCount = KEYWORD_SCORES.filter(k => k.totalScore < 60).length

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-[220px] p-6">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-[#191F28]">📊 키워드 점수분석</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">키워드별 최적화 상태를 요소별로 분석하여 개선 방향을 제시합니다</p>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">총 키워드</p>
            <p className="text-2xl font-black text-[#191F28]">{KEYWORD_SCORES.length}개</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">평균 점수</p>
            <p className="text-2xl font-black" style={{ color: scoreColor(avgScore) }}>{avgScore}점</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">우수 키워드 (80+)</p>
            <p className="text-2xl font-black text-[#12B76A]">{highCount}개</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">개선 필요 (60 미만)</p>
            <p className="text-2xl font-black text-[#F04452]">{lowCount}개</p>
          </div>
        </div>

        {/* 정렬 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-[#191F28]">키워드별 점수 상세 <span className="text-[#8B95A1] font-normal">(클릭하여 요소별 분석 확인)</span></p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B95A1]">정렬:</span>
            {([['score', '점수순'], ['volume', '검색량순'], ['rank', '순위순']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${sortBy === key ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 키워드 카드 목록 */}
        <div className="space-y-3">
          {sorted.map(kw => (
            <ScoreCard key={kw.keyword} data={kw} />
          ))}
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm text-center">
          <p className="text-[11px] text-[#8B95A1]">
            점수는 <strong className="text-[#3182F6]">네이버 플레이스 알고리즘</strong> 주요 요소를 기반으로 산출됩니다.
            실제 순위와 차이가 있을 수 있으며, 정기적 분석을 통해 최적화 전략을 수립하세요.
          </p>
        </div>
      </main>
    </div>
  )
}
