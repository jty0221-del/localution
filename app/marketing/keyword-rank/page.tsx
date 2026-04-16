'use client'

import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'

const KEYWORDS = [
  { keyword: '강남 마케팅 대행', rank: 3,  prev: 5,  volume: '월 2.4만', trend: 'up' },
  { keyword: '소상공인 마케팅',  rank: 7,  prev: 7,  volume: '월 8.1만', trend: 'same' },
  { keyword: '네이버 플레이스 대행', rank: 2, prev: 4, volume: '월 1.2만', trend: 'up' },
  { keyword: '하랑마케팅',       rank: 1,  prev: 1,  volume: '월 320',   trend: 'same' },
  { keyword: '자영업자 마케팅',  rank: 15, prev: 12, volume: '월 6.7만', trend: 'down' },
  { keyword: '강남 마케팅',      rank: 11, prev: 9,  volume: '월 4.3만', trend: 'down' },
  { keyword: '블로그 마케팅 대행', rank: 5, prev: 8,  volume: '월 3.1만', trend: 'up' },
]

export default function KeywordRankPage() {
  const [addKeyword, setAddKeyword] = useState('')

  useEffect(() => {
    const ok = document.cookie.split(';').some(function(c) {
      return c.trim().startsWith('localution_session=')
    })
    if (!ok) { window.location.href = '/login' }
  }, [])

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black text-[#191F28]">키워드 순위</h1>
              <p className="text-sm text-[#8B95A1] mt-0.5">네이버 검색 키워드 순위 추적</p>
            </div>
            <span className="text-xs text-[#8B95A1] bg-white border border-[#E5E8EB] px-3 py-1.5 rounded-xl">
              업데이트: 오늘 09:00
            </span>
          </div>

          {/* 키워드 추가 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4 mb-5 flex gap-2">
            <input
              value={addKeyword}
              onChange={e => setAddKeyword(e.target.value)}
              placeholder="추적할 키워드 입력 (예: 강남 카페)"
              className="flex-1 px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#3182F6]"
            />
            <button onClick={() => setAddKeyword('')}
              className="px-4 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6fd6]">
              추가
            </button>
          </div>

          {/* 순위 테이블 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">
            <div className="grid grid-cols-4 px-5 py-3 bg-[#F8F9FA] border-b border-[#E5E8EB] text-xs font-semibold text-[#8B95A1]">
              <span>키워드</span>
              <span className="text-center">현재 순위</span>
              <span className="text-center">검색량</span>
              <span className="text-center">변동</span>
            </div>
            {KEYWORDS.map((k, i) => (
              <div key={i} className="grid grid-cols-4 px-5 py-3.5 border-b border-[#F2F4F6] last:border-0 hover:bg-[#F8F9FA] items-center">
                <span className="text-sm font-medium text-[#191F28]">{k.keyword}</span>
                <div className="text-center">
                  <span className={"text-lg font-black " + (k.rank <= 3 ? "text-[#F59E0B]" : k.rank <= 10 ? "text-[#3182F6]" : "text-[#8B95A1]")}>
                    {k.rank}위
                  </span>
                </div>
                <span className="text-center text-xs text-[#8B95A1]">{k.volume}</span>
                <div className="text-center">
                  {k.trend === 'up' && <span className="text-xs font-bold text-[#10B981]">▲ {k.prev - k.rank}</span>}
                  {k.trend === 'down' && <span className="text-xs font-bold text-[#DC2626]">▼ {k.rank - k.prev}</span>}
                  {k.trend === 'same' && <span className="text-xs text-[#8B95A1]">━</span>}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#8B95A1] text-center mt-4">📊 키워드 순위는 매일 오전 9시에 자동 업데이트됩니다</p>

        </div>
      </main>
    </div>
  )
}
