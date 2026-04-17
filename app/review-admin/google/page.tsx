'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'

interface Review {
  id: number
  author: string
  rating: number
  content: string
  date: string
  replied: boolean
}

const DEMO_REVIEWS: Review[] = [
  { id: 1, author: 'J. Kim', rating: 5, content: 'Great food and cozy atmosphere. Service was excellent. Will definitely come back!', date: '5시간 전', replied: true },
  { id: 2, author: 'Sarah L.', rating: 4, content: 'Nice place for dinner. The bibimbap was really good. A bit pricey though.', date: '1일 전', replied: false },
  { id: 3, author: 'Mike P.', rating: 5, content: 'Best Korean restaurant in Gangnam! The BBQ set menu is a must-try.', date: '3일 전', replied: false },
  { id: 4, author: 'Y. Park', rating: 3, content: 'Food was okay but waiting time was a bit long. Interior is nice though.', date: '5일 전', replied: false },
]

const PLATFORM = {
  key: 'google',
  label: '구글',
  color: '#4285F4',
  bg: '#EBF3FE',
  textColor: '#1A56B0',
  icon: 'G',
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm tracking-tight" style={{ color: '#F59E0B' }}>
      {'★'.repeat(n)}<span className="text-[#E5E8EB]">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

export default function GoogleReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [connected, setConnected] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [aiReply, setAiReply] = useState('')
  const [generating, setGenerating] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterReplied, setFilterReplied] = useState<'all' | 'replied' | 'unreplied'>('all')
  const [copied, setCopied] = useState(false)
  const [tone, setTone] = useState<'warm' | 'polite' | 'formal'>('warm')

  useEffect(() => {
    try {
      const linksRaw = localStorage.getItem('localution.platform_links')
      const links = linksRaw ? JSON.parse(linksRaw) : []
      const googleLink = links.find((l: any) => l.platform === 'google')
      const legacyConnected = localStorage.getItem('localution.google.connected') === 'true'
      const isConn = !!googleLink || legacyConnected
      setConnected(isConn)
      setStoreName(googleLink?.externalName || '하랑마케팅 강남점')
      setReviews(DEMO_REVIEWS)
    } catch {
      setReviews(DEMO_REVIEWS)
    }
  }, [])

  const handleAiReply = async (review: Review) => {
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
          store_name: storeName || '하랑마케팅 강남점',
          tone,
        }),
      })
      const data = await res.json()
      setAiReply(data.reply || data.message || 'AI 답글 생성 실패')
    } catch {
      setAiReply('네트워크 오류')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await navigator.clipboard.writeText(aiReply)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      window.open('https://business.google.com/reviews/', '_blank', 'noopener,noreferrer')
    } catch {
      alert('복사 실패 — 직접 답글을 선택해 복사하세요')
    }
  }

  const filtered = reviews.filter(r => {
    if (filterRating !== null && r.rating !== filterRating) return false
    if (filterReplied === 'replied' && !r.replied) return false
    if (filterReplied === 'unreplied' && r.replied) return false
    return true
  })

  const stats = {
    total: reviews.length,
    unreplied: reviews.filter(r => !r.replied).length,
    avg: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0',
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 pt-20 md:p-8 md:pt-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Link href="/review-admin" className="text-xs text-[#8B95A1] hover:text-[#4E5968]">← 리뷰 관리</Link>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
            style={{ background: PLATFORM.color }}>{PLATFORM.icon}</div>
          <h1 className="text-xl md:text-2xl font-black text-[#191F28]">구글 리뷰 관리</h1>
          {connected ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-semibold">연결됨</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">데모 모드</span>
          )}
        </div>
        <p className="text-xs md:text-sm text-[#8B95A1] mb-4">
          {connected ? `${storeName} · 실시간 리뷰` : '연결 전 샘플 데이터입니다. 설정 > 플랫폼 연결에서 연동하세요.'}
        </p>

        {!connected && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 mb-5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs md:text-sm text-[#92400E]">
              구글 비즈니스 프로필을 연동하면 실시간 리뷰를 불러올 수 있습니다.
            </p>
            <Link href="/settings/connect?platform=google"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 whitespace-nowrap"
              style={{ background: PLATFORM.color }}>+ 연결하기</Link>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
            <p className="text-[11px] text-[#8B95A1] font-medium mb-1">총 리뷰</p>
            <p className="text-xl font-black text-[#191F28]">{stats.total}건</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
            <p className="text-[11px] text-[#8B95A1] font-medium mb-1">미답변</p>
            <p className="text-xl font-black text-[#F59E0B]">{stats.unreplied}건</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
            <p className="text-[11px] text-[#8B95A1] font-medium mb-1">평균 별점</p>
            <p className="text-xl font-black text-[#191F28]">{stats.avg}점</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">평점</span>
            <button onClick={() => setFilterRating(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === null ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
              style={filterRating === null ? { background: PLATFORM.color } : {}}>전체</button>
            {[5, 4, 3, 2, 1].map(n => (
              <button key={n} onClick={() => setFilterRating(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === n ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                style={filterRating === n ? { background: PLATFORM.color } : {}}>{n}★</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">상태</span>
            {([['all','전체'],['unreplied','미답변'],['replied','답변완료']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFilterReplied(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterReplied === v ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                style={filterReplied === v ? { background: PLATFORM.color } : {}}>{l}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#8B95A1] border border-[#E5E8EB]">
              조건에 맞는 리뷰가 없습니다.
            </div>
          ) : filtered.map(review => (
            <div key={review.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#191F28]">{review.author}</span>
                  <Stars n={review.rating} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8B95A1]">{review.date}</span>
                  {review.replied && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-semibold">답변완료</span>}
                </div>
              </div>
              <p className="text-sm text-[#4E5968] leading-relaxed mb-3 break-words">{review.content}</p>

              {replyingId === review.id && (
                <div className="rounded-xl p-3 mb-3 border" style={{ background: PLATFORM.bg, borderColor: PLATFORM.color + '40' }}>
                  {generating ? (
                    <p className="text-sm font-semibold" style={{ color: PLATFORM.textColor }}>AI 답글 생성 중...</p>
                  ) : aiReply ? (
                    <>
                      <div className="mb-2">
                        <p className="text-[10px] text-[#8B95A1] mb-1.5 flex items-center gap-1">
                          💡 복사 후 구글 비즈니스 프로필에 붙여넣기
                        </p>
                        <p className="text-sm text-[#191F28] leading-relaxed">{aiReply}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={handleSubmit}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90"
                          style={{ background: PLATFORM.color }}>
                          {copied ? '✓ 복사됨! 붙여넣기' : '📋 복사 + 구글 열기'}
                        </button>
                        <button onClick={() => handleAiReply(review)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F2F4F6] text-[#4E5968]">재생성</button>
                        <button onClick={() => { setReplyingId(null); setAiReply('') }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#8B95A1]">취소</button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {!review.replied && replyingId !== review.id && (
                <button onClick={() => handleAiReply(review)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
                  style={{ background: PLATFORM.color }}>
                  ✨ AI 답글 생성
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
