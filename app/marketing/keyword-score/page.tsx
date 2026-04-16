'use client'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'

const ANALYZE_RESULTS = [
  { keyword: '강남 마케팅 대행', score: 87, competition: '높음', volume: '월 2.4만', opportunity: '높음', recommend: true },
  { keyword: '강남 소상공인 마케팅', score: 72, competition: '중간', volume: '월 5.2천', opportunity: '매우 높음', recommend: true },
  { keyword: '강남구 마케팅 대행업체', score: 65, competition: '낮음', volume: '월 1.1천', opportunity: '중간', recommend: false },
  { keyword: '자영업 마케팅 솔루션', score: 91, competition: '낮음', volume: '월 2.8천', opportunity: '매우 높음', recommend: true },
]

export default function KeywordScorePage() {
  const [keyword, setKeyword] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [loading, setLoading] = useState(false)


  const handleAnalyze = () => {
    if (!keyword.trim()) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setAnalyzed(true) }, 1200)
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">

          <div className="mb-6">
            <h1 className="text-xl font-black text-[#191F28]">키워드 점수분석</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">AI 기반 키워드 경쟁도·기회도 분석</p>
          </div>

          {/* 검색 입력 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-5 mb-5">
            <p className="text-sm font-semibold text-[#191F28] mb-3">키워드 분석</p>
            <div className="flex gap-2">
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAnalyze() }}
                placeholder="분석할 키워드 입력 (예: 강남 카페 맛집)"
                className="flex-1 px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#3182F6]"
              />
              <button onClick={handleAnalyze}
                className="px-5 py-2.5 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6fd6] transition-colors">
                {loading ? '분석 중...' : '분석하기'}
              </button>
            </div>
            {loading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#8B95A1]">
                <div className="w-4 h-4 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
                AI가 키워드를 분석하고 있어요...
              </div>
            )}
          </div>

          {/* 분석 결과 */}
          {analyzed && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[#4E5968] px-1">연관 키워드 분석 결과</h2>
              {ANALYZE_RESULTS.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-[#191F28]">{r.keyword}</span>
                        {r.recommend && (
                          <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold rounded-full">추천</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-[#8B95A1]">검색량</p>
                          <p className="font-semibold text-[#191F28]">{r.volume}</p>
                        </div>
                        <div>
                          <p className="text-[#8B95A1]">경쟁도</p>
                          <p className={"font-semibold " + (r.competition === '높음' ? "text-[#DC2626]" : r.competition === '중간' ? "text-[#F59E0B]" : "text-[#10B981]")}>{r.competition}</p>
                        </div>
                        <div>
                          <p className="text-[#8B95A1]">기회도</p>
                          <p className={"font-semibold " + (r.opportunity.includes('매우') ? "text-[#10B981]" : r.opportunity === '높음' ? "text-[#3182F6]" : "text-[#8B95A1]")}>{r.opportunity}</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-full border-4 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: r.score >= 80 ? '#10B981' : r.score >= 65 ? '#F59E0B' : '#DC2626' }}>
                      <span className="text-sm font-black" style={{ color: r.score >= 80 ? '#10B981' : r.score >= 65 ? '#F59E0B' : '#DC2626' }}>{r.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!analyzed && !loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-10 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-semibold text-[#191F28]">키워드를 입력하고 분석을 시작해보세요</p>
              <p className="text-xs text-[#8B95A1] mt-1">AI가 경쟁도와 기회도를 분석해드려요</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
