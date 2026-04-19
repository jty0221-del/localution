'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
import { toast } from '../../lib/toast'
import { buildSettingsHref } from '../../lib/settings-tabs'

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
      let fallbackName = ''
      try {
        const p = JSON.parse(localStorage.getItem('localution_store') || '{}')
        fallbackName = p?.storeName || ''
      } catch {}
      setStoreName(googleLink?.externalName || fallbackName)
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
          store_name: storeName || '저희 매장',
          tone,
        }),
      })
      const data = await res.json()
      setAiReply(data.reply || data.message || '답글을 만들지 못했어요. 재생성을 눌러주세요 🔁')
    } catch {
      setAiReply('연결이 잠깐 불안정했어요. 다시 시도해주세요 🙏')
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
      toast.warn('자동 복사가 안 돼요. 답글을 직접 드래그해서 복사해주세요 ✍️')
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
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col overflow-x-hidden">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-[220px] pt-14 md:pt-0 min-w-0">
          <PageHeader
            icon="🔷"
            title="구글 리뷰 관리"
            subtitle={connected ? `${storeName} · 실시간 리뷰 자동 수집` : 'Google Business Profile 리뷰 · AI 답글 초안 자동 생성'}
            variant="google"
          />
          <div className="max-w-4xl mx-auto p-4 md:p-6 w-full">

        {/* 브레드크럼 + 상태 배지 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Link href="/review-admin" className="text-xs text-[#8B95A1] hover:text-[#4E5968] font-semibold">← 리뷰 관리</Link>
          <span className="text-[#E5E8EB]">·</span>
          {connected ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-semibold">● 연결됨</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">데모 모드</span>
          )}
        </div>

        {/* 🚧 데모 모드 배너 — 실시간 리뷰 API 연동 전까지 샘플 데이터 */}
        <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B] rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-2xl leading-none mt-0.5">🚧</span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-bold text-[#92400E] mb-1">데모 모드 · API 연동 준비중</p>
              <p className="text-xs text-[#B45309] leading-relaxed">
                현재 화면에 표시되는 리뷰는 기능 체험용 샘플 데이터예요. 구글 비즈니스 프로필 리뷰 API 제휴 심사가 완료되는 대로 실시간으로 연동됩니다.
              </p>
            </div>
            <Link href="/review-admin" className="px-3 py-2 rounded-xl text-[11px] md:text-xs font-bold bg-white text-[#92400E] border border-[#FDE68A] hover:bg-[#FFFBEB] whitespace-nowrap">
              허브로 돌아가기 →
            </Link>
          </div>
        </div>

        {!connected && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 mb-5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs md:text-sm text-[#92400E]">
              구글 비즈니스 프로필을 연동하면 실시간 리뷰를 불러올 수 있습니다.
            </p>
            <Link href={buildSettingsHref('connect', { platform: 'google' })}
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
              선택하신 조건에 맞는 리뷰는 아직 없어요 😊
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
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className="text-[10px] text-[#8B95A1] font-semibold">톤</span>
                          {(['warm','polite','formal'] as const).map(t => {
                            const label = t === 'warm' ? '😊 친근' : t === 'polite' ? '🙂 정중' : '🧑‍💼 공식'
                            const active = tone === t
                            return (
                              <button key={t}
                                onClick={() => { setTone(t); if (replyingId && aiReply) { const r = reviews.find(x => x.id === replyingId); if (r) { setTone(t); setTimeout(() => handleAiReply(r), 0) } } }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${active ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                                style={active ? { background: PLATFORM.color } : {}}>
                                {label}
                              </button>
                            )
                          })}
                          <span className="text-[9px] text-[#8B95A1] ml-0.5">· 클릭하면 재생성</span>
                        </div>
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

        {/* ── Footer ── */}
        <div className="-mx-4 md:-mx-6 mt-10">
          <Footer />
        </div>

          </div>
        </main>
      </div>
    </div>
  )
}

