'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import SlideAdBanner from '../components/SlideAdBanner'
import { useConnections, setConnection as libSetConnection, PlatformId as CanonicalPlatformId } from '../lib/connections'
import { toast, confirmDialog } from '../lib/toast'
import { buildSettingsHref } from '../lib/settings-tabs'
import {
  Star, ArrowRight, ArrowUp, ArrowDown, Minus, X, Check, CheckCircle2,
  AlertTriangle, Rocket, BarChart3, TrendingUp,
  Smile, Meh, Frown,
  Search, Users, Calendar, FileSpreadsheet, Link2, Lock, MapPin,
} from 'lucide-react'

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

// 대시보드에서 쓰는 로컬 플랫폼 id (INITIAL_PLATFORMS 기준)
// naver_search 는 검색광고 연동 미구현 → 당분간 타입에서 제외
type PlatformId =
  | 'naver_place' | 'google' | 'baemin'
  | 'yogiyo' | 'coupangeats' | 'yeoshin' | 'hometax'

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

// 대시보드 로컬 id ↔ 공통 훅 canonical id 매핑
const TO_CANONICAL: Record<PlatformId, CanonicalPlatformId> = {
  naver_place: 'naver',
  google: 'google',
  baemin: 'baemin',
  yogiyo: 'yogiyo',
  coupangeats: 'coupang',
  yeoshin: 'yeoshin',
  hometax: 'hometax',
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

// ── 주소/매장명에서 지역(구/동) 추출 ────────────────────────
// "서울시 강남구 테헤란로 123" → "강남구" | "부산 해운대구 우동" → "해운대구"
// 매장명에 "강남점"·"해운대점" 등 지점명만 있는 경우도 대응
function extractRegion(address?: string, storeName?: string, branch?: string): string | null {
  const src = [address, branch, storeName].filter(Boolean).join(' ')
  if (!src) return null
  // 1) "OO구" / "OO군" 패턴
  const gu = src.match(/([가-힣]{1,4})(구|군)/)
  if (gu) return gu[1] + gu[2]
  // 2) 주요 지역 약칭 (해운대, 강남, 홍대, 일산, 송도 등)
  const known = ['해운대','광안리','서면','강남','서초','홍대','합정','이태원','성수','건대','일산','분당','판교','송도','동탄','광교','수원','안양','평촌','인천','부평','부천','대구','동성로','수성','광주','상무','대전','둔산','울산','남구','동구','북구','중구','청주','전주','제주','서귀포','창원','마산','포항','경주','천안','아산','세종','강릉','춘천','원주']
  for (const k of known) {
    if (src.includes(k)) return k
  }
  return null
}

// 지역 기반 키워드 생성 (연동 전 노출용 데모, 단 실제 매장 지역 반영)
function generateRegionKeywords(region: string): KeywordRank[] {
  return [
    { keyword: `${region} 맛집`,     rank: 3,  prevRank: 5,   area: region, updatedAt: '방금 전' },
    { keyword: `${region} 카페`,     rank: 7,  prevRank: 7,   area: region, updatedAt: '3분 전' },
    { keyword: `${region} 점심`,     rank: 12, prevRank: 15,  area: region, updatedAt: '10분 전' },
    { keyword: `${region} 회식`,     rank: 21, prevRank: 18,  area: region, updatedAt: '18분 전' },
    { keyword: `${region} 데이트코스`, rank: 34, prevRank: null, area: region, updatedAt: '방금 전' },
  ]
}

const RECENT_REVIEWS = [
  { platform: '네이버',  name: '이**', rating: 1, text: '대기 시간이 너무 길었고 음식도 식어서 나왔습니다. 재방문은 어려울 것 같아요.', time: '1시간 전', replied: false, color: '#03C75A' },
  { platform: '네이버',  name: '김**', rating: 5, text: '음식도 맛있고 직원분들도 친절해요. 주차도 편하고 재방문 의사 있습니다!', time: '2시간 전', replied: false, color: '#03C75A' },
  { platform: '구글',    name: 'J**',  rating: 4, text: 'Great food and cozy atmosphere. Service was excellent. Will definitely come back!', time: '5시간 전', replied: true,  color: '#4285F4' },
  { platform: '구글',    name: '최**', rating: 2, text: '주차 안내가 불친절했고 계산 시 실수가 있어 당황스러웠습니다.', time: '7시간 전', replied: false, color: '#4285F4' },
  { platform: '네이버',  name: '박**', rating: 5, text: '회식으로 왔는데 음식 양도 많고 맛도 좋았어요. 사장님도 친절하시고 너무 좋았습니다', time: '어제',     replied: false, color: '#03C75A' },
  { platform: '구글',    name: 'L**',  rating: 3, text: 'Food was okay but waiting time was a bit long. Interior is nice though.', time: '어제',     replied: false, color: '#4285F4' },
]

const LS_STORE = 'localution_store'

// ═══════════════════════════════════════════════════════════
//  별점 / 랭크 배지
// ═══════════════════════════════════════════════════════════
function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.round(rating)
  const starSize = size === 'md' ? 14 : 11
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={starSize}
          strokeWidth={0}
          fill={i < full ? '#F5A623' : '#E5E8EB'}
          className={i < full ? 'text-[#F5A623]' : 'text-[#E5E8EB]'}
        />
      ))}
      <span className={(size === 'md' ? 'text-sm' : 'text-[11px]') + ' ml-1 text-[#4E5968] font-bold'}>{rating}</span>
    </span>
  )
}

function RankBadge({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null) return <span className="text-[10px] text-[#8B95A1] font-medium">신규</span>
  const diff = prev - current
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#12B76A] font-bold">
      <ArrowUp size={10} strokeWidth={3} />{diff}
    </span>
  )
  if (diff < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#F04452] font-bold">
      <ArrowDown size={10} strokeWidth={3} />{Math.abs(diff)}
    </span>
  )
  return <span className="inline-flex items-center gap-0.5 text-[10px] text-[#8B95A1] font-bold"><Minus size={10} strokeWidth={3} /></span>
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
          ? `${data.name}${ratingNum ? ` · ${ratingNum}점` : ''}${reviewCountNum ? ` · 리뷰 ${reviewCountNum}` : ''}`
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="플랫폼 연결 모달">
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
            'inline-flex items-center gap-1.5 text-xs p-3 rounded-xl mb-3 w-full',
            result.ok ? 'bg-[#E8FFF0] text-[#12B76A]' : 'bg-[#FFF0F0] text-[#F04452]',
          ].join(' ')}>
            {result.ok ? <Check size={14} strokeWidth={2.75} /> : <X size={14} strokeWidth={2.75} />}
            <span>{result.msg}</span>
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
// ═════════════════════════════════════════════════════════════
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
    setPosted(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ai-reply-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 id="ai-reply-modal-title" className="text-lg font-black text-[#191F28]">AI 답글 생성</h3>
          <button onClick={onClose} aria-label="모달 닫기" className="text-[#8B95A1] hover:text-[#191F28] w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F2F4F6] transition-colors">
            <X size={18} strokeWidth={2.25} />
          </button>
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
          <div className="bg-[#E8FFF0] text-[#12B76A] rounded-xl p-3 text-sm font-bold text-center mt-3 inline-flex items-center justify-center gap-1.5 w-full">
            <CheckCircle2 size={16} strokeWidth={2.5} />
            답글이 게시되었습니다
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
//  롤링 공지 배너 → 공통 컴포넌트 분리됨
//  (app/components/SlideAdBanner.tsx)
// ═══════════════════════════════════════════════════════════
// NoticeBanner / BANNER_SLIDES / BannerSlide 는 SlideAdBanner 로 이전


// ═══════════════════════════════════════════════════════════
//  메인 대시보드
// ═══════════════════════════════════════════════════════════
export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  useEffect(() => {
    const check = () => {
      if (typeof document === 'undefined') return
      const has = document.cookie.indexOf('localution_session=') !== -1
      setIsLoggedIn(prev => (prev === has ? prev : has))
    }
    check()
    // user-change 이벤트(로그인/로그아웃 시 각 페이지에서 dispatch) 구독
    const onUserChange = () => check()
    // 다른 탭에서 세션 변경 → storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'localution_user' || e.key === null) check()
    }
    // 포커스 복귀 시 재검증(탭 복귀 직후 세션 만료 감지)
    const onFocus = () => check()
    // 60초 주기 재검증(장시간 체류 중 만료 감지)
    const interval = window.setInterval(check, 60_000)
    window.addEventListener('localution:user-change', onUserChange)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('localution:user-change', onUserChange)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS)
  const [keywords, setKeywords] = useState<KeywordRank[]>([])
  const [storeRegion, setStoreRegion] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState('방금 전')
  const [isSyncing, setIsSyncing] = useState(false)
  const [mainKeyword, setMainKeyword] = useState('')

  const [connectPlatform, setConnectPlatform] = useState<Platform | null>(null)
  const [replyReview, setReplyReview] = useState<typeof RECENT_REVIEWS[number] | null>(null)

  // 공통 연동 훅 — /settings, /review-admin 과 동일 소스
  const { connections: canonicalConnections } = useConnections()

  // 훅 상태 → 대시보드 platforms 반영
  useEffect(() => {
    setPlatforms(prev => prev.map(p => {
      const canon = TO_CANONICAL[p.id]
      if (!canon) return p
      const c = canonicalConnections[canon]
      if (c?.connected) {
        return {
          ...p,
          connected: true,
          rating: p.rating ?? c.rating ?? null,
          reviews: p.reviews ?? c.reviewCount ?? null,
        }
      }
      return { ...p, connected: false, rating: null, reviews: null }
    }))
  }, [canonicalConnections])

  // 프로필(매장 주소/이름) → 지역 기반 키워드 자동 생성
  useEffect(() => {
    function syncKeywordsFromProfile() {
      try {
        const raw = localStorage.getItem(LS_STORE)
        const profile = raw ? JSON.parse(raw) : null
        const region = extractRegion(profile?.address, profile?.storeName, profile?.branch)
        if (region) {
          setStoreRegion(region)
          setKeywords(generateRegionKeywords(region))
          setMainKeyword(`${region} 맛집`)
        } else {
          setStoreRegion(null)
          setKeywords([])
          setMainKeyword('')
        }
      } catch {}
    }
    syncKeywordsFromProfile()
    const onChange = () => syncKeywordsFromProfile()
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_STORE) syncKeywordsFromProfile()
    }
    window.addEventListener('localution:user-change', onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('localution:user-change', onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const connectedCount = platforms.filter(p => p.connected).length
  const totalReviews   = platforms.reduce((s, p) => s + (p.reviews ?? 0), 0)
  const avgRating = (() => {
    const rated = platforms.filter(p => p.rating !== null)
    if (!rated.length) return 0
    return +(rated.reduce((s, p) => s + p.rating!, 0) / rated.length).toFixed(1)
  })()

  const handlePlatformClick = async (p: Platform) => {
    if (!isLoggedIn) {
      const ok = await confirmDialog(
        '로그인 후 플랫폼을 연동할 수 있습니다.\n로그인 페이지로 이동하시겠습니까?',
        { title: '로그인이 필요해요', okText: '로그인 하러 가기' },
      )
      if (ok) window.location.href = '/login'
      return
    }
    if (p.id === 'yeoshin' || p.id === 'hometax') {
      toast.info(`${p.name} 연동은 /settings 페이지에서 설정하세요.`)
      return
    }
    setConnectPlatform(p)
  }

  const handleSaveConnection = (
    id: PlatformId,
    data: VerifyResult & { input: string },
  ) => {
    // 공통 훅 경유로 저장 → /settings, /review-admin 자동 동기화
    // TO_CANONICAL 은 모든 PlatformId 를 커버하므로 fallback 불필요
    const canon = TO_CANONICAL[id]
    libSetConnection(canon, {
      connected: true,
      externalName: data.name,
      externalId: data.placeId || data.input,
      externalUrl: data.url,
      rating: data.rating ?? null,
      reviewCount: data.reviewCount ?? 0,
    })

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

  // 리뷰 감정 분석
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

  // 이번 주 매출
  const weekSales = [
    { d: '월', v: 142 }, { d: '화', v: 168 }, { d: '수', v: 195 },
    { d: '목', v: 178 }, { d: '금', v: 247 }, { d: '토', v: 312 }, { d: '일', v: 228 },
  ]
  const totalWeekSale = weekSales.reduce((s, x) => s + x.v, 0)

  // 오늘의 할 일
  const unansweredCount = RECENT_REVIEWS.filter(r => !r.replied).length
  const negativeUnansweredReviews = RECENT_REVIEWS.filter(r => r.rating <= 2 && !r.replied)
  const negativeUnansweredCount = negativeUnansweredReviews.length

  useEffect(() => {
    try {
      localStorage.setItem('localution.unanswered_count', String(unansweredCount))
      window.dispatchEvent(new CustomEvent('localution:unanswered-change'))
    } catch {}
  }, [unansweredCount])

  const stats = [
    { label: '이번 달 방문자', value: '2,847',                      sub: '전달 대비 +12.4%', up: true, color: '#3182F6', ring: '#E8F4FD' },
    { label: '총 리뷰 수',     value: (totalReviews || 142) + '건', sub: '이번 주 +34건',    up: true, color: '#03C75A', ring: '#E8FFF0' },
    { label: '평균 별점',      value: (avgRating || 4.6) + '점',    sub: '지역 평균 4.2',    up: true, color: '#F5A623', ring: '#FFF7E8' },
    { label: '키워드 상위',    value: '3개',                        sub: '신규 진입 +1',     up: true, color: '#9B5CFB', ring: '#F3ECFF' },
    { label: '이번 주 매출',   value: totalWeekSale + '만원',       sub: '지난주 대비 +18%', up: true, color: '#F04452', ring: '#FFF0F0' },
    { label: '단골 고객',      value: '38명',                       sub: '이번 달 +6명',     up: true, color: '#12B76A', ring: '#E8FFF0' },
  ]

  // ─────────────────────────────────────────────────────────
  //  오늘 처리할 작업 — 플랫폼 연동 현황에 따라 동적 렌더
  //  카테고리 기반 판정 (INITIAL_PLATFORMS의 category 필드가 단일 소스)
  // ─────────────────────────────────────────────────────────
  const reviewPlatformConnected = platforms.some(p => (p.category === '리뷰·검색' || p.category === '배달') && p.connected)
  const financePlatformConnected = platforms.some(p => p.category === '금융·세무' && p.connected)
  // 고객 관리/예약은 현재 별도 연동 테이블 없음 → 향후 지점 DB로 대체.
  // 일단 "any 플랫폼 연동됨"을 조건으로 잡는다
  const anyPlatformConnected = connectedCount > 0

  const todayTasks = [
    {
      key: 'unanswered-reviews',
      href: '/reviews',
      connectHref: buildSettingsHref('connect'),
      requiredLabel: '리뷰 플랫폼',
      label: '미답변 리뷰',
      count: unansweredCount,
      unit: '건',
      color: '#F04452',
      ready: reviewPlatformConnected,
    },
    {
      key: 'crm-revisit',
      href: '/crm',
      connectHref: '/customers',
      requiredLabel: '고객 DB',
      label: '재방문 유도',
      count: anyPlatformConnected ? 5 : 0,
      unit: '명',
      color: '#F59E0B',
      ready: anyPlatformConnected,
    },
    {
      key: 'reservations-today',
      href: '/reservations',
      connectHref: buildSettingsHref('connect'),
      requiredLabel: '예약 시스템',
      label: '오늘 예약',
      count: 0,
      unit: '건',
      color: '#3182F6',
      ready: false, // 현재 예약 연동 없음
    },
    {
      key: 'tax-invoice',
      href: '/settlement',
      connectHref: buildSettingsHref('connect'),
      requiredLabel: '홈택스/여신',
      label: '세금계산서 발행',
      count: financePlatformConnected ? 2 : 0,
      unit: '건',
      color: '#12B76A',
      ready: financePlatformConnected,
    },
  ]

  return (
    <div className="flex min-h-screen bg-[#F2F4F6] overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] p-4 pt-20 md:p-6 md:pt-6 min-w-0 max-w-full pb-24 md:pb-6">

        {/* ── 상단 롤링 공지 배너 ── */}
        <SlideAdBanner />

        {/* ── 부정 리뷰 긴급 알림 (미답변 1~2점 있을 때만) ── */}
        {isLoggedIn && negativeUnansweredCount > 0 && (
          <div className="relative overflow-hidden rounded-2xl shadow-sm mb-5 p-5 border-2 border-[#F04452]"
            style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE4E4 100%)' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F04452] flex items-center justify-center text-white shrink-0 animate-pulse">
                  <AlertTriangle size={20} strokeWidth={2.5} />
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
                className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-[#F04452] text-white text-sm font-bold hover:bg-[#DC2626] transition-all whitespace-nowrap shrink-0">
                지금 답변하기
                <ArrowRight size={14} strokeWidth={2.5} />
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">시작하기</span>
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
                <Link href={buildSettingsHref('connect')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#1B64DA] text-sm font-bold hover:bg-[#F2F4F6] transition-all whitespace-nowrap">
                  <Rocket size={14} strokeWidth={2.5} />
                  1단계: 플랫폼 연결
                </Link>
                <Link href="/settings"
                  className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur text-white text-sm font-bold hover:bg-white/20 transition-all text-center whitespace-nowrap border border-white/20">
                  가게 정보 입력
                </Link>
              </div>
            </div>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none"/>
            <div className="absolute -bottom-4 -right-12 w-24 h-24 rounded-full bg-white/5 pointer-events-none"/>
          </div>
        )}

        {/* ── 오늘 처리할 작업 ── */}
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 mb-5">
          <div className="mb-4">
            <p className="text-[11px] text-[#3182F6] font-bold mb-1">로컬루션 대시보드</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-black text-[#191F28]">오늘 처리할 작업</h1>
                  {!reviewPlatformConnected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">데모</span>
                  )}
                </div>
                <p className="text-xs text-[#8B95A1]">
                  {!reviewPlatformConnected
                    ? '샘플 데이터입니다. 리뷰 플랫폼(네이버·구글·배민·요기요·쿠팡)을 연결하면 실시간으로 표시됩니다'
                    : new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' }) + ' · 우선순위가 높은 작업 순으로 표시됩니다'
                  }
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${!reviewPlatformConnected ? 'bg-[#F59E0B]' : 'bg-[#12B76A] animate-pulse'}`}/>
                <span className="text-[10px] text-[#8B95A1] font-medium">{!reviewPlatformConnected ? '데모 데이터' : '실시간 업데이트'}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {todayTasks.map(t => {
              const ready = t.ready
              const href = ready ? t.href : (t.connectHref || '/settings')
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={[
                    'group flex flex-col p-4 rounded-xl border transition-all cursor-pointer',
                    ready
                      ? 'border-[#F2F4F6] hover:border-[#3182F6] hover:shadow-md bg-white'
                      : 'border-dashed border-[#E0E0E0] hover:border-[#3182F6] bg-[#FAFBFF]',
                  ].join(' ')}
                  title={ready ? '' : `${t.requiredLabel} 연동 후 이용 가능`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-8 rounded-full" style={{ background: ready ? t.color : '#D1D5DB' }}/>
                      <span className="text-xs text-[#8B95A1] font-medium truncate">{t.label}</span>
                    </div>
                    {!ready && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center gap-0.5 flex-shrink-0">
                        <Lock size={9} strokeWidth={2.75}/> 연동필요
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black mb-1" style={{ color: ready ? t.color : '#9CA3AF' }}>
                    {ready ? t.count : 0}<span className="text-sm font-bold text-[#8B95A1]">{t.unit}</span>
                  </span>
                  <span className={[
                    'text-[11px] inline-flex items-center gap-1 transition-colors',
                    ready ? 'text-[#8B95A1] group-hover:text-[#3182F6]' : 'text-[#F59E0B] font-semibold',
                  ].join(' ')}>
                    {ready
                      ? <>바로 처리하기 <ArrowRight size={11} strokeWidth={2.5} /></>
                      : <><Link2 size={11} strokeWidth={2.5} /> {t.requiredLabel} 연동하기</>}
                  </span>
                </Link>
              )
            })}
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
            <a href={isLoggedIn ? "/settings" : "/login"} className="inline-flex items-center gap-1 text-[11px] text-[#3182F6] font-semibold hover:underline">
              {isLoggedIn ? <>연동 관리 <ArrowRight size={11} strokeWidth={2.5} /></> : '로그인 후 연동 가능'}
            </a>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2">
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

        {/* ── 통계 카드 6개 ── */}
        {!reviewPlatformConnected && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">샘플 데이터</span>
            <span className="text-xs text-[#8B95A1]">리뷰 플랫폼(네이버·구글·배민·요기요·쿠팡)을 연동하면 실데이터로 자동 교체됩니다</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
          {stats.map((s, i) => (
            <div key={i} className={`bg-white rounded-2xl shadow-sm p-4 ${!reviewPlatformConnected ? 'opacity-75' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1 h-6 rounded-full" style={{ background: s.color }}/>
                <span className="text-[11px] text-[#8B95A1] font-medium">{s.label}</span>
              </div>
              <p className="text-lg font-black text-[#191F28]">{s.value}</p>
              <p className={`inline-flex items-center gap-0.5 text-[11px] font-bold mt-0.5 ${s.up ? 'text-[#12B76A]' : 'text-[#F04452]'}`}>
                {s.up
                  ? <ArrowUp size={11} strokeWidth={2.75} />
                  : <ArrowDown size={11} strokeWidth={2.75} />}
                <span>{s.sub}</span>
              </p>
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
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#191F28]">
                  <TrendingUp size={14} strokeWidth={2.25} className="text-[#3182F6]" />
                  주요 키워드 순위
                  {!platforms.find(p => p.id === 'naver_place')?.connected && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">데모</span>
                  )}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${platforms.find(p => p.id === 'naver_place')?.connected ? 'bg-[#12B76A] animate-pulse' : 'bg-[#F59E0B]'}`}/>
                  <span className="text-[10px] text-[#8B95A1]">
                    {platforms.find(p => p.id === 'naver_place')?.connected ? `실시간 · ${lastSync}` : '플레이스 연동 시 실시간 조회'}
                  </span>
                </div>
              </div>
              <button
                onClick={refreshKeywords}
                disabled={isSyncing || !platforms.find(p => p.id === 'naver_place')?.connected}
                className="text-[11px] text-[#3182F6] font-semibold border border-[#3182F6] px-2.5 py-1 rounded-lg hover:bg-[#E8F4FD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={!platforms.find(p => p.id === 'naver_place')?.connected ? '네이버 플레이스 연동 후 가능' : ''}
              >
                {isSyncing ? '갱신 중...' : '새로고침'}
              </button>
            </div>

            {!platforms.find(p => p.id === 'naver_place')?.connected && (
              <div className="px-5 py-4 bg-[#FFFBEB] border-b border-[#FEF3C7]">
                <p className="text-[11px] font-semibold text-[#92400E] mb-1 flex items-center gap-1">
                  <Lock size={11} strokeWidth={2.5}/> 아래는 샘플 데이터
                  {storeRegion && (
                    <span className="ml-1 bg-white text-[#92400E] border border-[#FDE68A] px-1.5 py-0.5 rounded-full text-[9px]">
                      내 매장 지역: {storeRegion}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-[#92400E] leading-relaxed">
                  {storeRegion
                    ? `'${storeRegion}' 기준 예시 키워드입니다. 네이버 플레이스를 연동하면 실제 순위가 실시간으로 표시돼요. `
                    : '프로필에 매장 주소를 등록하면 내 지역 키워드가 자동으로 뜹니다. '}
                  <button
                    onClick={() => handlePlatformClick(platforms.find(p => p.id === 'naver_place')!)}
                    className="text-[#92400E] font-bold underline inline-flex items-center gap-0.5"
                  >
                    지금 연동하기 <ArrowRight size={9} strokeWidth={3} />
                  </button>
                  {!storeRegion && (
                    <>
                      {' · '}
                      <Link href="/settings/profile" className="text-[#92400E] font-bold underline">
                        프로필 설정 →
                      </Link>
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="flex-1 divide-y divide-[#F2F4F6]">
              {keywords.length === 0 ? (
                <div className="px-5 py-10 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-[#F2F4F6] flex items-center justify-center mb-2">
                    <MapPin size={18} strokeWidth={2.25} className="text-[#8B95A1]"/>
                  </div>
                  <p className="text-sm font-bold text-[#191F28] mb-1">아직 추적할 키워드가 없습니다</p>
                  <p className="text-[11px] text-[#8B95A1] leading-relaxed mb-3">
                    매장 프로필에 주소를 등록하면<br/>
                    내 지역 기반 키워드가 자동으로 표시됩니다
                  </p>
                  <Link href="/settings/profile"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3182F6] text-white text-[11px] font-bold hover:bg-[#1B64DA] transition-colors">
                    프로필 설정하기 <ArrowRight size={11} strokeWidth={2.5} />
                  </Link>
                </div>
              ) : keywords.map((kw) => (
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

          {/* 인기 서비스 랭킹 */}
          <ServiceRanking />
        </div>

        {/* ── 최근 리뷰 ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#191F28]">최근 리뷰</span>
              {!reviewPlatformConnected && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">데모</span>
              )}
              <span className="text-[11px] text-[#8B95A1]">미답변 {RECENT_REVIEWS.filter(r => !r.replied).length}건</span>
              <span className="flex items-center gap-1 ml-2">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[10px] font-bold text-[#059669]" title={`긍정 ${sentimentCount.positive}건`}>
                  <Smile size={11} strokeWidth={2.5} />
                  {sentiment.positive}%
                </span>
                {sentimentCount.neutral > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[10px] font-bold text-[#4E5968]" title={`중립 ${sentimentCount.neutral}건`}>
                    <Meh size={11} strokeWidth={2.5} />
                    {sentiment.neutral}%
                  </span>
                )}
                {sentimentCount.negative > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[10px] font-bold text-[#DC2626]" title={`부정 ${sentimentCount.negative}건`}>
                    <Frown size={11} strokeWidth={2.5} />
                    {sentiment.negative}%
                  </span>
                )}
              </span>
            </div>
            <Link href="/reviews" className="inline-flex items-center gap-1 text-[11px] text-[#3182F6] font-semibold hover:underline">
              전체보기 <ArrowRight size={11} strokeWidth={2.5} />
            </Link>
          </div>
          {!reviewPlatformConnected && (
            <div className="px-5 py-4 bg-[#FFFBEB] border-b border-[#FEF3C7]">
              <p className="text-[11px] font-semibold text-[#92400E] mb-1 flex items-center gap-1">
                <Lock size={11} strokeWidth={2.5}/> 아래는 샘플 리뷰입니다
              </p>
              <p className="text-[10px] text-[#92400E] leading-relaxed">
                네이버·구글·배민 등 리뷰 플랫폼을 연동하면 실제 리뷰가 이 자리에 자동으로 들어옵니다.{' '}
                <Link href={buildSettingsHref('connect')} className="font-bold underline inline-flex items-center gap-0.5">
                  연동하러 가기 <ArrowRight size={9} strokeWidth={3} />
                </Link>
              </p>
            </div>
          )}
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
                      <span className="inline-flex items-center gap-1 text-[10px] bg-[#E8FFF0] text-[#12B76A] px-1.5 py-0.5 rounded-full font-semibold">
                        <Check size={10} strokeWidth={3} />
                        답변완료
                      </span>
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

        {/* ── Footer ── */}
        <div className="-mx-4 md:-mx-6 mt-8">
          <Footer />
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

