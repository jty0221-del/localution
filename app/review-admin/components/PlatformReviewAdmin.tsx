'use client'

// ============================================================
// 30차-22 · 멀티플랫폼 공통 리뷰 관리 컴포넌트
//
//   · 30차-21 네이버 2단 시스템 (초안 생성 → 편집 → 이대로 등록) 을
//     naver_place / baemin / yogiyo / coupangeats 4개 플랫폼에 공통 적용
//   · 30차-22-A "미답변 N건 초안 일괄 생성" 추가
//   · 플랫폼별 브랜딩은 props 로 주입
//
//   의존 API:
//     - GET  /api/stores/me                (연결 상태/집계)
//     - GET  /api/place/reviews?platform=  (리뷰 목록, 30차-21 초안 컬럼 포함)
//     - POST /api/place/reviews/fetch      (수집)  — naver_place 만 지원
//     - POST /api/ai-review-reply          (AI 초안 생성)
//     - POST /api/review-reply/draft       (초안 저장)
//     - POST /api/review-reply/submit      (Worker 큐 등록)
//     - POST /api/review-reply/bulk-draft  (일괄 생성 후보 조회)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
import { toast } from '../../lib/toast'

type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
type ReplyStatus = 'none' | 'draft' | 'queued' | 'submitting' | 'submitted' | 'failed'

// ── 페르소나 타입 ──────────────────────────────────────────
type PersonaTone   = 'friendly' | 'expert' | 'witty' | 'simple' | 'emo' | 'mz' | 'formal'
type PersonaGender = 'none' | 'male' | 'female'
type PersonaAge    = '' | 'teen' | '20s' | '30s' | '40s' | '50s' | '60s'
interface Persona {
  tone:   PersonaTone
  gender: PersonaGender
  age:    PersonaAge
}
const DEFAULT_PERSONA: Persona = { tone: 'friendly', gender: 'none', age: '' }

const TONE_OPTIONS: { value: PersonaTone; label: string; emoji: string }[] = [
  { value: 'friendly', label: '친근',   emoji: '😊' },
  { value: 'expert',   label: '전문가', emoji: '🧑‍💼' },
  { value: 'witty',    label: '유머',   emoji: '😄' },
  { value: 'simple',   label: '심플',   emoji: '✏️' },
  { value: 'emo',      label: '감성',   emoji: '💌' },
  { value: 'mz',       label: 'MZ',     emoji: '🔥' },
  { value: 'formal',   label: '공식',   emoji: '📋' },
]
const GENDER_OPTIONS: { value: PersonaGender; label: string }[] = [
  { value: 'none',   label: '성별 무관' },
  { value: 'male',   label: '남성' },
  { value: 'female', label: '여성' },
]
const AGE_OPTIONS: { value: PersonaAge; label: string }[] = [
  { value: '',    label: '연령 무관' },
  { value: 'teen', label: '10대' },
  { value: '20s',  label: '20대' },
  { value: '30s',  label: '30대' },
  { value: '40s',  label: '40대' },
  { value: '50s',  label: '50대' },
  { value: '60s',  label: '60대+' },
]

const PERSONA_KEY = 'localution:review_persona'

interface Review {
  id: string
  platform_review_id: string
  author: string
  rating: number | null
  content: string
  postedAt: string | null
  collectedAt: string | null
  hasReply: boolean
  photos: string[]           // 30차-23: 사진 URL 배열 (썸네일 렌더용)
  photoCount: number         // 요약 뱃지용 (photos.length)
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

export interface PlatformInfoBannerLink {
  label: string
  href: string
  dark: boolean   // true=진한 배경, false=연한 배경
}
export interface PlatformInfoBannerConfig {
  title: string
  desc: string
  links: PlatformInfoBannerLink[]
}

export interface PlatformConfig {
  platform: PlatformSlug          // 서버 슬러그
  uiKey: string                   // Sidebar variant (naver/baemin/yogiyo/coupang)
  label: string                   // "네이버 플레이스"
  color: string                   // 브랜드 컬러 hex
  bg: string                      // 연한 배경 hex
  textColor: string               // 글자 컬러 hex
  icon: string                    // "🟢" 헤더 이모지 (logoNode 없을 때 폴백)
  iconLetter: string              // "N" 원형 아이콘 글자
  logoNode?: ReactNode            // SVG 로고 — 있으면 PageHeader icon 대신 사용
  supportsFetch: boolean          // "지금 수집" 버튼 노출 여부
  connectHref: string             // 미연결 시 이동 경로
  collectEndpoint?: string        // "지금 수집" 커스텀 엔드포인트
  reviewAdminUrl?: string         // 플랫폼 리뷰 관리 URL
  platformInfoBanner?: PlatformInfoBannerConfig  // 연결 시 안내 배너 (kakao/baemin 등)
}

function Stars({ n, color }: { n: number; color: string }) {
  const v = Math.max(0, Math.min(5, Math.round(n)))
  return (
    <span className="text-sm tracking-tight" style={{ color }}>
      {'★'.repeat(v)}
      <span className="text-[#E5E8EB]">{'★'.repeat(5 - v)}</span>
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

function StatusBadge({ status }: { status: ReplyStatus }) {
  if (status === 'none') return null
  const map: Record<ReplyStatus, { label: string; bg: string; fg: string }> = {
    none: { label: '', bg: '', fg: '' },
    draft: { label: '📝 초안 저장됨', bg: '#EFF6FF', fg: '#1D4ED8' },
    queued: { label: '⚡ 자동 발행 중', bg: '#E0F2FE', fg: '#075985' },
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

export default function PlatformReviewAdmin({ config }: { config: PlatformConfig }) {
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
  // 30차-23: 기간 필터 (7일 / 30일 / 전체) — 서버 쿼리 파라미터로 넘겨서 re-fetch
  const [period, setPeriod] = useState<'7' | '30' | 'all'>('all')
  // 30차-23: 사진 라이트박스
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // ── 초안 편집 상태 ────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [persona, setPersona] = useState<Persona>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(PERSONA_KEY)
        if (saved) return { ...DEFAULT_PERSONA, ...JSON.parse(saved) }
      }
    } catch {}
    return DEFAULT_PERSONA
  })

  // ── 일괄 초안 생성 상태 ───────────────────────
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkCancelled, setBulkCancelled] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; currentId: string | null }>({
    done: 0, total: 0, currentId: null,
  })
  const bulkCancelRef = useRef(false)
  const [noCredentialsHref, setNoCredentialsHref] = useState<string | null>(null)

  // ── 1) /api/stores/me ────────────────────────────
  const loadStoresMe = useCallback(async () => {
    try {
      const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
      const data: StoreMeResponse = await res.json()
      if (!data?.ok) { setLoadingConn(false); return }
      const row = (data.platforms || []).find((p) => p.platform === config.platform)
      const link = config.platform === 'naver_place' ? data.naver_link : null
      const isConn = !!(row?.connected || link)
      setConnected(isConn)
      setStoreName(row?.platform_store_name || link?.external_name || '')
      setPlaceId(row?.platform_store_id || link?.external_id || null)
      setAgg({
        review_count: Number(row?.review_count ?? 0),
        rating_avg: typeof row?.rating_avg === 'number' ? row.rating_avg : null,
        unreplied_count: Number(row?.unreplied_count ?? 0),
        latest_collected_at: row?.latest_collected_at ?? null,
      })
    } catch (_) {}
    finally {
      setLoadingConn(false)
    }
  }, [config.platform])

  useEffect(() => { loadStoresMe() }, [loadStoresMe])

  // ── 2) 저장된 리뷰 로드 ──────────────────────────
  const loadReviews = useCallback(async () => {
    // connected 여부 무관하게 로드 (시드 리뷰도 표시)
    setLoadingReviews(true)
    try {
      // 30차-23: limit=1000 + period 쿼리 → 서버에서 기간 필터 처리
      const params = new URLSearchParams({
        platform: config.platform,
        limit: '1000',
        period,
      })
      const res = await fetch(`/api/place/reviews?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json()
      if (data?.ok && Array.isArray(data.reviews)) {
        const mapped: Review[] = data.reviews.map((r: any) => {
          const photoArr: string[] = Array.isArray(r.photos)
            ? (r.photos.filter((p: any) => typeof p === 'string' && p.length > 0) as string[])
            : []
          return {
            id: String(r.id),
            platform_review_id: String(r.platform_review_id),
            author: r.author_mask || r.author_name || '익명',
            rating: typeof r.rating === 'number' ? r.rating : null,
            content: r.content || '',
            postedAt: r.posted_at || null,
            collectedAt: r.collected_at || null,
            hasReply: !!r.has_reply,
            photos: photoArr,
            photoCount: photoArr.length,
            draftReply: r.draft_reply || null,
            replyStatus: (r.reply_status || 'none') as ReplyStatus,
            replyTone: r.reply_tone || null,
            replyQueuedAt: r.reply_queued_at || null,
            replySubmittedAt: r.reply_submitted_at || null,
            replyError: r.reply_error || null,
          }
        })
        setReviews(mapped)
      }
    } catch (_) {}
    finally {
      setLoadingReviews(false)
    }
  }, [config.platform, period])

  // loadingConn 완료 후 1회 로드 (connected 무관)
  useEffect(() => {
    if (!loadingConn) loadReviews()
  }, [loadingConn, loadReviews])

  // ── 3) 지금 수집 (naver_place 만 동작) ─────
  const collectNow = useCallback(async () => {
    if (!config.supportsFetch) {
      toast.info('이 플랫폼은 아직 자동 수집을 지원하지 않아요 (Worker 대기)')
      return
    }
    if (!connected || fetching) return
    setFetching(true)
    try {
      const endpoint = config.collectEndpoint || '/api/place/reviews/fetch'
      const isWorkerEndpoint = endpoint.includes('/collect')
      const body = isWorkerEndpoint
        ? { platform: config.platform }
        : (placeId ? { place_id: placeId } : {})
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || '리뷰 수집 실패')
        return
      }
      if (data.note || data.message) {
        toast.info(data.note || data.message)
      } else if (data.total > 0) {
        toast.success(`${config.label} 리뷰 ${data.total}건 수집 완료`)
      } else {
        toast.info('새로 수집된 리뷰가 없어요')
      }
      await Promise.all([loadStoresMe(), loadReviews()])
    } catch (e: any) {
      toast.error('수집 중 오류: ' + (e?.message || e))
    } finally {
      setFetching(false)
    }
  }, [connected, fetching, placeId, loadStoresMe, loadReviews, config.supportsFetch, config.label])

  // ── 4) 자동 1회 수집 ─────
  useEffect(() => {
    if (!connected) return
    if (!config.supportsFetch) return
    if (autoFetchTried) return
    if (loadingReviews) return
    if (reviews.length > 0) return
    setAutoFetchTried(true)
    collectNow()
  }, [connected, autoFetchTried, loadingReviews, reviews.length, collectNow, config.supportsFetch])

  // ── 5) 단일 초안 생성 ───────────────────────
  const handleGenerateDraft = async (review: Review, currentPersona?: Persona) => {
    const usePersona = currentPersona || persona
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
          platform: config.platform,
          aiSettings: { tone: usePersona.tone, length: 'medium' },
          customerProfile: { gender: usePersona.gender, age: usePersona.age },
        }),
      })
      const aiData = await aiRes.json()
      const generated = String(aiData?.reply || '').trim()
      if (!generated) {
        const errMsg = String(aiData?.error || aiData?.message || 'AI 서버 응답 없음')
        toast.error(`답글 생성 실패: ${errMsg.slice(0, 80)}`)
        setGenerating(false)
        return
      }
      setDraftText(generated)

      try {
        const saveRes = await fetch('/api/review-reply/draft', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_id: review.id, draft: generated, tone: usePersona.tone }),
        })
        const saveData = await saveRes.json()
        if (!saveRes.ok || !saveData?.ok) {
          toast.warn('초안은 생성됐지만 저장 실패: ' + (saveData?.error || ''))
        } else {
          setReviews((prev) =>
            prev.map((r) =>
              r.id === review.id
                ? { ...r, draftReply: generated, replyStatus: 'draft', replyTone: usePersona.tone }
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
    if (review.replyTone) {
      const savedTone = review.replyTone as PersonaTone
      const validTones: PersonaTone[] = ['friendly', 'expert', 'witty', 'simple', 'emo', 'mz', 'formal']
      if (validTones.includes(savedTone)) {
        setPersona((prev) => ({ ...prev, tone: savedTone }))
      }
    }
  }

  // ── 7) 수정된 초안 저장 ─────────────────────
  const saveDraftEdit = async (review: Review, text: string) => {
    try {
      const res = await fetch('/api/review-reply/draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id, draft: text, tone: persona.tone }),
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

  // ── 8) 자동 발행 (Worker 연동 / 수동 폴백) ─────────────────────
  const handleSubmit = async (review: Review) => {
    if (!draftText || !draftText.trim()) {
      toast.warn('먼저 답글을 작성해주세요')
      return
    }
    setSubmitting(true)
    try {
      const trimmed = draftText.trim()
      const saved = await saveDraftEdit(review, trimmed)
      if (!saved) { setSubmitting(false); return }

      // auto-publish: Worker 연동 우선, 미연결 시 수동 폴백
      const res = await fetch('/api/review-reply/auto-publish', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        if (data?.code === 'NO_CREDENTIALS') {
          setNoCredentialsHref(data?.connect_href || null)
          toast.warn(data?.error || '계정을 연결해야 자동 발행이 가능해요')
        } else {
          toast.error('발행 실패: ' + (data?.error || ''))
        }
        return
      }

      // ── Worker 자동 발행 모드 ──
      toast.success('⚡ Worker가 자동으로 답글을 등록해요! 1~2분 후 새로고침 해주세요.')
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? { ...r, replyStatus: 'queued', replyQueuedAt: new Date().toISOString(), draftReply: trimmed }
            : r,
        ),
      )

      setEditingId(null)
      setDraftText('')
    } catch (e: any) {
      toast.error('발행 오류: ' + (e?.message || e))
    } finally {
      setSubmitting(false)
    }
  }

  // ── 9) 일괄 초안 생성 ───────────────────
  const runBulkDraft = async () => {
    if (bulkRunning) return
    bulkCancelRef.current = false
    setBulkCancelled(false)
    setBulkRunning(true)

    try {
      const listRes = await fetch('/api/review-reply/bulk-draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: config.platform }),
      })
      const listData = await listRes.json()
      if (!listRes.ok || !listData?.ok) {
        toast.error('후보 조회 실패: ' + (listData?.error || ''))
        setBulkRunning(false)
        return
      }
      const candidates = (listData.candidates || []) as Array<{ id: string }>
      if (!candidates.length) {
        toast.info('미답변 리뷰가 없어요 ✨')
        setBulkRunning(false)
        return
      }
      setBulkProgress({ done: 0, total: candidates.length, currentId: null })

      for (let i = 0; i < candidates.length; i++) {
        if (bulkCancelRef.current) {
          toast.info(`중단됨 (${i}/${candidates.length} 완료)`)
          break
        }
        const c = candidates[i]
        setBulkProgress({ done: i, total: candidates.length, currentId: c.id })

        const target = reviews.find((r) => r.id === c.id)
        if (!target) continue

        try {
          const aiRes = await fetch('/api/ai-review-reply', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              review_id: c.id,
              review: target.content,
              rating: target.rating,
              platform: config.platform,
              aiSettings: { tone: persona.tone, length: 'medium' },
              customerProfile: { gender: persona.gender, age: persona.age },
            }),
          })
          const aiData = await aiRes.json()
          const generated = String(aiData?.reply || aiData?.message || '').trim()
          if (!generated) continue

          await fetch('/api/review-reply/draft', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_id: c.id, draft: generated, tone: persona.tone }),
          })

          setReviews((prev) =>
            prev.map((r) =>
              r.id === c.id
                ? { ...r, draftReply: generated, replyStatus: 'draft', replyTone: persona.tone }
                : r,
            ),
          )
        } catch (_) {
          // 개별 실패는 무시하고 다음으로
        }
      }

      setBulkProgress({ done: candidates.length, total: candidates.length, currentId: null })
      if (!bulkCancelRef.current) {
        toast.success(`일괄 초안 생성 완료 · ${candidates.length}건`)
      }
    } catch (e: any) {
      toast.error('일괄 생성 오류: ' + (e?.message || e))
    } finally {
      setBulkRunning(false)
    }
  }

  const cancelBulk = () => {
    bulkCancelRef.current = true
    setBulkCancelled(true)
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

  // 일괄 버튼 disabled 판정
  const bulkEligibleCount = reviews.filter(
    (r) => !r.hasReply && ['none', 'draft', 'failed'].includes(r.replyStatus),
  ).length

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col overflow-x-hidden">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-[220px] pt-14 md:pt-0 min-w-0">
          <PageHeader
            icon={config.icon}
            logoNode={config.logoNode}
            textDark={config.platform === 'kakao_map'}
            title={`${config.label} 리뷰 관리`}
            subtitle={
              connected
                ? (config.platform === 'naver_place'
                    ? `${storeName || '연결된 매장'} · 리뷰 ${agg.review_count}건 수집 완료 · 미답변 ${agg.unreplied_count}건 AI 답글 대기 중`
                    : config.platform === 'kakao_map'
                      ? `${storeName || '연결된 매장'} · 카카오맵 리뷰 ${agg.review_count}건 · 미답변 ${agg.unreplied_count}건 AI가 작성 준비 완료`
                      : config.platform === 'baemin'
                        ? `${storeName || '연결된 매장'} · 배민 리뷰 ${agg.review_count}건 수집 완료 · 미답변 ${agg.unreplied_count}건 AI 답글 대기 중`
                        : `${storeName || '연결된 매장'} · 리뷰 ${agg.review_count}건 수집 완료 · 미답변 ${agg.unreplied_count}건 AI 대기`)
                : (config.platform === 'naver_place'
                    ? '네이버 플레이스 공개 리뷰 자동 수집 · AI가 맞춤 사장님 답글 작성'
                    : config.platform === 'kakao_map'
                      ? '카카오맵 리뷰 자동 수집 · AI가 카카오 감성으로 답글 작성'
                      : config.platform === 'baemin'
                        ? '배달의민족 리뷰 자동 수집 · AI가 배민 스타일로 답글 작성'
                        : `${config.label} 리뷰 자동 수집 · AI 맞춤 답글 작성`)
            }
            variant={config.uiKey as any}
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
                    <p className="text-sm font-bold text-[#191F28] mb-1">아직 {config.label}이 연결되지 않았어요</p>
                    <p className="text-xs text-[#4E5968] leading-relaxed mb-3">
                      사장님 계정 로그인 정보를 한 번만 입력하면 리뷰가 자동으로 이 페이지에 쌓여요.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        href={config.connectHref}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
                        style={{ background: config.color }}
                      >
                        + {config.label} 연결하기
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
                  <p className="text-[11px] text-[#8B95A1] font-medium mb-1">주의 리뷰</p>
                  <p className="text-xl font-black text-[#F04452]">{negativeCount}건</p>
                </div>
              </div>
            )}

            {/* 일괄 초안 진행중 배너 */}
            {bulkRunning && (
              <div
                className="mb-4 rounded-2xl border p-4"
                style={{ background: config.bg, borderColor: config.color + '60' }}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-bold mb-1" style={{ color: config.textColor }}>
                      ⚡ 초안 일괄 생성 중 · {bulkProgress.done} / {bulkProgress.total}
                    </p>
                    <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%`,
                          background: config.color,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-[#4E5968] mt-1">
                      리뷰 1건당 평균 4~8초 소요. 도중에 이탈하면 진행이 멈춰요.
                    </p>
                  </div>
                  <button
                    onClick={cancelBulk}
                    disabled={bulkCancelled}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    {bulkCancelled ? '중단 요청됨…' : '중단'}
                  </button>
                </div>
              </div>
            )}

            {/* 네이버 플레이스 전용 안내 */}
            {connected && config.platform === 'naver_place' && (
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 mb-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="text-xl leading-none mt-0.5">🟢</span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-bold text-[#191F28] mb-1">네이버 플레이스 리뷰 — 자동 수집 + 사장님 답글 작성</p>
                  </div>
                  {placeId && (
                    <a
                      href={`https://m.place.naver.com/restaurant/${placeId}/review/visitor`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#E8FBF0] text-[#015C2C] hover:bg-[#D1F7E0]"
                    >
                      네이버 리뷰 원본 ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 플랫폼 공통 안내 배너 (kakao_map / baemin 등) */}
            {connected && config.platformInfoBanner && (
              <div
                className="rounded-2xl border p-4 mb-4"
                style={{ background: config.bg, borderColor: config.color + '55' }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: config.color }}
                  >
                    {config.logoNode
                      ? <div style={{ transform: 'scale(0.55)', transformOrigin: 'center' }}>{config.logoNode}</div>
                      : <span className="text-base font-black" style={{ color: config.textColor }}>{config.iconLetter}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-bold" style={{ color: config.textColor }}>
                      {config.platformInfoBanner.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: config.textColor + 'BB' }}>
                      {config.platformInfoBanner.desc}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {config.platformInfoBanner.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg hover:opacity-80 whitespace-nowrap transition-opacity"
                        style={link.dark
                          ? { background: config.textColor, color: config.bg }
                          : { background: config.color, color: '#fff' }
                        }
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 필터 + 액션 바 */}
            {connected && (
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {/* 30차-23: 기간 필터 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">기간</span>
                  {(
                    [
                      ['7', '최근 7일'],
                      ['30', '최근 30일'],
                      ['all', '전체'],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setPeriod(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${period === v ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                      style={period === v ? { background: config.color } : {}}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">평점</span>
                  <button
                    onClick={() => setFilterRating(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === null ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                    style={filterRating === null ? { background: config.color } : {}}
                  >
                    전체
                  </button>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFilterRating(n)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === n ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                      style={filterRating === n ? { background: config.color } : {}}
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
                      style={filterReplied === v ? { background: v === 'negative' ? '#F04452' : config.color } : {}}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="sm:ml-auto flex gap-2 flex-wrap">
                  {/* 일괄 초안 생성 버튼 */}
                  <button
                    onClick={runBulkDraft}
                    disabled={bulkRunning || bulkEligibleCount === 0}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 shadow-sm"
                    style={{ background: config.color }}
                    title={`미답변 ${bulkEligibleCount}건에 대해 AI 초안을 한 번에 생성`}
                  >
                    ⚡ 미답변 {bulkEligibleCount}건 초안 일괄 생성
                  </button>
                  {config.supportsFetch && (
                    <button
                      onClick={collectNow}
                      disabled={fetching}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-[#4E5968] bg-[#F2F4F6] hover:bg-[#E5E8EB] disabled:opacity-50"
                    >
                      {fetching ? '수집 중...' : '↻ 지금 수집'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 리뷰 목록 — connected 무관, 로딩 완료 후 항상 표시 */}
            {(!loadingConn || loadingReviews || reviews.length > 0) ? (
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
                    {config.supportsFetch
                      ? (fetching ? '잠시만 기다려 주세요' : '"↻ 지금 수집" 버튼을 누르면 공개 리뷰를 불러옵니다')
                      : 'Worker 가 연결되면 자동 수집이 시작돼요 (23차-5)'}
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
                    const isQueued = review.replyStatus === 'submitting'  // 'queued'는 재편집 허용
                    const isSubmitting = submitting && editingId === review.id
                    // reply_status='submitted' 이면 has_reply 여부와 무관하게 등록 완료로 처리
                    const isSubmitted = review.replyStatus === 'submitted'
                    const isBulkTarget = bulkRunning && bulkProgress.currentId === review.id
                    return (
                      <div
                        key={review.id}
                        className={`bg-white rounded-2xl border p-4 md:p-5 ${isNegative ? 'border-[#FCA5A5]' : 'border-[#E5E8EB]'} ${isBulkTarget ? 'ring-2' : ''}`}
                        style={isBulkTarget ? { ['--tw-ring-color' as any]: config.color } : {}}
                      >
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#191F28]">{review.author}</span>
                            {typeof review.rating === 'number' && <Stars n={review.rating} color={config.color} />}
                            {review.photoCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3182F6] font-semibold">
                                📷 사진 {review.photoCount}
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

                        {/* 30차-23: 사진 썸네일 그리드 */}
                        {review.photos.length > 0 && (
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 mb-3">
                            {review.photos.slice(0, 10).map((url, i) => (
                              <button
                                key={i}
                                onClick={() => setLightboxUrl(url)}
                                className="relative aspect-square rounded-lg overflow-hidden bg-[#F2F4F6] group"
                                title="크게 보기"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`review-photo-${i + 1}`}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:opacity-90 transition"
                                  onError={(e) => { (e.currentTarget.style.display = 'none') }}
                                />
                              </button>
                            ))}
                            {review.photos.length > 10 && (
                              <div className="aspect-square rounded-lg bg-[#F2F4F6] flex items-center justify-center text-xs font-bold text-[#8B95A1]">
                                +{review.photos.length - 10}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 편집중 UI */}
                        {isEditing && (
                          <div
                            className="rounded-xl p-3 mb-3 border"
                            style={{ background: config.bg, borderColor: config.color + '40' }}
                          >
                            {generating ? (
                              <p className="text-sm font-semibold py-2" style={{ color: config.textColor }}>
                                ✍️ AI가 초안을 만드는 중... (사진·SEO 키워드 분석 포함)
                              </p>
                            ) : (
                              <>
                                {/* ── 페르소나 패널 ── */}
                                <div className="rounded-xl border border-[#E5E8EB] bg-white p-3 mb-3 space-y-2.5">
                                  {/* 말투 */}
                                  <div>
                                    <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">말투</p>
                                    <div className="flex flex-wrap gap-1">
                                      {TONE_OPTIONS.map(({ value, label, emoji }) => {
                                        const active = persona.tone === value
                                        return (
                                          <button
                                            key={value}
                                            onClick={() => setPersona((p) => ({ ...p, tone: value }))}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${active ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                                            style={active ? { background: config.color } : {}}
                                          >
                                            {emoji} {label}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  {/* 성별 */}
                                  <div>
                                    <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">고객 성별</p>
                                    <div className="flex flex-wrap gap-1">
                                      {GENDER_OPTIONS.map(({ value, label }) => {
                                        const active = persona.gender === value
                                        return (
                                          <button
                                            key={value}
                                            onClick={() => setPersona((p) => ({ ...p, gender: value }))}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${active ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                                            style={active ? { background: config.color } : {}}
                                          >
                                            {label}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  {/* 연령 */}
                                  <div>
                                    <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">고객 연령대</p>
                                    <div className="flex flex-wrap gap-1">
                                      {AGE_OPTIONS.map(({ value, label }) => {
                                        const active = persona.age === value
                                        return (
                                          <button
                                            key={value}
                                            onClick={() => setPersona((p) => ({ ...p, age: value }))}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${active ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                                            style={active ? { background: config.color } : {}}
                                          >
                                            {label}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  <div className="flex justify-end pt-1">
                                    <button
                                      onClick={() => {
                                        try { localStorage.setItem(PERSONA_KEY, JSON.stringify(persona)) } catch {}
                                        toast.success('기본 페르소나 저장됨 💾')
                                      }}
                                      className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-[#F2F4F6] text-[#8B95A1] hover:bg-[#E5E8EB] hover:text-[#4E5968]"
                                    >
                                      💾 기본값으로 저장
                                    </button>
                                  </div>
                                </div>

                                <p className="text-[10px] text-[#8B95A1] mb-1 flex items-center gap-1">
                                  💡 필요하면 직접 수정한 뒤 등록하세요
                                </p>
                                <textarea
                                  value={draftText}
                                  onChange={(e) => setDraftText(e.target.value)}
                                  disabled={isQueued || isSubmitted || submitting}
                                  className="w-full rounded-lg border border-[#E5E8EB] p-2.5 text-sm text-[#191F28] bg-white focus:outline-none focus:ring-2 leading-relaxed resize-y min-h-[120px] disabled:bg-[#F9FAFB]"
                                  style={{ ['--tw-ring-color' as any]: config.color + '40' }}
                                  placeholder="AI 초안이 여기에 나타나요..."
                                />
                                <p className="text-[10px] text-[#8B95A1] mt-1 text-right">
                                  {draftText.length}자
                                </p>

                                <div className="flex gap-2 flex-wrap mt-2">
                                  <button
                                    onClick={() => handleGenerateDraft(review, persona)}
                                    disabled={generating || submitting || isQueued || isSubmitted}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border hover:bg-[#F9FAFB] disabled:opacity-50"
                                    style={{ borderColor: config.color + '60', color: config.textColor }}
                                  >
                                    🔁 AI 재생성
                                  </button>
                                  <button
                                    onClick={() => handleSubmit(review)}
                                    disabled={generating || submitting || !draftText.trim() || isQueued || isSubmitted}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                                    style={{ background: config.color }}
                                  >
                                    {submitting ? '처리 중...' : isQueued ? '⏳ Worker 처리 중' : '⚡ 자동 발행'}
                                  </button>

                                  <button
                                    onClick={() => { setEditingId(null); setDraftText('') }}
                                    disabled={submitting}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#8B95A1] hover:bg-[#F2F4F6] ml-auto"
                                  >
                                    닫기
                                  </button>
                                </div>

                                {review.replyStatus === 'queued' && (
                                  <p className="text-[11px] mt-2 text-[#075985] bg-[#E0F2FE] rounded-lg px-2 py-1.5">
                                    ⚡ Worker가 자동으로 플랫폼에 답글을 등록 중이에요. 1~2분 후 새로고침 해주세요.
                                  </p>
                                )}
                                {isSubmitted && (
                                  <p className="text-[11px] mt-2 text-[#059669] bg-[#ECFDF5] rounded-lg px-2 py-1.5">
                                    ✅ {config.label}에 등록 완료 ({timeAgo(review.replySubmittedAt)})
                                  </p>
                                )}
                                {review.replyStatus === 'failed' && review.replyError && (
                                  <p className="text-[11px] mt-2 text-[#DC2626] bg-[#FEE2E2] rounded-lg px-2 py-1.5">
                                    ❌ 등록 실패: {review.replyError}
                                    {config.reviewAdminUrl && (
                                      <a href={config.reviewAdminUrl} target="_blank" rel="noopener noreferrer"
                                        className="ml-2 underline">직접 등록 →</a>
                                    )}
                                  </p>
                                )}
                                {noCredentialsHref && (
                                  <div className="mt-2 flex items-center gap-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg px-3 py-2">
                                    <span className="text-xs text-[#92400E] flex-1">🔗 자동 발행하려면 {config.label} 계정을 연결해주세요</span>
                                    <Link
                                      href={noCredentialsHref}
                                      className="px-3 py-1 rounded-lg text-xs font-bold text-white hover:opacity-90 whitespace-nowrap"
                                      style={{ background: config.color }}
                                    >
                                      계정 연결하기
                                    </Link>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* 등록 완료 — 답글 내용 표시 */}
                        {!isEditing && isSubmitted && (
                          <div className="rounded-xl p-3 mb-2 border border-[#ECFDF5] bg-[#F0FDF4]">
                            <p className="text-[10px] font-bold text-[#059669] mb-1">✅ 사장님 답글 (등록 완료)</p>
                            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap break-words">
                              {review.draftReply || '(답글 내용 없음)'}
                            </p>
                          </div>
                        )}

                        {/* 초기 진입 버튼 — 미등록 상태에서만 표시 */}
                        {!isEditing && !isSubmitted && !review.hasReply && (
                          <div className="flex gap-2 flex-wrap items-center">
                            {hasDraft ? (
                              <>
                                <button
                                  onClick={() => openEditor(review)}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm"
                                  style={{ background: config.color }}
                                >
                                  📝 초안 이어서 편집
                                </button>
                                <span className="text-[11px] text-[#8B95A1] truncate max-w-[280px]">
                                  {(review.draftReply || '').slice(0, 60)}{(review.draftReply || '').length > 60 ? '...' : ''}
                                </span>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleGenerateDraft(review)}
                                  disabled={bulkRunning}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm disabled:opacity-50"
                                  style={{ background: config.color }}
                                  title="지역·업종·사진·키워드 자동 분석 → AI 답글 초안 생성"
                                >
                                  ✍️ AI 초안 생성
                                </button>
                                <button
                                  onClick={() => { setEditingId(review.id); setDraftText('') }}
                                  disabled={bulkRunning}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6] shadow-sm disabled:opacity-50"
                                >
                                  ✏️ 직접 작성
                                </button>
                              </>
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

      {/* 30차-23: 사진 라이트박스 */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="review-photo-large"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-[#191F28] font-bold text-lg flex items-center justify-center hover:bg-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
