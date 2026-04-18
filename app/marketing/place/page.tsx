'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'

// ── 진단 항목 데이터 ──────────────────────────────────
const DIAGNOSIS_ITEMS = [
  {
    category: '기본 정보',
    icon: '📋',
    score: 92,
    max: 100,
    color: '#3182F6',
    checks: [
      { label: '매장명 일치',      done: true,  desc: '네이버 플레이스와 실제 매장명이 일치합니다' },
      { label: '주소 정확도',      done: true,  desc: '도로명 주소가 정확하게 등록되어 있습니다' },
      { label: '전화번호 등록',    done: true,  desc: '대표번호가 정상 등록되어 있습니다' },
      { label: '카테고리 최적화',  done: true,  desc: '업종 카테고리가 올바르게 설정되어 있습니다' },
      { label: '홈페이지 URL',     done: false, desc: '홈페이지 URL이 등록되지 않았습니다 (권장)' },
    ],
  },
  {
    category: '사진·미디어',
    icon: '📸',
    score: 74,
    max: 100,
    color: '#F59E0B',
    checks: [
      { label: '대표 사진 등록',   done: true,  desc: '대표 이미지가 등록되어 있습니다' },
      { label: '내부 사진 10장+',  done: true,  desc: '내부 사진 12장 등록됨' },
      { label: '메뉴 사진 등록',   done: false, desc: '메뉴 사진이 부족합니다 (현재 3장, 10장 권장)' },
      { label: '외부 사진 등록',   done: true,  desc: '외부 사진 5장 등록됨' },
      { label: '최근 3개월 업로드', done: false, desc: '최근 사진 업로드가 없습니다. 주기적 업로드를 권장합니다' },
    ],
  },
  {
    category: '리뷰 관리',
    icon: '⭐',
    score: 88,
    max: 100,
    color: '#12B76A',
    checks: [
      { label: '평점 4.0 이상',    done: true,  desc: '현재 평점 4.6점 (매우 양호)' },
      { label: '리뷰 100건 이상',  done: true,  desc: '총 127건의 리뷰' },
      { label: '사장님 답글 비율', done: true,  desc: '답글 비율 84% (양호)' },
      { label: '최근 리뷰 7일 내', done: true,  desc: '최근 7일 내 리뷰 8건' },
      { label: '부정 리뷰 대응',   done: false, desc: '미응답 부정 리뷰 2건이 있습니다' },
    ],
  },
  {
    category: '키워드 최적화',
    icon: '🔍',
    score: 61,
    max: 100,
    color: '#F04452',
    checks: [
      { label: '주요 키워드 포함', done: true,  desc: '매장 소개에 주요 키워드 포함됨' },
      { label: '상위 키워드 3개+', done: false, desc: '상위 5위 내 키워드가 1개뿐입니다 (목표: 3개+)' },
      { label: '지역 키워드 노출', done: true,  desc: '지역명+업종 키워드 상위 노출 중' },
      { label: '키워드 밀도',      done: false, desc: '소개글 키워드 밀도가 낮습니다 (3% 미만)' },
      { label: '해시태그 등록',    done: false, desc: '해시태그가 등록되지 않았습니다' },
    ],
  },
  {
    category: '영업 정보',
    icon: '🕐',
    score: 95,
    max: 100,
    color: '#8B5CF6',
    checks: [
      { label: '영업시간 등록',    done: true,  desc: '전 요일 영업시간 등록됨' },
      { label: '휴무일 표시',      done: true,  desc: '정기 휴무일 등록됨' },
      { label: '주차 정보',        done: true,  desc: '주차 가능 정보 등록됨' },
      { label: '예약 가능 설정',   done: true,  desc: '네이버 예약 연동됨' },
      { label: '편의시설 정보',    done: false, desc: '편의시설 정보를 추가하면 노출에 유리합니다' },
    ],
  },
]

const TOTAL_SCORE = Math.round(DIAGNOSIS_ITEMS.reduce((s, d) => s + d.score, 0) / DIAGNOSIS_ITEMS.length)

// ── 점수 게이지 ───────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#12B76A' : score >= 60 ? '#F59E0B' : '#F04452'
  const label = score >= 80 ? '양호' : score >= 60 ? '보통' : '개선 필요'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#F2F4F6" strokeWidth="12"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 50 * score / 100} ${2 * Math.PI * 50 * (1 - score / 100)}`}
            strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-3xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs text-[#8B95A1] font-medium">/ 100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-bold" style={{ color }}>{label}</span>
    </div>
  )
}

// ── 진단 섹션 카드 ────────────────────────────────────
function DiagnosisCard({ item }: { item: typeof DIAGNOSIS_ITEMS[0] }) {
  const [open, setOpen] = useState(false)
  const passed = item.checks.filter(c => c.done).length
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6]">
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#FAFBFF] transition-colors text-left">
        <span className="text-2xl">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-[#191F28]">{item.category}</span>
            <span className="text-sm font-black" style={{ color: item.color }}>{item.score}점</span>
          </div>
          <div className="w-full bg-[#F2F4F6] rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${item.score}%`, background: item.color }}/>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[#8B95A1]">통과 {passed}/{item.checks.length}</span>
            <span className="text-[10px] text-[#8B95A1]">{open ? '▲ 접기' : '▼ 상세보기'}</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-2 border-t border-[#F2F4F6] pt-3">
          {item.checks.map((c, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${c.done ? 'bg-[#ECFDF5] text-[#12B76A]' : 'bg-[#FFF1F2] text-[#F04452]'}`}>
                {c.done ? '✓' : '✗'}
              </span>
              <div>
                <p className={`text-xs font-semibold ${c.done ? 'text-[#191F28]' : 'text-[#F04452]'}`}>{c.label}</p>
                <p className="text-[11px] text-[#8B95A1] mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 개선 추천 ─────────────────────────────────────────
const RECOMMENDATIONS = [
  { priority: 'HIGH', icon: '🔥', title: '키워드 최적화 필요', desc: '소개글에 지역+업종 키워드를 추가하고 해시태그를 5개 이상 등록하세요. 순위 상승에 직접적 영향을 줍니다.', impact: '+8~15순위 예상' },
  { priority: 'HIGH', icon: '📸', title: '메뉴 사진 보강', desc: '메뉴 사진을 10장 이상 등록하면 플레이스 노출 빈도가 증가합니다.', impact: '클릭률 +20~30% 예상' },
  { priority: 'MED',  icon: '💬', title: '부정 리뷰 답글 작성', desc: '미응답 부정 리뷰 2건에 성의있게 답글을 달아 신뢰도를 높이세요.', impact: '평점 관리 효과' },
  { priority: 'LOW',  icon: '🌐', title: '홈페이지 URL 등록', desc: '공식 홈페이지나 SNS 주소를 등록하면 신뢰도 점수가 올라갑니다.', impact: '신뢰도 +5점 예상' },
]

// ── 메인 페이지 ───────────────────────────────────────
export default function PlaceDiagnosisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalyzed, setLastAnalyzed] = useState('2026.04.13 오전 1:46')

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    await new Promise(r => setTimeout(r, 2000))
    setLastAnalyzed(new Date().toLocaleString('ko-KR'))
    setIsAnalyzing(false)
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] p-4 pt-20 md:p-6 md:pt-6">
        {/* LOCALUTION_HERO_BANNER */}
        <section className="bg-gradient-to-r from-[#22C55E] to-[#15803D] text-white px-4 py-10 sm:py-14">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="text-4xl sm:text-5xl drop-shadow-sm">📍</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">네이버 플레이스 SEO</h1>
              <p className="text-white/85 text-xs sm:text-sm mt-1 leading-relaxed">내 업체 노출 순위를 실시간으로 — 경쟁사 대비 위치·리뷰·반응까지</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
              로컬루션
            </div>
          </div>
        </section>

        {/* ── 데모 안내 배너 (비로그인·게스트 대상) ── */}
        <div className="mb-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F59E0B] text-white tracking-wider">샘플</span>
            <span className="text-sm font-bold text-[#92400E]">아래 점수는 예시 매장 진단 결과입니다</span>
          </div>
          <p className="text-xs text-[#92400E] sm:ml-auto leading-relaxed">
            내 가게 실제 점수를 보려면{' '}
            <a href="/login?redirect=/marketing/place"
              className="font-bold underline decoration-[#92400E] decoration-2 underline-offset-2">
              무료 가입 → 네이버 플레이스 연동
            </a>
            {' '}하세요. 1분이면 충분해요.
          </p>
        </div>

        {/* 페이지 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-[#191F28]">📍 플레이스 진단</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">네이버 플레이스 최적화 상태를 종합 분석합니다</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#8B95A1]">마지막 분석: {lastAnalyzed}</span>
            <button onClick={handleAnalyze} disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60">
              {isAnalyzing ? (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>재분석 중...</>
              ) : '🔄 다시 분석'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">

          {/* 좌: 종합 점수 + 추천 */}
          <div className="space-y-5">

            {/* 종합 점수 카드 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <p className="text-sm font-bold text-[#191F28] mb-4 text-center">종합 플레이스 점수</p>
              <div className="flex justify-center mb-4">
                <ScoreGauge score={TOTAL_SCORE} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DIAGNOSIS_ITEMS.map(item => (
                  <div key={item.category} className="flex items-center justify-between bg-[#F8F9FA] rounded-xl px-3 py-2">
                    <span className="text-[11px] text-[#8B95A1]">{item.icon} {item.category}</span>
                    <span className="text-xs font-bold" style={{ color: item.color }}>{item.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 개선 추천 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <p className="text-sm font-bold text-[#191F28] mb-3">🎯 개선 추천사항</p>
              <div className="space-y-3">
                {RECOMMENDATIONS.map((r, i) => (
                  <div key={i} className={`p-3 rounded-xl border-l-4 ${r.priority === 'HIGH' ? 'bg-[#FFF1F2] border-[#F04452]' : r.priority === 'MED' ? 'bg-[#FFFBEB] border-[#F59E0B]' : 'bg-[#F0F9FF] border-[#3182F6]'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#191F28]">{r.icon} {r.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.priority === 'HIGH' ? 'bg-[#F04452] text-white' : r.priority === 'MED' ? 'bg-[#F59E0B] text-white' : 'bg-[#3182F6] text-white'}`}>
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4E5968]">{r.desc}</p>
                    <p className="text-[10px] font-semibold text-[#3182F6] mt-1">{r.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 우: 항목별 진단 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#191F28]">항목별 상세 진단</p>
              <span className="text-[11px] text-[#8B95A1]">클릭하여 상세 항목 확인</span>
            </div>
            {DIAGNOSIS_ITEMS.map(item => (
              <DiagnosisCard key={item.category} item={item} />
            ))}
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}

