'use client'

export const dynamic = 'force-dynamic'

import Sidebar from '../components/Sidebar'

export default function AdminBiz() {
  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">매장 관리</h1>
          <p className="text-[#8B95A1] mt-1">매장 정보와 영업 현황을 관리해요</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 매장 정보 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#191F28] mb-4">📍 매장 정보</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: '매장명', value: '우리 가게' },
                { label: '주소', value: '서울시 강남구 ...' },
                { label: '전화번호', value: '02-1234-5678' },
                { label: '영업시간', value: '09:00 - 21:00' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-[#F2F4F6] last:border-0">
                  <span className="text-[#8B95A1]">{item.label}</span>
                  <span className="font-medium text-[#191F28]">{item.value}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full bg-[#3182F6] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">
              정보 수정
            </button>
          </div>

          {/* 이번 주 통계 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#191F28] mb-4">📊 이번 주 현황</h2>
            <div className="space-y-4">
              {[
                { label: '방문 고객', value: 284, max: 400, color: '#3182F6' },
                { label: '리뷰 획득', value: 47, max: 100, color: '#00C471' },
                { label: '목표 달성률', value: 71, max: 100, color: '#FF8C00' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#4E5968]">{item.label}</span>
                    <span className="font-medium text-[#191F28]">{item.value}</span>
                  </div>
                  <div className="h-2 bg-[#F2F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(item.value / item.max) * 100}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
