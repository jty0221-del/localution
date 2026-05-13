'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/app/components/Sidebar'
import PageHeader from '@/app/components/PageHeader'
import { TrendingUp, ThumbsUp, ThumbsDown, RefreshCw, BarChart3 } from 'lucide-react'

type Trends = {
  days: number
  total_reviews_analyzed: number
  top_keywords: Array<{ keyword: string; count: number }>
  positive_keywords: Array<{ keyword: string; count: number }>
  negative_keywords: Array<{ keyword: string; count: number }>
}

export default function KeywordsPage() {
  const [data, setData] = useState<Trends | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/user/review-keyword-trends?days=${days}`, { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setData(j)
    } catch (_) {}
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [days])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<TrendingUp size={24} className="text-white" strokeWidth={2.5} />}
          title="리뷰 키워드 트렌드"
          subtitle="자주 등장하는 단어 — 강점과 개선점 한눈에"
          variant="emerald"
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            {[7, 30, 90, 180].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition ${
                  days === d ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200'
                }`}
              >
                {d}일
              </button>
            ))}
            <button
              onClick={load}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
            </button>
          </div>

          <div className="text-xs md:text-sm text-gray-500 px-1">
            분석 리뷰: {data?.total_reviews_analyzed || 0}건
          </div>

          {/* 긍정 / 부정 키워드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 긍정 키워드 */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <ThumbsUp size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm md:text-base font-bold text-emerald-900">강점 키워드 (4~5점)</div>
                  <div className="text-[11px] text-emerald-700">손님이 좋아하는 부분</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data?.positive_keywords?.map(k => (
                  <span
                    key={k.keyword}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-emerald-200 rounded-full text-xs md:text-sm"
                    style={{ fontSize: Math.min(16, 10 + k.count / 2) + 'px' }}
                  >
                    <span className="font-bold text-emerald-900">{k.keyword}</span>
                    <span className="text-emerald-600 text-[10px]">{k.count}</span>
                  </span>
                ))}
                {(!data || data.positive_keywords.length === 0) && (
                  <div className="text-sm text-emerald-700 py-3">데이터 없음</div>
                )}
              </div>
            </div>

            {/* 부정 키워드 */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                  <ThumbsDown size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm md:text-base font-bold text-red-900">개선 키워드 (1~2점)</div>
                  <div className="text-[11px] text-red-700">손님이 불만 표현한 부분</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data?.negative_keywords?.map(k => (
                  <span
                    key={k.keyword}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-red-200 rounded-full text-xs md:text-sm"
                    style={{ fontSize: Math.min(16, 10 + k.count / 2) + 'px' }}
                  >
                    <span className="font-bold text-red-900">{k.keyword}</span>
                    <span className="text-red-600 text-[10px]">{k.count}</span>
                  </span>
                ))}
                {(!data || data.negative_keywords.length === 0) && (
                  <div className="text-sm text-red-700 py-3">부정 리뷰 없음 (긍정 100%)</div>
                )}
              </div>
            </div>
          </div>

          {/* 전체 키워드 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <BarChart3 size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="text-sm md:text-base font-bold text-gray-900">전체 빈출 키워드 TOP 30</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data?.top_keywords?.map((k, i) => (
                <span
                  key={k.keyword}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs"
                  style={{ fontSize: Math.min(18, 11 + k.count / 3) + 'px' }}
                >
                  <span className="font-bold text-gray-900">{k.keyword}</span>
                  <span className="text-gray-500 text-[10px]">{k.count}</span>
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
