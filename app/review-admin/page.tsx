'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'

const reviews = [
  { id: 1, platform: '네이버', name: '김지수', stars: 5, text: '음식이 너무 맛있어요! 사장님도 친절하시고 또 올게요 😊', time: '10분 전', answered: false, reply: '안녕하세요, 김지수 고객님! 맛있게 드셨다니 정말 기쁩니다. 사장님이 직접 만든 정성이 전해진 것 같아 뿌듯하네요. 다음에 또 방문해 주시면 더 맛있는 음식으로 보답하겠습니다. 감사합니다! 😊' },
  { id: 2, platform: '배민', name: '박민준', stars: 4, text: '배달도 빠르고 양도 많아요. 가격 대비 최고!', time: '1시간 전', answered: true, reply: '' },
  { id: 3, platform: '네이버', name: '이서연', stars: 5, text: '분위기 너무 좋고 커피도 맛있어요. 단골 될 것 같아요!', time: '3시간 전', answered: false, reply: '이서연 고객님, 방문해 주셔서 감사합니다! 분위기와 커피 모두 마음에 드셨다니 정말 기쁩니다. 단골로 오신다고 하시니 더 열심히 준비하겠습니다. ☕' },
  { id: 4, platform: '쿠팡이츠', name: '최동훈', stars: 3, text: '맛은 있는데 포장이 좀 아쉬웠어요.', time: '5시간 전', answered: false, reply: '최동훈 고객님, 소중한 의견 감사합니다. 포장 부분에서 불편을 드려 죄송합니다. 더 나은 포장재를 준비해 다음엔 완벽한 상태로 배달될 수 있도록 하겠습니다!' },
  { id: 5, platform: '네이버', name: '정민아', stars: 5, text: '주차가 넓어서 좋아요. 가족과 함께 왔는데 모두 만족했습니다.', time: '1일 전', answered: true, reply: '' },
]

export default function ReviewAdminPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [texts, setTexts] = useState<Record<number, string>>(
    Object.fromEntries(reviews.map(r => [r.id, r.reply]))
  )

  const filtered = tab === 'pending' ? reviews.filter(r => !r.answered) : reviews

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">AI 리뷰·마케팅</h1>
        <p className="text-sm text-gray-400 mt-1">AI가 분석한 리뷰와 추천 답글을 확인하세요</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ label: '전체 리뷰', value: '28', icon: '📝' }, { label: '미답변', value: '3', icon: '⏳' }, { label: '평균 별점', value: '4.6★', icon: '⭐' }].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {[{ key: 'pending', label: '미답변 3' }, { key: 'all', label: '전체 보기' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t.key ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(review => (
          <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${review.platform === '네이버' ? 'bg-green-100 text-green-600' : review.platform === '배민' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {review.platform}
                </span>
                <span className="font-semibold text-gray-900 text-sm">{review.name}</span>
                <span className="text-yellow-400 text-sm">{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</span>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{review.time}</span>
            </div>
            <p className="text-gray-700 text-sm mb-4 bg-gray-50 rounded-xl p-3 leading-relaxed">"{review.text}"</p>

            {review.answered ? (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
                답글 완료
              </div>
            ) : (
              <div>
                <div className="text-xs text-blue-600 font-semibold mb-2 flex items-center gap-1">
                  <span>🤖</span> AI 추천 답글
                </div>
                <textarea
                  value={texts[review.id] || ''}
                  onChange={e => setTexts(prev => ({ ...prev, [review.id]: e.target.value }))}
                  rows={3}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-blue-400 bg-gray-50 transition-all"
                />
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-sm">
                    답글 등록
                  </button>
                  <button className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">
                    재생성
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
