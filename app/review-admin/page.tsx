'use client'

export const dynamic = 'force-dynamic'

import Sidebar from '../components/Sidebar'
import Link from 'next/link'

const reviews = [
  { id: 1, platform: '네이버', name: '김**', rating: 5, content: '음식이 정말 맛있고 서비스도 친절해요! 다음에 또 올게요.', time: '10분 전', replied: false },
  { id: 2, platform: '구글', name: 'J***', rating: 4, content: 'Great place, will definitely visit again!', time: '1시간 전', replied: true },
  { id: 3, platform: '카카오', name: '이**', rating: 3, content: '맛은 있는데 웨이팅이 좀 길어요.', time: '3시간 전', replied: false },
  { id: 4, platform: '네이버', name: '박**', rating: 5, content: '사장님이 너무 친절하세요. 단골 됩니다!', time: '5시간 전', replied: true },
  { id: 5, platform: '구글', name: 'M***', rating: 2, content: 'Food was okay but service was slow.', time: '1일 전', replied: false },
]

export default function ReviewAdmin() {
  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">리뷰 관리</h1>
          <p className="text-[#8B95A1] mt-1">AI가 리뷰 답변을 도와드려요</p>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['전체', '미답변', '네이버', '구글', '카카오'].map(f => (
            <button key={f} className="px-4 py-2 rounded-full text-sm font-medium bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors">
              {f}
            </button>
          ))}
        </div>

        {/* 리뷰 목록 */}
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-[#F2F4F6] text-[#4E5968] px-2 py-1 rounded-full">{review.platform}</span>
                  <span className="font-medium text-[#191F28]">{review.name}</span>
                  <span className="text-yellow-400">{'★'.repeat(review.rating)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!review.replied && (
                    <span className="text-xs bg-[#FFE8E8] text-[#FF3B30] px-2 py-1 rounded-full font-medium">미답변</span>
                  )}
                  <span className="text-xs text-[#8B95A1]">{review.time}</span>
                </div>
              </div>
              <p className="text-[#4E5968] mb-4">{review.content}</p>
              {!review.replied && (
                <button className="bg-[#3182F6] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors">
                  AI 답변 생성
                </button>
              )}
              {review.replied && (
                <div className="bg-[#F2F4F6] rounded-xl p-3 text-sm text-[#4E5968]">
                  ✅ 답변 완료
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
