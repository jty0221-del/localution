'use client'

import { useState } from 'react'

const MOCK_KEYWORDS = [
  { kw: '강남 마케팅 대행', rank: 3, change: 2, searches: 1240 },
  { kw: '소상공인 마케팅', rank: 7, change: -1, searches: 3800 },
  { kw: '네이버 플레이스 최적화', rank: 12, change: 5, searches: 920 },
  { kw: '하랑마케팅', rank: 1, change: 0, searches: 340 },
  { kw: '강남 SNS 마케팅', rank: 18, change: 3, searches: 580 },
]

const MOCK_CHECKLIST = [
  { item: '매장 사진 10장 이상', done: true },
  { item: '영업시간 등록', done: true },
  { item: '메뉴/서비스 등록', done: true },
  { item: '최근 30일 리뷰 5개 이상', done: true },
  { item: '리뷰 답글률 80% 이상', done: false },
  { item: '키워드 태그 10개 이상', done: false },
  { item: '스마트플레이스 소식 등록', done: false },
]

export default function PlacePage() {
  const [activeTab, setActiveTab] = useState('진단')
  const tabs = ['진단', '키워드', '최적화 팁']
  const score = Math.round(MOCK_CHECKLIST.filter(c => c.done).length / MOCK_CHECKLIST.length * 100)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black text-[#191F28]">플레이스 관리</h1>
        <p className="text-sm text-[#8B95A1] mt-0.5">네이버 플레이스 진단 · 키워드 · 최적화</p>
      </div>

      <div className="flex gap-1 bg-[#F2F4F6] rounded-xl p-1 mb-5">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={"flex-1 py-2 rounded-lg text-xs font-semibold transition-all " + (activeTab === tab ? "bg-white text-[#191F28] shadow-sm" : "text-[#8B95A1]")}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === '진단' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6 flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#F2F4F6" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#3182F6" strokeWidth="3" strokeDasharray={score + ", 100"} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-[#191F28]">{score}</span>
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-[#191F28]">플레이스 최적화 점수</p>
              <p className="text-sm text-[#8B95A1] mt-1">
                {score >= 80 ? '최적화 우수! 유지하세요' : score >= 60 ? '보통 — 개선 여지 있음' : '즉시 개선이 필요해요'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-5">
            <p className="text-sm font-bold text-[#191F28] mb-3">체크리스트</p>
            <div className="space-y-2">
              {MOCK_CHECKLIST.map(item => (
                <div key={item.item} className="flex items-center gap-3 py-2 border-b border-[#F2F4F6] last:border-0">
                  <div className={"w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 " + (item.done ? "bg-[#10B981]" : "bg-[#F2F4F6]")}>
                    {item.done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <p className={"text-sm " + (item.done ? "text-[#191F28]" : "text-[#8B95A1]")}>{item.item}</p>
                  {!item.done && <span className="ml-auto text-xs text-[#3182F6] font-semibold">개선 필요</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === '키워드' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">
          <div className="p-4 border-b border-[#F2F4F6]">
            <p className="text-sm font-bold text-[#191F28]">키워드 순위 현황</p>
          </div>
          <div className="divide-y divide-[#F2F4F6]">
            {MOCK_KEYWORDS.map(k => (
              <div key={k.kw} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-[#3182F6]">{k.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#191F28] truncate">{k.kw}</p>
                  <p className="text-xs text-[#8B95A1]">월간 검색 {k.searches.toLocaleString()}회</p>
                </div>
                <div className={"text-xs font-bold px-2 py-1 rounded-lg " + (k.change > 0 ? "bg-[#DCFCE7] text-[#15803D]" : k.change < 0 ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#F2F4F6] text-[#8B95A1]")}>
                  {k.change > 0 ? '▲' + k.change : k.change < 0 ? '▼' + Math.abs(k.change) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === '최적화 팁' && (
        <div className="space-y-3">
          {[
            { title: '리뷰 답글 달기', desc: '24시간 내 답글을 달면 노출 점수 +15점', icon: '💬', color: '#3182F6' },
            { title: '사진 주기적 업로드', desc: '월 4장 이상 신규 사진 등록 권장', icon: '📸', color: '#10B981' },
            { title: '스마트플레이스 소식', desc: '월 2회 이상 소식 등록 시 상위 노출 유리', icon: '📢', color: '#F59E0B' },
            { title: '키워드 태그 최적화', desc: '업종·지역 키워드 10개 이상 설정', icon: '🏷️', color: '#8B5CF6' },
            { title: '예약 기능 활성화', desc: '예약 기능 ON 시 클릭률 최대 2.3배', icon: '📅', color: '#EC4899' },
          ].map(tip => (
            <div key={tip.title} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: tip.color + '1A' }}>
                {tip.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-[#191F28]">{tip.title}</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
