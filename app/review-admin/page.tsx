'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'

type Review = {
  id: number; platform: string; name: string; rating: number;
  content: string; time: string; replied: boolean; reply?: string
}

const INITIAL_REVIEWS: Review[] = [
  { id: 1, platform: '네이버', name: '김**', rating: 5, content: '음식이 정말 맛있고 서비스도 친절해요! 사장님이 직접 테이블까지 오셔서 인사해주셨어요. 다음에 또 올게요!', time: '10분 전', replied: false },
  { id: 2, platform: '구글',   name: 'J***', rating: 4, content: 'Great food and cozy atmosphere. Service was a bit slow but overall a wonderful experience. Will definitely come back!', time: '1시간 전', replied: false },
  { id: 3, platform: '카카오', name: '이**', rating: 3, content: '맛은 있는데 웨이팅이 너무 길어요. 1시간 넘게 기다렸어요. 음식은 맛있었지만 대기가 아쉽네요.', time: '3시간 전', replied: true, reply: '소중한 리뷰 감사드립니다. 대기 시간이 길어 불편을 드려 죄송합니다. 더 나은 서비스를 위해 노력하겠습니다!' },
  { id: 4, platform: '네이버', name: '박**', rating: 5, content: '사장님이 너무 친절하세요. 음식도 맛있고 가격도 합리적이에요. 단골 됩니다!', time: '5시간 전', replied: false },
  { id: 5, platform: '구글',   name: 'M***', rating: 2, content: 'Food was okay but service was very slow and the staff seemed disinterested. The place was also quite noisy.', time: '1일 전', replied: false },
  { id: 6, platform: '네이버', name: '최**', rating: 5, content: '주변에서 제일 맛있는 집이에요. 재료도 신선하고 양도 푸짐합니다. 강추!', time: '2일 전', replied: true, reply: '과찬의 말씀 감사드립니다! 항상 신선한 재료만 사용하도록 노력하고 있어요. 또 오세요 😊' },
]

const AI_REPLIES: Record<string, string[]> = {
  '5': [
    '따뜻한 리뷰 정말 감사드립니다! 항상 정성을 다해 모시겠습니다. 또 방문해 주시면 더욱 맛있는 음식으로 모시겠습니다 😊',
    '소중한 5점 감사합니다! 말씀해주신 것처럼 항상 최선을 다하겠습니다. 곧 또 뵐 수 있기를 바랍니다!',
    '이런 좋은 리뷰가 저희에게 큰 힘이 됩니다. 다음 방문 때는 서비스 이용권 드리겠습니다! 감사합니다 🙏',
  ],
  '4': [
    '좋은 평가 감사드립니다! 부족한 점이 있었다면 더 개선하도록 노력하겠습니다. 다음에도 방문해 주세요!',
    '리뷰 남겨주셔서 감사합니다. 더 완벽한 서비스를 위해 최선을 다하겠습니다!',
    '4점 평가 감사드려요! 더 노력해서 다음엔 5점 받을 수 있도록 하겠습니다 😊',
  ],
  '3': [
    '리뷰 남겨주셔서 감사합니다. 불편하셨던 점을 개선하겠습니다. 다시 한번 기회를 주신다면 더 나은 모습 보여드리겠습니다.',
    '소중한 의견 감사합니다. 말씀해주신 부분을 꼭 개선하겠습니다. 다음 방문 때는 더 만족스러운 경험 드리겠습니다!',
    '리뷰 감사합니다. 부족한 점이 있었던 것 같아 죄송합니다. 더 나은 서비스로 보답하겠습니다.',
  ],
  '2': [
    '불편을 드려 진심으로 사과드립니다. 말씀해주신 부분을 즉시 개선하겠습니다. 다시 한번 기회를 주신다면 더 좋은 모습 보여드리겠습니다.',
    '소중한 피드백 감사합니다. 미흡한 점이 있었습니다. 서비스 품질 향상을 위해 최선을 다하겠습니다.',
    '불편하셨던 점에 깊이 사과드립니다. 고객님의 의견을 소중히 여기며 개선에 힘쓰겠습니다.',
  ],
  '1': [
    '불편을 드려 진심으로 사과드립니다. 고객님의 의견을 경영진에게 전달하여 즉시 개선하도록 하겠습니다.',
    '소중한 피드백 감사합니다. 다시는 이런 일이 없도록 철저히 점검하겠습니다. 직접 연락 주시면 보상해 드리겠습니다.',
    '정말 죄송합니다. 고객님이 불편하셨던 점들을 면밀히 검토하여 재발 방지에 최선을 다하겠습니다.',
  ],
}

function AIModal({ review, onClose, onSubmit }: { review: Review, onClose: () => void, onSubmit: (r: string) => void }) {
  const options = AI_REPLIES[String(review.rating)] || AI_REPLIES['3']
  const [selected, setSelected] = useState(0)
  const [edited, setEdited] = useState(options[0])

  const selectOption = (i: number) => { setSelected(i); setEdited(options[i]) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="font-bold text-[#191F28]">AI 답변 생성</h2>
          </div>
          <button onClick={onClose} className="text-[#8B95A1] text-2xl leading-none hover:text-[#191F28]">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* 원본 리뷰 */}
          <div className="bg-[#F2F4F6] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold bg-white px-2 py-0.5 rounded-full text-[#4E5968]">{review.platform}</span>
              <span className="text-yellow-400 text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
              <span className="text-xs text-[#8B95A1]">{review.name}</span>
            </div>
            <p className="text-sm text-[#4E5968] leading-relaxed">{review.content}</p>
          </div>

          {/* AI 옵션 3개 */}
          <div>
            <p className="text-sm font-semibold text-[#191F28] mb-3">AI 추천 답변 (클릭해서 선택)</p>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <button key={i} onClick={() => selectOption(i)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm leading-relaxed ${selected === i ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#93C5FD]'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selected === i ? 'border-[#3182F6] bg-[#3182F6]' : 'border-[#E5E8EB]'}`}>
                      {selected === i && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <span className="text-[#4E5968]">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 직접 편집 */}
          <div>
            <p className="text-sm font-semibold text-[#191F28] mb-2">답변 수정 (직접 편집 가능)</p>
            <textarea value={edited} onChange={e => setEdited(e.target.value)} rows={4}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] resize-none transition-colors" />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#4E5968] font-semibold text-sm hover:bg-[#F2F4F6]">취소</button>
          <button onClick={() => { onSubmit(edited); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#3182F6] text-white font-semibold text-sm hover:bg-[#1B64DA] transition-colors">
            답변 게시하기 ✅
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReviewAdmin() {
  const [reviews, setReviews] = useState(INITIAL_REVIEWS)
  const [filter, setFilter] = useState('all')
  const [aiTarget, setAiTarget] = useState<Review | null>(null)

  const filtered = reviews.filter(r => {
    if (filter === 'unreplied') return !r.replied
    if (['네이버','구글','카카오'].includes(filter)) return r.platform === filter
    return true
  })

  const submitReply = (id: number, reply: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, replied: true, reply } : r))
  }

  const unrepliedCount = reviews.filter(r => !r.replied).length

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] px-4 md:px-8 pb-8">
        <TopBar />

        <p className="text-[#8B95A1] mb-6">AI가 리뷰 답변을 도와드려요</p>

        {unrepliedCount > 0 && (
          <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-[#191F28] text-sm">미답변 리뷰 {unrepliedCount}개</div>
              <div className="text-xs text-[#8B95A1]">빠른 답변이 별점 향상에 도움이 돼요</div>
            </div>
            <button onClick={() => setFilter('unreplied')}
              className="ml-auto text-xs font-semibold text-[#3182F6] border border-[#3182F6] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF]">
              바로 답변하기
            </button>
          </div>
        )}

        {/* 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'all', label: '전체' }, { id: 'unreplied', label: '미답변' },
            { id: '네이버', label: '네이버' }, { id: '구글', label: '구글' }, { id: '카카오', label: '카카오' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === f.id ? 'bg-[#3182F6] text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-[#3182F6]'}`}>
              {f.label} {f.id === 'unreplied' ? `(${unrepliedCount})` : ''}
            </button>
          ))}
        </div>

        {/* 리뷰 목록 */}
        <div className="space-y-4">
          {filtered.map(review => (
            <div key={review.id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold bg-[#F2F4F6] text-[#4E5968] px-2 py-1 rounded-full">{review.platform}</span>
                  <span className="font-semibold text-[#191F28]">{review.name}</span>
                  <span className="text-yellow-400">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!review.replied && <span className="text-xs bg-[#FFE8E8] text-[#FF3B30] px-2 py-1 rounded-full font-semibold">미답변</span>}
                  <span className="text-xs text-[#8B95A1]">{review.time}</span>
                </div>
              </div>
              <p className="text-[#4E5968] mb-4 leading-relaxed">{review.content}</p>

              {review.replied && review.reply && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mb-3">
                  <div className="text-xs font-semibold text-[#3182F6] mb-1">사장님 답변</div>
                  <p className="text-sm text-[#4E5968]">{review.reply}</p>
                </div>
              )}

              {!review.replied && (
                <button onClick={() => setAiTarget(review)}
                  className="flex items-center gap-2 bg-[#3182F6] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1B64DA] transition-colors">
                  🤖 AI 답변 생성
                </button>
              )}
              {review.replied && (
                <div className="text-sm text-[#00C471] font-semibold flex items-center gap-1">✅ 답변 완료</div>
              )}
            </div>
          ))}
        </div>
      </main>

      {aiTarget && (
        <AIModal
          review={aiTarget}
          onClose={() => setAiTarget(null)}
          onSubmit={(reply) => submitReply(aiTarget.id, reply)}
        />
      )}
    </div>
  )
}
