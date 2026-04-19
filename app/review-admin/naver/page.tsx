'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'

interface Review {
  id: number
  author: string
  rating: number
  content: string
  date: string
  replied: boolean
  hasPhoto: boolean
}

const DEMO_REVIEWS: Review[] = [
  { id: 1, author: '김**', rating: 5, content: '음식도 맛있고 직원분들도 친절해요. 주차도 편하고 재방문 의사 있습니다!', date: '2시간 전', replied: false, hasPhoto: true },
  { id: 2, author: '박**', rating: 5, content: '회식으로 왔는데 음식 양도 많고 맛도 좋았어요. 사장님도 친절하시고 너무 좋았습니다', date: '1일 전', replied: false, hasPhoto: false },
  { id: 3, author: '이**', rating: 4, content: '분위기 좋고 맛있어요. 다만 주말에는 웨이팅이 좀 있네요.', date: '2일 전', replied: true, hasPhoto: true },
  { id: 4, author: '최**', rating: 5, content: '이 가격에 이 퀄리티 진짜 대박이에요! 단골 될 것 같아요', date: '3일 전', replied: true, hasPhoto: false },
  { id: 5, author: '정**', rating: 3, content: '맛은 괜찮은데 양이 좀 적어요. 가격 대비 아쉽습니다.', date: '4일 전', replied: false, hasPhoto: false },
]

const PLATFORM = {
  key: 'naver',
  label: '네이버',
  color: '#03C75A',
  bg: '#E8FBF0',
  textColor: '#015C2C',
  icon: 'N',
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm tracking-tight" style={{ color: PLATFORM.color }}>
      {'★'.repeat(n)}<span className="text-[#E5E8EB]">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

export default function NaverReviewPage() {
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
      // 1) LS_LINKS 우선
      const linksRaw = localStorage.getItem('localution.platform_links')
      const links = linksRaw ? JSON.parse(linksRaw) : []
      const naverLink = links.find((l: any) => l.platform === 'naver')
      // 2) 레거시
      const legacyConnected = localStorage.getItem('localution.naver.connected') === 'true'
      const isConn = !!naverLink || legacyConnected
      setConnected(isConn)
      // 연동된 매장명 우선, 없으면 프로필의 매장명, 둘 다 없으면 빈 문자열
      let fallbackName = ''
      try {
        const p = JSON.parse(localStorage.getItem('localution_store') || '{}')
        fallbackName = p?.storeName || ''
      } catch {}
      setStoreName(naverLink?.externalName || fallbackName)
      // 현재는 데모 데이터 사용 (실제 네이버 리뷰 API는 별도 제휴 필요)
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
      window.open('https://new.smartplace.naver.com/', '_blank', 'noopener,noreferrer')
    } catch {
      alert('자동 복사가 안 돼요. 답글을 직접 드래그해서 복사해주세요 ✍️')
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
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Link href="/review-admin" className="text-xs text-[#8B95A1] hover:text-[#4E5968]">← 리뷰 관리</Link>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
            style={{ background: PLATFORM.color }}>{PLATFORM.icon}</div>
          <h1 className="text-xl md:text-2xl font-black text-[#191F28]">네이버 리뷰 관리</h1>
          {connected ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-semibold">연결됨</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">데모 모드</span>
          )}
        </div>
        <p className="text-xs md:text-sm text-[#8B95A1] mb-4">
          {connected ? `${storeName} · 실시간 리뷰` : '아직 연결 전이라 샘플로 보여드려요. 설정 → 플랫폼 연결에서 1분이면 연동 완료! 🔌'}
        </p>

        {/* 🚧 데모 모드 배너 — 실시간 리뷰 API 연동 전까지 샘플 데이터 */}
        <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B] rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-2xl leading-none mt-0.5">🚧</span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-bold text-[#92400E] mb-1">데모 모드 · API 연동 준비중</p>
              <p className="text-xs text-[#B45309] leading-relaxed">
                현재 화면에 표시되는 리뷰는 기능 체험용 샘플 데이터예요. 네이버 플레이스 리뷰 API 제휴 심사가 완료되는 대로 실시간으로 연동됩니다.
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
              네이버 플레이스를 연결하면 리뷰가 실시간으로 들어와요. 지금 연결해볼까요?
            </p>
            <Link href="/settings/connect?platform=naver"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 whitespace-nowrap"
              style={{ background: PLATFORM.color }}>+ 연결하기</Link>
          </div>
        )}

        {/* 통계 */}
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

        {/* 필터 */}
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

        {/* 리뷰 목록 */}
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
                  {review.hasPhoto && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3182F6] font-semibold">📷 사진</span>}
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
                          💡 복사 후 네이버 스마트플레이스에 붙여넣기
                        </p>
                        <p className="text-sm text-[#191F28] leading-relaxed">{aiReply}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={handleSubmit}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90"
                          style={{ background: PLATFORM.color }}>
                          {copied ? '✓ 복사됨! 붙여넣기' : '📋 복사 + 네이버 열기'}
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
        <div className="-mx-4 md:-mx-8 mt-10">
          <Footer />
        </div>

      </main>

    </div>
  )
}

