'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

const POSTS = [
  { id: 1, author: '강남 카페사장', region: '서울 · 강남구', title: '배달앱 수수료 올랐는데 다들 어떻게 하세요?', content: '요기요, 배민 수수료가 너무 올라서 힘드네요. 다른 사장님들은 어떻게 대응하시나요?', likes: 23, comments: 12, time: '1시간 전', tag: '배달/배민' },
  { id: 2, author: '홍대 분식집', region: '서울 · 마포구', title: '네이버 플레이스 리뷰 이벤트 효과 공유합니다', content: '리뷰 이벤트 진행 후 방문자 수 47% 증가했어요! 구체적인 방법 공유드립니다.', likes: 41, comments: 18, time: '3시간 전', tag: '네이버플레이스' },
  { id: 3, author: '수원 치킨집', region: '경기 · 수원시', title: '공동구매 - 친환경 포장재 20% 할인 모집합니다', content: '10개 매장이 모이면 친환경 포장재 20% 저렴하게 구매할 수 있어요. 관심있으신 분!', likes: 15, comments: 31, time: '5시간 전', tag: '공동구매' },
  { id: 4, author: '인천 미용실', region: '인천 · 연수구', title: '블랙컨슈머 정보 공유 - 조심하세요', content: '최근 불법 환불 요구하는 손님 정보 공유합니다. 사진과 패턴 정리해두었어요.', likes: 67, comments: 44, time: '어제', tag: '블랙컨슈머' },
  { id: 5, author: '부산 식당', region: '부산 · 해운대구', title: '정부지원금 신청 결과 나왔어요!', content: '소상공인 디지털전환 지원금 200만원 받았습니다. 신청 방법 알려드릴게요.', likes: 89, comments: 56, time: '2일 전', tag: '정부지원금' },
]

const TAG_COLORS: Record<string, string> = {
  '배달/배민': '#2AC1BC', '네이버플레이스': '#03C75A',
  '공동구매': '#8B5CF6', '블랙컨슈머': '#DC2626', '정부지원금': '#F59E0B'
}

export default function CommunityPage() {
  const searchParams = useSearchParams()
  const region = searchParams?.get('r') || '전국'
  const district = searchParams?.get('d') || ''
  const [showWrite, setShowWrite] = useState(false)


  const title = district ? region + ' ' + district : region

  return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black text-[#191F28]">사장님 커뮤니티 <span className="text-[#EC4899]">{title}</span></h1>
              <p className="text-sm text-[#8B95A1] mt-0.5">소상공인 정보 공유 · 공동구매 · 블랙컨슈머 방어</p>
            </div>
            <button onClick={() => setShowWrite(true)}
              className="px-4 py-2 bg-[#EC4899] text-white text-sm font-semibold rounded-xl hover:bg-[#db2777] transition-colors">
              + 글쓰기
            </button>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-2 mb-5">
            {['전체', '네이버플레이스', '배달/배민', '공동구매', '블랙컨슈머', '정부지원금'].map(tag => (
              <button key={tag}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#FDF2F8] hover:text-[#EC4899] hover:border-[#EC4899] transition-colors">
                {tag}
              </button>
            ))}
          </div>

          {/* 게시물 목록 */}
          <div className="space-y-3">
            {POSTS.map(post => (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-5 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: (TAG_COLORS[post.tag] || '#8B95A1') + '20', color: TAG_COLORS[post.tag] || '#8B95A1' }}>
                      {post.tag}
                    </span>
                    <span className="text-xs text-[#8B95A1]">{post.region}</span>
                  </div>
                  <span className="text-xs text-[#8B95A1] flex-shrink-0">{post.time}</span>
                </div>
                <h3 className="text-sm font-bold text-[#191F28] mb-1.5">{post.title}</h3>
                <p className="text-xs text-[#8B95A1] line-clamp-2 mb-3">{post.content}</p>
                <div className="flex items-center gap-4 text-xs text-[#8B95A1]">
                  <span className="flex items-center gap-1"><span>❤️</span>{post.likes}</span>
                  <span className="flex items-center gap-1"><span>💬</span>{post.comments}</span>
                  <span className="ml-auto font-medium text-[#4E5968]">{post.author}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 글쓰기 모달 */}
          {showWrite && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
                <h2 className="text-base font-black text-[#191F28] mb-4">글쓰기</h2>
                <div className="space-y-3">
                  <select className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#EC4899]">
                    <option>카테고리 선택</option>
                    <option>네이버플레이스</option>
                    <option>배달/배민</option>
                    <option>공동구매</option>
                    <option>블랙컨슈머</option>
                    <option>정부지원금</option>
                  </select>
                  <input placeholder="제목" className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#EC4899]" />
                  <textarea rows={4} placeholder="내용을 입력해주세요..." className="w-full px-3 py-2 rounded-xl border border-[#E5E8EB] text-sm focus:outline-none focus:border-[#EC4899] resize-none" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowWrite(false)} className="flex-1 py-2.5 border border-[#E5E8EB] rounded-xl text-sm text-[#4E5968] font-medium hover:bg-[#F8F9FA]">취소</button>
                  <button onClick={() => setShowWrite(false)} className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-xl text-sm font-semibold hover:bg-[#db2777]">등록</button>
                </div>
              </div>
            </div>
          )}

        </div>
  )
}
