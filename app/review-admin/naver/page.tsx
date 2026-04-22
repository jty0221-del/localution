'use client'

// ============================================================
// 30차-21 · /review-admin/naver — 댓글 초안→편집→자동등록 2단 시스템
//
//   변경 (30차-21):
//     - 기존 "⚡ 원클릭 자동 등록" + "✨ 먼저 미리보기" 2버튼 제거
//     - 단일 "✍️ 댓글 초안 생성" 버튼 → AI 초안 생성 + 자동 저장
//     - 생성 완료 후 편집 textarea + "🔁 AI 초안 수정" + "✅ 이대로 등록하기" 2버튼
//     - 상태 배지 (none/draft/queued/submitting/submitted/failed)
//     - 프롬프트는 30차-21 키워드 과다·미사여구 방지 룰 적용됨
//     - 이대로 등록하기 → /api/review-reply/submit 호출 → Worker 큐에 등록
//       (Worker 가 23차-4 네이버 어댑터 완성 시 실제 submit)
// ============================================================

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
import { toast } from '../../lib/toast'

type ReplyStatus = 'none' | 'draft' | 'queued' | 'submitting' | 'submitted' | 'failed'

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
  draftReply: string | null
  replyStatus: ReplyStatus
  replyTone: string | null
  replyQueuedAt: string | null
  replySubmittedAt: string | null
  replyError: string | null
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

// 상태 배지
function StatusBadge({ status }: { status: ReplyStatus }) {
  if (status === 'none') return null
  const map: Record<ReplyStatus, { label: string; bg: string; fg: string }> = {
    none: { label: '', bg: '', fg: '' },
    draft: { label: '📝 초안 저장됨', bg: '#EFF6FF', fg: '#1D4ED8' },
    queued: { label: '⏳ 등록 대기열', bg: '#FEF3C7', fg: '#92400E' },
    submitting: { label: '🚀 등록 중...', bg: '#E0F2FE', fg: '#075985' },
    submitted: { label: '✅ 등록 완료', bg: '#ECFDF5', fg: '#059669' },
    failed: { label: '❌ 등록 실패', bg: '#FEE2E2', fg: '#DC2626' },
  }
  const s = map[status]
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  )
}

export default function NaverReviewPage() {
  // ── 연결 상태 ─────────────────────────
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

  // ── 리뷰 목록 ────────────────────────────
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [autoFetchTried, setAutoFetchTried] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterReplied, setFilterReplied] = useState<'all' | 'replied' | 'unreplied' | 'negative'>('all')

  // ── 초안 편집 상태 ────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)          // 현재 편집창 열린 리뷰
  const [draftText, setDraftText] = useState<string>('')                   // 편집중 텍스트
  const [generating, setGenerating] = useState(false)                      // AI 초안 생성 중
  const [submitting, setSubmitting] = useState(false)                      // 큐 등록 중
  const [tone, setTone] = useState<'warm' | 'polite' | 'formal'>('warm')

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
          draftReply: r.draft_reply || null,
          replyStatus: (r.reply_status || 'none') as ReplyStatus,
          replyTone: r.reply_tone || null,
          replyQueuedAt: r.reply_queued_at || null,
          replySubmittedAt: r.reply_submitted_at || null,
          replyError: r.reply_error || null,
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

  // ── 3) 지금 수집 ─────
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
      await Promise.all([loadStoresMe(), loadReviews()])
    } catch (e: any) {
      toast.error('수집 중 오류: ' + (e?.message || e))
    } finally {
      setFetching(false)
    }
  }, [connected, fetching, placeId, loadStoresMe, loadReviews])

  // ── 4) 자동 1회 수집 ─────
  useEffect(() => {
    if (!connected) return
    if (autoFetchTried) return
    if (loadingReviews) return
    if (reviews.length > 0) return
    setAutoFetchTried(true)
    collectNow()
  }, [connected, autoFetchTried, loadingReviews, reviews.length, collectNow])

  // ── 5) 초안 생성 ───────────────────────
  //  한 번의 버튼 클릭으로:
  //    1. /api/ai-review-reply 호출 (SEO+Vision+지역 자동)
  //    2. 결과를 /api/review-reply/draft 로 저장 (reply_status='draft')
  //    3. 편집창 열기 (setEditingId + setDraftText)
  const handleGenerateDraft = async (review: Review, currentTone?: typeof tone) => {
    const useTone = currentTone || tone
    setEditingId(review.id)
    setGenerating(true)
    setDraftText('')
    try {
      const aiRes = await fetch('/api/ai-review-reply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: review.id,
          review: review.content,
          rating: review.rating,
          aiSettings: { tone: useTone, length: 'medium' },
        }),
      })
      const aiData = await aiRes.json()
      const generated = String(aiData?.reply || aiData?.message || '').trim()
      if (!generated) {
        toast.error('답글 생성 실패. 다시 시도해주세요 🙏')
        setGenerating(false)
        return
      }
      setDraftText(generated)

      // DB 에 초안 저장
      try {
        const saveRes = await fetch('/api/review-reply/draft', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            review_id: review.id,
            draft: generated,
            tone: useTone,
          }),
        })
        const saveData = await saveRes.json()
        if (!saveRes.ok || !saveData?.ok) {
          toast.warn('초안은 생성됐지만 저장 실패: ' + (saveData?.error || ''))
        } else {
          // 로컬 상태 업데이트
          setReviews((prev) =>
            prev.map((r) =>
              r.id === review.id
                ? { ...r, draftReply: generated, replyStatus: 'draft', replyTone: useTone }
                : r,
            ),
          )
        }
      } catch (e: any) {
        toast.warn('초안 저장 중 오류: ' + (e?.message || e))
      }
    } catch (e: any) {
      toast.error('초안 생성 오류: ' + (e?.message || e))
    } finally {
      setGenerating(false)
    }
  }

  // ── 6) 편집창 열기 (기존 초안이 있을 때) ───────────────
  const openEditor = (review: Review) => {
    setEditingId(review.id)
    setDraftText(review.draftReply || '')
    if (review.replyTone === 'warm' || review.replyTone === 'polite' || review.replyTone === 'formal') {
      setTone(review.replyTone)
    }
  }

  // ── 7) 수정된 초안 저장 (자동 저장) ─────────────────────
  const saveDraftEdit = async (review: Review, text: string) => {
    try {
      const res = await fetch('/api/review-reply/draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: review.id,
          draft: text,
          tone,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        toast.warn('저장 실패: ' + (data?.error || ''))
        return false
      }
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, draftReply: text, replyStatus: 'draft' } : r)),
      )
      return true
    } catch (e: any) {
      toast.warn('저장 오류: ' + (e?.message || e))
      return false
    }
  }

  // ── 8) 이대로 등록하기 → /api/review-reply/submit ─────
  const handleSubmit = async (review: Review) => {
    if (!draftText || !draftText.trim()) {
      toast.warn('먼저 답글 초안을 생성해주세요')
      return
    }
    setSubmitting(true)
    try {
      // 1. 편집된 내용을 먼저 저장
      const saved = await saveDraftEdit(review, draftText.trim())
      if (!saved) {
        setSubmitting(false)
        return
      }
      // 2. 큐에 등록
      const res = await fetch('/api/review-reply/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        toast.error('등록 실패: ' + (data?.error || ''))
        return
      }
      toast.success(data.note || '대기열에 등록됐어요 ✨')
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? {
                ...r,
                replyStatus: 'queued',
                replyQueuedAt: data.reply_queued_at || new Date().toISOString(),
                draftReply: draftText.trim(),
              }
            : r,
        ),
      )
      // 편집창 닫기
      setEditingId(null)
      setDraftText('')
    } catch (e: any) {
      toast.error('등록 오류: ' + (e?.message || e))
    } finally {
      setSubmitting(false)
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
                ? `${storeName || '연결된 매장'} · 공개 리뷰 자동 수집 + AI 답글 2단 플로우`
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

            {/* 미연결 안내 */}
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

            {/* 통계 카드 */}
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

            {/* 필터 */}
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

            {/* 리뷰 목록 */}
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
                    const isEditing = editingId === review.id
                    const hasDraft = !!(review.draftReply && review.draftReply.trim())
                    const isQueued = review.replyStatus === 'queued' || review.replyStatus === 'submitting'
                    const isSubmitted = review.replyStatus === 'submitted'
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
                            <StatusBadge status={review.replyStatus} />
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

                        {/* 편집중 UI */}
                        {isEditing && (
                          <div
                            className="rounded-xl p-3 mb-3 border"
                            style={{ background: PLATFORM.bg, borderColor: PLATFORM.color + '40' }}
                          >
                            {generating ? (
                              <p className="text-sm font-semibold py-2" style={{ color: PLATFORM.textColor }}>
                                ✍️ AI가 초안을 만드는 중... (사진·SEO 키워드 분석 포함)
                              </p>
                            ) : (
                              <>
                                {/* 톤 선택 */}
                                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                  <span className="text-[10px] text-[#8B95A1] font-semibold">톤</span>
                                  {(['warm', 'polite', 'formal'] as const).map((t) => {
                                    const label = t === 'warm' ? '😊 친근' : t === 'polite' ? '🙂 정중' : '🧑‍💼 공식'
                                    const active = tone === t
                                    return (
                                      <button
                                        key={t}
                                        onClick={() => setTone(t)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${active ? 'text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'}`}
                                        style={active ? { background: PLATFORM.color } : {}}
                                      >
                                        {label}
                                      </button>
                                    )
                                  })}
                                </div>

                                {/* 편집 가능한 textarea */}
                                <p className="text-[10px] text-[#8B95A1] mb-1 flex items-center gap-1">
                                  💡 필요하면 직접 수정한 뒤 등록하세요
                                </p>
                                <textarea
                                  value={draftText}
                                  onChange={(e) => setDraftText(e.target.value)}
                                  disabled={isQueued || isSubmitted || submitting}
                                  className="w-full rounded-lg border border-[#E5E8EB] p-2.5 text-sm text-[#191F28] bg-white focus:outline-none focus:ring-2 focus:ring-[#03C75A40] leading-relaxed resize-y min-h-[120px] disabled:bg-[#F9FAFB]"
                                  placeholder="AI 초안이 여기에 나타나요..."
                                />
                                <p className="text-[10px] text-[#8B95A1] mt-1 text-right">
                                  {draftText.length}자
                                </p>

                                {/* 2버튼 분기 */}
                                <div className="flex gap-2 flex-wrap mt-2">
                                  <button
                                    onClick={() => handleGenerateDraft(review)}
                                    disabled={generating || submitting || isQueued || isSubmitted}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border hover:bg-[#F9FAFB] disabled:opacity-50"
                                    style={{ borderColor: PLATFORM.color + '60', color: PLATFORM.textColor }}
                                    title="AI에게 다시 써달라고 요청"
                                  >
                                    🔁 AI 초안 수정
                                  </button>
                                  <button
                                    onClick={() => handleSubmit(review)}
                                    disabled={generating || submitting || !draftText.trim() || isQueued || isSubmitted}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                                    style={{ background: PLATFORM.color }}
                                    title="네이버에 자동 등록 (Worker 처리)"
                                  >
                                    {submitting ? '등록 중...' : isQueued ? '대기열 등록됨' : '✅ 이대로 등록하기'}
                                  </button>
                                  <button
                                    onClick={() => { setEditingId(null); setDraftText('') }}
                                    disabled={submitting}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#8B95A1] hover:bg-[#F2F4F6] ml-auto"
                                  >
                                    닫기
                                  </button>
                                </div>

                                {/* 상태 안내 */}
                                {isQueued && (
                                  <p className="text-[11px] mt-2 text-[#92400E] bg-[#FEF3C7] rounded-lg px-2 py-1.5">
                                    ⏳ 등록 대기열에 올라와 있어요.{' '}
                                    {review.replyQueuedAt && `(${timeAgo(review.replyQueuedAt)} 전 등록)`}{' '}
                                    Worker 가 네이버에 올려드려요.
                                  </p>
                                )}
                                {isSubmitted && (
                                  <p className="text-[11px] mt-2 text-[#059669] bg-[#ECFDF5] rounded-lg px-2 py-1.5">
                                    ✅ 네이버에 등록 완료 ({timeAgo(review.replySubmittedAt)} 전)
                                  </p>
                                )}
                                {review.replyStatus === 'failed' && review.replyError && (
                                  <p className="text-[11px] mt-2 text-[#DC2626] bg-[#FEE2E2] rounded-lg px-2 py-1.5">
                                    ❌ 등록 실패: {review.replyError}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* 초기 진입 버튼 */}
                        {!isEditing && !review.hasReply && (
                          <div className="flex gap-2 flex-wrap items-center">
                            {hasDraft ? (
                              <>
                                <button
                                  onClick={() => openEditor(review)}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm"
                                  style={{ background: PLATFORM.color }}
                                >
                                  📝 초안 이어서 편집
                                </button>
                                <span className="text-[11px] text-[#8B95A1] truncate max-w-[280px]">
                                  {(review.draftReply || '').slice(0, 60)}{(review.draftReply || '').length > 60 ? '...' : ''}
                                </span>
                              </>
                            ) : (
                              <button
                                onClick={() => handleGenerateDraft(review)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm"
                                style={{ background: PLATFORM.color }}
                                title="지역·업종·사진·키워드 자동 분석 → AI 답글 초안 생성"
                              >
                                ✍️ 댓글 초안 생성
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : null}

            <div className="-mx-4 md:-mx-6 mt-10">
              <Footer />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
