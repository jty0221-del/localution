'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'

const REVIEWS = [
  { name: '김**', rating: 5, text: '진짜 최고예요! 다음에 또 올게요 ㅎㅎ 분위기도 좋고 음식도 맛있어요.', date: '2026-04-16', replied: false },
  { name: '이**', rating: 4, text: '전반적으로 만족스러웠어요. 주차 공간이 조금 아쉬웠어요.', date: '2026-04-15', replied: true, reply: '방문해주셔서 감사합니다! 주차 환경 개선을 위해 노력하겠습니다.' },
  { name: '박**', rating: 5, text: '여기 단골입니다. 항상 맛있고 서비스도 훌륭해요!', date: '2026-04-14', replied: false },
  { name: '최**', rating: 3, text: '기대에 비해 조금 아쉬웠어요. 개선 부탁드려요.', date: '2026-04-13', replied: false },
  { name: '정**', rating: 5, text: '사장님 너무 친절하세요. 항상 감사합니다!', date: '2026-04-12', replied: true, reply: '항상 변함없이 찾아주시는 정 고객님, 정말 감사합니다!' },
]

export default function ReviewPage_Google() {
  const [replyModal, setReplyModal] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')


  const pendingCount = REVIEWS.filter(r => !r.replied).length

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">

          <div className="flex items-center gap-3 mb-6">
            <Link href="/review-admin" className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-[#E5E8EB] text-[#8B95A1] hover:bg-[#F2F4F6] text-sm">←</Link>
            <div>
              <h1 className="text-xl font-black text-[#191F28]">구글 리뷰</h1>
              <p className="text-sm text-[#8B95A1] mt-0.5">총 23개 · 별점 4.6 · 미답변 1개</p>
            </div>
          </div>

          {/* 요약 */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F2F4F6] text-center">
              <p className="text-2xl font-black text-[#191F28]">23</p>
              <p className="text-xs text-[#8B95A1] mt-0.5">전체 리뷰</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F2F4F6] text-center">
              <p className="text-2xl font-black" style={{ color: '#4285F4' }}>4.6</p>
              <p className="text-xs text-[#8B95A1] mt-0.5">평균 별점</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F2F4F6] text-center">
              <p className="text-2xl font-black text-[#DC2626]">{pendingCount}</p>
              <p className="text-xs text-[#8B95A1] mt-0.5">미답변</p>
            </div>
          </div>

          {/* 리뷰 목록 */}
          <div className="space-y-3">
            {REVIEWS.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: '#4285F4' }}>{r.name[0]}</div>
                    <div>
                      <p className="text-sm font-semibold text-[#191F28]">{r.name}</p>
                      <p className="text-xs text-[#8B95A1]">{r.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#F59E0B] text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                  </div>
                </div>
                <p className="text-sm text-[#4E5968] leading-relaxed">{r.text}</p>

                {r.replied && 'reply' in r && (
                  <div className="mt-3 p-3 rounded-xl border-l-3" style={{ background: '#EEF3FE', borderLeft: '3px solid #4285F4' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#4285F4' }}>사장님 답글</p>
                    <p className="text-sm text-[#4E5968]">{r.reply}</p>
                  </div>
                )}

                {!r.replied && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { setReplyModal(i); setReplyText('') }}
                      className="px-3 py-1.5 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                      style={{ background: '#4285F4' }}>
                      AI 답글 생성
                    </button>
                    <button className="px-3 py-1.5 bg-[#F2F4F6] text-[#4E5968] text-xs font-semibold rounded-xl hover:bg-[#E5E8EB]">
                      직접 작성
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI 답글 모달 */}
          {replyModal !== null && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
                <h2 className="text-base font-black text-[#191F28] mb-3">AI 답글 생성</h2>
                <div className="p-3 bg-[#F8F9FA] rounded-xl mb-3 text-xs text-[#4E5968]">
                  {replyModal !== null ? REVIEWS[replyModal].text : ''}
                </div>
                <div className="flex gap-2 mb-3">
                  {['따뜻한','전문적','유쾌한','심플'].map(tone => (
                    <button key={tone} className="px-3 py-1 rounded-full text-xs bg-[#EFF6FF] text-[#3182F6] font-medium hover:bg-[#DBEAFE]">{tone}</button>
                  ))}
                </div>
                <div className="p-3 bg-[#EFF6FF] rounded-xl mb-4 text-sm text-[#191F28] leading-relaxed">
                  소중한 리뷰 남겨주셔서 진심으로 감사드립니다 😊 사장님의 말씀을 마음 깊이 새기겠습니다. 다음 방문 때 더욱 만족스러운 경험을 드릴 수 있도록 최선을 다하겠습니다. 또 찾아주세요!
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setReplyModal(null)} className="flex-1 py-2.5 border border-[#E5E8EB] rounded-xl text-sm text-[#4E5968] font-medium hover:bg-[#F8F9FA]">취소</button>
                  <button onClick={() => setReplyModal(null)} className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90"
                    style={{ background: '#4285F4' }}>등록하기</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
