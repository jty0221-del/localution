'use client'

// ============================================================
// 30차-15-C · /review-admin/naver 실데이터 전환
//
//   기존 (30차-15-B 이전):
//     - localStorage.platform_links / localStorage.naver.connected 만 확인
//     - DEMO_REVIEWS 5건 하드코딩
//     - "데모 모드 · API 연동 준비중" 배너 상시 노출
//     - 연결하기 버튼 → /settings?tab=connect&platform=naver 로 튕김
//
//   변경 (30차-15-C):
//     - /api/stores/me 서버 단일 진실원으로 연결 상태 판정
//       (platform_credentials.naver_place 또는 place_targets 존재 = 연결)
//     - 연결됨이면 /api/place/reviews?platform=naver_place 로 실제 리뷰 로드
//     - 연결됐는데 저장 리뷰 0 이면 /api/place/reviews/fetch 자동 1회 트리거
//     - "↻ 지금 수집" 버튼 상시 제공 (연결된 상태)
//     - 데모모드 배너 완전 제거 (미연결 안내 카드로 대체)
//     - 미연결이면 /dashboard 로 이동 (ConnectModal 있음)
//     - ★≤3 부정리뷰 하이라이트 + 평점/답변상태 필터
//     - AI 답글 생성 파이프라인 유지
// ============================================================

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
import { toast } from '../../lib/toast'

interface Review {
  id: string
  platform_review_id: string
  author: string
  rating: number | null
  content: string
  postedAt: string | null
  collectedAt: string | null
  hasReply: boolean
  photos: number
}

interface StoreMeResponse {
  ok: boolean
  platforms?: Array<{
    platform: string
    connected: boolean
    platform_store_name: string | null
    platform_store_id: string | null
    review_count: number
    rating_avg: number | null
    unreplied_count: number
    latest_collected_at: string | null
  }>
  naver_link?: {
    external_id: string | null
    external_name: string | null
    external_url: string | null
  } | null
}

const PLATFORM = {
  key: 'naver',
  label: '네이버 플레이스',
  color: '#03C75A',
  bg: '#E8FBF0',
  textColor: '#015C2C',
  icon: 'N',
}

function Stars({ n }: { n: number }) {
  const v = Math.max(0, Math.min(5, Math.round(n)))
  return (
    <span className="text-sm tracking-tight" style={{ color: PLATFORM.color }}>
      {'★'.repeat(v)}<span className="text-[#E5E8EB]">{'★'.repeat(5 - v)}</span>
    </span>
  )
}

function timeAgo(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const dd = Math.floor(h / 24)
  if (dd < 30) return `${dd}일 전`
  return d.toLocaleDateString('ko-KR')
}

export default function NaverReviewPage() {
  // ── 연결 상태 (서버 단일 진실원) ─────────────────────────
  const [loadingConn, setLoadingConn] = useState(true)
  const [connected, setConnected] = useState(false)
  const [storeName, setStoreName] = useState<string>('')
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [agg, setAgg] = useState<{ review_count: number; rating_avg: number | null; unreplied_count: number; latest_collected_at: string | null }>({
    review_count: 0,
    rating_avg: null,
    unreplied_count: 0,
    latest_collected_at: null,
  })

  // ── 리뷰 목록 ────────────────────────────────────────
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [autoFetchTried, setAutoFetchTried] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterReplied, setFilterReplied] = useState<'all' | 'replied' | 'unreplied' | 'negative'>('all')

  // ── AI 답글 ────────────────────────────────────────
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [aiReply, setAiReply] = useState('')
  const [generating, setGenerating] = useState(false)
  const [tone, setTone] = useState<'warm' | 'polite' | 'formal'>('warm')
  const [copied, setCopied] = useState(false)

  // ── 1) /api/stores/me 로드 ────────────────────────────
  const loadStoresMe = useCallback(async () => {
    try {
      const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
      const data: StoreMeResponse = await res.json()
      if (!data?.ok) { setLoadingConn(false); return }
      const np = (data.platforms || []).find((p) => p.platform === 'naver_place')
      const link = data.naver_link
      const isConn = !!(np?.connected || link)
      setConnected(isConn)
      setStoreName(np?.platform_store_name || link?.external_name || '')
      setPlaceId(np?.platform_store_id || link?.external_id || null)
      setAgg({
        review_count: Number(np?.review_count ?? 0),
        rating_avg: typeof np?.rating_avg === 'number' ? np.rating_avg : null,
        unreplied_count: Number(np?.unreplied_count ?? 0),
        latest_collected_at: np?.latest_collected_at ?? null,
      })
    } catch (_) {}
    finally {
      setLoadingConn(false)
    }
  }, [])

  useEffect(() => { loadStoresMe() }, [loadStoresMe])

  // ── 2) 저장된 리뷰 로드 ──────────────────────────────
  const loadReviews = useCallback(async () => {
    if (!connected) return
    setLoadingReviews(true)
    try {
      const res = await fetch('/api/place/reviews?platform=naver_place&limit=100', {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json()
      if (data?.ok && Array.isArray(data.reviews)) {
        const mapped: Review[] = data.reviews.map((r: any) => ({
          id: String(r.id),
          platform_review_id: String(r.platform_review_id),
          author: r.author_mask || r.author_name || '익명',
          rating: typeof r.rating === 'number' ? r.rating : null,
          content: r.content || '',
          postedAt: r.posted_at || null,
          collectedAt: r.collected_at || null,
          hasReply: !!r.has_reply,
          photos: Array.isArray(r.photos) ? r.photos.length : 0,
        }))
        setReviews(mapped)
      }
    } catch (_) {}
    finally {
      setLoadingReviews(false)
    }
  }, [connected])

  useEffect(() => {
    if (connected) loadReviews()
  }, [connected, loadReviews])

  // ── 3) 지금 수집 (POST /api/place/reviews/fetch) ─────
  const collectNow = useCallback(async () => {
    if (!connected || fetching) return
    setFetching(true)
    try {
      const res = await fetch('/api/place/reviews/fetch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placeId ? { place_id: placeId } : {}),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || '리뷰 수집 실패')
        return
      }
      if (data.total > 0) {
        toast.success(`네이버 리뷰 ${data.total}건 수집 완료`)
      } else {
        toast.info(data.note || '새로 수집된 리뷰가 없어요')
      }
      // 재로드
      await Promise.all([loadStoresMe(), loadReviews()])
    } catch (e: any) {
      toast.error('수집 중 오류: ' + (e?.message || e))
    } finally {
      setFetching(false)
    }
  }, [connected, fetching, placeId, loadStoresMe, loadReviews])

  // ── 4) 자동 1회 수집: 연결됐는데 저장 리뷰 0 이면 ─────
  useEffect(() => {
    if (!connected) return
    if (autoFetchTried) return
    if (loadingReviews) return
    if (reviews.length > 0) return
    setAutoFetchTried(true)
    collectNow()
  }, [connected, autoFetchTried, loadingReviews, reviews.length, collectNow])

  // ── 5) AI 답글 ───────────────────────────────────────
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
          rating: review.rating ?? 5,
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(aiReply)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      window.open('https://new.smartplace.naver.com/', '_blank', 'noopener,noreferrer')
    } catch {
      toast.warn('자동 복사가 안 돼요. 답글을 직접 드래그해서 복사해주세요 ✍️')
    }
  }

  // ── 필터 ────────────────────────────────────────────
  const filtered = reviews.filter((r) => {
    if (filterRating !== null && r.rating !== filterRating) return false
    if (filterReplied === 'replied' && !r.hasReply) return false
    if (filterReplied === 'unreplied' && r.hasReply) return false
    if (filterReplied === 'negative') {
      if (typeof r.rating !== 'number' || r.rating > 3) return false
    }
    return true
  })

  const negativeCount = reviews.filter((r) => typeof r.rating === 'number' && r.rating <= 3).length
  const ratingDisplay = typeof agg.rating_avg === 'number' ? agg.rating_avg.toFixed(1) : '-'

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col overflow-x-hidden">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-[220px] pt-14 md:pt-0 min-w-0">
          <PageHeader
            icon="🟢"
            title="네이버 리뷰 관리"
            subtitle={
              connected
                ? `${storeName || '연결된 매장'} · 공개 리뷰 자동 수집`
                : '플레이스를 연결하면 리뷰가 자동 수집됩니다'
            }
            variant="naver"
          />
          <div className="max-w-4xl mx-auto p-4 md:p-6 w-full">
            {/* 브레드크럼 + 상태 */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Link href="/review-admin" className="text-xs text-[#8B95A1] hover:text-[#4E5968] font-semibold">← 리뷰 관리</Link>
              <span className="text-[#E5E8EB]">·</span>
              {loadingConn ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1] font-semibold">확인 중...</span>
              ) : connected ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-semibold">● 연결됨</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">미연결</span>
              )}
              {connected && agg.latest_collected_at && (
                <span className="text-[10px] text-[#8B95A1]">마지막 수집 · {timeAgo(agg.latest_collected_at)}</span>
              )}
            </div>

            {/* ── 미연결 안내 (데모 모드 배너 대체) ── */}
            {!loadingConn && !connected && (
              <div className="bg-white border border-[#E5E8EB] rounded-2xl p-5 mb-5">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="text-3xl leading-none mt-0.5">🔗</span>
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-bold text-[#191F28] mb-1">아직 네이버 플레이스가 연결되지 않았어요</p>
                    <p className="text-xs text-[#4E5968] leading-relaxed mb-3">
                      대시보드에서 네이버 플레이스 URL을 한 번만 입력하면, 공개 방문자 리뷰가 자동으로 이 페이지에 쌓여요.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
                        style={{ background: PLATFORM.color }}
                      >
                        + 대시보드에서 연결
                      </Link>
                      <Link
                        href="/my/platforms"
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                      >
                        플랫폼 허브로
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 통계 카드 (연결됐을 때만) ── */}
            {connected && (
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
                  <p className="text-[11px] text-[#8B95A1] font-medium mb-1">총 리뷰</p>
                  <p className="text-xl font-black text-[#191F28]">{agg.review_count}건</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
                  <p className="text-[11px] text-[#8B95A1] font-medium mb-1">평균 별점</p>
                  {agg.rating_avg === null && agg.review_count > 0 ? (
                    <p className="text-xs font-bold text-[#4E5968] leading-tight">
                      키워드 리뷰<br/>
                      <span className="text-[10px] text-[#8B95A1] font-medium">별점 없음</span>
                    </p>
                  ) : (
                    <p className="text-xl font-black text-[#191F28]">{ratingDisplay}점</p>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
                  <p className="text-[11px] text-[#8B95A1] font-medium mb-1">미답변</p>
                  <p className="text-xl font-black text-[#F59E0B]">{agg.unreplied_count}건</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
                  <p className="text-[11px] text-[#8B95A1] font-medium mb-1">★≤3</p>
                  <p className="text-xl font-black text-[#F04452]">{negativeCount}건</p>
                </div>
              </div>
            )}

            {/* ── 지금 수집 버튼 + 필터 (연결됐을 때만) ── */}
            {connected && (
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">평점</span>
                  <button
                    onClick={() => setFilterRating(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === null ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                    style={filterRating === null ? { background: PLATFORM.color } : {}}
                  >
                    전체
                  </button>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFilterRating(n)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === n ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                      style={filterRating === n ? { background: PLATFORM.color } : {}}
                    >
                      {n}★
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">상태</span>
                  {(
                    [
                      ['all', '전체'],
                      ['unreplied', '미답변'],
                      ['replied', '답변완료'],
                      ['negative', '부정 ★≤3'],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setFilterReplied(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterReplied === v ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                      style={filterReplied === v ? { background: v === 'negative' ? '#F04452' : PLATFORM.color } : {}}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="sm:ml-auto flex gap-2">
                  <button
                    onClick={collectNow}
                    disabled={fetching}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: PLATFORM.color }}
                  >
                    {fetching ? '수집 중...' : '↻ 지금 수집'}
                  </button>
                </div>
              </div>
            )}

            {/* ── 리뷰 목록 ── */}
            {connected ? (
              loadingReviews ? (
                <div className="bg-white rounded-2xl p-12 text-center text-sm text-[#8B95A1] border border-[#E5E8EB]">
                  리뷰 불러오는 중...
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-[#E5E8EB]">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-sm font-bold text-[#191F28] mb-1">
                    {fetching ? '수집 중입니다...' : '아직 수집된 리뷰가 없어요'}
                  </p>
                  <p className="text-xs text-[#8B95A1]">
                    {fetching ? '잠시만 기다려 주세요' : '"↻ 지금 수집" 버튼을 누르면 공개 리뷰를 불러옵니다'}
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#8B95A1] border border-[#E5E8EB]">
                  선택하신 조건에 맞는 리뷰가 없어요 😊
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((review) => {
                    const isNegative = typeof review.rating === 'number' && review.rating <= 3
                    return (
                      <div
                        key={review.id}
                        className={`bg-white rounded-2xl border p-4 md:p-5 ${isNegative ? 'border-[#FCA5A5]' : 'border-[#E5E8EB]'}`}
                      >
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#191F28]">{review.author}</span>
                            {typeof review.rating === 'number' && <Stars n={review.rating} />}
                            {review.photos > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3182F6] font-semibold">
                                📷 사진 {review.photos}
                              </span>
                            )}
                            {isNegative && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#DC2626] font-semibold">
                                부정 리뷰
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#8B95A1]">{timeAgo(review.postedAt || review.collectedAt)}</span>
                            {review.hasReply ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-semibold">답변완료</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold">미답변</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-[#4E5968] leading-relaxed mb-3 break-words whitespace-pre-wrap">
                          {review.content || '(내용 없음)'}
                        </p>

                        {replyingId === review.id && (
                          <div
                            className="rounded-xl p-3 mb-3 border"
                            style={{ background: PLATFORM.bg, borderColor: PLATFORM.color + '40' }}
                          >
                            {generating ? (
                              <p className="text-sm font-semibold" style={{ color: PLATFORM.textColor }}>
                                AI 답글 생성 중...
                              </p>
                            ) : aiReply ? (
                              <>
                                <div className="mb-2">
                                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                    <span className="text-[10px] text-[#8B95A1] font-semibold">톤</span>
                                    {(['warm', 'polite', 'formal'] as const).map((t) => {
                                      const label = t === 'warm' ? '😊 친근' : t === 'polite' ? '🙂 정중' : '🧑‍💼 공식'
                                      const active = tone === t
                                      return (
                                        <button
                                          key={t}
                                          onClick={() => {
                                            setTone(t)
                                            if (replyingId && aiReply) {
                                              const r = reviews.find((x) => x.id === replyingId)
                                              if (r) { setTone(t); setTimeout(() => handleAiReply(r), 0) }
                                            }
                                          }}
                                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${active ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                                          style={active ? { background: PLATFORM.color } : {}}
                                        >
                                          {label}
                                        </button>
                                      )
                                    })}
                                    <span className="text-[9px] text-[#8B95A1] ml-0.5">· 클릭하면 재생성</span>
                                  </div>
                                  <p className="text-[10px] text-[#8B95A1] mb-1.5 flex items-center gap-1">
                                    💡 복사 후 네이버 스마트플레이스에 붙여넣기
                                  </p>
                                  <p className="text-sm text-[#191F28] leading-relaxed whitespace-pre-wrap">{aiReply}</p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    onClick={handleCopy}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90"
                                    style={{ background: PLATFORM.color }}
                                  >
                                    {copied ? '✓ 복사됨! 붙여넣기' : '📋 복사 + 네이버 열기'}
                                  </button>
                                  <button
                                    onClick={() => handleAiReply(review)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F2F4F6] text-[#4E5968]"
                                  >
                                    재생성
                                  </button>
                                  <button
                                    onClick={() => { setReplyingId(null); setAiReply('') }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#8B95A1]"
                                  >
                                    취소
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        )}

                        {!review.hasReply && replyingId !== review.id && (
                          <button
                            onClick={() => handleAiReply(review)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
                            style={{ background: PLATFORM.color }}
                          >
                            ✨ AI 답글 생성
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : null}

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
