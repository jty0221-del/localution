'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'

const customers = [
  { id: 1, name: '김지수', visits: 12, lastVisit: '오늘', spent: '240,000', grade: '단골', phone: '010-****-1234', tag: '카페 선호' },
  { id: 2, name: '박민준', visits: 8, lastVisit: '3일 전', spent: '160,000', grade: '단골', phone: '010-****-5678', tag: '배달 선호' },
  { id: 3, name: '이서연', visits: 5, lastVisit: '1주일 전', spent: '98,000', grade: '일반', phone: '010-****-9012', tag: '신규' },
  { id: 4, name: '최동훈', visits: 3, lastVisit: '2주일 전', spent: '54,000', grade: '일반', phone: '010-****-3456', tag: '' },
  { id: 5, name: '정민아', visits: 20, lastVisit: '어제', spent: '410,000', grade: 'VIP', phone: '010-****-7890', tag: 'VIP' },
]

const gradeColor: Record<string, string> = {
  'VIP': 'bg-yellow-100 text-yellow-700',
  '단골': 'bg-blue-100 text-blue-600',
  '일반': 'bg-gray-100 text-gray-500',
}

export default function CRMPage() {
  const [search, setSearch] = useState('')
  const filtered = customers.filter(c => c.name.includes(search))

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <div className="md:ml-[220px] p-4 md:p-8 max-w-4xl">
        <div className="pt-14 md:pt-0 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">CRM · 고객관리</h1>
          <p className="text-sm text-gray-400 mt-1">단골 고객을 파악하고 맞춤 마케팅을 실행하세요</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[{ label: '전체 고객', value: '142', icon: '👥' }, { label: 'VIP 고객', value: '12', icon: '⭐' }, { label: '이번 달 신규', value: '+8', icon: '🆕' }].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 알림톡 발송 배너 */}
        <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-white font-bold mb-0.5">💬 알림톡 마케팅</div>
            <div className="text-green-50 text-sm">단골 고객에게 쿠폰·이벤트 소식을 보내세요</div>
          </div>
          <button className="bg-white text-green-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-green-50 transition-colors whitespace-nowrap">발송하기</button>
        </div>

        {/* 검색 */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객 이름 검색"
            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 shadow-sm" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 px-4 py-3 text-xs font-semibold text-gray-400 border-b border-gray-100">
            <span>고객명</span><span className="text-center">방문횟수</span><span className="text-center">최근방문</span><span className="text-center">누적결제</span><span className="text-center">등급</span>
          </div>
          {filtered.map(c => (
            <div key={c.id} className="grid grid-cols-5 px-4 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                <div className="text-xs text-gray-400">{c.phone}</div>
              </div>
              <div className="text-center text-sm font-medium text-gray-700">{c.visits}회</div>
              <div className="text-center text-sm text-gray-500">{c.lastVisit}</div>
              <div className="text-center text-sm font-semibold text-gray-900">{c.spent}원</div>
              <div className="flex justify-center">
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${gradeColor[c.grade]}`}>{c.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
