'use client'
import { useState } from 'react'

const googleReviews = [
  { id: 1, author: 'J. Kim', rating: 5, content: 'Great food and cozy atmosphere. Service was excellent. Will definitely come back!', date: '5시간 전', replied: true },
  { id: 2, author: 'Sarah L.', rating: 4, content: 'Nice place for dinner. The bibimbap was really good. A bit pricey though.', date: '1일 전', replied: false },
  { id: 3, author: 'Mike P.', rating: 5, content: 'Best Korean restaurant in Gangnam! The BBQ set menu is a must-try.', date: '3일 전', replied: false },
  { id: 4, author: 'Y. Park', rating: 3, content: 'Food was okay but waiting time was a bit long. Interior is nice though.', date: '5일 전', replied: false },
]

export default function GoogleReviewPage() {
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [aiReply, setAiReply] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleAiReply = async (review: typeof googleReviews[0]) => {
    setReplyingId(review.id)
    setGenerating(true)
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text: review.content, reviewer_name: review.author, rating: review.rating, store_name: '하랑마케팅 강남점', tone: 'warm' })
      })
      const data = await res.json()
      setAiReply(data.reply || data.message || '생성 실패')
    } catch { setAiReply('네트워크 오류') }
    finally { setGenerating(false) }
  }

  return (
    <div style={{ padding: '32px', maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>G</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>구글 리뷰 관리</h1>
      </div>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>구글 비즈니스 프로필 리뷰를 관리하세요</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'rgba(66,133,244,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(66,133,244,0.15)' }}>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>총 리뷰</p>
          <p style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{googleReviews.length}건</p>
        </div>
        <div style={{ background: 'rgba(66,133,244,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(66,133,244,0.15)' }}>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>미답변</p>
          <p style={{ color: '#f59e0b', fontSize: 22, fontWeight: 700 }}>{googleReviews.filter(r => !r.replied).length}건</p>
        </div>
        <div style={{ background: 'rgba(66,133,244,0.08)', borderRadius: 12, padding: 16, border: '1px solid rgba(66,133,244,0.15)' }}>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>평균 별점</p>
          <p style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{(googleReviews.reduce((s, r) => s + r.rating, 0) / googleReviews.length).toFixed(1)}점</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {googleReviews.map(review => (
          <div key={review.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{review.author}</span>
                <span style={{ color: '#f59e0b' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{review.date}</span>
                {review.replied && <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', padding: '3px 10px', borderRadius: 6, fontSize: 12 }}>답변완료</span>}
              </div>
            </div>
            <p style={{ color: '#e2e8f0', lineHeight: 1.7, marginBottom: 14 }}>{review.content}</p>
            {replyingId === review.id && (
              <div style={{ background: 'rgba(66,133,244,0.06)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                {generating ? <p style={{ color: '#4285F4' }}>AI 답글 생성 중...</p> : (
                  <div>
                    <p style={{ color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 }}>{aiReply}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ padding: '7px 18px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>등록</button>
                      <button onClick={() => handleAiReply(review)} style={{ padding: '7px 18px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>재생성</button>
                      <button onClick={() => setReplyingId(null)} style={{ padding: '7px 18px', background: 'transparent', color: '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>취소</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!review.replied && replyingId !== review.id && (
              <button onClick={() => handleAiReply(review)} style={{
                padding: '9px 18px', background: 'linear-gradient(135deg, #4285F4, #34a0f4)',
                color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>AI 답글</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
