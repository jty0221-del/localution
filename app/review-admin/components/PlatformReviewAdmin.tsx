'use client'

// ============================================================
// 30차-22 · 멀티플랫폼 공통 리뷰 관리 컴포넌트
//
// · 30차-21 네이버 2단 시스템 (초안 생성 → 편집 → 이대로 등록) 을
// naver_place / baemin / yogiyo / coupangeats 4개 플랫폼에 공통 적용
// · 30차-22-A "미답변 N건 초안 일괄 생성" 추가
// · 플랫폼별 브랜딩은 props 로 주입
//
// 의존 API:
// - GET /api/stores/me (연결 상태/집계)
// - GET /api/place/reviews?platform= (리뷰 목록, 30차-21 초안 컬럼 포함)
// - POST /api/place/reviews/fetch (수집) — naver_place 만 지원
// - POST /api/ai-review-reply (AI 초안 생성)
// - POST /api/review-reply/draft (초안 저장)
// - POST /api/review-reply/submit (Worker 큐 등록)
// - POST /api/review-reply/bulk-draft (일괄 생성 후보 조회)
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
import { toast } from '../../lib/toast'
import { Heart, Briefcase, Smile, Edit3, Mail, Flame, FileText, AlertTriangle, Sparkles, Star, type LucideIcon } from 'lucide-react'
// 76차: CoupangReviewBookmarkletDialog import 제거 (자동 연결로 대체됨)

type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
type ReplyStatus = 'none' | 'draft' | 'queued' | 'submitting' | 'submitted' | 'failed'

// ── 페르소나 타입 ──────────────────────────────────────────
// v1.6y: 톤 4종 추가 — apologetic (사과), grateful (감사), gourmand (미식), custom (맞춤)
type PersonaTone = 'friendly' | 'expert' | 'witty' | 'simple' | 'emo' | 'mz' | 'formal' | 'apologetic' | 'grateful' | 'gourmand' | 'custom'
type PersonaGender = 'none' | 'male' | 'female'
type PersonaAge = '' | 'teen' | '20s' | '30s' | '40s' | '50s' | '60s'
interface Persona {
 tone: PersonaTone
 gender: PersonaGender
 age: PersonaAge
}
const DEFAULT_PERSONA: Persona = { tone: 'friendly', gender: 'none', age: '' }

const TONE_OPTIONS: { value: PersonaTone; label: string; Icon: LucideIcon }[] = [
 { value: 'friendly', label: '친근', Icon: Heart },
 { value: 'expert', label: '전문가', Icon: Briefcase },
 { value: 'witty', label: '유머', Icon: Smile },
 { value: 'simple', label: '심플', Icon: Edit3 },
 { value: 'emo', label: '감성', Icon: Mail },
 { value: 'mz', label: 'MZ', Icon: Flame },
 { value: 'formal', label: '공식', Icon: FileText },
 // v1.6y 추가
 { value: 'grateful', label: '감사', Icon: Heart },
 { value: 'apologetic', label: '사과', Icon: AlertTriangle },
 { value: 'gourmand', label: '미식', Icon: Smile },
 { value: 'custom', label: '맞춤', Icon: Edit3 },
]
const GENDER_OPTIONS: { value: PersonaGender; label: string }[] = [
 { value: 'none', label: '성별 무관' },
 { value: 'male', label: '남성' },
 { value: 'female', label: '여성' },
]
const AGE_OPTIONS: { value: PersonaAge; label: string }[] = [
 { value: '', label: '연령 무관' },
 { value: 'teen', label: '10대' },
 { value: '20s', label: '20대' },
 { value: '30s', label: '30대' },
 { value: '40s', label: '40대' },
 { value: '50s', label: '50대' },
 { value: '60s', label: '60대+' },
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
 writableComment?: boolean | null // v1.6q: 배민 자체 30일 정책 신호 (false = 답글 불가)
 photos: string[] // 30차-23: 사진 URL 배열 (썸네일 렌더용)
 photoCount: number // 요약 뱃지용 (photos.length)
 draftReply: string | null
 replyStatus: ReplyStatus
 replyTone: string | null
 replyQueuedAt: string | null
 replySubmittedAt: string | null
 replyError: string | null
 replyContent: string | null // 37차-12: 실제 등록된 답글 본문 (네이버 owner reply 또는 worker 등록 답글)
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
 dark: boolean // true=진한 배경, false=연한 배경
}
export interface PlatformInfoBannerConfig {
 title: string
 desc: string
 links: PlatformInfoBannerLink[]
}

export interface PlatformConfig {
 platform: PlatformSlug // 서버 슬러그
 uiKey: string // Sidebar variant (naver/baemin/yogiyo/coupang)
 label: string // "네이버 플레이스"
 color: string // 브랜드 컬러 hex
 bg: string // 연한 배경 hex
 textColor: string // 글자 컬러 hex
 icon: string // "" 헤더 이모지 (logoNode 없을 때 폴백)
 iconLetter: string // "N" 원형 아이콘 글자
 logoNode?: ReactNode // SVG 로고 — 있으면 PageHeader icon 대신 사용
 supportsFetch: boolean // "지금 수집" 버튼 노출 여부
 connectHref: string // 미연결 시 이동 경로
 collectEndpoint?: string // "지금 수집" 커스텀 엔드포인트
 reviewAdminUrl?: string // 플랫폼 리뷰 관리 URL
 platformInfoBanner?: PlatformInfoBannerConfig // 연결 시 안내 배너 (kakao/baemin 등)
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

// ─── 사용자 친화적 에러 메시지 변환 ───
// 워커가 보내는 기술적 에러를 사장님이 이해할 수 있는 메시지로 변환
// 기술 정보 (placeId, NID_AUT, GraphQL 등) 노출 금지
type FriendlyError = { msg: string; action: 'retry' | 'reconnect' | 'wait' | 'support' }
function makeFriendlyError(raw: string | null | undefined): FriendlyError {
 const e = String(raw || '').toLowerCase()
 // 비밀번호 변경
 if (e.includes('비밀번호') && (e.includes('잘못') || e.includes('변경') || e.includes('credentials_invalid')) ||
 e.includes('password')) {
 return {
 msg: '네이버 비밀번호가 변경된 것 같아요. 매장 연결을 다시 해주세요.',
 action: 'reconnect',
 }
 }
 // 계정 잠금 / 보안조치
 if (e.includes('보안조치') || e.includes('차단') || e.includes('account_locked') ||
 e.includes('해외') || e.includes('locked')) {
 return {
 msg: '네이버 계정에 일시 보안조치가 적용되어 있어요. 시크릿 모드로 직접 로그인해 본인 인증을 완료해주세요.',
 action: 'wait',
 }
 }
 // 프록시 / 인프라
 if (e.includes('프록시') || e.includes('proxy') || e.includes('402') || e.includes('407')) {
 return {
 msg: '잠시 시스템 점검 중이에요. 잠시 후 자동으로 다시 시도할게요.',
 action: 'wait',
 }
 }
 // CAPTCHA
 if (e.includes('captcha') || e.includes('자동입력') || e.includes('영수증')) {
 return {
 msg: 'CAPTCHA 풀이가 어려워서 잠시 후 자동으로 다시 시도할게요.',
 action: 'retry',
 }
 }
 // 권한 / placeId / forbidden — 일반화
 if (e.includes('권한') || e.includes('forbidden') || e.includes('owner') ||
 e.includes('placeid') || e.includes('nid_aut') || e.includes('smartplace')) {
 return {
 msg: '네이버 사장님센터가 잠시 답글 등록을 막은 것 같아요. 잠시 후 자동으로 다시 시도하거나, 매장 연결을 다시 해주세요.',
 action: 'reconnect',
 }
 }
 // 매핑 / GraphQL / 기술 메시지
 if (e.includes('graphql') || e.includes('reviewid') || e.includes('mapping') ||
 e.includes('mutation') || e.includes('null') || e.includes('undefined') ||
 e.includes('http')) {
 return {
 msg: '잠시 등록이 지연되고 있어요. 잠시 후 자동으로 다시 시도할게요.',
 action: 'retry',
 }
 }
 // 미지정 폴백
 return {
 msg: '답글 등록이 지연되고 있어요. 잠시 후 자동으로 다시 시도할게요.',
 action: 'retry',
 }
}

function StatusBadge({ status }: { status: ReplyStatus }) {
 if (status === 'none') return null
 const map: Record<ReplyStatus, { label: string; bg: string; fg: string }> = {
 none: { label: '', bg: '', fg: '' },
 draft: { label: '초안 저장됨', bg: '#EFF6FF', fg: '#1D4ED8' },
 queued: { label: ' 자동 발행 중', bg: '#E0F2FE', fg: '#075985' },
 submitting: { label: ' 등록 중...', bg: '#E0F2FE', fg: '#075985' },
 submitted: { label: '등록 완료', bg: '#ECFDF5', fg: '#059669' },
 failed: { label: '등록 실패', bg: '#FEE2E2', fg: '#DC2626' },
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
 // 쿠팡이츠 북마클릿 — Akamai 우회용 직접 추출 다이얼로그
 // 76차: cpeBookmarklet 상태 제거 (자동 연결로 대체됨)
 const [filterRating, setFilterRating] = useState<number | null>(null)
 const [filterReplied, setFilterReplied] = useState<'all' | 'replied' | 'unreplied' | 'negative'>('all')
 // 30차-23: 기간 필터 (7일 / 30일 / 전체) — 서버 쿼리 파라미터로 넘겨서 re-fetch
 const [period, setPeriod] = useState<'7' | '30' | 'all'>('all')
 // 30차-23: 사진 라이트박스
 const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
 // v1.6m: 30일 경과 안내 모달
 const [expiredInfoOpen, setExpiredInfoOpen] = useState(false)

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

 // v1.6y: custom 톤 — 사장님 맞춤 프롬프트 (예: "정성스러운 한식당 사장님처럼, 메뉴 칭찬 + 재방문 유도")
 const CUSTOM_PROMPT_KEY = 'localution:review_persona_custom_prompt'
 const [customPrompt, setCustomPrompt] = useState<string>(() => {
 try {
 if (typeof window !== 'undefined') {
 return window.localStorage.getItem(CUSTOM_PROMPT_KEY) || ''
 }
 } catch {}
 return ''
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
 // 68차-3: hasReply 도 reply_content 또는 raw_snapshot.replies 로 추론
 // has_reply: false 인데 reply_content 가 있으면 (이전 fetch 가 update 못한 경우)
 // 답글 박스를 노출하도록 보정
 hasReply: !!r.has_reply
 || !!r.reply_content
 || (Array.isArray((r.raw_snapshot as any)?.replies) && (r.raw_snapshot as any).replies.length > 0),
 // v1.6q: 배민 자체 writableComment 필드 — false 면 30일 초과로 답글 불가
 writableComment: typeof (r.raw_snapshot as any)?.writableComment === 'boolean'
 ? (r.raw_snapshot as any).writableComment
 : null,
 photos: photoArr,
 photoCount: photoArr.length,
 draftReply: r.draft_reply || null,
 replyStatus: (r.reply_status || 'none') as ReplyStatus,
 replyTone: r.reply_tone || null,
 replyQueuedAt: r.reply_queued_at || null,
 replySubmittedAt: r.reply_submitted_at || null,
 replyError: r.reply_error || null,
 // 답글 본문: 플랫폼별 우선순위
 // 1) reply_content 컬럼 (쿠팡/배민/요기요 — 워커가 직접 저장)
 // 2) raw_snapshot.ownerReplyBody (네이버 — raw_snapshot 안에 보존)
 // 3) raw_snapshot.replies[0].comment (쿠팡 fallback)
 replyContent:
 r.reply_content ||
 ((r.raw_snapshot as any)?.ownerReplyBody) ||
 ((r.raw_snapshot as any)?.replies?.[0]?.comment) ||
 ((r.raw_snapshot as any)?.replies?.[0]?.content) ||
 null,
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

 // 76차: 쿠팡이츠 북마클릿 직접 가져오기 함수 제거 (자동 연결로 대체됨)

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

 // 워커 처리 대기 후 결과 자동 polling (5초 간격, 60회 = 5분)
 // — 워커 큐 처리 시간 가변적이라 자주 체크
 if (data.queued && data.jobId) {
 let lastCount = reviews.length
 for (let i = 0; i < 60; i++) {
 await new Promise(r => setTimeout(r, 5000))
 await Promise.all([loadStoresMe(), loadReviews()])
 try {
 const r = await fetch('/api/place/reviews?platform=' + config.platform + '&limit=1', { cache: 'no-store' })
 const j = await r.json()
 const newCount = j?.total_count || 0
 if (newCount > lastCount) {
 toast.success(`${config.label} 리뷰 ${newCount}건 수집 완료`)
 break
 }
 lastCount = newCount
 } catch {}
 }
 }
 } catch (e: any) {
 toast.error('수집 중 오류: ' + (e?.message || e))
 } finally {
 setFetching(false)
 }
 }, [connected, fetching, placeId, loadStoresMe, loadReviews, config.supportsFetch, config.label, config.platform, reviews.length])

 // ── 4) 자동 수집 ─────
 // 37차-14: 사장님이 직접 답글 단 경우도 빨리 반영되도록 5분으로 단축
 // · 데이터가 0건이면 무조건 수집
 // · 마지막 수집이 5분 이상 지났으면 자동 재수집
 useEffect(() => {
 if (!connected) return
 if (!config.supportsFetch) return
 if (autoFetchTried) return
 if (loadingReviews) return
 const lastMs = agg.latest_collected_at ? new Date(agg.latest_collected_at).getTime() : 0
 const isStale = !lastMs || (Date.now() - lastMs > 5 * 60 * 1000) // 5분
 if (reviews.length > 0 && !isStale) return
 setAutoFetchTried(true)
 collectNow()
 }, [connected, autoFetchTried, loadingReviews, reviews.length, collectNow, config.supportsFetch, agg.latest_collected_at])

 // ── 5) 단일 초안 생성 ───────────────────────
 const handleGenerateDraft = async (review: Review, currentPersona?: Persona) => {
 const usePersona = currentPersona || persona
 setEditingId(review.id)
 setGenerating(true)
 setDraftText('')
 try {
 // 클라이언트 타임아웃 85초 (서버 maxDuration 90s 직전 fallback)
 const aiController = new AbortController()
 const aiTimer = setTimeout(() => aiController.abort(), 85000)
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
 customPrompt: usePersona.tone === 'custom' ? customPrompt : undefined,
 }),
 signal: aiController.signal,
 })
 clearTimeout(aiTimer)
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
 const msg = e?.name === 'AbortError'
 ? 'AI 응답이 너무 느려요 (85초 초과). 다시 시도해 주세요.'
 : '초안 생성 오류: ' + (e?.message || e)
 toast.error(msg)
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
 const validTones: PersonaTone[] = ['friendly', 'expert', 'witty', 'simple', 'emo', 'mz', 'formal', 'apologetic', 'grateful', 'gourmand', 'custom']
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

 // ── 카카오맵 manual_paste 모드 ── 클립보드 복사 + 새 탭 이동
 if (data.mode === 'manual_paste' && data.reply_text) {
 try {
 await navigator.clipboard.writeText(data.reply_text)
 toast.success('답글이 클립보드에 복사됐어요. 새 탭에서 붙여넣기 후 등록해주세요.')
 } catch {
 // 클립보드 권한 거부 시 fallback
 const ta = document.createElement('textarea')
 ta.value = data.reply_text
 ta.style.position = 'fixed'; ta.style.opacity = '0'
 document.body.appendChild(ta)
 ta.select()
 try { document.execCommand('copy') } catch {}
 document.body.removeChild(ta)
 toast.info('답글이 복사됐어요 (수동). 새 탭에서 붙여넣기 해주세요.')
 }
 if (data.platform_url) {
 window.open(data.platform_url, '_blank', 'noopener,noreferrer')
 }
 // DB 는 이미 submitted 처리됨 — UI 도 반영
 setReviews((prev) =>
 prev.map((r) =>
 r.id === review.id
 ? {
 ...r,
 replyStatus: 'submitted',
 replySubmittedAt: new Date().toISOString(),
 draftReply: trimmed,
 replyContent: trimmed,
 hasReply: true,
 replyError: null,
 }
 : r,
 ),
 )
 setEditingId(null)
 setDraftText('')
 return
 }

 // ── 자동 발행 모드 — 보수적 표시 ──
 // hasReply=true 로 미리 마킹하지 않음 (워커가 실제 등록 검증 통과해야 표시됨)
 // queued 상태로만 표시 → 90초 후 자동 재수집으로 실제 결과 반영
 toast.success(`답글 발행 요청을 보냈어요! ${config.label}에 등록 시도 중 (60~90초 소요). 결과는 자동으로 갱신됩니다.`)
 setReviews((prev) =>
 prev.map((r) =>
 r.id === review.id
 ? {
 ...r,
 replyStatus: 'queued',
 replyQueuedAt: new Date().toISOString(),
 draftReply: trimmed,
 replyError: null,
 }
 : r,
 ),
 )

 setEditingId(null)
 setDraftText('')

 // 90초 후 자동 재수집 — 실제 네이버 등록 상태 확인 (GraphQL hasOwnerReply 정확히 반영)
 // 모바일에서 페이지 떠나도 다시 돌아왔을 때 visibility change 시 fetch
 setTimeout(() => {
 if (document.visibilityState === 'visible') {
 collectNow().catch(() => null)
 }
 }, 90000)
 // 모바일 대응: 페이지 visibility 복귀 시 자동 fetch (페이지 백그라운드 후 재진입)
 const onVisibility = () => {
 if (document.visibilityState === 'visible') {
 collectNow().catch(() => null)
 document.removeEventListener('visibilitychange', onVisibility)
 }
 }
 document.addEventListener('visibilitychange', onVisibility)
 // 5분 후 cleanup
 setTimeout(() => document.removeEventListener('visibilitychange', onVisibility), 5 * 60 * 1000)
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
 toast.info('미답변 리뷰가 없어요 ')
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
 }).slice().sort((a, b) => {
 // v1.6r: 배민 30일 경과 = 답글 불가 → 화면 아래로
 // 배민이 아니면 단순 최신순. 같은 그룹 내에서는 posted_at DESC.
 const isExpired = (r: any) => {
 if (config.platform !== 'baemin') return false
 if (r.writableComment === false) return true
 // posted_at > ID prefix 순
 if (r.postedAt) {
 const ts = new Date(r.postedAt).getTime()
 if (!isNaN(ts) && (Date.now() - ts) / 86400_000 > 30) return true
 }
 const m = String(r.platform_review_id || '').match(/^baemin-real-(\d{8})/)
 if (m) {
 const ymd = m[1]
 const dateStr = ymd.slice(0,4) + '-' + ymd.slice(4,6) + '-' + ymd.slice(6,8) + 'T00:00:00'
 const ts = new Date(dateStr).getTime()
 if (!isNaN(ts) && (Date.now() - ts) / 86400_000 > 30) return true
 }
 return false
 }
 const aExpired = isExpired(a) ? 1 : 0
 const bExpired = isExpired(b) ? 1 : 0
 if (aExpired !== bExpired) return aExpired - bExpired // 미만료 → 만료 순
 // 같은 그룹 내 — 정확한 날짜 우선 사용 (ID prefix > postedAt > collectedAt)
 const dateMs = (r: any): number => {
 // baemin-real-YYYYMMDDXXXXXXXX 의 YYYYMMDD 가 가장 정확 (collected_at 같은 시간 문제 회피)
 const m = String(r.platform_review_id || '').match(/^baemin-real-(\d{8})/)
 if (m) {
 const ymd = m[1]
 const dateStr = ymd.slice(0,4) + '-' + ymd.slice(4,6) + '-' + ymd.slice(6,8) + 'T00:00:00'
 const ts = new Date(dateStr).getTime()
 if (!isNaN(ts)) return ts
 }
 if (r.postedAt) {
 const ts = new Date(r.postedAt).getTime()
 if (!isNaN(ts)) return ts
 }
 if (r.collectedAt) {
 const ts = new Date(r.collectedAt).getTime()
 if (!isNaN(ts)) return ts
 }
 return 0
 }
 return dateMs(b) - dateMs(a) // 최신 → 옛날
 })

 const negativeCount = reviews.filter((r) => typeof r.rating === 'number' && r.rating <= 3).length
 const ratingDisplay = typeof agg.rating_avg === 'number' ? agg.rating_avg.toFixed(1) : '-'

 // 일괄 버튼 disabled 판정
 const bulkEligibleCount = reviews.filter(
 (r) => !r.hasReply && ['none', 'draft', 'failed'].includes(r.replyStatus),
 ).length

 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <div className="flex flex-1">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-[220px] pt-4 md:pt-0 min-w-0">
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
 <span className="text-3xl leading-none mt-0.5"></span>
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
 초안 일괄 생성 중 · {bulkProgress.done} / {bulkProgress.total}
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
 <span className="text-xl leading-none mt-0.5"></span>
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
 미답변 {bulkEligibleCount}건 초안 일괄 생성
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
 {/* 76차: '직접 가져오기' 버튼 제거 — 자동 연결로 충분, 일반 사장님 혼란 야기
 (75차까지 자동 연결 완성 + 답글 자동 발행 12초 작동 확인됨) */}
 </div>
 </div>
 )}

 {/* 키워드 분석 (리뷰 1건 이상일 때만) */}
 {reviews.length > 0 && (
 <KeywordAnalysis platform={config.platform} platformLabel={config.label} platformColor={config.color} />
 )}

 {/* 리뷰 목록 — connected 무관, 로딩 완료 후 항상 표시 */}
 {(!loadingConn || loadingReviews || reviews.length > 0) ? (
 loadingReviews ? (
 <div className="bg-white rounded-2xl p-12 text-center text-sm text-[#8B95A1] border border-[#E5E8EB]">
 리뷰 불러오는 중...
 </div>
 ) : reviews.length === 0 ? (
 <div className="bg-white rounded-2xl p-6 md:p-8 text-center border border-[#E5E8EB]">
 <p className="text-sm font-bold text-[#191F28] mb-1">
 {fetching ? '수집 중입니다...' : '아직 수집된 리뷰가 없어요'}
 </p>
 <p className="text-xs text-[#8B95A1] mb-4">
 {config.supportsFetch
 ? (fetching ? '1~3분 정도 걸려요. 매장이 여러 개면 아래에서 매장을 선택해 주세요.' : '"↻ 지금 수집" 버튼을 누르면 공개 리뷰를 불러옵니다')
 : 'Worker 가 연결되면 자동 수집이 시작돼요 (23차-5)'}
 </p>
 {/* 쿠팡이츠 — 매장 선택 버튼은 fetching 중에도 항상 표시 */}
 {config.platform === 'coupangeats' && connected && (
 <CoupangStorePicker onPicked={async () => {
 setAutoFetchTried(false)
 await Promise.all([loadStoresMe(), loadReviews()])
 }} />
 )}
 </div>
 ) : filtered.length === 0 ? (
 <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#8B95A1] border border-[#E5E8EB]">
 선택하신 조건에 맞는 리뷰가 없어요 
 </div>
 ) : (
 <div className="space-y-3">
 {filtered.map((review) => {
 const isNegative = typeof review.rating === 'number' && review.rating <= 3
 const isEditing = editingId === review.id
 const hasDraft = !!(review.draftReply && review.draftReply.trim())
 const isQueued = review.replyStatus === 'submitting'
 const isSubmitting = submitting && editingId === review.id
 const isSubmitted = review.replyStatus === 'submitted'
 const isBulkTarget = bulkRunning && bulkProgress.currentId === review.id
 // v1.6q: 배민 30일 정책 — writableComment > posted_at > ID prefix > collectedAt 순
 // 배민이 직접 알려주는 writableComment 가 가장 정확 (false = 답글 불가)
 const isReplyExpired = (() => {
 if (config.platform !== 'baemin') return false
 // 0. v1.6q: 배민 자체 신호 가장 정확
 if (review.writableComment === false) return true
 // 1. posted_at 우선
 if (review.postedAt) {
 const ts = new Date(review.postedAt).getTime()
 if (!isNaN(ts)) {
 const daysAgo = (Date.now() - ts) / 86400_000
 return daysAgo > 30
 }
 }
 // 2. platform_review_id 의 YYYYMMDD prefix 추출
 const idMatch = String(review.platform_review_id || '').match(/(\d{8})/)
 if (idMatch) {
 const ymd = idMatch[1]
 const dateStr = ymd.slice(0,4) + '-' + ymd.slice(4,6) + '-' + ymd.slice(6,8) + 'T00:00:00'
 const ts = new Date(dateStr).getTime()
 if (!isNaN(ts)) {
 const daysAgo = (Date.now() - ts) / 86400_000
 return daysAgo > 30
 }
 }
 // 3. collectedAt fallback (보수적)
 if (review.collectedAt) {
 const ts = new Date(review.collectedAt).getTime()
 if (!isNaN(ts)) {
 const daysAgo = (Date.now() - ts) / 86400_000
 return daysAgo > 30
 }
 }
 return false
 })()
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
 사진 {review.photoCount}
 </span>
 )}
 {isNegative && (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#DC2626] font-semibold">
 부정 리뷰
 </span>
 )}
 {/* v1.6m: 배민 30일 경과 — 클릭하면 안내 모달 */}
 {isReplyExpired && !review.hasReply && (
 <button
 type="button"
 onClick={() => setExpiredInfoOpen(true)}
 className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold hover:bg-[#FDE68A] transition-colors inline-flex items-center gap-0.5"
 title="자세히 보기"
 >
 30일 경과 <span className="opacity-60">ⓘ</span>
 </button>
 )}
 {/* 이미 답글 달린 리뷰는 status badge 숨김 (오래된 failed 배지 노출 방지) */}
 {!review.hasReply && <StatusBadge status={review.replyStatus} />}
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
 AI가 초안을 만드는 중... (사진·SEO 키워드 분석 포함)
 </p>
 ) : (
 <>
 {/* ── 페르소나 패널 ── */}
 <div className="rounded-xl border border-[#E5E8EB] bg-white p-3 mb-3 space-y-2.5">
 {/* 말투 */}
 <div>
 <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">말투</p>
 <div className="flex flex-wrap gap-1">
 {TONE_OPTIONS.map(({ value, label, Icon }) => {
 const active = persona.tone === value
 return (
 <button
 key={value}
 onClick={() => setPersona((p) => ({ ...p, tone: value }))}
 className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 ${active ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
 style={active ? { background: config.color } : {}}
 >
 <Icon size={11} strokeWidth={2.5} /> {label}
 </button>
 )
 })}
 </div>
 {/* v1.6y: custom 톤 선택 시 사장님 맞춤 프롬프트 입력 */}
 {persona.tone === 'custom' && (
 <div className="mt-2 rounded-lg bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] border border-[#E9D5FF] p-2.5">
 <p className="text-[10px] font-bold text-[#7C3AED] mb-1.5 flex items-center gap-1">
 <Edit3 size={11} strokeWidth={2.5} /> 사장님 맞춤 톤 (자유 작성)
 </p>
 <textarea
 value={customPrompt}
 onChange={(e) => setCustomPrompt(e.target.value)}
 onBlur={() => { try { localStorage.setItem(CUSTOM_PROMPT_KEY, customPrompt) } catch {} }}
 placeholder={"예) 정성스러운 한식당 사장님처럼 소박한 말투. 메뉴 칭찬 + 재방문 유도. \"이모티콘 절대 금지\""}
 className="w-full rounded-md border border-[#E9D5FF] bg-white p-2 text-[12px] text-[#191F28] focus:outline-none focus:ring-2 focus:ring-[#7C3AED40] resize-y min-h-[60px]"
 />
 <p className="text-[10px] text-[#8B95A1] mt-1">
 {customPrompt.length}자 · 입력 후 다른 곳을 클릭하면 자동 저장
 </p>
 </div>
 )}
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
 toast.success('기본 페르소나 저장됨 ')
 }}
 className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-[#F2F4F6] text-[#8B95A1] hover:bg-[#E5E8EB] hover:text-[#4E5968]"
 >
 기본값으로 저장
 </button>
 </div>
 </div>

 <p className="text-[10px] text-[#8B95A1] mb-1 flex items-center gap-1">
 필요하면 직접 수정한 뒤 등록하세요
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
 AI 재생성
 </button>
 {/* v1.6m: 30일 경과 시 클릭하면 안내 모달, 아니면 정상 발행 */}
 {isReplyExpired && !review.hasReply ? (
 <button
 type="button"
 onClick={() => setExpiredInfoOpen(true)}
 className="px-4 py-1.5 rounded-lg text-xs font-bold border-2 border-dashed border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] inline-flex items-center gap-1"
 title="클릭해서 이유 보기"
 >
 답글 불가 <span className="opacity-70">ⓘ</span>
 </button>
 ) : (
 <button
 onClick={() => handleSubmit(review)}
 disabled={generating || submitting || !draftText.trim() || isSubmitted || review.hasReply}
 className="px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
 style={{ background: config.color }}
 title="자동 발행이 실패하면 '복사 + 직접 등록' 버튼이 가장 안정적이에요"
 >
 {submitting ? '처리 중...' : (review.replyStatus === 'queued' ? ' 다시 자동 발행' : ' 자동 발행')}
 </button>
 )}

 {/* 직접 등록 버튼 — 자동 발행이 실패할 때 대안 (가장 안정적) */}
 {config.reviewAdminUrl && !review.hasReply && !isSubmitted && !isReplyExpired && (
 <button
 onClick={() => {
 try {
 navigator.clipboard.writeText(draftText)
 toast.info(`답글이 복사됐어요! ${config.label}에서 붙여넣기 하세요`)
 } catch {}
 window.open(config.reviewAdminUrl!, '_blank', 'noopener')
 }}
 disabled={!draftText.trim() || submitting}
 className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border hover:bg-[#F9FAFB] disabled:opacity-50"
 style={{ borderColor: config.color + '60', color: config.textColor }}
 title={`답글을 복사하고 ${config.label} 답글 작성 페이지를 새 탭으로 열어요`}
 >
 복사 + {config.label}에서 직접 등록
 </button>
 )}

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
 Worker가 자동으로 플랫폼에 답글을 등록 중이에요. 1~2분 후 새로고침 해주세요.
 </p>
 )}
 {isSubmitted && (
 <p className="text-[11px] mt-2 text-[#059669] bg-[#ECFDF5] rounded-lg px-2 py-1.5">
 {config.label}에 등록 완료 ({timeAgo(review.replySubmittedAt)})
 </p>
 )}
 {!isSubmitted && review.hasReply && (
 <p className="text-[11px] mt-2 text-[#059669] bg-[#ECFDF5] rounded-lg px-2 py-1.5">
 이미 {config.label}에 답글이 달린 리뷰예요. 자동 발행은 비활성화됩니다.
 </p>
 )}
 {/* v1.6m: 배민 30일 경과 안내 */}
 {isReplyExpired && !isSubmitted && !review.hasReply && (
 <p className="text-[11px] mt-2 text-[#92400E] bg-[#FEF3C7] rounded-lg px-2 py-1.5">
 배민 정책: 등록된 지 30일이 지난 리뷰에는 답글을 달 수 없어요. (배민 자체 제한)
 </p>
 )}
 {review.replyStatus === 'failed' && review.replyError && !review.hasReply && (() => {
 const fe = makeFriendlyError(review.replyError)
 return (
 <div className="mt-2 rounded-lg px-3 py-2 bg-[#FFF7ED] border border-[#FED7AA]">
 <p className="text-[12px] text-[#9A3412] leading-relaxed">
 ⏳ {fe.msg}
 </p>
 <div className="mt-1.5 flex gap-2 flex-wrap">
 {fe.action === 'reconnect' && noCredentialsHref && (
 <Link
 href={noCredentialsHref}
 className="text-[11px] px-2 py-1 rounded font-bold text-white bg-[#F97316] hover:bg-[#EA580C]"
 >매장 다시 연결 →</Link>
 )}
 {config.reviewAdminUrl && (
 <a
 href={config.reviewAdminUrl}
 target="_blank" rel="noopener noreferrer"
 className="text-[11px] px-2 py-1 rounded text-[#9A3412] underline"
 >직접 등록하기 ↗</a>
 )}
 </div>
 </div>
 )
 })()}
 {noCredentialsHref && (
 <div className="mt-2 flex items-center gap-2 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg px-3 py-2">
 <span className="text-xs text-[#92400E] flex-1"> 자동 발행하려면 {config.label} 계정을 연결해주세요</span>
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

 {/* 등록 완료 또는 플랫폼에 이미 달린 답글 — 답글 내용 표시 */}
 {/* 68차-3: replyContent 가 있으면 무조건 노출 (hasReply boolean 우회) */}
 {!isEditing && (isSubmitted || review.hasReply || !!review.replyContent) && (
 <div className="rounded-xl p-3 mb-2 border border-[#ECFDF5] bg-[#F0FDF4]">
 <p className="text-[10px] font-bold text-[#059669] mb-1">
 {isSubmitted ? `사장님 답글 (${config.label} 등록 완료)` : `사장님 답글 (${config.label}에 등록됨)`}
 </p>
 <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap break-words">
 {review.replyContent || review.draftReply || `(로컬루션에서 작성하지 않은 답글이에요. ${config.label}에서 직접 확인해주세요.)`}
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
 초안 이어서 편집
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
 AI 초안 생성
 </button>
 <button
 onClick={() => { setEditingId(review.id); setDraftText('') }}
 disabled={bulkRunning}
 className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6] shadow-sm disabled:opacity-50"
 >
 직접 작성
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

 {/* 76차: CoupangReviewBookmarkletDialog 제거 — 자동 연결로 충분 */}

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

 {/* v1.6m: 배민 30일 경과 안내 모달 */}
 {expiredInfoOpen && (
 <div
 role="dialog"
 aria-modal="true"
 className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
 onClick={() => setExpiredInfoOpen(false)}
 >
 <div
 className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-sm">
 <span className="text-white text-lg">⏰</span>
 </div>
 <span className="text-base font-bold text-[#191F28]">답글 등록 불가 안내</span>
 </div>
 <button
 onClick={() => setExpiredInfoOpen(false)}
 className="text-[#8B95A1] hover:text-[#191F28] text-lg font-bold"
 aria-label="닫기"
 >
 ✕
 </button>
 </div>

 <div className="px-5 py-5 space-y-3">
 <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3">
 <p className="text-sm font-bold text-[#92400E] mb-1">배민 자체 정책 제한</p>
 <p className="text-xs text-[#92400E] leading-relaxed">
 배민은 등록된 지 <strong>30일이 지난 리뷰</strong>에는 사장님 댓글을 등록할 수 없습니다.
 </p>
 </div>

 <div>
 <p className="text-xs font-bold text-[#191F28] mb-1.5">왜 이런 정책이 있나요?</p>
 <p className="text-xs text-[#4E5968] leading-relaxed">
 배민은 답글 신뢰성을 위해 30일 제한을 두고 있어요.
 로컬루션은 답글 발행 가능한 30일 이내 리뷰를 우선으로 처리합니다.
 </p>
 </div>

 <div>
 <p className="text-xs font-bold text-[#191F28] mb-1.5">대안</p>
 <ul className="text-xs text-[#4E5968] leading-relaxed space-y-1 list-disc list-inside">
 <li>매일 오후 1시 자동 수집되는 새 리뷰에는 즉시 답글 가능</li>
 <li>새 리뷰 들어오면 카카오톡/Web Push 알림 받으세요</li>
 <li>24시간 이내 답글이 가장 효과적입니다</li>
 </ul>
 </div>

 <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-3">
 <p className="text-xs text-[#075985] leading-relaxed">
 <strong>로컬루션은 사장님이 놓치지 않도록 매일 자동 수집하고 알림까지 보내드립니다.</strong>
 </p>
 </div>
 </div>

 <div className="px-5 py-3 bg-[#F8F9FA] border-t border-[#F2F4F6]">
 <button
 onClick={() => setExpiredInfoOpen(false)}
 className="w-full px-4 py-2.5 bg-[#3182F6] text-white rounded-xl font-bold text-sm hover:bg-[#1B64DA] transition-colors"
 >
 확인
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}

// ── 리뷰 키워드 분석 + 마케팅 추천 ──
type Keyword = {
  keyword: string
  count: number
  avg_rating: number | null
  positive: number
  negative: number
  neutral: number
  positive_ratio: number
  marketing_score: number
  category: 'signature' | 'marketing_pick' | 'blog_topic' | 'improvement' | 'neutral'
  recommendation: string
  suggested_use: string[]
}

type KeywordResp = {
  ok: boolean
  total_reviews: number
  keywords: Keyword[]
  by_category: {
    signature: Keyword[]
    marketing_pick: Keyword[]
    blog_topic: Keyword[]
    improvement: Keyword[]
  }
  top_marketing: Keyword[]
  summary: { avg_rating: number | null; total: number }
}

function KeywordAnalysis({ platform, platformLabel, platformColor }: { platform: string; platformLabel: string; platformColor: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<KeywordResp | null>(null)
  const [tab, setTab] = useState<'recommend' | 'all'>('recommend')
  const [sortBy, setSortBy] = useState<'count' | 'rating_high' | 'rating_low' | 'positive' | 'score'>('score')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/place/reviews/keywords?platform=' + platform + '&min_count=2&limit=80', { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setData(j)
    } catch {} finally { setLoading(false) }
  }, [platform])

  useEffect(() => { if (open) load() }, [open, load])

  const sorted = useMemo(() => {
    if (!data) return []
    const arr = [...data.keywords]
    if (sortBy === 'score') arr.sort((a, b) => b.marketing_score - a.marketing_score)
    else if (sortBy === 'count') arr.sort((a, b) => b.count - a.count)
    else if (sortBy === 'rating_high') arr.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
    else if (sortBy === 'rating_low') arr.sort((a, b) => (a.avg_rating || 5) - (b.avg_rating || 5))
    else if (sortBy === 'positive') arr.sort((a, b) => b.positive_ratio - a.positive_ratio)
    return arr
  }, [data, sortBy])

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FAFBFF] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center shadow-sm">
            <Sparkles size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-[#191F28]">키워드 분석 · 마케팅 추천</p>
            <p className="text-[10px] text-[#8B95A1]">SEO 키워드 자동 추출 + 활용 가이드</p>
          </div>
        </div>
        <span className="text-xs text-[#8B95A1]">{open ? '접기' : '열기'}</span>
      </button>

      {open && (
        <div className="px-3 md:px-4 pb-4 border-t border-[#F2F4F6]">
          {loading ? (
            <p className="text-xs text-[#8B95A1] py-6 text-center">분석 중...</p>
          ) : !data || data.keywords.length === 0 ? (
            <p className="text-xs text-[#8B95A1] py-6 text-center">분석할 키워드가 부족해요 (리뷰 더 모이면 자동 분석)</p>
          ) : (
            <>
              {/* 탭 */}
              <div className="inline-flex rounded-xl bg-[#F2F4F6] p-0.5 my-3">
                <button onClick={() => setTab('recommend')}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold ' +
                    (tab === 'recommend' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]')}>
                  마케팅 추천
                </button>
                <button onClick={() => setTab('all')}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold ' +
                    (tab === 'all' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]')}>
                  전체 키워드 ({data.keywords.length})
                </button>
              </div>

              {tab === 'recommend' && (
                <div className="space-y-3">
                  {/* 1. 매장 시그니처 */}
                  {data.by_category.signature.length > 0 && (
                    <CategoryBlock
                      title="매장 시그니처"
                      desc="가장 자주, 가장 긍정적으로 언급된 키워드 — 모든 마케팅의 핵심"
                      color="#059669"
                      bg="#ECFDF5"
                      keywords={data.by_category.signature}
                    />
                  )}
                  {/* 2. 마케팅 활용 */}
                  {data.by_category.marketing_pick.length > 0 && (
                    <CategoryBlock
                      title="마케팅 활용 강점"
                      desc="긍정 비율 75%+ — SNS 캡션·광고 카피·해시태그에 사용"
                      color="#3182F6"
                      bg="#EFF6FF"
                      keywords={data.by_category.marketing_pick}
                    />
                  )}
                  {/* 3. 블루오션 / 블로그 후보 */}
                  {data.by_category.blog_topic.length > 0 && (
                    <CategoryBlock
                      title="블로그 글·롱테일 SEO 후보"
                      desc="긍정 응답 있고 빈도 낮음 — 더 부각하면 차별화 가능"
                      color="#7C3AED"
                      bg="#F5F3FF"
                      keywords={data.by_category.blog_topic}
                    />
                  )}
                  {/* 4. 개선 필요 */}
                  {data.by_category.improvement.length > 0 && (
                    <CategoryBlock
                      title="개선 필요 — 즉시 점검"
                      desc="부정 비율 60%+ 또는 평균 별점 2.8 이하 — 사장님 직접 점검 권장"
                      color="#DC2626"
                      bg="#FEF2F2"
                      keywords={data.by_category.improvement}
                    />
                  )}
                  {data.by_category.signature.length === 0 &&
                   data.by_category.marketing_pick.length === 0 &&
                   data.by_category.blog_topic.length === 0 &&
                   data.by_category.improvement.length === 0 && (
                    <p className="text-xs text-[#8B95A1] py-4 text-center">아직 추천할 만한 키워드가 부족해요. 리뷰 30개 이상 모이면 더 정확해져요.</p>
                  )}

                  {/* 통합 활용 안내 */}
                  <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-[#FAFBFF] to-[#FEF3C7] border border-[#FDE68A]">
                    <p className="text-[11px] font-bold text-[#92400E] mb-1.5">활용 가이드</p>
                    <ul className="text-[11px] text-[#92400E] space-y-1 leading-relaxed list-disc pl-5">
                      <li><strong>시그니처</strong> 키워드 → 네이버 플레이스 소개글·매장 슬로건·메뉴판 강조</li>
                      <li><strong>마케팅 강점</strong> → 인스타 해시태그, AI 답글에 자연스럽게 삽입</li>
                      <li><strong>블루오션</strong> → 블로그 글 주제로 잡고 롱테일 SEO 시도</li>
                      <li><strong>개선 필요</strong> → 직원 회의 안건, 서비스 점검 우선순위로</li>
                    </ul>
                  </div>
                </div>
              )}

              {tab === 'all' && (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] text-[#8B95A1]">{data.total_reviews}개 리뷰 · {data.keywords.length}개 키워드 ·</span>
                    {([
                      ['score', '마케팅 점수'],
                      ['count', '빈도'],
                      ['rating_high', '별점 ↑'],
                      ['rating_low', '별점 ↓'],
                      ['positive', '긍정 ↑'],
                    ] as const).map(([v, l]) => (
                      <button key={v} onClick={() => setSortBy(v)}
                        className={'text-[11px] font-bold px-2 py-1 rounded-lg ' +
                          (sortBy === v ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]')}
                        style={sortBy === v ? { background: platformColor } : {}}>
                        {l}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {sorted.map(k => <KeywordRow key={k.keyword} k={k} />)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CategoryBlock({ title, desc, color, bg, keywords }: {
  title: string; desc: string; color: string; bg: string; keywords: Keyword[]
}) {
  return (
    <div className="rounded-xl p-3 border" style={{ background: bg, borderColor: color + '30' }}>
      <div className="mb-2">
        <p className="text-sm font-black" style={{ color }}>{title}</p>
        <p className="text-[10px] mt-0.5" style={{ color: color + 'cc' }}>{desc}</p>
      </div>
      <div className="space-y-1.5">
        {keywords.map(k => (
          <div key={k.keyword} className="bg-white rounded-lg p-2.5 border border-white">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-black text-[#191F28] truncate">#{k.keyword}</span>
                <span className="text-[10px] text-[#8B95A1] tabular-nums flex-shrink-0">{k.count}회</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] flex-shrink-0">
                {k.avg_rating !== null && (
                  <span className="inline-flex items-center gap-0.5 font-bold tabular-nums"
                    style={{ color: k.avg_rating >= 4 ? '#059669' : k.avg_rating >= 3 ? '#F59E0B' : '#DC2626' }}>
                    <Star size={10} fill="currentColor" strokeWidth={0} />
                    {k.avg_rating}
                  </span>
                )}
                <span className="font-bold tabular-nums" style={{
                  color: k.positive_ratio >= 70 ? '#059669' : k.positive_ratio >= 40 ? '#F59E0B' : '#DC2626'
                }}>
                  긍정 {k.positive_ratio}%
                </span>
              </div>
            </div>
            {k.suggested_use.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {k.suggested_use.map(u => (
                  <span key={u} className="text-[9px] px-1.5 py-0.5 rounded bg-[#F2F4F6] text-[#4E5968] font-bold">
                    {u}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function KeywordRow({ k }: { k: Keyword }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FAFBFF] border border-[#F2F4F6]">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-bold text-[#191F28] truncate">{k.keyword}</span>
        <span className="text-[10px] text-[#8B95A1] flex-shrink-0">{k.count}회</span>
        {k.marketing_score >= 70 && (
          <span className="text-[9px] font-black bg-[#7C3AED] text-white px-1 py-0.5 rounded flex-shrink-0">
            점수 {k.marketing_score}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px]">
        {k.avg_rating !== null && (
          <span className="inline-flex items-center gap-0.5 font-bold tabular-nums"
            style={{ color: k.avg_rating >= 4 ? '#059669' : k.avg_rating >= 3 ? '#F59E0B' : '#DC2626' }}>
            <Star size={10} fill="currentColor" strokeWidth={0} />
            {k.avg_rating}
          </span>
        )}
        <span className="font-bold tabular-nums" style={{
          color: k.positive_ratio >= 70 ? '#059669' : k.positive_ratio >= 40 ? '#F59E0B' : '#DC2626'
        }}>
          긍정 {k.positive_ratio}%
        </span>
      </div>
    </div>
  )
}

// ── 쿠팡이츠 — 사장님이 직접 매장 선택 (다중 매장 케이스) ──
function CoupangStorePicker({ onPicked }: { onPicked: () => void | Promise<void> }) {
 const [open, setOpen] = useState(false)
 const [loading, setLoading] = useState(false)
 const [stores, setStores] = useState<Array<{ storeId: string; name: string | null }>>([])
 const [currentPrimary, setCurrentPrimary] = useState<string | null>(null)
 const [errorMsg, setErrorMsg] = useState<string | null>(null)
 const [picking, setPicking] = useState<string | null>(null)

 async function load() {
 setLoading(true); setErrorMsg(null)
 try {
 const r = await fetch('/api/place/coupang-stores', { cache: 'no-store' })
 const j = await r.json()
 if (!j.ok) {
 setErrorMsg(j.error || '매장 조회 실패')
 setStores([])
 return
 }
 setStores(j.stores || [])
 setCurrentPrimary(j.current_primary || null)
 } catch (e: any) {
 setErrorMsg(e?.message || '오류')
 } finally { setLoading(false) }
 }

 async function pick(sid: string) {
 setPicking(sid); setErrorMsg(null)
 try {
 const r = await fetch('/api/place/coupang-stores', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ store_id: sid, store_ids: stores.map(s => s.storeId) }),
 })
 const j = await r.json()
 if (!j.ok) { setErrorMsg(j.error || '저장 실패'); return }
 setOpen(false)
 toast.success(j.message || '매장 등록 완료')
 await onPicked()
 } catch (e: any) { setErrorMsg(e?.message || '오류') }
 finally { setPicking(null) }
 }

 if (!open) {
 return (
 <button
 onClick={() => { setOpen(true); load() }}
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412] text-xs font-bold hover:bg-[#FFEDD5]"
 >
 매장이 여러 개인가요? 직접 선택
 </button>
 )
 }

 return (
 <div className="mt-3 p-4 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-left">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-bold text-[#9A3412]">매장 선택</h3>
 <button onClick={() => setOpen(false)} className="text-xs text-[#9A3412]">닫기</button>
 </div>
 {loading && <p className="text-xs text-[#9A3412]">매장 목록 불러오는 중...</p>}
 {errorMsg && (
 <p className="text-xs text-[#DC2626] mb-2">
 {errorMsg}
 {errorMsg.includes('연결') || errorMsg.includes('만료') ? (
 <span> · <Link href="/my/platforms/coupangeats/connect" className="underline font-bold">다시 연결하기</Link></span>
 ) : null}
 </p>
 )}
 {!loading && stores.length === 0 && !errorMsg && (
 <div className="text-xs text-[#9A3412] space-y-2">
 <p>자동 감지된 매장이 없어요. 매장 URL 을 직접 붙여넣어 주세요:</p>
 <button
 onClick={async () => {
 const input = prompt(
 '쿠팡이츠 매장 URL 을 붙여넣어 주세요\n\n' +
 '여러 매장은 한 줄씩 입력:\n\n' +
 '예: https://store.coupangeats.com/merchant/management/reviews/950251\n' +
 'https://store.coupangeats.com/merchant/management/reviews/950254\n\n' +
 '쿠팡이츠 사장님 사이트의 리뷰 페이지 주소를 그대로 복사해 주세요.'
 )
 if (!input) return
 const tokens = input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
 const ids: string[] = []
 for (const t of tokens) {
 const m = t.match(/(?:reviews|store|stores)\/(\d{4,})/) || t.match(/^(\d{4,})$/)
 if (m && m[1] && !ids.includes(m[1])) ids.push(m[1])
 }
 if (ids.length === 0) {
 alert('매장 ID 를 추출하지 못했어요. 다시 확인해 주세요.')
 return
 }
 if (!confirm(`${ids.length}개 매장 등록 + 6개월치 수집을 시작하시겠어요?\n\n${ids.join('\n')}`)) return
 setPicking(ids[0])
 try {
 const r = await fetch('/api/place/coupang-stores', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ store_id: ids[0], store_ids: ids }),
 })
 const j = await r.json()
 if (!j.ok) { setErrorMsg(j.error || '저장 실패'); return }
 setOpen(false)
 toast.success(`매장 ${ids.length}개 등록 완료 — 6개월치 수집 1~3분`)
 await onPicked()
 } catch (e: any) { setErrorMsg(e?.message || '오류') }
 finally { setPicking(null) }
 }}
 className="px-3 py-2 rounded-lg bg-[#F97316] text-white text-xs font-bold hover:bg-[#EA580C]"
 >
 매장 URL 직접 입력
 </button>
 </div>
 )}
 {stores.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
 <p className="text-xs text-[#9A3412]">사장님 계정의 매장 목록입니다. 리뷰를 가져올 매장을 선택해주세요:</p>
 <button
 onClick={async () => {
 if (!confirm(`전체 ${stores.length}개 매장을 모두 등록 + 6개월치 수집 시작하시겠어요?`)) return
 setPicking(stores[0].storeId)
 try {
 const r = await fetch('/api/place/coupang-stores', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 store_id: stores[0].storeId,
 store_ids: stores.map(s => s.storeId),
 }),
 })
 const j = await r.json()
 if (!j.ok) { setErrorMsg(j.error || '저장 실패'); return }
 setOpen(false)
 toast.success(j.message || '전체 매장 등록 완료')
 await onPicked()
 } catch (e: any) { setErrorMsg(e?.message || '오류') }
 finally { setPicking(null) }
 }}
 disabled={picking !== null}
 className="px-2.5 py-1 rounded-lg bg-[#9A3412] text-white text-[11px] font-bold hover:bg-[#7C2D12] disabled:opacity-50 flex-shrink-0"
 >
 전체 {stores.length}개 한꺼번에
 </button>
 </div>
 {stores.map(s => (
 <button
 key={s.storeId}
 onClick={() => pick(s.storeId)}
 disabled={picking !== null}
 className={'w-full text-left p-3 rounded-xl border-2 transition disabled:opacity-50 ' +
 (currentPrimary === s.storeId ? 'border-[#F97316] bg-white' : 'border-transparent bg-white hover:border-[#FED7AA]')}
 >
 <div className="flex items-center justify-between">
 <div className="min-w-0">
 <div className="text-sm font-bold text-[#191F28] truncate">
 {s.name || '매장명 미지정'}
 {currentPrimary === s.storeId && <span className="ml-2 text-[10px] text-[#F97316]">(현재)</span>}
 </div>
 <div className="text-[11px] text-[#8B95A1] font-mono">매장 ID: {s.storeId}</div>
 </div>
 <span className="text-xs font-bold text-[#F97316] flex-shrink-0 ml-2">
 {picking === s.storeId ? '...' : '선택'}
 </span>
 </div>
 </button>
 ))}
 <p className="text-[11px] text-[#9A3412] mt-2">선택 시 6개월치 리뷰 자동 수집이 시작돼요 (1~3분 소요).</p>
 </div>
 )}
 </div>
 )
}
