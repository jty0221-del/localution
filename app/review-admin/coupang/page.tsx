'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import { useConnections } from '../../lib/connections'

const PLATFORM = {
  key:   'coupang',
  label: '쿠팡이츠',
  color: '#FF4B30',
  bg:    '#FFF3F0',
  icon:  '🟠',
  apiPath: '/api/reviews/coupang',
}

interface Review {
  id: string
  rating: number
  content: string
  author: string
  orderedMenu?: string
  createdAt: string
  replied: boolean
  replyContent?: string
}

export default function ReviewPage() {
  const [reviews, setReviews]       = useState<Review[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [replyMap, setReplyMap]     = useState<Record<string, string>>({})
  const [sendingId, setSendingId]   = useState<string | null>(null)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterReplied, setFilterReplied] = useState<'all' | 'replied' | 'unreplied'>('all')

  // 허브(review-admin)·대시보드·설정과 동기화된 연동 상태
  const { isConnected } = useConnections()
  const connected = isConnected('coupang')

  useEffect(() => {
    if (connected) fetchReviews()
  }, [connected])

  const fetchReviews = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(PLATFORM.apiPath)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
      } else if (res.status === 401) {
        setError('인증이 만료되었습니다. 재연동해 주세요.')
        localStorage.removeItem(`localution.${PLATFORM.key}.connected`)
      } else if (res.status === 503) {
        setError('플랫폼 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.message || '리뷰를 가져오는 중 오류가 발생했습니다.')
      }
    } catch (e) {
      setError('연결이 잠깐 불안정했어요. 다시 시도해주세요 🙏')
    }
    setLoading(false)
  }

  const handleConnect = () => {
    // 상세 페이지에서는 더 이상 단독 연동하지 않고 설정 탭으로 보냄
    window.location.href = '/settings?tab=connect&platform=coupang'
  }

  const handleSendReply = async (reviewId: string) => {
    const content = replyMap[reviewId]?.trim()
    if (!content) return
    setSendingId(reviewId)
    try {
      const res = await fetch(`${PLATFORM.apiPath}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, content }),
      })
      if (res.ok) {
        setReviews(prev => prev.map(r =>
          r.id === reviewId ? { ...r, replied: true, replyContent: content } : r
        ))
        setReplyMap(prev => ({ ...prev, [reviewId]: '' }))
      } else {
        alert('답글 등록에 실패했습니다.')
      }
    } catch {
      alert('연결이 잠깐 불안정했어요. 다시 시도해주세요 🙏가 발생했습니다.')
    }
    setSendingId(null)
  }

  const handleAIReply = async (reviewId: string, reviewContent: string) => {
    const tone = localStorage.getItem('ai.tone') || 'friendly'
    const keyword = localStorage.getItem('ai.keyword') || ''
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: reviewContent, tone, keyword, platform: PLATFORM.key }),
      })
      if (res.ok) {
        const data = await res.json()
        setReplyMap(prev => ({ ...prev, [reviewId]: data.reply || '' }))
      }
    } catch {}
  }

  const filtered = reviews.filter(r => {
    if (filterRating && r.rating !== filterRating) return false
    if (filterReplied === 'replied' && !r.replied) return false
    if (filterReplied === 'unreplied' && r.replied) return false
    return true
  })

  const unrepliedCount = reviews.filter(r => !r.replied).length
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/review-admin" className="text-[#8B95A1] hover:text-[#191F28] text-sm">← 전체</Link>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
              style={{ background: PLATFORM.bg }}>{PLATFORM.icon}</div>
            <div>
              <h1 className="text-xl font-bold text-[#191F28]">{PLATFORM.label} 리뷰</h1>
              <p className="text-xs text-[#8B95A1]">리뷰 조회 및 AI 답글 관리</p>
            </div>
          </div>
          {connected && (
            <button onClick={fetchReviews} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-sm font-semibold text-[#4E5968] rounded-xl shadow-sm hover:bg-[#F2F4F6] transition-colors">
              {loading ? '⏳' : '🔄'} 새로고침
            </button>
          )}
        </div>

        {!connected ? (
          /* 연동 안내 */
          <div className="max-w-lg mx-auto mt-12">
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{ background: PLATFORM.bg }}>{PLATFORM.icon}</div>
              <h2 className="text-xl font-bold text-[#191F28] mb-2">{PLATFORM.label} 연동</h2>
              <p className="text-sm text-[#4E5968] mb-2 leading-relaxed">쿠팡이츠는 공식 EatApp Partner API를 제공합니다. WING에서 API 키를 발급받아 연동하세요.</p>

              {/* 환경변수 안내 */}
              <div className="mt-4 p-4 bg-[#F8F9FA] rounded-xl text-left mb-6">
                <p className="text-xs font-bold text-[#4E5968] mb-2">⚙️ Vercel 환경변수 설정 필요:</p>
                <p className="text-xs text-[#8B95A1] font-mono">COUPANG_VENDOR_ID=...</p>
                <p className="text-xs text-[#8B95A1] font-mono">COUPANG_ACCESS_KEY=...</p>
                <p className="text-xs text-[#8B95A1] font-mono">COUPANG_SECRET_KEY=...</p>
                <p className="text-[11px] text-[#8B95A1] mt-2">WING > 계정관리 > API 키 발급 후 환경변수에 추가하세요.</p>
              </div>

              <div className="flex gap-3">
                <a href="https://wing.coupang.com" target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: PLATFORM.color }}>
                  {PLATFORM.label} 사장님 포털 →
                </a>
                <button onClick={handleConnect}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#191F28] text-white hover:bg-[#333D4B] transition-colors">
                  연동 테스트
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '전체 리뷰', value: reviews.length + '개', icon: '📝', color: PLATFORM.color },
                { label: '평균 별점', value: '⭐ ' + avgRating, icon: '⭐', color: '#D97706' },
                { label: '미답변',   value: unrepliedCount + '개', icon: '💬', color: unrepliedCount > 0 ? '#EF4444' : '#059669' },
                { label: '답변율',  value: reviews.length > 0 ? Math.round(((reviews.length - unrepliedCount) / reviews.length) * 100) + '%' : '0%', icon: '✅', color: '#059669' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-[#8B95A1] mb-1">{s.label}</p>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* 필터 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
                {([null, 1, 2, 3, 4, 5] as const).map(r => (
                  <button key={String(r)} onClick={() => setFilterRating(r as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterRating === r ? 'text-white' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}
                    style={filterRating === r ? { background: PLATFORM.color } : {}}>
                    {r === null ? '전체' : '★' + r}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
                {([['all','전체'],['unreplied','미답변'],['replied','답변완료']] as const).map(([v,l]) => (
                  <button key={v} onClick={() => setFilterReplied(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterReplied === v ? 'text-white' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}
                    style={filterReplied === v ? { background: PLATFORM.color } : {}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* 에러 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600">{error}</div>
            )}

            {/* 로딩 */}
            {loading && (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-3xl mb-3 animate-spin inline-block">⏳</div>
                <p className="text-[#8B95A1] text-sm">{PLATFORM.label}에서 리뷰를 가져오는 중...</p>
              </div>
            )}

            {/* 리뷰 없음 */}
            {!loading && filtered.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">{reviews.length === 0 ? PLATFORM.icon : '🔍'}</div>
                <p className="font-semibold text-[#191F28] mb-1">
                  {reviews.length === 0 ? '리뷰가 없어요' : '필터 조건에 맞는 리뷰가 없어요'}
                </p>
                <p className="text-sm text-[#8B95A1]">
                  {reviews.length === 0 ? '새로고침하거나 나중에 다시 확인해 주세요.' : '필터를 변경해 보세요.'}
                </p>
              </div>
            )}

            {/* 리뷰 목록 */}
            {!loading && filtered.map(review => (
              <div key={review.id}
                className={`bg-white rounded-2xl p-5 shadow-sm mb-3 border-l-4 ${review.replied ? 'border-gray-200' : 'border-[' + PLATFORM.color + ']'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#191F28] text-sm">{review.author}</span>
                      <span className="text-xs text-[#8B95A1]">{review.createdAt}</span>
                      {review.replied && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">답변완료</span>
                      )}
                    </div>
                    <div className="flex gap-0.5 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    {review.orderedMenu && (
                      <p className="text-xs text-[#8B95A1] mb-1">주문: {review.orderedMenu}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#191F28] leading-relaxed mb-3">{review.content}</p>

                {review.replied && review.replyContent && (
                  <div className="bg-[#F8F9FA] rounded-xl p-3 mb-3 border-l-2" style={{ borderColor: PLATFORM.color }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: PLATFORM.color }}>사장님 답글</p>
                    <p className="text-xs text-[#4E5968]">{review.replyContent}</p>
                  </div>
                )}

                {!review.replied && (
                  <div className="space-y-2">
                    <textarea
                      value={replyMap[review.id] || ''}
                      onChange={e => setReplyMap(prev => ({ ...prev, [review.id]: e.target.value }))}
                      placeholder="답글을 작성하세요..."
                      rows={3}
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#3182F6] transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAIReply(review.id, review.content)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#F5F3FF] text-[#8B5CF6] hover:bg-[#EDE9FE] transition-colors">
                        ✨ AI 답글 생성
                      </button>
                      <button
                        onClick={() => handleSendReply(review.id)}
                        disabled={!replyMap[review.id]?.trim() || sendingId === review.id}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${!replyMap[review.id]?.trim() ? 'bg-[#E5E8EB] cursor-not-allowed' : 'hover:opacity-90'}`}
                        style={replyMap[review.id]?.trim() ? { background: PLATFORM.color } : {}}>
                        {sendingId === review.id ? '등록 중...' : '답글 등록'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── Footer ── */}
        <div className="-mx-4 md:-mx-8 mt-10">
          <Footer />
        </div>

      </main>

    </div>
  )
}
