'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

type FilterType = 'all' | 'vip' | 'regular' | 'new'

const customers = [
  { id: 1, name: '김지민', phone: '010-1234-5678', visits: 12, totalSpend: 284000, lastVisit: '2026-04-13', grade: 'VIP', tag: '단골', platform: '네이버' },
  { id: 2, name: '박서연', phone: '010-2345-6789', visits: 7, totalSpend: 156000, lastVisit: '2026-04-11', grade: '일반', tag: '회식', platform: '카카오' },
  { id: 3, name: '이준혁', phone: '010-3456-7890', visits: 3, totalSpend: 67000, lastVisit: '2026-04-10', grade: '신규', tag: '첫방문', platform: '구글' },
  { id: 4, name: '최수아', phone: '010-4567-8901', visits: 18, totalSpend: 412000, lastVisit: '2026-04-14', grade: 'VIP', tag: '단골', platform: '네이버' },
  { id: 5, name: '정민준', phone: '010-5678-9012', visits: 5, totalSpend: 98000, lastVisit: '2026-04-08', grade: '일반', tag: '가족', platform: '구글' },
  { id: 6, name: '한예진', phone: '010-6789-0123', visits: 1, totalSpend: 23000, lastVisit: '2026-04-12', grade: '신규', tag: '첫방문', platform: '인스타' },
]

const gradeColor: Record<string, string> = {
  'VIP': 'bg-[#FFF3E0] text-[#FF8C00]',
  '일반': 'bg-[#E8F1FE] text-[#3182F6]',
  '신규': 'bg-[#F0FDF4] text-[#00C896]',
}

export default function CustomersPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'vip', label: 'VIP' },
    { key: 'regular', label: '일반' },
    { key: 'new', label: '신규' },
  ]

  const filterMap: Record<FilterType, string | null> = {
    all: null,
    vip: 'VIP',
    regular: '일반',
    new: '신규',
  }

  const filtered = customers.filter(c => {
    const gradeMatch = !filterMap[filter] || c.grade === filterMap[filter]
    const searchMatch = !search || c.name.includes(search) || c.phone.includes(search) || c.tag.includes(search)
    return gradeMatch && searchMatch
  })

  const selectedCustomer = customers.find(c => c.id === selected)

  const totalVisits = customers.reduce((s, c) => s + c.visits, 0)
  const totalSpend = customers.reduce((s, c) => s + c.totalSpend, 0)
  const vipCount = customers.filter(c => c.grade === 'VIP').length

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#191F28]">고객 관리</h1>
          <p className="text-[#8B95A1] mt-1 text-sm">방문 고객을 분석하고 관리해요</p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 고객', value: customers.length + '명', icon: '👥', color: '#3182F6' },
            { label: 'VIP 고객', value: vipCount + '명', icon: '⭐', color: '#FF8C00' },
            { label: '총 방문', value: totalVisits.toLocaleString() + '회', icon: '🚪', color: '#00C896' },
            { label: '누적 매출', value: (totalSpend / 10000).toFixed(0) + '만원', icon: '💰', color: '#8B5CF6' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{s.icon}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[#8B95A1] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 고객 목록 */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* 검색 + 필터 */}
            <div className="p-5 border-b border-[#F2F4F6]">
              <div className="flex gap-3 mb-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="이름, 전화번호, 태그 검색"
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm pl-9 focus:outline-none focus:border-[#3182F6] transition-all"
                  />
                  <span className="absolute left-3 top-2.5 text-[#8B95A1]">🔍</span>
                </div>
                <button className="bg-[#3182F6] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1B64DA] transition-colors">
                  + 고객 추가
                </button>
              </div>
              <div className="flex gap-2">
                {filters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      filter === f.key
                        ? 'bg-[#3182F6] text-white'
                        : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
                    ].join(' ')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 목록 */}
            <div className="divide-y divide-[#F8F9FA]">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id === selected ? null : c.id)}
                  className={[
                    'w-full text-left px-5 py-4 hover:bg-[#FAFBFF] transition-colors flex items-center gap-4',
                    selected === c.id ? 'bg-[#EFF6FF]' : '',
                  ].join(' ')}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-[#191F28]">{c.name}</span>
                      <span className={['text-[10px] px-1.5 py-0.5 rounded-full font-bold', gradeColor[c.grade]].join(' ')}>{c.grade}</span>
                      <span className="text-[10px] bg-[#F2F4F6] text-[#8B95A1] px-1.5 py-0.5 rounded-full">#{c.tag}</span>
                    </div>
                    <div className="text-xs text-[#8B95A1]">{c.phone} · 방문 {c.visits}회 · {c.lastVisit}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[#191F28]">{c.totalSpend.toLocaleString()}원</div>
                    <div className="text-[10px] text-[#8B95A1]">{c.platform} 유입</div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center text-[#8B95A1] text-sm">검색 결과가 없어요</div>
              )}
            </div>
          </div>

          {/* 고객 상세 / 마케팅 발송 */}
          <div className="space-y-4">
            {selectedCustomer ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="text-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                    {selectedCustomer.name[0]}
                  </div>
                  <h3 className="font-bold text-[#191F28]">{selectedCustomer.name}</h3>
                  <span className={['text-xs px-2 py-0.5 rounded-full font-bold', gradeColor[selectedCustomer.grade]].join(' ')}>{selectedCustomer.grade}</span>
                </div>
                <div className="space-y-2.5 mb-5">
                  {[
                    { label: '전화번호', value: selectedCustomer.phone },
                    { label: '총 방문', value: selectedCustomer.visits + '회' },
                    { label: '총 결제', value: selectedCustomer.totalSpend.toLocaleString() + '원' },
                    { label: '최근 방문', value: selectedCustomer.lastVisit },
                    { label: '유입 채널', value: selectedCustomer.platform },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[#8B95A1]">{r.label}</span>
                      <span className="font-semibold text-[#191F28]">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <button className="w-full bg-[#3182F6] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">
                    📱 문자 발송
                  </button>
                  <button className="w-full border border-[#E5E8EB] text-[#4E5968] font-semibold py-2.5 rounded-xl text-sm hover:bg-[#F2F4F6] transition-colors">
                    🎁 쿠폰 발송
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <div className="text-4xl mb-2">👆</div>
                <p className="text-sm text-[#8B95A1]">고객을 클릭하면<br />상세 정보가 표시돼요</p>
              </div>
            )}

            {/* 마케팅 빠른 발송 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-4">📣 전체 마케팅 발송</h3>
              <div className="space-y-2">
                {[
                  { label: 'VIP 고객 감사 문자', icon: '⭐', count: vipCount },
                  { label: '재방문 쿠폰 발송', icon: '🎟️', count: customers.length },
                  { label: '신규 환영 메시지', icon: '🎉', count: customers.filter(c => c.grade === '신규').length },
                ].map((m, i) => (
                  <button key={i} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E8EB] hover:border-[#3182F6] hover:bg-[#EFF6FF] transition-all text-sm group">
                    <div className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <span className="text-[#4E5968] group-hover:text-[#3182F6]">{m.label}</span>
                    </div>
                    <span className="text-[#8B95A1] text-xs">{m.count}명</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
