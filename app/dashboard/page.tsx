'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'

// ═══════════════════════════════════════════════════════════
//  플랫폼 로고 SVG
// ═══════════════════════════════════════════════════════════

function NaverPlaceLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#03C75A"/>
      <path d="M9 39V9h8L31 27V9h8v30h-8L17 21v18H9Z" fill="white"/>
    </svg>
  )
}

function GoogleLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect width="48" height="48" rx="10" fill="white" stroke="#E5E8EB" strokeWidth="1.5"/>
      <path d="M43.6 24.5c0-1.5-.14-3-.38-4.5H24v8.5h10.94c-.5 2.5-1.96 4.6-4.16 6v5h6.74c3.94-3.62 6.08-9 6.08-15z" fill="#4285F4"/>
      <path d="M24 44c5.4 0 9.92-1.8 13.24-4.86l-6.46-5c-1.8 1.2-4.1 1.92-6.78 1.92-5.22 0-9.64-3.52-11.22-8.26H6.12v5.14C9.42 40.02 16.28 44 24 44z" fill="#34A853"/>
      <path d="M12.78 27.8A11.94 11.94 0 0112.2 24c0-1.32.22-2.6.58-3.8v-5.14H6.12A20 20 0 004 24c0 3.22.78 6.28 2.12 9.14l6.66-5.34z" fill="#FBBC05"/>
      <path d="M24 12.08c2.94 0 5.58 1.02 7.66 3l5.74-5.74C33.9 6.06 29.38 4 24 4 16.28 4 9.42 7.98 6.12 14.86l6.66 5.14C14.36 15.6 18.78 12.08 24 12.08z" fill="#EA4335"/>
    </svg>
  )
}

function BaeminLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#2AC1BC"/>
      <text
        x="24"
        y="31"
        fontSize="18"
        fontWeight="900"
        fill="#1A1A1A"
        fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        textAnchor="middle"
        letterSpacing="-0.5"
      >배민</text>
    </svg>
  )
}

function YogiyoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#E5007F"/>
      <text x="24" y="23" fontSize="11" fontWeight="900" fill="white" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" textAnchor="middle">요기요</text>
      <circle cx="24" cy="33" r="4" fill="white"/>
      <path d="M16 43 Q24 39 32 43" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function CoupangEatsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      <text x="5" y="25" fontSize="9.5" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="0.2">
        <tspan fill="#E31837">c</tspan><tspan fill="#F4A900">o</tspan><tspan fill="#E31837">u</tspan><tspan fill="#5BAD48">p</tspan><tspan fill="#3B79BE">a</tspan><tspan fill="#E31837">n</tspan><tspan fill="#F4A900">g</tspan>
      </text>
      <text x="5" y="39" fontSize="13" fontWeight="900" fill="#4A2C0A" fontFamily="Arial,sans-serif">eats</text>
    </svg>
  )
}

function NaverSearchLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#03C75A"/>
      <path d="M9 39V9h8L31 27V9h8v30h-8L17 21v18H9Z" fill="white"/>
    </svg>
  )
}

function YeoshinLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#003087"/>
      <rect x="9" y="15" width="30" height="18" rx="3" stroke="white" strokeWidth="2.5" fill="none"/>
      <rect x="9" y="21" width="30" height="5" fill="white"/>
      <rect x="12" y="28" width="9" height="2.5" rx="1.2" fill="white" opacity="0.55"/>
    </svg>
  )
}

function HometaxLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#006AB4"/>
      <path d="M24 9L7 22h5v17h10v-9h4v9h10V22h5L24 9z" fill="white"/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════
//  타입 & 상수
// ═══════════════════════════════════════════════════════════

type PlatformId =
  | 'naver_place' | 'google' | 'baemin'
  | 'yogiyo' | 'coupangeats' | 'naver_search' | 'yeoshin' | 'hometax'

interface Platform {
  id: PlatformId
  name: string
  shortName: string
  logo: (size?: number) => JSX.Element
  category: '리뷰·검색' | '배달' | '금융·세무'
  connected: boolean
  rating: number | null
  reviews: number | null
  color: string
}

const INITIAL_PLATFORMS: Platform[] = [
  { id: 'naver_place',  name: '네이버 플레이스', shortName: '네이버',   logo: (s) => <NaverPlaceLogo size={s}/>,   category: '리뷰·검색', connected: false, rating: null, reviews: null, color: '#03C75A' },
  { id: 'google',       name: '구글 비즈니스',   shortName: '구글',     logo: (s) => <GoogleLogo size={s}/>,       category: '리뷰·검색', connected: false, rating: null, reviews: null, color: '#4285F4' },
  { id: 'baemin',       name: '배달의민족',        shortName: '배민',     logo: (s) => <BaeminLogo size={s}/>,       category: '배달',      connected: false, rating: null, reviews: null, color: '#2AC1BC' },
  { id: 'yogiyo',       name: '요기요',            shortName: '요기요',   logo: (s) => <YogiyoLogo size={s}/>,       category: '배달',      connected: false, rating: null, reviews: null, color: '#FA1A32' },
  { id: 'coupangeats',  name: '쿠팡이츠',          shortName: '쿠팡이츠', logo: (s) => <CoupangEatsLogo size={s}/>,  category: '배달',      connected: false, rating: null, reviews: null, color: '#FF5A00' },
  { id: 'yeoshin',      name: '여신금융',           shortName: '여신금융', logo: (s) => <YeoshinLogo size={s}/>,      category: '금융·세무', connected: false, rating: null, reviews: null, color: '#003087' },
  { id: 'hometax',      name: '홈택스',            shortName: '홈택스',   logo: (s) => <HometaxLogo size={s}/>,      category: '금융·세무', connected: false, rating: null, reviews: null, color: '#006AB4' },
]

interface KeywordRank {
  keyword: string
  rank: number
  prevRank: number | null
  area: string
  updatedAt: string
}

const MOCK_KEYWORDS: KeywordRank[] = [
  { keyword: '강남 맛집',     rank: 3,  prevRank: 5,   area: '강남구', updatedAt: '방금 전' },
  { keyword: '강남 한식당',   rank: 7,  prevRank: 7,   area: '강남구', updatedAt: '3분 전' },
  { keyword: '테헤란로 점심', rank: 12, prevRank: 15,  area: '강남구', updatedAt: '10분 전' },
  { keyword: '강남 회식장소', rank: 21, prevRank: 18,  area: '강남구', updatedAt: '18분 전' },
  { keyword: '강남 단체석',   rank: 34, prevRank: null, area: '강남구', updatedAt: '방금 전' },
]

const RECENT_REVIEWS = [
  { platform: '네이버',  name: '김**', rating: 5, text: '음식도 맛있고 직원분들도 친절해요. 주차도 편하고 재방문 의사 있습니다!', time: '2시간 전', replied: false, color: '#03C75A' },
  { platform: '구글',    name: 'J**',  rating: 4, text: 'Great food and cozy atmosphere. Service was excellent. Will definitely come back!', time: '5시간 전', replied: true,  color: '#4285F4' },
  { platform: '네이버',  name: '박**', rating: 5, text: '회식으로 왔는데 음식 양도 많고 맛도 좋았어요. 사장님도 친절하시고 너무 좋았습니다', time: '어제',     replied: false, color: '#03C75A' },
  { platform: '구글',    name: 'L**',  rating: 3, text: 'Food was okay but waiting time was a bit long. Interior is nice though.', time: '어제',     replied: false, color: '#4285F4' },
]

const LS_LINKS = 'localution.platform_links'
const LS_STORE = 'localution_store'

// ═══════════════════════════════════════════════════════════
//  별점 / 랭크 배지
// ═══════════════════════════════════════════════════════════
function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.round(rating)
  const cls = size === 'md' ? 'text-base' : 'text-xs'
  return (
    <span className={`${cls} text-[#F5A623] tracking-tight`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <span className={`${size === 'md' ? 'text-sm' : 'text-[11px]'} ml-1 text-[#4E5968] font-bold`}>{rating}</span>
    </span>
  )
}

function RankBadge({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null) return <span className="text-[10px] text-[#8B95A1] font-medium">신규</span>
  const diff = prev - current
  if (diff > 0) return <span className="text-[10px] text-[#12B76A] font-bold">▲{diff}</span>
  if (diff < 0) return <span className="text-[10px] text-[#F04452] font-bold">▼{Math.abs(diff)}</span>
  return <span className="text-[10px] text-[#8B95A1] font-bold">–</span>
}

// ═══════════════════════════════════════════════════════════
//  플랫폼 연동 모달 (범용)
// ═══════════════════════════════════════════════════════════
interface VerifyResult {
  ok: boolean
  msg: string
  placeId?: string
  name?: string
  address?: string
  category?: string
  phone?: string
  rating?: number | null
  reviewCount?: number
  url?: string
  source?: string
}

interface ConnectModalProps {
  platform: Platform
  onClose: () => void
  onSave: (id: PlatformId, data: VerifyResult & { input: string }) => void
}

function ConnectModal({ platform, onClose, onSave }: ConnectModalProps) {
  const [url, setUrl] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)

  const apiEndpoint = (() => {
    if (platform.id === 'naver_place') return '/api/platforms/naver'
    if (platform.id === 'google') return '/api/platforms/google'
    return '/api/platforms/delivery'
  })()

  const placeholder = (() => {
    if (platform.id === 'naver_place') return 'https://map.naver.com/p/entry/place/1234567890'
    if (platform.id === 'google') return 'https://www.google.com/maps/place/... 또는 Place ID (ChIJ...)'
    if (platform.id === 'baemin') return 'https://baemin.me/... 또는 배민 매장 URL'
    if (platform.id === 'yogiyo') return 'https://www.yogiyo.co.kr/mobile/#/123456'
    if (platform.id === 'coupangeats') return 'https://www.coupangeats.com/restaurants/...'
    return '매장 URL'
  })()

  const verify = async () => {
    if (!url.trim()) return
    setVerifying(true)
    setResult(null)
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          input: url,
          platform: platform.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, msg: data.error || '검증 실패' })
      } else {
        // 플랫폼별 필드 정규화
        const placeId =
          data.placeId ||
          data.googlePlaceId ||
          data.naverPlaceId ||
          data.externalId ||
          ''
        const ratingNum =
          typeof data.rating === 'number' ? data.rating : data.rating ? Number(data.rating) : null
        const reviewCountNum =
          typeof data.reviewCount === 'number'
            ? data.reviewCount
            : data.reviewCount
              ? Number(data.reviewCount)
              : 0

        const label = data.name
          ? `${data.name}${ratingNum ? ` · ★${ratingNum}` : ''}${reviewCountNum ? ` · 리뷰 ${reviewCountNum}` : ''}`
          : placeId || '연동 가능'

        setResult({
          ok: true,
          msg: label,
          placeId,
          name: data.name,
          address: data.address,
          category: data.category,
          phone: data.phone,
          rating: ratingNum,
          reviewCount: reviewCountNum,
          url: data.url,
          source: data.source,
        })
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e.message || '서버 오류' })
    } finally {
      setVerifying(false)
    }
  }

  const save = () => {
    if (!result?.ok) return
    onSave(platform.id, { ...result, input: url })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          {platform.logo(40)}
          <div>
            <h3 className="text-lg font-black text-[#191F28]">{platform.name} 연동</h3>
            <p className="text-xs text-[#8B95A1]">매장 URL 또는 ID를 입력하세요</p>
          </div>
        </div>

        <label className="block text-xs font-bold text-[#4E5968] mb-1.5">매장 URL</label>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-sm focus:border-[#3182F6] focus:outline-none mb-3"
        />

        <button
          onClick={verify}
          disabled={verifying || !url.trim()}
          className="w-full bg-[#F2F4F6] text-[#3182F6] py-2.5 rounded-xl text-sm font-bold hover:bg-[#E8F4FD] transition-colors disabled:opacity-50 mb-3"
        >
          {verifying ? '검증 중...' : '연동 확인'}
        </button>

        {result && (
          <div className={[
            'text-xs p-3 rounded-xl mb-3',
            result.ok ? 'bg-[#E8FFF0] text-[#12B76A]' : 'bg-[#FFF0F0] text-[#F04452]',
          ].join(' ')}>
            {result.ok ? '✓ ' : '✗ '}{result.msg}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-[#E5E8EB] text-[#4E5968] py-2.5 rounded-xl text-sm font-bold hover:bg-[#F8F9FA]"
          >
            취소
          </button>
          <button
            onClick={save}
            disabled={!result?.ok}
            className="flex-1 bg-[#3182F6] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-40"
          >
            연동 저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  AI 답글 생성 모달
// ═══════════════════════════════════════════════════════════
interface ReplyModalProps {
  review: typeof RECENT_REVIEWS[number]
  onClose: () => void
}

function AIReplyModal({ review, onClose }: ReplyModalProps) {
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState('')

  const generate = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let storeCtx: any = {}
      try {
        const raw = localStorage.getItem(LS_STORE)
        if (raw) storeCtx = JSON.parse(raw)
      } catch {}

      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: review.text,
          platform: review.platform,
          bizType: storeCtx.bizType || '',
          storeName: storeCtx.name || '',
          region: storeCtx.region || (storeCtx.address ? storeCtx.address.split(' ').slice(0, 2).join(' ') : ''),
          mainKeyword: storeCtx.mainKeyword || '',
          subKeywords: storeCtx.subKeywords || '',
          storeDesc: storeCtx.desc || '',
          aiSettings: {
            tone: 'friendly',
            length: 'medium',
            includes: { thanks: true, revisit: true, mention: true, personalize: false, improve: true, keyword: true },
            closing: '',
            excludes: '',
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'AI 답변 생성 실패')
      } else {
        setReply(data.reply || '')
      }
    } catch (e: any) {
      setError(e.message || '서버 오류')
    } finally {
      setLoading(false)
    }
  }, [review])

  useEffect(() => { generate() }, [generate])

  const post = () => {
    // 실제 플랫폼 API 연동 전 — 목업 성공
    setPosted(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-[#191F28]">AI 답글 생성</h3>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28] text-xl">×</button>
        </div>

        {/* 원본 리뷰 */}
        <div className="bg-[#F8F9FA] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-black text-white px-2 py-0.5 rounded-full"
              style={{ background: review.color }}
            >
              {review.platform}
            </span>
            <span className="text-xs font-bold text-[#4E5968]">{review.name}</span>
            <Stars rating={review.rating} />
            <span className="text-[10px] text-[#8B95A1]">{review.time}</span>
          </div>
          <p className="text-sm text-[#191F28]">{review.text}</p>
        </div>

        {/* AI 답변 */}
        <label className="block text-xs font-bold text-[#4E5968] mb-1.5">AI 추천 답변 (수정 가능)</label>
        {loading ? (
          <div className="bg-[#FAFBFF] rounded-xl p-6 text-center text-sm text-[#8B95A1]">
            AI가 SEO 최적화된 답변을 생성 중입니다...
          </div>
        ) : error ? (
          <div className="bg-[#FFF0F0] text-[#F04452] rounded-xl p-4 text-sm">{error}</div>
        ) : (
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-sm focus:border-[#3182F6] focus:outline-none resize-none"
          />
        )}

        {posted && (
          <div className="bg-[#E8FFF0] text-[#12B76A] rounded-xl p-3 text-sm font-bold text-center mt-3">
            ✓ 답글이 게시되었습니다
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={generate}
            disabled={loading}
            className="flex-1 border border-[#E5E8EB] text-[#4E5968] py-2.5 rounded-xl text-sm font-bold hover:bg-[#F8F9FA] disabled:opacity-50"
          >
            다시 생성
          </button>
          <button
            onClick={post}
            disabled={loading || !reply.trim() || posted}
            className="flex-1 bg-[#3182F6] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-40"
          >
            {posted ? '게시 완료' : '답변 게시하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  메인 대시보드
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  롤링 공지 배너 (5초 자동 전환)
// ═══════════════════════════════════════════════════════════
const BANNER_SLIDES = [
  {
    title: 'AI가 대신 답변하는 시대',
    sub: '리뷰 답글, 이제 AI에게 맡기세요',
    desc: '네이버 · 구글 · 배민 · 요기요 통합 AI 리뷰 자동 답글',
    bg: 'linear-gradient(135deg, #1e3a5f 0%, #3182F6 100%)',
    emoji: '🤖',
    link: '/review-admin',
  },
  {
    title: 'QR 스캔 한 번으로',
    sub: '고객이 직접 리뷰를 쓰는 시대',
    desc: 'QR 코드 스캔 → AI 리뷰 생성 → 플랫폼 자동 등록',
    bg: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    emoji: '📱',
    link: '/qr-admin',
  },
  {
    title: '매출과 고객을 한 눈에',
    sub: '대시보드 하나로 끝',
    desc: '매출 캘린더 · 고객 CRM · 정산 자동화 모두 통합',
    bg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    emoji: '📊',
    link: '/dashboard',
  },
  {
    title: '소상공인 경영안정자금',
    sub: '최대 2천만원 · 연 1.5%',
    desc: '지금 사장님 매출이면 신청 가능합니다',
    bg: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
    emoji: '💰',
    link: 'https://ols.semas.or.kr',
  },
  {
    title: '플레이스 상위 노출 비법',
    sub: '키워드 + 리뷰 + 답글률 = 상위 노출',
    desc: '로컬루션 AI가 키워드 분석부터 리뷰 답글까지 자동화',
    bg: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    emoji: '🚀',
    link: '/marketing',
  },
]


// ═══════════════════════════════════════════════════════════
//  인기 서비스 TOP 10 (순위 애니메이션)
// ═══════════════════════════════════════════════════════════
const SERVICE_RANKING_INIT = [
  { id: 1,  name: 'AI 리뷰 자동 답글',  category: '리뷰', badge: 'HOT',  color: '#F04452' },
  { id: 2,  name: '네이버 플레이스 관리', category: '플레이스', badge: '',     color: '#03C75A' },
  { id: 3,  name: 'QR 리뷰 자동화',         category: 'QR',     badge: 'NEW',  color: '#7C3AED' },
  { id: 4,  name: '매출 캘린더 · 정산',     category: '정산', badge: '',     color: '#3182F6' },
  { id: 5,  name: '고객 CRM 관리',              category: 'CRM',    badge: '',     color: '#F59E0B' },
  { id: 6,  name: '키워드 순위 추적',          category: 'SEO',    badge: '',     color: '#10B981' },
  { id: 7,  name: '숫폼 퍼블리셔',           category: '마케팅', badge: '',     color: '#EC4899' },
  { id: 8,  name: '배민 리뷰 연동',            category: '배달', badge: '',     color: '#2AC1BC' },
  { id: 9,  name: '구글 리뷰 연동',            category: '구글', badge: '',     color: '#4285F4' },
  { id: 10, name: '세금계산서 자동 발행',      category: '행정', badge: '',     color: '#6B7280' },
]

function ServiceRanking() {
  const [items, setItems] = useState(SERVICE_RANKING_INIT.map((s, i) => ({ ...s, rank: i + 1, prevRank: i + 1, score: 100 - i * 8 })))
  const [isShuffling, setIsShuffling] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsShuffling(true)
      setTimeout(() => {
        setItems(prev => {
          const arr = [...prev]
          // 2~3개 항목의 순위를 랜덤 교환
          const swapCount = 2 + Math.floor(Math.random() * 2)
          for (let s = 0; s < swapCount; s++) {
            const a = Math.floor(Math.random() * arr.length)
            let b = Math.floor(Math.random() * arr.length)
            while (b === a) b = Math.floor(Math.random() * arr.length)
            // 점수 살짝 변동
            arr[a].score += Math.floor(Math.random() * 10) - 4
            arr[b].score += Math.floor(Math.random() * 10) - 4
          }
          // 점수순 재정렬
          arr.sort((a, b) => b.score - a.score)
          arr.forEach((item, i) => {
            item.prevRank = item.rank
            item.rank = i + 1
          })
          return arr
        })
        setIsShuffling(false)
      }, 300)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#191F28]">인기 서비스 TOP 10</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F04452] animate-pulse inline-block"/>
          </div>
          <p className="text-[10px] text-[#8B95A1] mt-0.5">실시간 사용량 기준</p>
        </div>
        <span className="text-[10px] text-[#8B95A1] bg-[#F2F4F6] px-2 py-1 rounded-full">5초마다 갱신</span>
      </div>
      <div className="flex-1">
        {items.map((item) => {
          const diff = item.prevRank - item.rank
          return (
            <div
              key={item.id}
              className="px-5 py-3 flex items-center gap-3 border-b border-[#F8F9FA] hover:bg-[#FAFBFF] transition-all duration-500"
              style={{
                transform: isShuffling ? 'translateX(4px)' : 'translateX(0)',
                opacity: isShuffling ? 0.7 : 1,
                transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              <div className={'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ' + (item.rank <= 3 ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#8B95A1]')}>
                {item.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#191F28] truncate">{item.name}</span>
                  {item.badge && (
                    <span className={'text-[9px] px-1.5 py-0.5 rounded-full font-bold ' + (item.badge === 'HOT' ? 'bg-[#FFF0F0] text-[#F04452]' : 'bg-[#EFF6FF] text-[#3182F6]')}>{item.badge}</span>
                  )}
                </div>
                <span className="text-[10px] text-[#8B95A1]">{item.category}</span>
              </div>
              <div className="flex-shrink-0 w-12 text-right">
                {diff > 0 && <span className="text-[11px] font-bold text-[#12B76A]">▲{diff}</span>}
                {diff < 0 && <span className="text-[11px] font-bold text-[#F04452]">▼{Math.abs(diff)}</span>}
                {diff === 0 && <span className="text-[11px] text-[#8B95A1]">—</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}





function NoticeBanner() {
  const [idx, setIdx] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState(1) // 1=right, -1=left
  const touchStart = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideDir(1)
      setIsAnimating(true)
      setTimeout(() => {
        setIdx(prev => (prev + 1) % BANNER_SLIDES.length)
        setIsAnimating(false)
      }, 400)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const goTo = (i: number) => {
    if (i === idx) return
    setSlideDir(i > idx ? 1 : -1)
    setIsAnimating(true)
    setTimeout(() => { setIdx(i); setIsAnimating(false) }, 400)
  }

  const s = BANNER_SLIDES[idx]
  const isExternal = s.link.startsWith('http')

  return (
    <div className="mb-5 relative">
      <div
        className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg relative"
        style={{ background: s.bg, minHeight: 160 }}
        onClick={() => isExternal ? window.open(s.link, '_blank') : (window.location.href = s.link)}
        onTouchStart={(e) => { touchStart.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - touchStart.current
          if (Math.abs(diff) > 50) {
            goTo(diff > 0 ? (idx - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length : (idx + 1) % BANNER_SLIDES.length)
          }
        }}
      >
        <div
          className="px-8 py-7 flex items-center justify-between"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? 'translateX(' + (slideDir * 30) + 'px)' : 'translateX(0)',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs font-semibold mb-1 tracking-wide uppercase">{s.sub}</p>
            <h2 className="text-2xl font-black text-white mb-2 leading-tight">{s.title}</h2>
            <p className="text-sm text-white/80">{s.desc}</p>
          </div>
          <span className="text-6xl ml-6 flex-shrink-0 drop-shadow-lg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>{s.emoji}</span>
        </div>

        {/* 도트 인디케이터 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {BANNER_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i) }}
              className="transition-all duration-300"
              style={{
                width: i === idx ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === idx ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>

        {/* 좌우 화살표 */}
        <button
          onClick={(e) => { e.stopPropagation(); goTo((idx - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length) }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white text-sm transition-colors"
        >
          &#8249;
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); goTo((idx + 1) % BANNER_SLIDES.length) }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white text-sm transition-colors"
        >
          &#8250;
        </button>

        {/* 슬라이드 카운터 */}
        <div className="absolute top-4 right-4 bg-black/30 text-white text-[10px] px-2.5 py-1 rounded-full font-semibold">
          {idx + 1} / {BANNER_SLIDES.length}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  
  // 로그인 상태 체크
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  useEffect(() => {
    const cookies = document.cookie
    if (cookies.indexOf('localution_session=') !== -1) {
      setIsLoggedIn(true)
    }
  }, [])

  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS)
  const [keywords, setKeywords] = useState<KeywordRank[]>(MOCK_KEYWORDS)
  const [lastSync, setLastSync] = useState('방금 전')
  const [isSyncing, setIsSyncing] = useState(false)
  const [mainKeyword] = useState('강남 맛집')

  // 모달 상태
  const [connectPlatform, setConnectPlatform] = useState<Platform | null>(null)
  const [replyReview, setReplyReview] = useState<typeof RECENT_REVIEWS[number] | null>(null)

  // localStorage에서 연동 상태 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LINKS)
      if (raw) {
        const links = JSON.parse(raw) as Record<string, any>
        setPlatforms(prev => prev.map(p => {
          const linked = links[p.id]
          if (linked) {
            return {
              ...p,
              connected: true,
              rating: linked.rating ?? p.rating ?? null,
              reviews: linked.reviews ?? p.reviews ?? 0,
            }
          }
          return p
        }))
      }
    } catch {}
  }, [])

  const connectedCount = platforms.filter(p => p.connected).length
  const totalReviews   = platforms.reduce((s, p) => s + (p.reviews ?? 0), 0)
  const avgRating = (() => {
    const rated = platforms.filter(p => p.rating !== null)
    if (!rated.length) return 0
    return +(rated.reduce((s, p) => s + p.rating!, 0) / rated.length).toFixed(1)
  })()

  const handlePlatformClick = (p: Platform) => {
    if (!isLoggedIn) {
      if (confirm('로그인 후 플랫폼을 연동할 수 있습니다.\n로그인 페이지로 이동하시겠습니까?')) {
        window.location.href = '/login'
      }
      return
    }
    if (p.id === 'naver_search' || p.id === 'yeoshin' || p.id === 'hometax') {
      alert(`${p.name} 연동은 /settings 페이지에서 설정하세요.`)
      return
    }
    setConnectPlatform(p)
  }

  const handleSaveConnection = (
    id: PlatformId,
    data: VerifyResult & { input: string },
  ) => {
    try {
      const raw = localStorage.getItem(LS_LINKS)
      const links = raw ? JSON.parse(raw) : {}
      links[id] = {
        input: data.input,
        placeId: data.placeId,
        name: data.name,
        address: data.address,
        category: data.category,
        phone: data.phone,
        rating: data.rating ?? null,
        reviews: data.reviewCount ?? 0,
        url: data.url,
        source: data.source,
        linkedAt: new Date().toISOString(),
      }
      localStorage.setItem(LS_LINKS, JSON.stringify(links))
    } catch {}

    setPlatforms(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              connected: true,
              rating: data.rating ?? p.rating ?? null,
              reviews: data.reviewCount ?? p.reviews ?? 0,
            }
          : p,
      ),
    )
  }

  const refreshKeywords = useCallback(async () => {
    setIsSyncing(true)
    try {
      await new Promise(r => setTimeout(r, 800))
      setKeywords(prev => prev.map(k => ({
        ...k,
        prevRank: k.rank,
        rank: Math.max(1, k.rank + Math.floor(Math.random() * 3) - 1),
        updatedAt: '방금 전',
      })))
      setLastSync('방금 전')
    } finally {
      setIsSyncing(false)
    }
  }, [mainKeyword])

  useEffect(() => {
    const id = setInterval(refreshKeywords, 600_000)
    return () => clearInterval(id)
  }, [refreshKeywords])

  // 24시간 방문자
  const hourlyVisitors = [
    { h: '9시', v: 12 }, { h: '10시', v: 24 }, { h: '11시', v: 48 },
    { h: '12시', v: 92 }, { h: '13시', v: 76 }, { h: '14시', v: 41 },
    { h: '15시', v: 35 }, { h: '16시', v: 44 }, { h: '17시', v: 63 },
    { h: '18시', v: 88 }, { h: '19시', v: 104 }, { h: '20시', v: 72 },
  ]
  const maxVisitor = Math.max(...hourlyVisitors.map(x => x.v))

  // 리뷰 감정 분석 (RECENT_REVIEWS 기반 실시간 계산, 별점 기준)
  const sentimentCount = {
    positive: RECENT_REVIEWS.filter(r => r.rating >= 4).length,
    neutral:  RECENT_REVIEWS.filter(r => r.rating === 3).length,
    negative: RECENT_REVIEWS.filter(r => r.rating <= 2).length,
  }
  const sentimentTotal = RECENT_REVIEWS.length || 1
  const sentiment = {
    positive: Math.round(sentimentCount.positive / sentimentTotal * 100),
    neutral:  Math.round(sentimentCount.neutral  / sentimentTotal * 100),
    negative: Math.round(sentimentCount.negative / sentimentTotal * 100),
  }

  // VIP 고객
  const vipCustomers = [
    { name: '김정수', visits: 14, spent: '82만원', last: '3일 전', tag: 'VIP' },
    { name: '이수연', visits: 11, spent: '67만원', last: '1주 전', tag: 'VIP' },
    { name: '박민준', visits: 9,  spent: '55만원', last: '2일 전', tag: '단골' },
    { name: '최유진', visits: 8,  spent: '48만원', last: '5일 전', tag: '단골' },
    { name: '정하늘', visits: 7,  spent: '42만원', last: '1주 전', tag: '단골' },
  ]

  // 이번 주 매출
  const weekSales = [
    { d: '월', v: 142 }, { d: '화', v: 168 }, { d: '수', v: 195 },
    { d: '목', v: 178 }, { d: '금', v: 247 }, { d: '토', v: 312 }, { d: '일', v: 228 },
  ]
  const maxSale = Math.max(...weekSales.map(x => x.v))
  const totalWeekSale = weekSales.reduce((s, x) => s + x.v, 0)

  // 오늘의 할 일
  const unansweredCount = RECENT_REVIEWS.filter(r => !r.replied).length
  const negativeUnansweredReviews = RECENT_REVIEWS.filter(r => r.rating <= 2 && !r.replied)
  const negativeUnansweredCount = negativeUnansweredReviews.length

  // 탭바/사이드바와 미답변 개수 공유
  useEffect(() => {
    try {
      localStorage.setItem('localution.unanswered_count', String(unansweredCount))
      window.dispatchEvent(new CustomEvent('localution:unanswered-change'))
    } catch {}
  }, [unansweredCount])
  const todoList = [
    { title: '미답변 리뷰',    count: unansweredCount, unit: '건', color: '#F04452', bg: '#FFF0F0', link: '/reviews' },
    { title: '재방문 유도',    count: 5,  unit: '명', color: '#F59E0B', bg: '#FFF7E8', link: '/crm' },
    { title: '오늘 예약',      count: 7,  unit: '건', color: '#3182F6', bg: '#E8F4FD', link: '/reservations' },
    { title: '세금계산서 발행', count: 2,  unit: '건', color: '#12B76A', bg: '#E8FFF0', link: '/settlement' },
  ]

  // 경쟁사 비교
  const compareData = [
    { label: '평균 별점',  me: avgRating || 4.6,        area: 4.2, unit: '점' },
    { label: '월 리뷰 수', me: totalReviews || 142,     area: 87,  unit: '건' },
    { label: '답글률',    me: 94,                       area: 61,  unit: '%' },
  ]

  const stats = [
    { label: '이번 달 방문자', value: '2,847',                      sub: '전달 대비 +12.4%', up: true, color: '#3182F6', ring: '#E8F4FD' },
    { label: '총 리뷰 수',     value: (totalReviews || 142) + '건', sub: '이번 주 +34건',    up: true, color: '#03C75A', ring: '#E8FFF0' },
    { label: '평균 별점',      value: (avgRating || 4.6) + '점',    sub: '지역 평균 4.2',    up: true, color: '#F5A623', ring: '#FFF7E8' },
    { label: '키워드 상위',    value: '3개',                        sub: '신규 진입 +1',     up: true, color: '#9B5CFB', ring: '#F3ECFF' },
    { label: '이번 주 매출',   value: totalWeekSale + '만원',       sub: '지난주 대비 +18%', up: true, color: '#F04452', ring: '#FFF0F0' },
    { label: '단골 고객',      value: '38명',                       sub: '이번 달 +6명',     up: true, color: '#12B76A', ring: '#E8FFF0' },
  ]

  const totalTodo = todoList.reduce((s, t) => s + t.count, 0)
  const today = new Date()
  const dayNames = ['일','월','화','수','목','금','토']
  const dateStr = today.getFullYear() + '년 ' + (today.getMonth() + 1) + '월 ' + today.getDate() + '일 ' + dayNames[today.getDay()] + '요일'

                return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] p-4 pt-20 md:p-6 md:pt-6 min-w-0">

        {/* ── 상단 롤링 공지 배너 ── */}
        <NoticeBanner />

        {/* ── 🚨 부정 리뷰 긴급 알림 (미답변 1★~2★ 있을 때만) ── */}
        {isLoggedIn && negativeUnansweredCount > 0 && (
          <div className="relative overflow-hidden rounded-2xl shadow-sm mb-5 p-5 border-2 border-[#F04452]"
            style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE4E4 100%)' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F04452] flex items-center justify-center text-white text-lg shrink-0 animate-pulse">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F04452] text-white">긴급</span>
                    <h3 className="text-sm md:text-base font-black text-[#7F1D1D]">
                      답변이 시급한 부정 리뷰 {negativeUnansweredCount}건
                    </h3>
                  </div>
                  <p className="text-xs text-[#991B1B] leading-relaxed">
                    낮은 별점 리뷰는 첫 24시간 안에 답글을 남기면 고객 신뢰가 회복될 확률이 3배 높아져요.
                  </p>
                </div>
              </div>
              <Link href="/reviews?filter=negative-unanswered"
                className="px-4 py-2.5 rounded-xl bg-[#F04452] text-white text-sm font-bold hover:bg-[#DC2626] transition-all text-center whitespace-nowrap shrink-0">
                지금 답변하기 →
              </Link>
            </div>
          </div>
        )}

        {/* ── 신규 사용자 온보딩 (연결 0개일 때만) ── */}
        {isLoggedIn && connectedCount === 0 && (
          <div id="start-onboarding-card" className="relative overflow-hidden rounded-2xl shadow-sm mb-5 p-5 md:p-6"
            style={{ background: 'linear-gradient(135deg, #3182F6 0%, #1B64DA 100%)' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">👋 시작하기</span>
                  <span className="text-[10px] text-white/70">3분이면 충분해요</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black mb-1.5 leading-tight">처음이세요? 여기서부터 시작하세요</h2>
                <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                  우리 가게 정보를 등록하고 네이버·구글·배민·요기요 같은 플랫폼을 연결하면
                  <br className="hidden md:block"/>
                  리뷰·예약·매출 데이터가 한 곳에 모입니다.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link href="/settings/connect"
                  className="px-4 py-2.5 rounded-xl bg-white text-[#1B64DA] text-sm font-bold hover:bg-[#F2F4F6] transition-all text-center whitespace-nowrap">
                  🚀 1단계: 플랫폼 연결
                </Link>
                <Link href="/settings"
                  className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur text-white text-sm font-bold hover:bg-white/20 transition-all text-center whitespace-nowrap border border-white/20">
                  가게 정보 입력
                </Link>
              </div>
            </div>
            {/* 장식 */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none"/>
            <div className="absolute -bottom-4 -right-12 w-24 h-24 rounded-full bg-white/5 pointer-events-none"/>
          </div>
        )}

        {/* ── 오늘 처리할 작업 (오늘의 할 일 통합) ── */}
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 mb-5">
          <div className="mb-4">
            <p className="text-[11px] text-[#3182F6] font-bold mb-1">로컬루션 대시보드</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-black text-[#191F28]">오늘 처리할 작업</h1>
                  {connectedCount === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">데모</span>
                  )}
                </div>
                <p className="text-xs text-[#8B95A1]">
                  {connectedCount === 0
                    ? '샘플 데이터입니다. 플랫폼을 연결하면 실시간으로 표시됩니다'
                    : new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' }) + ' · 우선순위가 높은 작업 순으로 표시됩니다'
                  }
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${connectedCount === 0 ? 'bg-[#F59E0B]' : 'bg-[#12B76A] animate-pulse'}`}/>
                <span className="text-[10px] text-[#8B95A1] font-medium">{connectedCount === 0 ? '데모 데이터' : '실시간 업데이트'}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Link href="/reviews" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#F04452]"/>
                <span className="text-xs text-[#8B95A1] font-medium">미답변 리뷰</span>
              </div>
              <span className="text-2xl font-black text-[#F04452] mb-1">3<span className="text-sm font-bold text-[#8B95A1]">건</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </Link>
            <Link href="/crm" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#F59E0B]"/>
                <span className="text-xs text-[#8B95A1] font-medium">재방문 유도</span>
              </div>
              <span className="text-2xl font-black text-[#F59E0B] mb-1">5<span className="text-sm font-bold text-[#8B95A1]">명</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </Link>
            <Link href="/reservations" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#3182F6]"/>
                <span className="text-xs text-[#8B95A1] font-medium">오늘 예약</span>
              </div>
              <span className="text-2xl font-black text-[#3182F6] mb-1">7<span className="text-sm font-bold text-[#8B95A1]">건</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </Link>
            <Link href="/settlement" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#12B76A]"/>
                <span className="text-xs text-[#8B95A1] font-medium">세금계산서 발행</span>
              </div>
              <span className="text-2xl font-black text-[#12B76A] mb-1">2<span className="text-sm font-bold text-[#8B95A1]">건</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </Link>
          </div>
        </div>

        {/* ── 플랫폼 연동 현황 바 ── */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#191F28]">플랫폼 연동 현황</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F4FD] text-[#3182F6] font-semibold">
                {connectedCount}/{platforms.length} 연동됨
              </span>
            </div>
            <a href={isLoggedIn ? "/settings" : "/login"} className="text-[11px] text-[#3182F6] font-semibold hover:underline flex items-center gap-1">
              {isLoggedIn ? '연동 관리 →' : '로그인 후 연동 가능'}
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-8 gap-2">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => handlePlatformClick(p)}
                className={[
                  'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all cursor-pointer',
                  p.connected
                    ? 'bg-white border border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md'
                    : 'bg-[#F8F9FA] border border-dashed border-[#E0E0E0] hover:border-[#3182F6] hover:bg-white',
                ].join(' ')}
                title={p.connected ? '클릭하여 연동 정보 수정' : '클릭하여 연동하기'}
              >
                {p.logo(32)}
                <span className="text-[10px] font-semibold text-[#4E5968] text-center leading-tight">{p.shortName}</span>
                <span className={[
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  p.connected ? 'bg-[#E8FFF0] text-[#12B76A]' : 'bg-[#F2F4F6] text-[#8B95A1]',
                ].join(' ')}>
                  {p.connected ? '연동됨' : '연동하기'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 통계 카드 4개 ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="text-xs text-[#8B95A1] font-medium mb-0.5">{s.label}</p>
                <p className="text-xl font-black text-[#191F28]">{s.value}</p>
                <p className={`text-[11px] font-bold mt-0.5 ${s.up ? 'text-[#12B76A]' : 'text-[#F04452]'}`}>
                  {s.up ? '↑' : '↓'} {s.change} <span className="text-[#8B95A1] font-normal">전달 대비</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 메인 2컬럼 ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px_300px] gap-4 mb-5">

          {/* 좌: 연동 플랫폼 별점·리뷰 현황 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
              <span className="text-sm font-bold text-[#191F28]">플랫폼별 별점 · 리뷰 현황</span>
              <span className="text-[11px] text-[#8B95A1]">연동된 플랫폼만 표시</span>
            </div>
            <div className="p-5 space-y-4">
              {platforms.filter(p => p.connected).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#8B95A1] mb-3">아직 연동된 플랫폼이 없습니다</p>
                  <p className="text-xs text-[#8B95A1]">상단 로고를 클릭해 연동을 시작하세요</p>
                </div>
              ) : (
                platforms.filter(p => p.connected).map(p => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0">{p.logo(36)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[#191F28]">{p.name}</span>
                        {p.rating !== null ? (
                          <div className="flex items-center gap-3">
                            <Stars rating={p.rating} />
                            <span className="text-xs text-[#8B95A1]">리뷰 <strong className="text-[#191F28]">{p.reviews}건</strong></span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8B95A1]">데이터 수집 중...</span>
                        )}
                      </div>
                      {p.rating !== null && (
                        <div className="w-full bg-[#F2F4F6] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(p.rating / 5) * 100}%`, background: p.color }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {platforms.filter(p => !p.connected).length > 0 && (
                <div className="mt-4 p-4 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E0E0E0]">
                  <p className="text-xs text-[#8B95A1] mb-2 font-medium">미연동 플랫폼 — 클릭하여 바로 연동</p>
                  <div className="flex flex-wrap gap-2">
                    {platforms.filter(p => !p.connected).map(p => (
                      <button
                        key={p.id}
                        onClick={() => handlePlatformClick(p)}
                        className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-[#E5E8EB] hover:border-[#3182F6] transition-colors"
                      >
                        {p.logo(18)}
                        <span className="text-[11px] text-[#4E5968] font-semibold">{p.shortName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 우: 주요 키워드 실시간 순위 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-[#191F28]">주요 키워드 순위</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse inline-block"/>
                  <span className="text-[10px] text-[#8B95A1]">실시간 · {lastSync}</span>
                </div>
              </div>
              <button
                onClick={refreshKeywords}
                disabled={isSyncing}
                className="text-[11px] text-[#3182F6] font-semibold border border-[#3182F6] px-2.5 py-1 rounded-lg hover:bg-[#E8F4FD] transition-colors disabled:opacity-50"
              >
                {isSyncing ? '갱신 중...' : '새로고침'}
              </button>
            </div>

            <div className="flex-1 divide-y divide-[#F2F4F6]">
              {keywords.map((kw) => (
                <div key={kw.keyword} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#FAFBFF] transition-colors">
                  <div className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0',
                    kw.rank <= 3  ? 'bg-[#3182F6] text-white'
                    : kw.rank <= 10 ? 'bg-[#E8F4FD] text-[#3182F6]'
                    : 'bg-[#F2F4F6] text-[#8B95A1]',
                  ].join(' ')}>
                    {kw.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#191F28] truncate">{kw.keyword}</p>
                    <p className="text-[10px] text-[#8B95A1]">{kw.area} · {kw.updatedAt}</p>
                  </div>
                  <RankBadge current={kw.rank} prev={kw.prevRank} />
                </div>
              ))}
            </div>

          {/* 인기 서비스 랭킹 */}
          <ServiceRanking />



          </div>
        </div>

        {/* ── 최근 리뷰 ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#191F28]">최근 리뷰</span>
              <span className="text-[11px] text-[#8B95A1]">미답변 {RECENT_REVIEWS.filter(r => !r.replied).length}건</span>
              <span className="flex items-center gap-1 ml-2">
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[10px] font-bold text-[#059669]" title={`긍정 ${sentimentCount.positive}건`}>
                  😊 {sentiment.positive}%
                </span>
                {sentimentCount.neutral > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[10px] font-bold text-[#4E5968]" title={`중립 ${sentimentCount.neutral}건`}>
                    😐 {sentiment.neutral}%
                  </span>
                )}
                {sentimentCount.negative > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[10px] font-bold text-[#DC2626]" title={`부정 ${sentimentCount.negative}건`}>
                    😟 {sentiment.negative}%
                  </span>
                )}
              </span>
            </div>
            <Link href="/reviews" className="text-[11px] text-[#3182F6] font-semibold hover:underline">전체보기 →</Link>
          </div>
          <div className="divide-y divide-[#F2F4F6]">
            {RECENT_REVIEWS.map((r, i) => (
              <div key={i} className="px-5 py-4 hover:bg-[#FAFBFF] transition-colors flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white mt-0.5"
                  style={{ background: r.color }}
                >
                  {r.platform.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#4E5968]">{r.name}</span>
                    <Stars rating={r.rating} />
                    <span className="text-[10px] text-[#8B95A1]">{r.time}</span>
                    {r.replied && (
                      <span className="text-[10px] bg-[#E8FFF0] text-[#12B76A] px-1.5 py-0.5 rounded-full font-semibold">답변완료</span>
                    )}
                  </div>
                  <p className="text-sm text-[#4E5968] line-clamp-1">{r.text}</p>
                </div>
                {!r.replied && (
                  <button
                    onClick={() => setReplyReview(r)}
                    className="flex-shrink-0 ml-4 text-xs bg-[#3182F6] text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-[#1B64DA] transition-colors"
                  >
                    AI 답글
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* 모달들 */}
      {connectPlatform && (
        <ConnectModal
          platform={connectPlatform}
          onClose={() => setConnectPlatform(null)}
          onSave={handleSaveConnection}
        />
      )}
      {replyReview && (
        <AIReplyModal
          review={replyReview}
          onClose={() => setReplyReview(null)}
        />
      )}
    </div>
  )
}