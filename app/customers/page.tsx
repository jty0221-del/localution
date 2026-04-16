'use client'

import { useState } from 'react'

const MOCK_CUSTOMERS = [
  { id: 1, name: '김민수', phone: '010-1234-5678', tag: 'VIP', visits: 12, lastVisit: '2026-04-14', spend: '₩128,000' },
  { id: 2, name: '이지영', phone: '010-2345-6789', tag: '단골', visits: 7, lastVisit: '2026-04-12', spend: '₩74,000' },
  { id: 3, name: '박서준', phone: '010-3456-7890', tag: '신규', visits: 1, lastVisit: '2026-04-16', spend: '₩23,000' },
  { id: 4, name: '최유진', phone: '010-4567-8901', tag: 'VIP', visits: 18, lastVisit: '2026-04-15', spend: '₩210,000' },
  { id: 5, name: '정현우', phone: '010-5678-9012', tag: '단골', visits: 5, lastVisit: '2026-04-10', spend: '₩51,000' },
  { id: 6, name: '강서연', phone: '010-6789-0123', tag: '신규', visits: 2, lastVisit: '2026-04-11', spend: '₩34,000' },
  { id: 7, name: '윤도현', phone: '010-7890-1234', tag: '휴면', visits: 9, lastVisit: '2026-01-20', spend: '₩93,000' },
  { id: 8, name: '임소희', phone: '010-8901-2345', tag: 'VIP', visits: 22, lastVisit: '2026-04-13', spend: '₩287,000' },
]

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'VIP':    { bg: '#FFF9C4', text: '#B45309' },
  '단골':   { bg: '#DCFCE7', text: '#15803D' },
  '신규':   { bg: '#EFF6FF', text: '#3182F6' },
  '휴면':   { bg: '#F2F4F6', text: '#8B95A1' },
  '블랙리스트': { bg: '#FEE2E2', text: '#DC2626' },
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('전체')
  const [showAdd, setShowAdd] = useState(false)
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS)


  const tags = ['전체', 'VIP', '단골', '신규', '휴면', '블랙리스트']

  const filtered = customers.filter(c => {
    const matchTag = activeTag === '전체' || c.tag === activeTag
    const matchSearch = c.name.includes(search) || c.phone.includes(search)
    return matchTag && matchSearch
  })

  const stats = [
    { label: '전체 고객', value: customers.length + '명', color: '#3182F6', icon: '👥' },
    { label: 'VIP 고객', value: customers.filter(c => c.tag === 'VIP').length + '명', color: '#F59E0B', icon: '⭐' },
    { label: '신규 (이번 달)', value: customers.filter(c => c.tag === '신규').length + '명', color: '#10B981', icon: '✨' },
    { label: '재방문 유도 대상', value: customers.filter(c => c.tag === '휴면').length + '명', color: '#F97316', icon: '🔔' },
  ]

  return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">

          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black text-[#191F28]">고객 관리</h1>
              <p className="text-sm text-[#8B95A1] mt-0.5">CRM · 고객 태그 · 메시지 발송</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1a6fd6] transition-colors"
            >
              <span>+</span><span>고객 추가</span>
            </button>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F2F4F6]">
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 검색 + 필터 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="text"
                placeholder="이름 또는 전화번호 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#3182F6]"
              />
              <button className="px-4 py-2 bg-[#F2F4F6] text-[#4E5968] text-sm font-medium rounded-xl hover:bg-[#E5E8EB] transition-colors">
                📨 단체 메시지
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={"px-3 py-1 rounded-full text-xs font-medium transition-all " + (activeTag === tag ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]")}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 고객 리스트 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">
            <div className="grid grid-cols-5 px-4 py-2.5 bg-[#F8F9FA] border-b border-[#E5E8EB] text-xs font-semibold text-[#8B95A1]">
              <span>이름</span>
              <span>연락처</span>
              <span>태그</span>
              <span>방문 횟수</span>
              <span>마지막 방문</span>
            </div>
            {filtered.map(c => (
              <div key={c.id} className="grid grid-cols-5 px-4 py-3 border-b border-[#F2F4F6] hover:bg-[#F8F9FA] transition-colors items-center">
                <span className="text-sm font-semibold text-[#191F28]">{c.name}</span>
                <span className="text-sm text-[#4E5968]">{c.phone}</span>
                <span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={TAG_COLORS[c.tag] || { bg: '#F2F4F6', text: '#4E5968' }}>
                    {c.tag}
                  </span>
                </span>
                <span className="text-sm text-[#4E5968]">{c.visits}회</span>
                <span className="text-sm text-[#8B95A1]">{c.lastVisit}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-[#8B95A1] text-sm">검색 결과가 없어요</div>
            )}
          </div>

          {/* 추가 모달 */}
          {showAdd && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                <h2 className="text-lg font-black text-[#191F28] mb-4">고객 추가</h2>
                <div className="space-y-3">
                  <input placeholder="이름" className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#3182F6]" />
                  <input placeholder="전화번호" className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#3182F6]" />
                  <select className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#3182F6]">
                    <option>신규</option><option>단골</option><option>VIP</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#E5E8EB] rounded-xl text-sm text-[#4E5968] font-medium hover:bg-[#F8F9FA]">취소</button>
                  <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-semibold hover:bg-[#1a6fd6]">추가</button>
                </div>
              </div>
            </div>
          )}

        </div>
  )
}
