'use client'
import { useState } from 'react'

const mockReviews = [
  { id: 1, platform: 'naver', author: '김**', rating: 5, content: '음식도 맛있고 직원분들도 친절해요. 주차도 편하고 재방문 의사 있습니다!', date: '2시간 전', replied: false },
  { id: 2, platform: 'google', author: 'J**', rating: 4, content: 'Great food and cozy atmosphere. Service was excellent.', date: '5시간 전', replied: true, reply: '감사합니다! 또 방문해주세요 :)' },
  { id: 3, platform: 'naver', author: '박**', rating: 5, content: '회식으로 왔는데 음식 양도 많고 맛도 좋았어요. 사장님도 친절하시고 너무 좋았습니다', date: '1일 전', replied: false },
  { id: 4, platform: 'baemin', author: 'L**', rating: 3, content: 'Food was okay but waiting time was a bit long. Interior is nice though.', date: '1일 전', replied: false },
  { id: 5, platform: 'kakao', author: '최**', rating: 5, content: '분위기 좋고 맛있어요! 디저트도 훌륭합니다.', date: '2일 전', replied: true, reply: '좋은 리뷰 감사합니다!' },
  { id: 6, platform: 'yogiyo', author: '정**', rating: 4, content: '배달 빠르고 맛있었어요. 양도 많아서 좋았습니다.', date: '3일 전', replied: false },
]

const platformColors: Record<string, string> = {
  naver: '#03C75A',
  google: '#4285F4',
  kakao: '#FEE500',
  baemin: '#2AC1BC',
  yogiyo: '#FA0050',
  coupang: '#E52528',
}

const platformNames: Record<string, string> = {
  naver: '네이버',
  google: '구글',
  kakao: '카카오',
  baemin: '배달의민족',
  yogiyo: '요기요',
  coupang: '쿠팡이츠',
}

export default function ReviewsPage() {
  const [filter, setFilter] = useState('all')
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [aiReply, setAiReply] = useState('')
  const [generating, setGenerating] = useState(false)

  const filtered = filter === 'all' ? mockReviews
    : filter === 'unreplied' ? mockReviews.filter(r => !r.replied)
    : mockReviews.filter(r => r.platform === filter)

  const handleAiReply = async (review: typeof mockReviews[0]) => {
    setReplyingId(review.id)
    setGenerating(true)
    setAiReply('')
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_text: review.content,
          reviewer_name: review.author,
          rating: review.rating,
          store_name: '하랑마케팅 강남점',
          tone: 'warm'
        })
      })
      const data = await res.json()
      setAiReply(data.reply || data.message || 'AI 답글 생성에 실패했습니다.')
    } catch {
      setAiReply('네트워크 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: 960 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#fff' }}>리뷰 관리</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>전체 플랫폼 리뷰를 한곳에서 관리하고 AI 답글을 작성하세요</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: '전체' },
          { key: 'unreplied', label: '미답변' },
          { key: 'naver', label: '네이버' },
          { key: 'google', label: '구글' },
          { key: 'kakao', label: '카카오' },
          { key: 'baemin', label: '배민' },
          { key: 'yogiyo', label: '요기요' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: filter === f.key ? '#3b82f6' : 'rgba(255,255,255,0.06)',
              color: filter === f.key ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: filter === f.key ? 600 : 400,
            }}
          >{f.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map(review => (
          <div key={review.id} style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  background: platformColors[review.platform] || '#666',
                  color: review.platform === 'kakao' ? '#000' : '#fff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}>{platformNames[review.platform]}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{review.author}</span>
                <span style={{ color: '#f59e0b' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{review.date}</span>
                {review.replied && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>답변완료</span>}
              </div>
            </div>
            <p style={{ color: '#e2e8f0', lineHeight: 1.7, marginBottom: 16 }}>{review.content}</p>

            {review.replied && review.reply && (
              <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: '3px solid #3b82f6' }}>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>사장님 답글</p>
                <p style={{ color: '#cbd5e1', fontSize: 14 }}>{review.reply}</p>
              </div>
            )}

            {replyingId === review.id && (
              <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>AI 생성 답글</p>
                {generating ? (
                  <p style={{ color: '#3b82f6' }}>AI가 답글을 생성하고 있습니다...</p>
                ) : (
                  <div>
                    <p style={{ color: '#e2e8f0', lineHeight: 1.7, marginBottom: 12 }}>{aiReply}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>답글 등록</button>
                      <button onClick={() => handleAiReply(review)} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>다시 생성</button>
                      <button onClick={() => setReplyingId(null)} style={{ padding: '8px 20px', background: 'transparent', color: '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>취소</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!review.replied && replyingId !== review.id && (
              <button
                onClick={() => handleAiReply(review)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >AI 답글 작성</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
