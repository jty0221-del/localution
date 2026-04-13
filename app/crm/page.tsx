'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'

const customers = [
  { id: 1, name: '김지수', visits: 12, lastVisit: '오늘', spent: '240,000', grade: 'VIP', phone: '010-****-1234' },
  { id: 2, name: '박민준', visits: 8, lastVisit: '3일 전', spent: '160,000', grade: '단골', phone: '010-****-5678' },
  { id: 3, name: '이서연', visits: 5, lastVisit: '1주일 전', spent: '98,000', grade: '단골', phone: '010-****-9012' },
  { id: 4, name: '최동훈', visits: 3, lastVisit: '2주일 전', spent: '54,000', grade: '일반', phone: '010-****-3456' },
  { id: 5, name: '정민아', visits: 20, lastVisit: '어제', spent: '410,000', grade: 'VIP', phone: '010-****-7890' },
  { id: 6, name: '한승우', visits: 1, lastVisit: '3주일 전', spent: '18,000', grade: '일반', phone: '010-****-2345' },
]

const gradeStyle: Record<string, string> = {
  'VIP': 'bg-yellow-100 text-yellow-700',
  '단골': 'bg-blue-100 text-blue-600',
  '일반': 'bg-gray-100 text-gray-500',
}

export default function CRMPage() {
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('전체')

  const filtered = customers.filter(c => {
    const matchSearch = c.name.includes(search)
    const matchGrade = grade === '전체' || c.grade === grade
    return matchSearch && matchGrade
  })

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">CRM · 고객관리</h1>
        <p className="text-sm text-gray-400 mt-1">단골 고객을 파악하고 맞춤 마케팅을 실행하세요</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ label: '전체 고객', value: '142', icon: '👥' }, { label: 'VIP 고객', value: '12', icon: '⭐' }, { label: '신규 (이번 달)', value: '+8', icon: '🆕' }].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-white font-bold mb-0.5">💬 알림톡 마케팅</div>
          <div className="text-green-50 text-sm">단골 고객에게 쿠폰·이벤트 소식을 발송하세요</div>
        </div>
        <button className="bg-white text-green-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-green-50 transition-colors whitespace-nowrap">
          발송하기
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객 이름 검색"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 shadow-sm" />
        </div>
        {['전체', 'VIP', '단골', '일반'].map(g => (
          <button key={g} onClick={() => setGrade(g)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${grade === g ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {g}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-5 px-5 py-3 text-xs font-semibold text-gray-400 border-b border-gray-100">
          <span>고객명</span><span className="text-center">방문횟수</span><span className="text-center">최근방문</span><span className="text-center">누적결제</span><span className="text-center">등급</span>
        </div>
        {filtered.map((c, i) => (
          <div key={c.id} className={`px-5 py-4 ${i < filtered.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
            <div className="md:grid md:grid-cols-5 md:items-center">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                <div className="text-xs text-gray-400">{c.phone}</div>
              </div>
              <div className="hidden md:block text-center text-sm font-medium text-gray-700">{c.visits}회</div>
              <div className="hidden md:block text-center text-sm text-gray-500">{c.lastVisit}</div>
              <div className="hidden md:block text-center text-sm font-semibold text-gray-900">{c.spent}원</div>
              <div className="hidden md:flex justify-center">
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${gradeStyle[c.grade]}`}>{c.grade}</span>
              </div>
              {/* 모바일 */}
              <div className="md:hidden flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${gradeStyle[c.grade]}`}>{c.grade}</span>
                <span className="text-xs text-gray-400">{c.lastVisit} · {c.visits}회 · {c.spent}원</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
