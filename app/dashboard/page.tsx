'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
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
const NOTICES = [
  {
    icon: '💰',
    title: '소상공인 경영안정자금',
    desc: '지금 사장님 매출이면 신청 가능합니다',
    detail: '최대 2천만원 · 연 1.5% 고정금리 · 담보 불필요',
    deadline: '5월 31일 마감',
    url: 'https://ols.semas.or.kr/ols/man/SMAN010M/page.do',
    bg: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  },
  {
    icon: '🖥️',
    title: '소상공인 디지털 전환 지원',
    desc: '스마트 매장 구축 비용 최대 400만원 지원',
    detail: '키오스크·POS·예약시스템 도입 지원',
    deadline: '6월 15일 마감',
    url: 'https://www.semas.or.kr',
    bg: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
  },
  {
    icon: '📊',
    title: '2026년 매출세액 공제 안내',
    desc: '연매출 8천만원 이하 개인사업자 세액공제 확대',
    detail: '부가세 간이과세 기준 상향 · 최대 20% 공제',
    deadline: '연중 상시',
    url: 'https://www.hometax.go.kr',
    bg: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
  },
  {
    icon: '👥',
    title: '고용보험료 80% 지원',
    desc: '5인 미만 사업장 사장님, 고용보험료 돌려받으세요',
    detail: '월 최대 4만원 환급 · 근로자도 동시 지원',
    deadline: '상시 접수',
    url: 'https://www.ei.go.kr',
    bg: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
  },
  {
    icon: '⚡',
    title: '에너지 절감 설비 지원사업',
    desc: '냉난방·조명 교체 비용 최대 70% 지원',
    detail: 'LED 조명, 고효율 에어컨 등 · 최대 500만원',
    deadline: '7월 31일 마감',
    url: 'https://www.semas.or.kr',
    bg: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  },
]

function NoticeBanner() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx(prev => (prev + 1) % NOTICES.length)
        setFade(true)
      }, 300)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const n = NOTICES[idx]
  return (
    <div
      className="rounded-2xl shadow-sm px-5 py-4 mb-5 relative overflow-hidden cursor-pointer transition-all hover:shadow-md"
      style={{ background: n.bg }}
      onClick={() => window.open(n.url, '_blank')}
    >
      <div className="flex items-center justify-between" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0">{n.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-white">{n.title}</span>
              <span className="text-[10px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">{n.deadline}</span>
            </div>
            <p className="text-xs text-white/80">{n.desc}</p>
            <p className="text-[11px] text-white/60 mt-0.5">{n.detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <div className="flex gap-1">
            {NOTICES.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === idx ? 'white' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
          <span className="text-xs text-white font-semibold bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors">자세히 보기 →</span>
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

  // 리뷰 감정 분석
  const sentiment = { positive: 78, neutral: 14, negative: 8 }

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
  const dayNames = ['일','월','화','수','목','금','토']
  const dateStr = today.getFullYear() + '년 ' + (today.getMonth() + 1) + '월 ' + today.getDate() + '일 ' + dayNames[today.getDay()] + '요일'

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-[220px] p-8 min-w-0">
        <NoticeBanner />


        {/* ── Hero 바 ── */}
        <div className="bg-white rounded-3xl px-8 py-7 mb-7 shadow-[0_4px_24px_rgba(17,24,39,0.06)] border border-[#F2F4F6]">
          <div className="flex items-center justify-between flex-wrap gap-5">
            <div>
              <p className="text-sm font-bold text-[#3182F6] mb-2 tracking-wide">로컬루션 대시보드</p>
              <h1 className="text-[32px] leading-tight font-black text-[#191F28] tracking-tight">오늘 처리할 작업 {totalTodo}건</h1>
              <p className="text-[15px] text-[#4E5968] font-medium mt-2">{dateStr} · 매출, 리뷰, 고객 현황을 한 눈에 확인하세요</p>
            </div>
            <div className="flex gap-3">
              <a href="/reviews" className="bg-[#F2F4F6] text-[#191F28] font-bold text-[15px] px-6 py-3.5 rounded-2xl hover:bg-[#E8F4FD] hover:text-[#3182F6] transition-colors">
                AI 답글 작성
              </a>
              <a href="/settlement" className="bg-[#3182F6] text-white font-bold text-[15px] px-6 py-3.5 rounded-2xl hover:bg-[#1B64DA] transition-colors shadow-[0_4px_16px_rgba(49,130,246,0.35)]">
                매출 확인
              </a>
            </div>
          </div>
        </div>

        {/* ── 정부지원금 알림 ── */}
        <div className="bg-white rounded-2xl border border-[#F2F4F6] shadow-sm px-7 py-5 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF7E8] flex items-center justify-center flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#F59E0B]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-[#F59E0B] bg-[#FFF7E8] px-2 py-0.5 rounded-full tracking-wider">알림</span>
                <span className="text-[10px] font-bold text-[#8B95A1]">5월 31일 마감</span>
              </div>
              <p className="text-[17px] font-black text-[#191F28] leading-snug">소상공인 경영안정자금, 지금 사장님 매출이면 신청 가능합니다</p>
              <p className="text-[13px] text-[#8B95A1] font-semibold mt-1">최대 2천만원 · 연 1.5% 고정금리 · 담보 불필요</p>
            </div>
          </div>
          <a href="/community" className="text-[14px] font-black text-[#191F28] border border-[#E5E8EB] px-5 py-3 rounded-xl hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors flex-shrink-0">자세히 보기</a>
        </div>

        {/* ── 오늘의 할 일 ── */}
        <div className="bg-white rounded-2xl shadow-sm p-7 mb-6 border border-[#F2F4F6]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[22px] font-black text-[#191F28] tracking-tight">오늘의 할 일</h2>
              <p className="text-[13px] text-[#8B95A1] font-semibold mt-1">우선순위가 높은 작업 순으로 표시됩니다</p>
            </div>
            <span className="text-[12px] font-black text-[#12B76A] bg-[#E8FFF0] px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse" />
              실시간 업데이트
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {todoList.map((t, i) => (
              <a key={i} href={t.link} className="group relative bg-[#FAFBFC] hover:bg-white hover:shadow-[0_8px_24px_rgba(49,130,246,0.12)] transition-all rounded-2xl p-6 border border-[#F2F4F6] hover:border-[#3182F6]">
                <div className="w-1 h-10 rounded-full absolute left-0 top-6" style={{ background: t.color }} />
                <p className="text-[13px] text-[#8B95A1] font-bold ml-3">{t.title}</p>
                <div className="flex items-baseline gap-1 mt-2 ml-3">
                  <span className="text-[36px] font-black leading-none" style={{ color: t.color }}>{t.count}</span>
                  <span className="text-[16px] font-black" style={{ color: t.color }}>{t.unit}</span>
                </div>
                <div className="flex items-center justify-between mt-3 ml-3">
                  <span className="text-[12px] text-[#8B95A1] font-bold">바로 처리하기</span>
                  <span className="text-[#CBD2DC] group-hover:text-[#3182F6] text-xl font-black transition-colors">→</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── 플랫폼 연동 현황 ── */}
        <div className="bg-white rounded-2xl shadow-sm px-7 py-6 mb-6 border border-[#F2F4F6]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-black text-[#191F28] tracking-tight">플랫폼 연동 현황</span>
              <span className="text-[12px] px-3 py-1 rounded-full bg-[#E8F4FD] text-[#3182F6] font-black">
                {connectedCount} / {platforms.length} 연동됨
              </span>
            </div>
            <a href="/settings" className="text-[13px] text-[#3182F6] font-black hover:underline">
              {isLoggedIn ? '연동 관리 →' : '로그인 후 연동 가능'}
            </a>
          </div>
          <div className="grid grid-cols-9 gap-3">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => handlePlatformClick(p)}
                className={[
                  'flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all cursor-pointer',
                  p.connected
                    ? 'bg-white border border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md'
                    : 'bg-[#FAFBFC] border border-dashed border-[#E0E0E0] hover:border-[#3182F6] hover:bg-white',
                ].join(' ')}
                title={p.connected ? '연동 정보 수정' : '연동하기'}
              >
                {p.logo(40)}
                <span className="text-[12px] font-black text-[#4E5968] text-center leading-tight">{p.shortName}</span>
                <span className={[
                  'text-[10px] font-black px-2 py-0.5 rounded-full',
                  p.connected ? 'bg-[#E8FFF0] text-[#12B76A]' : 'bg-[#F2F4F6] text-[#8B95A1]',
                ].join(' ')}>
                  {p.connected ? '연동됨' : '연동 안됨'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 통계 카드 6개 ── */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-6 border border-[#F2F4F6] hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-10 rounded-full" style={{ background: s.color }} />
                <p className="text-[12px] text-[#8B95A1] font-black leading-tight">{s.label}</p>
              </div>
              <p className="text-[28px] font-black text-[#191F28] tracking-tight leading-none">{s.value}</p>
              <p className="text-[12px] font-bold mt-2" style={{ color: s.up ? '#12B76A' : '#F04452' }}>
                {s.up ? '▲' : '▼'} {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── 3컬럼: 시간대 / 감정 / 경쟁사 ── */}
        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-5 mb-6">

          {/* 시간대별 방문자 */}
          <div className="bg-white rounded-2xl shadow-sm p-7 border border-[#F2F4F6]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[18px] font-black text-[#191F28] tracking-tight">시간대별 방문자</h3>
                <p className="text-[13px] text-[#8B95A1] font-bold mt-1">오늘 방문 추이</p>
              </div>
              <span className="text-[11px] bg-[#E8FFF0] text-[#12B76A] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="flex items-end gap-2 h-[160px]">
              {hourlyVisitors.map((hv, i) => {
                const h = Math.max(8, (hv.v / maxVisitor) * 140)
                const peak = hv.v === maxVisitor
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className={peak ? 'text-[12px] font-black text-[#3182F6]' : 'text-[11px] font-black text-[#8B95A1]'}>{hv.v}</span>
                    <div className="w-full rounded-t-xl transition-all" style={{ height: h + 'px', background: peak ? 'linear-gradient(180deg,#3182F6,#1B64DA)' : '#E8F4FD' }} />
                    <span className="text-[11px] font-black text-[#8B95A1]">{hv.h}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 리뷰 감정 분석 */}
          <div className="bg-white rounded-2xl shadow-sm p-7 border border-[#F2F4F6]">
            <h3 className="text-[18px] font-black text-[#191F28] tracking-tight">리뷰 감정 분석</h3>
            <p className="text-[13px] text-[#8B95A1] font-bold mb-5 mt-1">최근 30일 기준</p>
            <div className="flex items-center gap-5">
              <div className="relative w-[120px] h-[120px] flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F2F4F6" strokeWidth="4.5" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#12B76A" strokeWidth="4.5" strokeDasharray={sentiment.positive + ' 100'} />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray={sentiment.neutral + ' 100'} strokeDashoffset={-sentiment.positive} />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F04452" strokeWidth="4.5" strokeDasharray={sentiment.negative + ' 100'} strokeDashoffset={-(sentiment.positive + sentiment.neutral)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[28px] font-black text-[#12B76A] leading-none">{sentiment.positive}%</span>
                  <span className="text-[11px] text-[#8B95A1] font-black mt-1">긍정</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#12B76A]" />
                  <span className="text-[13px] font-black text-[#4E5968] flex-1">긍정</span>
                  <span className="text-[14px] font-black text-[#191F28]">{sentiment.positive}%</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <span className="text-[13px] font-black text-[#4E5968] flex-1">중립</span>
                  <span className="text-[14px] font-black text-[#191F28]">{sentiment.neutral}%</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#F04452]" />
                  <span className="text-[13px] font-black text-[#4E5968] flex-1">부정</span>
                  <span className="text-[14px] font-black text-[#191F28]">{sentiment.negative}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 경쟁사 비교 */}
          <div className="bg-white rounded-2xl shadow-sm p-7 border border-[#F2F4F6]">
            <h3 className="text-[18px] font-black text-[#191F28] tracking-tight">경쟁사 비교</h3>
            <p className="text-[13px] text-[#8B95A1] font-bold mb-5 mt-1">강남구 동종업계 평균</p>
            <div className="space-y-5">
              {compareData.map((c, i) => {
                const meNum = Number(c.me)
                const areaNum = Number(c.area)
                const total = meNum + areaNum || 1
                const mePct = (meNum / total) * 100
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-black text-[#4E5968]">{c.label}</span>
                      <span className="text-[11px] font-black text-[#12B76A] bg-[#E8FFF0] px-2 py-0.5 rounded-full">우위</span>
                    </div>
                    <div className="flex h-8 rounded-xl overflow-hidden border border-[#F2F4F6]">
                      <div className="bg-[#3182F6] text-white text-[11px] font-black flex items-center justify-center" style={{ width: mePct + '%' }}>
                        내 매장 {c.me}{c.unit}
                      </div>
                      <div className="bg-[#F2F4F6] text-[#8B95A1] text-[11px] font-black flex items-center justify-center flex-1">
                        지역 {c.area}{c.unit}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── 2컬럼: 플랫폼 별점 / 키워드 순위 ── */}
        <div className="grid grid-cols-[1fr_400px] gap-5 mb-6">

          {/* 플랫폼 별점 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6]">
            <div className="px-7 py-6 border-b border-[#F2F4F6] flex items-center justify-between">
              <span className="text-[18px] font-black text-[#191F28] tracking-tight">플랫폼별 별점 · 리뷰 현황</span>
              <span className="text-[12px] text-[#8B95A1] font-bold">연동된 플랫폼만 표시</span>
            </div>
            <div className="p-7 space-y-6">
              {platforms.filter(p => p.connected).length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[15px] text-[#4E5968] mb-2 font-black">아직 연동된 플랫폼이 없어요</p>
                  <p className="text-[13px] text-[#8B95A1] font-semibold">상단 로고를 클릭해 연동을 시작하세요</p>
                </div>
              ) : (
                platforms.filter(p => p.connected).map(p => (
                  <div key={p.id} className="flex items-center gap-5">
                    <div className="flex-shrink-0">{p.logo(44)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[15px] font-black text-[#191F28]">{p.name}</span>
                        {p.rating !== null ? (
                          <div className="flex items-center gap-3">
                            <Stars rating={p.rating} size="md" />
                            <span className="text-[13px] text-[#8B95A1] font-bold">리뷰 <strong className="text-[#191F28] font-black">{p.reviews}건</strong></span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#8B95A1] font-bold">데이터 수집 중</span>
                        )}
                      </div>
                      {p.rating !== null && (
                        <div className="w-full bg-[#F2F4F6] rounded-full h-3 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: ((p.rating / 5) * 100) + '%', background: p.color }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {platforms.filter(p => !p.connected).length > 0 && (
                <div className="mt-6 p-5 bg-[#FAFBFC] rounded-2xl border border-dashed border-[#E0E0E0]">
                  <p className="text-[13px] text-[#4E5968] mb-3 font-black">미연동 플랫폼 — 클릭하여 바로 연동</p>
                  <div className="flex flex-wrap gap-2.5">
                    {platforms.filter(p => !p.connected).map(p => (
                      <button key={p.id} onClick={() => handlePlatformClick(p)}
                        className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-[#E5E8EB] hover:border-[#3182F6] transition-colors">
                        {p.logo(22)}
                        <span className="text-[12px] text-[#4E5968] font-black">{p.shortName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 키워드 순위 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-[#F2F4F6]">
            <div className="px-7 py-6 border-b border-[#F2F4F6] flex items-center justify-between">
              <div>
                <span className="text-[18px] font-black text-[#191F28] tracking-tight">주요 키워드 순위</span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse inline-block" />
                  <span className="text-[12px] text-[#8B95A1] font-bold">실시간 · {lastSync}</span>
                </div>
              </div>
              <button onClick={refreshKeywords} disabled={isSyncing}
                className="text-[12px] text-[#3182F6] font-black border border-[#3182F6] px-3.5 py-2 rounded-xl hover:bg-[#E8F4FD] transition-colors disabled:opacity-50">
                {isSyncing ? '갱신 중' : '새로고침'}
              </button>
            </div>
            <div className="flex-1 divide-y divide-[#F2F4F6]">
              {keywords.map(kw => (
                <div key={kw.keyword} className="px-6 py-5 flex items-center gap-4 hover:bg-[#FAFBFF] transition-colors">
                  <div className={[
                    'w-11 h-11 rounded-xl flex items-center justify-center text-[16px] font-black flex-shrink-0',
                    kw.rank <= 3  ? 'bg-[#3182F6] text-white'
                    : kw.rank <= 10 ? 'bg-[#E8F4FD] text-[#3182F6]'
                    : 'bg-[#F2F4F6] text-[#8B95A1]',
                  ].join(' ')}>
                    {kw.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-[#191F28] truncate">{kw.keyword}</p>
                    <p className="text-[12px] text-[#8B95A1] font-bold mt-0.5">{kw.area} · {kw.updatedAt}</p>
                  </div>
                  <RankBadge current={kw.rank} prev={kw.prevRank} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2컬럼: 이번 주 매출 / VIP 고객 ── */}
        <div className="grid grid-cols-[1.2fr_1fr] gap-5 mb-6">

          {/* 이번 주 매출 */}
          <div className="bg-white rounded-2xl shadow-sm p-7 border border-[#F2F4F6]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[18px] font-black text-[#191F28] tracking-tight">이번 주 매출</h3>
                <p className="text-[13px] text-[#8B95A1] font-bold mt-1">총 <strong className="text-[#191F28] font-black">{totalWeekSale}만원</strong> · 지난주 대비 +18%</p>
              </div>
              <a href="/settlement" className="text-[13px] text-[#3182F6] font-black hover:underline">전체 보기 →</a>
            </div>
            <div className="flex items-end gap-3 h-[200px]">
              {weekSales.map((w, i) => {
                const h = (w.v / maxSale) * 180
                const isMax = w.v === maxSale
  }
  }
                return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-[220px] p-6 min-w-0">

        {/* ── 상단 롤링 공지 배너 ── */}
        <NoticeBanner />

        {/* ── 오늘 처리할 작업 (오늘의 할 일 통합) ── */}
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 mb-5">
          <div className="mb-4">
            <p className="text-[11px] text-[#3182F6] font-bold mb-1">로컬루션 대시보드</p>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-[#191F28] mb-1">오늘 처리할 작업</h1>
                <p className="text-xs text-[#8B95A1]">
                  {new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' })} · 우선순위가 높은 작업 순으로 표시됩니다
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse inline-block"/>
                <span className="text-[10px] text-[#8B95A1] font-medium">실시간 업데이트</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <a href="/reviews" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#F04452]"/>
                <span className="text-xs text-[#8B95A1] font-medium">미답변 리뷰</span>
              </div>
              <span className="text-2xl font-black text-[#F04452] mb-1">3<span className="text-sm font-bold text-[#8B95A1]">건</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </a>
            <a href="/crm" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#F59E0B]"/>
                <span className="text-xs text-[#8B95A1] font-medium">재방문 유도</span>
              </div>
              <span className="text-2xl font-black text-[#F59E0B] mb-1">5<span className="text-sm font-bold text-[#8B95A1]">명</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </a>
            <a href="/reservations" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#3182F6]"/>
                <span className="text-xs text-[#8B95A1] font-medium">오늘 예약</span>
              </div>
              <span className="text-2xl font-black text-[#3182F6] mb-1">7<span className="text-sm font-bold text-[#8B95A1]">건</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </a>
            <a href="/settlement" className="group flex flex-col p-4 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 rounded-full bg-[#12B76A]"/>
                <span className="text-xs text-[#8B95A1] font-medium">세금계산서 발행</span>
              </div>
              <span className="text-2xl font-black text-[#12B76A] mb-1">2<span className="text-sm font-bold text-[#8B95A1]">건</span></span>
              <span className="text-[11px] text-[#8B95A1] group-hover:text-[#3182F6] transition-colors flex items-center gap-1">바로 처리하기 <span>→</span></span>
            </a>
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
          <div className="grid grid-cols-8 gap-2">
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
        <div className="grid grid-cols-4 gap-4 mb-5">
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
        <div className="grid grid-cols-[1fr_340px] gap-5 mb-5">

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
          </div>
        </div>

        {/* ── 최근 리뷰 ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#191F28]">최근 리뷰</span>
              <span className="text-[11px] text-[#8B95A1]">미답변 {RECENT_REVIEWS.filter(r => !r.replied).length}건</span>
            </div>
            <a href="/reviews" className="text-[11px] text-[#3182F6] font-semibold hover:underline">전체보기 →</a>
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
}
}