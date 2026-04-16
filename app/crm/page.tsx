'use client'

export const dynamic = 'force-dynamic'

import Sidebar from '../components/Sidebar'

const customers = [
  { id: 1, name: '김민준', visits: 12, lastVisit: '2일 전', totalSpend: '145,000원', grade: 'VIP' },
  { id: 2, name: '이서연', visits: 8, lastVisit: '5일 전', totalSpend: '89,000원', grade: '단골' },
  { id: 3, name: '박지훈', visits: 3, lastVisit: '2주 전', totalSpend: '34,000원', grade: '일반' },
  { id: 4, name: '최수아', visits: 20, lastVisit: '어제', totalSpend: '230,000원', grade: 'VIP' },
]

const gradeColors: Record<string, string> = {
  'VIP': 'bg-yellow-100 text-yellow-700',
  '단골': 'bg-blue-100 text-blue-700',
  '일반': 'bg-gray-100 text-gray-600',
}

export default function CRM() {
  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">고객 관리</h1>
          <p className="text-[#8B95A1] mt-1">단골 고객을 관리하고 관계를 쌓아요</p>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '전체 고객', value: '284' },
            { label: 'VIP 고객', value: '23' },
            { label: '이번 달 신규', value: '18' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <div className="text-2xl font-bold text-[#191F28]">{s.value}</div>
              <div className="text-sm text-[#8B95A1] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 고객 목록 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F2F4F6]">
            <h2 className="font-bold text-[#191F28]">고객 목록</h2>
          </div>
          <div className="divide-y divide-[#F2F4F6]">
            {customers.map(c => (
              <div key={c.id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center font-bold text-[#3182F6]">
                    {c.name[0]}
                  </div>
                  <div>
                    <div className="font-medium text-[#191F28]">{c.name}</div>
                    <div className="text-sm text-[#8B95A1]">최근 방문: {c.lastVisit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-medium text-[#191F28]">{c.totalSpend}</div>
                    <div className="text-xs text-[#8B95A1]">{c.visits}회 방문</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${gradeColors[c.grade]}`}>{c.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
