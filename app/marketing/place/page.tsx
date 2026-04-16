'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'

const SCORE_ITEMS = [
  { label: '리뷰 수량', score: 82, max: 100, tip: '리뷰가 많을수록 상위 노출에 유리해요' },
  { label: '답글률', score: 74, max: 100, tip: '24시간 내 답글 비율을 높여주세요' },
  { label: '사진 품질', score: 91, max: 100, tip: '고품질 사진이 클릭률을 높입니다' },
  { label: '키워드 최적화', score: 63, max: 100, tip: '업종+지역 키워드를 메뉴/상호에 활용하세요' },
  { label: '업데이트 빈도', score: 55, max: 100, tip: '주 2회 이상 정보 업데이트를 권장합니다' },
  { label: '영업시간 정확도', score: 95, max: 100, tip: '영업시간이 정확하면 신뢰도가 올라가요' },
]

export default function PlacePage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ok = document.cookie.split(';').some(function(c) {
      return c.trim().startsWith('localution_session=')
    })
    if (!ok) { window.location.href = '/login' }
    setTimeout(() => setLoading(false), 800)
  }, [])

  const totalScore = Math.round(SCORE_ITEMS.reduce((a, i) => a + i.score, 0) / SCORE_ITEMS.length)
  const scoreColor = totalScore >= 80 ? '#10B981' : totalScore >= 60 ? '#F59E0B' : '#DC2626'

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FA]">
        <Sidebar />
        <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#3182F6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#8B95A1]">플레이스 진단 중...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">

          <div className="mb-6">
            <h1 className="text-xl font-black text-[#191F28]">플레이스 진단</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">네이버 플레이스 상위 노출 점수 분석</p>
          </div>

          {/* 종합 점수 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6 mb-5 flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-8 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: scoreColor }}>
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: scoreColor }}>{totalScore}</p>
                <p className="text-[10px] text-[#8B95A1]">점</p>
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-[#191F28]">
                {totalScore >= 80 ? '상위 노출 양호 🎉' : totalScore >= 60 ? '개선 필요 ⚠️' : '즉각 개선 필요 🚨'}
              </p>
              <p className="text-sm text-[#4E5968] mt-1">
                {totalScore >= 80
                  ? '전반적으로 잘 관리되고 있어요. 키워드 최적화를 더 강화해보세요.'
                  : '몇 가지 항목을 개선하면 상위 노출이 가능해요!'}
              </p>
              <button className="mt-3 px-4 py-2 bg-[#03C75A] text-white text-xs font-semibold rounded-xl hover:opacity-90">
                네이버 플레이스 바로가기
              </button>
            </div>
          </div>

          {/* 항목별 점수 */}
          <div className="space-y-3">
            {SCORE_ITEMS.map(item => (
              <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#191F28]">{item.label}</span>
                  <span className="text-sm font-black" style={{ color: item.score >= 80 ? '#10B981' : item.score >= 60 ? '#F59E0B' : '#DC2626' }}>
                    {item.score}점
                  </span>
                </div>
                <div className="w-full bg-[#F2F4F6] rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: item.score + '%', background: item.score >= 80 ? '#10B981' : item.score >= 60 ? '#F59E0B' : '#DC2626' }} />
                </div>
                <p className="text-xs text-[#8B95A1]">💡 {item.tip}</p>
              </div>
            ))}
          </div>

          <button className="w-full mt-5 py-3 bg-[#3182F6] text-white rounded-xl text-sm font-semibold hover:bg-[#1a6fd6] transition-colors">
            AI 최적화 가이드 받기
          </button>

        </div>
      </main>
    </div>
  )
}
