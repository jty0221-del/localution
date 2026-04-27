'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import SlideAdBanner from '../components/SlideAdBanner'
import { useConnections, setConnection as libSetConnection, removeConnection as libRemoveConnection, PlatformId as CanonicalPlatformId } from '../lib/connections'
import { toast, confirmDialog } from '../lib/toast'
import { buildSettingsHref } from '../lib/settings-tabs'
import {
  Star, ArrowRight, ArrowUp, ArrowDown, Minus, X, Check, CheckCircle2,
  AlertTriangle, Rocket, TrendingUp,
  Smile, Meh, Frown,
  Link2, Lock, MapPin,
  Layers, Zap, MessageSquare, ThumbsUp, Flame, Users, RefreshCw, ChevronDown,
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

function KakaoMapLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FEE500"/>
      <path d="M24 11c-7 0-12.5 4.4-12.5 10 0 3.7 2.5 7 6.3 8.9l-1.5 5.3c-.1.3.3.5.5.3l6.2-4.3c.3 0 .7.1 1 .1 7 0 12.5-4.4 12.5-10S31 11 24 11Z" fill="#191919"/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════
//  타입 & 상수
// ═══════════════════════════════════════════════════════════

// 대시보드에서 쓰는 로컬 플랫폼 id (INITIAL_PLATFORMS 기준)
// naver_search 는 검색광고 연동 미구현 → 당분간 타입에서 제외
type PlatformId =
  | 'naver_place' | 'google' | 'kakao_map' | 'baemin'
  | 'yogiyo' | 'coupangeats' | 'yeoshin' | 'hometax'

interface Platform {
  id: PlatformId
  name: string
  shortName: string
  logo: (size?: number) => JSX.Element
  category: '리뷰·검색' | '지도·리뷰' | '배달' | '금융·세무'
  connected: boolean
  rating: number | null
  reviews: number | null
  color: string
}

// 대시보드 로컬 id ↔ 공통 훅 canonical id 매핑
const TO_CANONICAL: Record<PlatformId, CanonicalPlatformId> = {
  naver_place: 'naver',
  google: 'google',
  kakao_map: 'kakao',
  baemin: 'baemin',
  yogiyo: 'yogiyo',
  coupangeats: 'coupang',
  yeoshin: 'yeoshin',
  hometax: 'hometax',
}
const INITIAL_PLATFORMS: Platform[] = [
  { id: 'naver_place',  name: '네이버 플레이스', shortName: '네이버',   logo: (s) => <NaverPlaceLogo size={s}/>,   category: '리뷰·검색', connected: false, rating: null, reviews: null, color: '#03C75A' },
  { id: 'google',       name: '구글 비즈니스',   shortName: '구글',     logo: (s) => <GoogleLogo size={s}/>,       category: '리뷰·검색', connected: false, rating: null, reviews: null, color: '#4285F4' },
  { id: 'kakao_map',    name: '카카오맵',          shortName: '카카오',   logo: (s) => <KakaoMapLogo size={s}/>,     category: '지도·리뷰', connected: false, rating: null, reviews: null, color: '#FEE500' },
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

// 플레이스(실시간) 페이지와 동일한 키워드 패턴 (업종별 접미어)
const KW_PATTERNS: Record<string, string[]> = {
  '맛집':     ['맛집', '회식', '점심', '데이트', '저녁'],
  '카페':     ['카페', '브런치', '디저트', '스터디카페', '감성카페'],
  '네일샵':   ['네일', '젤네일', '패디큐어', '네일아트', '속눈썹'],
  '치과':     ['치과', '임플란트', '교정', '라미네이트', '스케일링'],
  '미용실':   ['미용실', '염색', '펌', '남자컷', '헤어컷'],
  '동물병원': ['동물병원', '건강검진', '예방접종', '중성화', '강아지'],
  '학원':     ['학원', '과외', '입시학원', '영어학원', '수학학원'],
  '피트니스': ['헬스장', 'PT', '필라테스', '요가', '크로스핏'],
  '병원':     ['병원', '의원', '진료', '예약', '상담'],
}
const KW_RANKS = [3, 7, 12, 21, 34] as const
const KW_PREV  = [5, 7, 15, 18, null] as const

// 플레이스(실시간) 페이지의 buildMockData 와 동일한 키워드 생성
function generateRegionKeywords(region: string, storeName?: string, category?: string): KeywordRank[] {
  const cat = category || '맛집'
  const suffixes = KW_PATTERNS[cat] || KW_PATTERNS['맛집']
  const times = ['방금 전', '3분 전', '10분 전', '18분 전', '방금 전']
  return [
    { keyword: `${region} ${suffixes[0]}`,   rank: KW_RANKS[0], prevRank: KW_PREV[0] ?? null, area: region, updatedAt: times[0] },
    { keyword: storeName ? `${storeName} ${region}` : `${region}역 ${suffixes[0]}`, rank: KW_RANKS[1], prevRank: KW_PREV[1] ?? null, area: region, updatedAt: times[1] },
    { keyword: `${region}역 ${suffixes[0]}`, rank: KW_RANKS[2], prevRank: KW_PREV[2] ?? null, area: region, updatedAt: times[2] },
    { keyword: `${region} ${suffixes[3] || suffixes[0]}`, rank: KW_RANKS[3], prevRank: KW_PREV[3] ?? null, area: region, updatedAt: times[3] },
    { keyword: `${region} ${suffixes[1] || suffixes[0]}`, rank: KW_RANKS[4], prevRank: KW_PREV[4] ?? null, area: region, updatedAt: times[4] },
  ]
}

function inferCategoryFromStore(name: string): string | null {
  if (!name) return null
  if (/카페|커피|베이커리|브런치/.test(name)) return '카페'
  if (/치과/.test(name)) return '치과'
  if (/네일/.test(name)) return '네일샵'
  if (/미용실|헤어샵|헤어|살롱/.test(name)) return '미용실'
  if (/동물병원/.test(name)) return '동물병원'
  if (/학원/.test(name)) return '학원'
  if (/헬스|피트니스|요가|필라테스/.test(name)) return '피트니스'
  if (/의원|한의원|정형외과|병원/.test(name)) return '병원'
  return null
}

const RECENT_REVIEWS = [
  { platform: '네이버',  name: '이**', rating: 1, text: '대기 시간이 너무 길었고 음식도 식어서 나왔습니다. 재방문은 어려울 것 같아요.', time: '1시간 전', replied: false, color: '#03C75A' },
  { platform: '네이버',  name: '김**', rating: 5, text: '음식도 맛있고 직원분들도 친절해요. 주차도 편하고 재방문 의사 있습니다!', time: '2시간 전', replied: false, color: '#03C75A' },
  { platform: '구글',    name: 'J**',  rating: 4, text: 'Great food and cozy atmosphere. Service was excellent. Will definitely come back!', time: '5시간 전', replied: true,  color: '#4285F4' },
  { platform: '구글',    name: '최**', rating: 2, text: '주차 안내가 불친절했고 계산 시 실수가 있어 당황스러웠습니다.', time: '7시간 전', replied: false, color: '#4285F4' },
  { platform: '네이버',  name: '박**', rating: 5, text: '회식으로 왔는데 음식 양도 많고 맛도 좋았어요. 사장님도 친절하시고 너무 좋았습니다', time: '어제',     replied: false, color: '#03C75A' },
  { platform: '구글',    name: 'L**',  rating: 3, text: 'Food was okay but waiting time was a bit long. Interior is nice though.', time: '어제',     replied: false, color: '#4285F4' },
]

// 30차-23: 실제 platform_reviews 레코드 (요약 카드·하단 최근 리뷰 용)
interface RealReview {
  id: string
  platform: string              // 'naver_place' | 'baemin' | ...
  platform_review_id?: string | null
  author_name?: string | null
  author_mask?: string | null
  rating: number | null
  content: string
  photos?: string[] | null
  posted_at: string | null
  collected_at?: string | null
  has_reply: boolean
  reply_status?: string | null
  draft_reply?: string | null
  sentiment?: 'positive' | 'neutral' | 'negative' | null
}

// "2026-04-21T10:22:00Z" → "1시간 전" / "어제" / "3일 전" / "4월 12일"
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diffMs = Date.now() - t
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day === 1) return '어제'
  if (day < 7) return `${day}일 전`
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

// DB platform slug → 대시보드 PlatformId (동일하지만 타입 안정성)
function dbPlatformToId(dbPlatform: string): PlatformId | null {
  const map: Record<string, PlatformId> = {
    naver_place: 'naver_place',
    google: 'google',
    kakao_map: 'kakao_map',
    baemin: 'baemin',
    yogiyo: 'yogiyo',
    coupangeats: 'coupangeats',
  }
  return map[dbPlatform] ?? null
}

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

// ─── 지역 커뮤니티 위젯 ────────────────────────────────────────────
const REGION_ID_MAP: Record<string, string> = {
  '부천': 'gyeonggi-bucheon', '수원': 'gyeonggi-suwon', '성남': 'gyeonggi-seongnam',
  '고양': 'gyeonggi-goyang', '일산': 'gyeonggi-goyang', '용인': 'gyeonggi-yongin',
  '안양': 'gyeonggi-anyang', '의정부': 'gyeonggi-uijeongbu', '안산': 'gyeonggi-ansan',
  '화성': 'gyeonggi-hwaseong', '파주': 'gyeonggi-paju', '남양주': 'gyeonggi-namyangju',
  '강남': 'seoul-gangnam', '마포': 'seoul-mapo', '홍대': 'seoul-mapo',
  '송파': 'seoul-songpa', '강동': 'seoul-gangdong', '강서': 'seoul-gangseo',
  '종로': 'seoul-jongno', '중구': 'seoul-junggu', '영등포': 'seoul-yeongdeungpo',
  '해운대': 'busan-haeundae', '부산': 'busan-haeundae', '대구': 'daegu-suseong',
  '인천': 'incheon-namdong', '대전': 'daejeon-yuseong', '광주': 'gwangju-seo',
  '분당': 'gyeonggi-bundang', '판교': 'gyeonggi-bundang',
}

const COMMUNITY_SAMPLE: Array<{
  id: number; category: string; region_id: string; title: string;
  author: string; avatar: string; time: string; likes: number; comments: number
}> = [
  { id: 1, category: 'success', region_id: 'gyeonggi-bucheon', title: '부천 소사동 카페 플레이스 1위 달성 후기', author: '소사카페', avatar: '소', time: '1시간 전', likes: 34, comments: 8 },
  { id: 2, category: 'tip',     region_id: 'gyeonggi-bucheon', title: '부천 상동 맛집 키워드 공략법 공유해요', author: '상동식당', avatar: '상', time: '3시간 전', likes: 52, comments: 14 },
  { id: 3, category: 'qna',     region_id: 'gyeonggi-bucheon', title: '부천 역곡에서 배달 시작하려는데 추천 플랫폼은?', author: '역곡분식', avatar: '역', time: '5시간 전', likes: 11, comments: 6 },
  { id: 4, category: 'free',    region_id: 'gyeonggi-bucheon', title: '부천 중동 상권 요즘 어떤가요?', author: '중동피부샵', avatar: '중', time: '어제', likes: 28, comments: 19 },
  { id: 5, category: 'success', region_id: 'gyeonggi-bucheon', title: '네이버 리뷰 답변 꾸준히 했더니 별점 0.4 올랐어요', author: '부천헤어', avatar: '부', time: '2일 전', likes: 47, comments: 11 },
  { id: 6, category: 'tip',     region_id: 'nationwide', title: 'AI 리뷰 답글로 응답률 100% 달성 팁', author: '마케팅고수', avatar: '마', time: '4시간 전', likes: 89, comments: 22 },
  { id: 7, category: 'success', region_id: 'nationwide', title: '인스타 릴스 + 네이버 플레이스 시너지 효과', author: '로컬루션팀', avatar: '로', time: '1일 전', likes: 63, comments: 17 },
  { id: 8, category: 'qna',     region_id: 'nationwide', title: '스마트플레이스 사진 업로드 순서도 순위에 영향 있나요?', author: '초보사장님', avatar: '초', time: '2일 전', likes: 19, comments: 9 },
  // 수원
  { id: 9,  category: 'tip',     region_id: 'gyeonggi-suwon', title: '수원 행궁동 골목상권 SNS 마케팅 후기', author: '행궁카페', avatar: '행', time: '2시간 전', likes: 41, comments: 7 },
  { id: 10, category: 'success', region_id: 'gyeonggi-suwon', title: '수원 인계동 네일샵 플레이스 별점 관리법', author: '인계네일', avatar: '인', time: '1일 전', likes: 33, comments: 5 },
  // 성남/분당
  { id: 11, category: 'tip',     region_id: 'gyeonggi-bundang', title: '분당 정자동 카페 키워드 전략 공유', author: '정자카페', avatar: '정', time: '3시간 전', likes: 55, comments: 12 },
  // 강남
  { id: 12, category: 'success', region_id: 'seoul-gangnam', title: '강남 청담 헤어샵 예약률 2배 만든 방법', author: '청담헤어', avatar: '청', time: '6시간 전', likes: 78, comments: 25 },
  // 마포/홍대
  { id: 13, category: 'free',    region_id: 'seoul-mapo', title: '홍대 상권 요즘 트렌드 어떤가요', author: '홍대식당', avatar: '홍', time: '어제', likes: 22, comments: 8 },
  // 해운대
  { id: 14, category: 'tip',     region_id: 'busan-haeundae', title: '해운대 여름 성수기 마케팅 준비 팁', author: '해운대카페', avatar: '해', time: '1일 전', likes: 44, comments: 6 },
]

const CAT_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  success: { label: '성공사례', bg: '#ECFDF5', text: '#059669' },
  tip:     { label: '마케팅 팁', bg: '#FFFBEB', text: '#D97706' },
  qna:     { label: '질문/답변', bg: '#EFF6FF', text: '#3182F6' },
  free:    { label: '자유게시판', bg: '#F5F3FF', text: '#7C3AED' },
}

function mapRegionToId(region: string | null): string {
  if (!region) return 'nationwide'
  for (const [key, id] of Object.entries(REGION_ID_MAP)) {
    if (region.includes(key)) return id
  }
  return 'nationwide'
}

function CommunityWidget({ storeRegion }: { storeRegion: string | null }) {
  const defaultRegionId = mapRegionToId(storeRegion)
  const defaultLabel = storeRegion
    ? Object.entries(REGION_ID_MAP).find(([k]) => storeRegion.includes(k))?.[0] || storeRegion
    : null

  const [selectedRegionId, setSelectedRegionId] = useState(defaultRegionId)
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel)
  const [spinning, setSpinning] = useState(false)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [seed, setSeed] = useState(0)

  // 지역 목록 (주요 지역만)
  const REGION_OPTIONS = [
    { id: 'nationwide',          label: '전국' },
    { id: 'gyeonggi-bucheon',    label: '부천' },
    { id: 'gyeonggi-suwon',      label: '수원' },
    { id: 'gyeonggi-seongnam',   label: '성남' },
    { id: 'gyeonggi-goyang',     label: '고양/일산' },
    { id: 'gyeonggi-yongin',     label: '용인' },
    { id: 'gyeonggi-bundang',    label: '분당' },
    { id: 'gyeonggi-anyang',     label: '안양' },
    { id: 'gyeonggi-namyangju',  label: '남양주' },
    { id: 'seoul-gangnam',       label: '강남' },
    { id: 'seoul-mapo',          label: '마포/홍대' },
    { id: 'seoul-songpa',        label: '송파' },
    { id: 'seoul-gangseo',       label: '강서' },
    { id: 'seoul-yeongdeungpo',  label: '영등포' },
    { id: 'busan-haeundae',      label: '해운대' },
    { id: 'incheon-namdong',     label: '인천' },
    { id: 'daejeon-yuseong',     label: '대전' },
    { id: 'daegu-suseong',       label: '대구' },
    { id: 'gwangju-seo',         label: '광주' },
  ]

  const posts = COMMUNITY_SAMPLE
    .filter(p => p.region_id === selectedRegionId || p.region_id === 'nationwide')
    .slice(seed % 2 === 0 ? 0 : 1, (seed % 2 === 0 ? 0 : 1) + 4)

  function handleRefresh() {
    setSpinning(true)
    setSeed(s => s + 1)
    setTimeout(() => setSpinning(false), 600)
  }

  function handleRegionSelect(id: string, label: string) {
    setSelectedRegionId(id)
    setSelectedLabel(id === 'nationwide' ? null : label)
    setShowRegionPicker(false)
    setSeed(s => s + 1)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 border-b border-[#F2F4F6] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users size={15} className="text-[#3182F6] flex-shrink-0" strokeWidth={2.5} />
          <span className="text-sm font-bold text-[#191F28] truncate">
            {selectedLabel ? `${selectedLabel} 커뮤니티` : '로컬 커뮤니티'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 지역 변경 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowRegionPicker(v => !v)}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] font-medium transition-colors"
            >
              <MapPin size={10} strokeWidth={2.5} />
              {selectedLabel || '전국'}
              <ChevronDown size={10} strokeWidth={2.5} />
            </button>
            {showRegionPicker && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-[#E5E8EB] z-50 py-1 max-h-52 overflow-y-auto">
                {REGION_OPTIONS.map(opt => (
                  <button key={opt.id}
                    onClick={() => handleRegionSelect(opt.id, opt.label)}
                    className={'w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F2F4F6] transition-colors ' + (selectedRegionId === opt.id ? 'font-bold text-[#3182F6]' : 'text-[#4E5968]')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg hover:bg-[#F2F4F6] text-[#8B95A1] hover:text-[#3182F6] transition-colors"
            title="새로고침"
          >
            <RefreshCw size={13} strokeWidth={2.5} className={spinning ? 'animate-spin' : ''} />
          </button>
          <Link href="/community" className="flex items-center gap-0.5 text-[11px] text-[#8B95A1] hover:text-[#3182F6] transition-colors">
            전체보기 <ArrowRight size={11} />
          </Link>
        </div>
      </div>
      <div className="divide-y divide-[#F8F9FA]">
        {posts.map(post => {
          const cat = CAT_STYLE[post.category] || CAT_STYLE.free
          return (
            <Link key={post.id + '-' + seed} href="/community"
              className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAFBFC] transition-colors group">
              <div className="w-7 h-7 rounded-full bg-[#3182F6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {post.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: cat.bg, color: cat.text }}>{cat.label}</span>
                  {post.region_id !== 'nationwide' && (
                    <span className="text-[9px] text-[#8B95A1]">📍 내 지역</span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-[#191F28] truncate group-hover:text-[#3182F6] transition-colors">
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#8B95A1]">
                  <span>{post.author}</span>
                  <span>·</span>
                  <span>{post.time}</span>
                  <span className="flex items-center gap-0.5 ml-auto">
                    <ThumbsUp size={9} /> {post.likes}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare size={9} /> {post.comments}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      <div className="px-4 py-3 bg-[#FAFBFC] border-t border-[#F2F4F6]">
        <Link href="/community"
          className="flex items-center justify-center gap-1.5 text-[12px] text-[#3182F6] font-bold hover:underline">
          <Flame size={12} /> {selectedLabel ? `${selectedLabel} 커뮤니티 더 보기` : '커뮤니티 더 보기'}
        </Link>
      </div>
    </div>
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
  initialUrl?: string
  isConnected?: boolean
  savedStoreName?: string | null
  onClose: () => void
  onSave: (id: PlatformId, data: VerifyResult & { input: string }) => void
  onDisconnect?: (id: PlatformId) => Promise<void> | void
}

function ConnectModal({ platform, initialUrl, isConnected, savedStoreName, onClose, onSave, onDisconnect }: ConnectModalProps) {
  // 30차-15-A: 이미 저장된 URL 이 있으면 prefill
  const [url, setUrl] = useState(initialUrl ?? '')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  const apiEndpoint = (() => {
    if (platform.id === 'naver_place') return '/api/platforms/naver'
    if (platform.id === 'google') return '/api/platforms/google'
    if (platform.id === 'kakao_map') return '/api/platforms/kakao'
    return '/api/platforms/delivery'
  })()

  const placeholder = (() => {
    if (platform.id === 'naver_place') return 'https://map.naver.com/p/entry/place/1234567890'
    if (platform.id === 'google') return 'https://www.google.com/maps/place/... 또는 Place ID (ChIJ...)'
    if (platform.id === 'kakao_map') return 'https://place.map.kakao.com/616380187'
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
          <div className="flex-1">
            <h3 className="text-lg font-black text-[#191F28]">{platform.name} 연동</h3>
            <p className="text-xs text-[#8B95A1]">
              {isConnected ? '이미 연결됨 — URL 변경 또는 해제 가능' : '매장 URL 또는 ID를 입력하세요'}
            </p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#E8FFF0] text-[#12B76A] rounded-md text-[10px] font-black">
              <Check size={11} strokeWidth={3} />
              연결됨
            </div>
          )}
        </div>

        {isConnected && savedStoreName && (
          <div className="mb-3 p-3 bg-[#F2F4F6] rounded-xl">
            <div className="text-[10px] text-[#8B95A1] mb-0.5">현재 연결된 매장</div>
            <div className="text-sm font-bold text-[#191F28]">{savedStoreName}</div>
          </div>
        )}

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

        {isConnected && onDisconnect && (
          <button
            onClick={async () => {
              if (!window.confirm(`${platform.name} 연결을 정말 해제할까요?\n해제 후 다시 연동하려면 ID/비밀번호를 다시 입력해야 해요.`)) return
              setDisconnecting(true)
              try {
                await onDisconnect(platform.id)
                onClose()
              } finally {
                setDisconnecting(false)
              }
            }}
            disabled={disconnecting}
            className="w-full mb-2 border border-[#F04452] text-[#F04452] py-2.5 rounded-xl text-xs font-bold hover:bg-[#FFF0F0] disabled:opacity-50"
          >
            {disconnecting ? '해제 중...' : '연결 해제'}
          </button>
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
            {isConnected ? '변경 저장' : '연동 저장'}
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
//  인기 서비스 TOP 10 (순위 애니메이션)
// ═══════════════════════════════════════════════════════════
const SERVICE_RANKING_INIT = [
  { id: 1,  name: 'AI 리뷰 자동 답글',  category: '리뷰', badge: 'HOT',  color: '#F04452' },
  { id: 2,  name: '네이버 플레이스 관리', category: '플레이스', badge: '',     color: '#03C75A' },
  { id: 3,  name: 'QR 리뷰 자동화',         category: 'QR',     badge: 'NEW',  color: '#7C3AED' },
  { id: 4,  name: '매출 캘린더 · 정산',     category: '정산', badge: '',     color: '#3182F6' },
  { id: 5,  name: '고객 CRM 관리',              category: 'CRM',    badge: '',     color: '#F59E0B' },
  { id: 6,  name: '키워드 순위 추적',          category: 'SEO',    badge: '',     color: '#10B981' },
  { id: 7,  name: '숏폼 퍼블리셔',           category: '마케팅', badge: '',     color: '#EC4899' },
  { id: 8,  name: '배민 리뷰 연동',            category: '배달', badge: '',     color: '#2AC1BC' },
  { id: 9,  name: '구글 리뷰 연동',            category: '구글', badge: '',     color: '#4285F4' },
  { id: 10, name: '세금계산서 자동 발행',      category: '행정', badge: '',     color: '#6B7280' },
]

function QuickNav() {
  const links = [
    { href: '/dashboard',        label: '대시보드',   bg: '#EFF6FF', color: '#3182F6',  icon: 'DB' },
    { href: '/reviews',          label: '리뷰 관리',  bg: '#FFFBEB', color: '#F59E0B',  icon: '리뷰' },
    { href: '/marketing/place',  label: '마케팅 관리',bg: '#FFF7ED', color: '#EA580C',  icon: '마케' },
    { href: '/qr-admin',         label: 'QR 관리',    bg: '#F5F3FF', color: '#8B5CF6',  icon: 'QR' },
    { href: '/customers',        label: '고객 관리',  bg: '#ECFDF5', color: '#059669',  icon: '고객' },
    { href: '/settings/profile', label: '매장 관리',  bg: '#FFF1F2', color: '#E11D48',  icon: '매장' },
    { href: '/community',        label: '커뮤니티',   bg: '#FDF2F8', color: '#EC4899',  icon: '커뮤' },
  ]
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F2F4F6]">
        <span className="text-sm font-bold text-[#191F28]">빠른 이동</span>
        <p className="text-[10px] text-[#8B95A1] mt-0.5">주요 메뉴 바로가기</p>
      </div>
      <div className="p-3 space-y-1">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F8F9FA] transition-colors group">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: l.bg, color: l.color }}>{l.icon}</div>
            <span className="text-sm font-medium text-[#4E5968] group-hover:text-[#191F28]">{l.label}</span>
            <ArrowRight size={12} strokeWidth={2.5} className="ml-auto text-[#D1D5DB] group-hover:text-[#3182F6] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function ServiceRanking() {
  const [items, setItems] = useState(SERVICE_RANKING_INIT.map((s, i) => ({ ...s, rank: i + 1, prevRank: i + 1, score: 100 - i * 8 })))
  const [isShuffling, setIsShuffling] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsShuffling(true)
      setTimeout(() => {
        setItems(prev => {
          const arr = [...prev]
          const swapCount = 2 + Math.floor(Math.random() * 2)
          for (let s = 0; s < swapCount; s++) {
            const a = Math.floor(Math.random() * arr.length)
            let b = Math.floor(Math.random() * arr.length)
            while (b === a) b = Math.floor(Math.random() * arr.length)
            arr[a].score += Math.floor(Math.random() * 10) - 4
            arr[b].score += Math.floor(Math.random() * 10) - 4
          }
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
                {diff > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#12B76A]">
                    <ArrowUp size={10} strokeWidth={3} />{diff}
                  </span>
                )}
                {diff < 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#F04452]">
                    <ArrowDown size={10} strokeWidth={3} />{Math.abs(diff)}
                  </span>
                )}
                {diff === 0 && <span className="text-[11px] text-[#8B95A1]">—</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
//  메인 대시보드
// ═══════════════════════════════════════════════════════════
export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  useEffect(() => {
    const check = () => {
      if (typeof document === 'undefined') return
      // 30차-4: 쿠키 이름 정합성 — 서버 requireUser() 는 localution_user 쿠키를 읽음.
      // 기존엔 localution_session 만 검사해서 OAuth 로그인 상태에서도 isLoggedIn=false 였음.
      const c = document.cookie
      const has =
        c.indexOf('localution_user=') !== -1 ||
        c.indexOf('localution_session=') !== -1
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

  // 30차-15-A: 서버 저장된 플랫폼별 상세 (모달 prefill 용)
  const [serverPlatformDetails, setServerPlatformDetails] = useState<
    Record<string, { connected: boolean; platform_store_id: string | null; platform_store_name: string | null }>
  >({})
  const [serverStore, setServerStore] = useState<{
    naver_place_id?: string | null
    naver_url?: string | null
  } | null>(null)

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
      // 30차-18: canonical 이 "disconnected" 여도 rating/reviews 는 초기화하지 않는다.
      //   · reloadStoresMe 가 이미 set 한 집계(p.reviews=20)를 여기서 덮어쓰면
      //     "20건 수집했는데 대시보드에 안 보임" 재현 버그.
      //   · connected 플래그만 canonical 기준으로 해제하고, 집계는 /api/stores/me 를 단일 진실원으로.
      return { ...p, connected: false }
    }))
  }, [canonicalConnections])

  // 30차-2: 서버 단일 진실원 동기화 (/api/stores/me → platform_credentials)
  //   · /my/platforms/[platform]/connect 에서 ID/비번 입력해 저장한 연결은
  //     platform_credentials 테이블에 있고 localStorage 에는 없음.
  //   · 여기서 서버 상태를 읽어 platforms[].connected 를 "true 로만" 덮어써서
  //     로컬스토리지 기반 + 서버 기반 연결이 합쳐지도록 한다.
  //   · 서버 slug (naver_place/baemin/yogiyo/coupangeats) 는 대시보드 PlatformId 와 동일명.
  // 30차-15-B: 서버 응답의 review_count/rating_avg 도 대시보드 state 로 반영.
  //   → "데이터 수집 중..." → 실제 별점/리뷰 수로 자동 전환
  const [reviewsFetchState, setReviewsFetchState] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle')
  const [workerCollecting, setWorkerCollecting] = useState<Record<string, boolean>>({})

  // 30차-23: 연결된 플랫폼별 실제 리뷰 (키: PlatformId, 값: RealReview[])
  //   · 좌측 "플랫폼별 별점·리뷰 현황" 카드의 플랫폼 행 아래 최신 2건 미니 렌더
  //   · 하단 "최근 리뷰" 섹션에 전 플랫폼 통합 정렬
  const [platformReviews, setPlatformReviews] = useState<Record<string, RealReview[]>>({})
  const loadPlatformReviews = useCallback(async (platformIds: PlatformId[]): Promise<void> => {
    if (platformIds.length === 0) return
    const results: Record<string, RealReview[]> = {}
    await Promise.all(
      platformIds.map(async (pid) => {
        try {
          const params = new URLSearchParams({ platform: pid, limit: '30', period: 'all' })
          const res = await fetch(`/api/place/reviews?${params.toString()}`, { cache: 'no-store' })
          if (!res.ok) return
          const j = await res.json().catch(() => null)
          if (!j?.ok || !Array.isArray(j.reviews)) return
          results[pid] = j.reviews as RealReview[]
        } catch {
          // 단일 플랫폼 실패는 다른 플랫폼 결과를 막지 않음
        }
      }),
    )
    setPlatformReviews((prev) => ({ ...prev, ...results }))
  }, [])

  const reloadStoresMe = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/stores/me', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (!data?.ok) return
      const server: Array<{
        platform: string
        connected: boolean
        platform_store_id: string | null
        platform_store_name: string | null
        review_count?: number
        rating_avg?: number | null
      }> = data.platforms ?? []

      const detailsMap: Record<
        string,
        { connected: boolean; platform_store_id: string | null; platform_store_name: string | null }
      > = {}
      const aggMap: Record<string, { review_count: number; rating_avg: number | null }> = {}
      server.forEach((p) => {
        detailsMap[p.platform] = {
          connected: !!p.connected,
          platform_store_id: p.platform_store_id ?? null,
          platform_store_name: p.platform_store_name ?? null,
        }
        aggMap[p.platform] = {
          review_count: Number(p.review_count ?? 0),
          rating_avg: typeof p.rating_avg === 'number' ? p.rating_avg : null,
        }
      })
      setServerPlatformDetails(detailsMap)
      setServerStore({
        naver_place_id: data.store?.naver_place_id ?? null,
        naver_url: data.store?.naver_url ?? data.store?.naver_place_url ?? null,
      })

      const connectedSet = new Set(
        server.filter((p) => p.connected).map((p) => p.platform)
      )
      setPlatforms((prev) =>
        prev.map((p) => {
          const agg = aggMap[p.id]
          const hasAgg = agg && agg.review_count > 0
          return {
            ...p,
            connected: connectedSet.has(p.id) ? true : p.connected,
            // 서버 집계가 있으면 실제 값으로 덮어쓰기. 없으면 기존 state 유지 (localStorage 값 포함)
            rating: hasAgg ? agg.rating_avg : p.rating,
            reviews: hasAgg ? agg.review_count : p.reviews,
          }
        })
      )
    } catch {
      // graceful degrade — 서버 응답 실패시 localStorage 만 쓰임
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    reloadStoresMe()
  }, [isLoggedIn, reloadStoresMe])

  // 30차-23: 연결된 플랫폼이 하나라도 변경되면 실제 리뷰 로드
  //   · 현재 platform_reviews 테이블에 데이터가 있는 건 naver_place 뿐이지만,
  //     baemin/yogiyo/coupangeats 도 23차-5 Worker 붙으면 자동으로 채워진다.
  useEffect(() => {
    if (!isLoggedIn) return
    const connectedIds = platforms
      .filter((p) => p.connected && (p.category === '리뷰·검색' || p.category === '배달'))
      .map((p) => p.id)
      .filter((pid) => pid === 'naver_place' || pid === 'baemin' || pid === 'yogiyo' || pid === 'coupangeats' || pid === 'google' || pid === 'kakao_map')
    if (connectedIds.length === 0) {
      setPlatformReviews({})
      return
    }
    loadPlatformReviews(connectedIds)
  }, [isLoggedIn, platforms, loadPlatformReviews])

  // 30차-15-B: 연결된 네이버 플레이스가 있고 리뷰 집계가 0건이면 자동으로 1회 수집 시도
  //   · 사용자가 "지금 수집" 을 누르지 않아도 연결 직후 첫 수집을 빠르게 반영해
  //     "데이터 수집 중..." 라벨이 저절로 해소되도록 한다.
  //   · 중복 호출 방지: reviewsFetchState 로 가드
  useEffect(() => {
    if (!isLoggedIn) return
    if (reviewsFetchState !== 'idle') return
    const nv = platforms.find((p) => p.id === 'naver_place')
    if (!nv?.connected) return
    // 이미 집계가 있으면 (reviews > 0) 수집 스킵
    if (typeof nv.reviews === 'number' && nv.reviews > 0) return

    setReviewsFetchState('fetching')
    ;(async () => {
      try {
        const res = await fetch('/api/place/reviews/fetch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!res.ok) {
          setReviewsFetchState('error')
          return
        }
        const j = await res.json().catch(() => null)
        if (j?.ok && typeof j.total === 'number' && j.total > 0) {
          await reloadStoresMe()
        }
        setReviewsFetchState('done')
      } catch {
        setReviewsFetchState('error')
      }
    })()
  }, [isLoggedIn, platforms, reviewsFetchState, reloadStoresMe])

  const handleCollectNaverReviews = async () => {
    setReviewsFetchState('fetching')
    try {
      const res = await fetch('/api/place/reviews/fetch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) {
        toast.error(j?.error || `리뷰 수집 실패 (${res.status})`)
        setReviewsFetchState('error')
        return
      }
      await reloadStoresMe()
      // 30차-23: 수집 직후 리뷰 목록도 즉시 갱신 → UI 바로 반영
      await loadPlatformReviews(['naver_place'])
      if (j.total > 0) {
        toast.success(`네이버 리뷰 ${j.total}건 수집 완료`)
      } else {
        toast.info(j.note || '수집된 리뷰가 없습니다')
      }
      setReviewsFetchState('done')
    } catch (e: any) {
      toast.error(`수집 오류: ${e?.message || e}`)
      setReviewsFetchState('error')
    }
  }

  const handleCollectWorkerPlatform = async (platformId: string) => {
    setWorkerCollecting(prev => ({ ...prev, [platformId]: true }))
    try {
      const res = await fetch('/api/review-reply/collect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) {
        toast.error(j?.error || j?.message || `수집 요청 실패 (${res.status})`)
        setWorkerCollecting(prev => ({ ...prev, [platformId]: false }))
        return
      }
      toast.info('워커에 수집 요청 완료 — 리뷰가 들어오면 자동으로 업데이트됩니다')

      // 20초 간격으로 최대 9회(3분) 폴링 — 리뷰 생기면 즉시 반영
      let tries = 0
      const prevCount = (platformReviews[platformId] || []).length
      const timer = setInterval(async () => {
        tries++
        try {
          await loadPlatformReviews([platformId as PlatformId])
          await reloadStoresMe()
          const newCount = (platformReviews[platformId] || []).length
          if (newCount > prevCount || tries >= 9) {
            clearInterval(timer)
            setWorkerCollecting(prev => ({ ...prev, [platformId]: false }))
            if (newCount > prevCount) {
              toast.success(`${platformId} 리뷰 ${newCount}건 수집 완료!`)
            } else {
              toast.info('수집 완료 — 리뷰 관리 페이지에서 확인하세요')
            }
          }
        } catch {
          if (tries >= 9) {
            clearInterval(timer)
            setWorkerCollecting(prev => ({ ...prev, [platformId]: false }))
          }
        }
      }, 20000)
    } catch (e: any) {
      toast.error(`수집 오류: ${e?.message || e}`)
      setWorkerCollecting(prev => ({ ...prev, [platformId]: false }))
    }
  }

  // keyword-rank 페이지 등록 키워드 → 대시보드 주요키워드 순위 연동
  useEffect(() => {
    function syncKeywordsFromRank() {
      try {
        // 1) keyword-rank 저장 키워드 우선
        type KrankGroup = { keyword: string; relatedKw: string; label: string; history: Array<{ date: string; rank: number | null }> }
        type KrankSet   = { id: string; name: string; region: string; groups: KrankGroup[] }
        const saved: KrankSet[] = JSON.parse(localStorage.getItem('localution.krank_saved_v1') || '[]')

        if (saved.length > 0) {
          const mapped: KeywordRank[] = []
          for (const set of saved) {
            for (const g of set.groups) {
              const latest = g.history?.[0] ?? null
              const prev   = g.history?.[1] ?? null
              mapped.push({
                keyword:   g.keyword,
                rank:      latest?.rank ?? 999,
                prevRank:  prev?.rank ?? null,
                area:      set.region || undefined,
                updatedAt: latest?.date || '—',
              })
            }
          }
          setKeywords(mapped.slice(0, 10))
          setStoreRegion(saved[0]?.region || null)
          setMainKeyword(mapped[0]?.keyword || '')
          return
        }

        // 2) fallback: 프로필 기반 자동 생성
        const raw1 = localStorage.getItem('localution.store_info')
        const raw2 = localStorage.getItem(LS_STORE)
        const profile = raw1 ? JSON.parse(raw1) : raw2 ? JSON.parse(raw2) : null
        const region = extractRegion(profile?.address || profile?.location, profile?.storeName || profile?.name, profile?.branch)
        if (region) {
          const storeName = profile?.name || profile?.storeName || ''
          const category = profile?.category || profile?.industry || inferCategoryFromStore(storeName) || '맛집'
          setStoreRegion(region)
          setKeywords(generateRegionKeywords(region, storeName, category))
          setMainKeyword(`${region} ${(KW_PATTERNS[category] || KW_PATTERNS['맛집'])[0]}`)
        } else {
          setStoreRegion(null)
          setKeywords([])
          setMainKeyword('')
        }
      } catch {}
    }
    syncKeywordsFromRank()
    const onChange = () => syncKeywordsFromRank()
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_STORE || e.key === 'localution.krank_saved_v1') syncKeywordsFromRank()
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
    if (p.id === 'yogiyo' || p.id === 'coupangeats') {
      window.location.href = `/my/platforms/${p.id}/connect`
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

  // 30차-15-A: 연결 해제 — DELETE /api/platform-accounts + localStorage + 대시보드 state 정리
  const handleDisconnect = async (id: PlatformId) => {
    // naver_place / baemin / yogiyo / coupangeats 만 platform_credentials 로 저장됨
    const credentialPlatforms = ['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'kakao_map']
    if (credentialPlatforms.includes(id)) {
      try {
        const res = await fetch(`/api/platform-accounts?platform=${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) {
          const msg = await res.text()
          toast.error(`해제 실패: ${msg.slice(0, 80)}`)
          return
        }
      } catch (e: any) {
        toast.error(`해제 오류: ${e?.message || e}`)
        return
      }
    }

    // localStorage 정리 (canonical key)
    const canon = TO_CANONICAL[id]
    if (canon) libRemoveConnection(canon)

    // 대시보드 state 즉시 반영
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, connected: false, rating: null, reviews: null } : p)),
    )
    setServerPlatformDetails((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    toast.success('연결이 해제되었습니다.')
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

  // 30차-23: 연결된 전 플랫폼 실제 리뷰 → 최신순 머지
  //   · has_reply=false 포함 전체 리뷰 대상 감정·미답변 집계
  //   · posted_at 없는 행은 collected_at 으로 폴백
  const mergedRealReviews: Array<RealReview & { _platformId: PlatformId }> = (() => {
    const arr: Array<RealReview & { _platformId: PlatformId }> = []
    for (const [pid, rs] of Object.entries(platformReviews)) {
      const id = dbPlatformToId(pid)
      if (!id) continue
      for (const r of rs) arr.push({ ...r, _platformId: id })
    }
    arr.sort((a, b) => {
      const ta = a.posted_at || a.collected_at || ''
      const tb = b.posted_at || b.collected_at || ''
      return tb.localeCompare(ta)
    })
    return arr
  })()
  const hasRealReviews = mergedRealReviews.length > 0

  // 리뷰 감정 분석 — 실데이터가 있으면 실데이터, 없으면 RECENT_REVIEWS (데모)
  const sentimentSource: Array<{ rating: number | null; has_reply?: boolean; replied?: boolean }> = hasRealReviews
    ? mergedRealReviews.map((r) => ({ rating: r.rating, has_reply: r.has_reply }))
    : RECENT_REVIEWS.map((r) => ({ rating: r.rating, replied: r.replied }))
  const sentimentCount = {
    positive: sentimentSource.filter((r) => typeof r.rating === 'number' && r.rating >= 4).length,
    neutral:  sentimentSource.filter((r) => typeof r.rating === 'number' && r.rating === 3).length,
    negative: sentimentSource.filter((r) => typeof r.rating === 'number' && r.rating <= 2).length,
  }
  const sentimentTotal = sentimentSource.filter((r) => typeof r.rating === 'number').length || 1
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

  // 오늘의 할 일 — 실데이터 있으면 실데이터 기준
  // reply_status='submitted'이면 has_reply=false여도 답변완료로 처리
  const isReplied = (r: RealReview) => r.has_reply || r.reply_status === 'submitted'
  const unansweredCount = hasRealReviews
    ? mergedRealReviews.filter((r) => !isReplied(r)).length
    : RECENT_REVIEWS.filter((r) => !r.replied).length
  const negativeUnansweredCount = hasRealReviews
    ? mergedRealReviews.filter((r) => typeof r.rating === 'number' && r.rating <= 2 && !isReplied(r)).length
    : RECENT_REVIEWS.filter((r) => r.rating <= 2 && !r.replied).length

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
  // 30차-23: 실제 리뷰 → AIReplyModal 이 요구하는 shape 변환
  const openAIReplyFromReal = useCallback(
    (r: RealReview, platformId: PlatformId) => {
      const pf = platforms.find((x) => x.id === platformId)
      const displayName = r.author_mask || r.author_name || '익명'
      setReplyReview({
        platform: pf?.shortName || pf?.name || platformId,
        name: displayName,
        rating: typeof r.rating === 'number' ? r.rating : 0,
        text: r.content || '',
        time: timeAgo(r.posted_at) || (r.collected_at ? timeAgo(r.collected_at) : ''),
        replied: !!r.has_reply,
        color: pf?.color || '#03C75A',
      })
    },
    [platforms],
  )

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        {/* ── 25차-4: 신규 모듈 프로모 스트립 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Link
            href="/marketing/card-news"
            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#EC4899] via-[#F43F5E] to-[#F97316] text-white shadow-sm hover:shadow-lg transition-all"
          >
            <div className="absolute top-3 right-3 text-[9px] font-black bg-white/25 text-white px-2 py-0.5 rounded-full backdrop-blur">NEW</div>
            <div className="flex items-center gap-2 mb-2">
              <Layers size={20} strokeWidth={2.5} />
              <span className="text-[13px] font-black">인스타 카드뉴스</span>
            </div>
            <p className="text-[11px] text-white/90 leading-snug mb-3">주제만 던지면 캐러셀 10장 AI 자동 생성 · PNG 저장</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold">
              만들러 가기 <ArrowRight size={12} strokeWidth={2.75} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <Link
            href="/my/platforms"
            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#A855F7] text-white shadow-sm hover:shadow-lg transition-all"
          >
            <div className="absolute top-3 right-3 text-[9px] font-black bg-white/25 text-white px-2 py-0.5 rounded-full backdrop-blur">NEW</div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={20} strokeWidth={2.5} />
              <span className="text-[13px] font-black">플랫폼 통합 관리</span>
            </div>
            <p className="text-[11px] text-white/90 leading-snug mb-3">네이버·배민·요기요·쿠팡이츠 4곳 리뷰 답글 대리 게시</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold">
              연결하러 가기 <ArrowRight size={12} strokeWidth={2.75} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <Link
            href="/marketing/blog-tracking"
            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#F59E0B] via-[#FACC15] to-[#FCD34D] text-[#1F2937] shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} strokeWidth={2.5} />
              <span className="text-[13px] font-black">블로그 순위 추적</span>
            </div>
            <p className="text-[11px] text-[#1F2937]/85 leading-snug mb-3">스마트블록·블로그탭·인기글 3구간 일 1회 자동 추적</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold">
              추적 시작 <ArrowRight size={12} strokeWidth={2.75} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
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
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 md:gap-2">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => handlePlatformClick(p)}
                className={[
                  'flex flex-col items-center gap-1 p-2 md:p-2.5 rounded-xl transition-all cursor-pointer',
                  p.connected
                    ? 'bg-white border border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md'
                    : 'bg-[#F8F9FA] border border-dashed border-[#E0E0E0] hover:border-[#3182F6] hover:bg-white',
                ].join(' ')}
                title={p.connected ? '클릭하여 연동 정보 수정' : '클릭하여 연동하기'}
              >
                <span className="block md:hidden">{p.logo(26)}</span>
                <span className="hidden md:block">{p.logo(32)}</span>
                <span className="text-[9px] md:text-[10px] font-semibold text-[#4E5968] text-center leading-tight">{p.shortName}</span>
                <span className={[
                  'text-[8px] md:text-[9px] font-bold px-1 md:px-1.5 py-0.5 rounded-full',
                  p.connected ? 'bg-[#E8FFF0] text-[#12B76A]' : 'bg-[#F2F4F6] text-[#8B95A1]',
                ].join(' ')}>
                  {p.connected ? '연동됨' : '연동'}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mb-5">
          {stats.map((s, i) => (
            <div key={i} className={`bg-white rounded-2xl shadow-sm p-3 md:p-4 min-w-0 ${!reviewPlatformConnected ? 'opacity-75' : ''}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1 h-5 rounded-full shrink-0" style={{ background: s.color }}/>
                <span className="text-[10px] md:text-[11px] text-[#8B95A1] font-medium truncate">{s.label}</span>
              </div>
              <p className="text-base md:text-lg font-black text-[#191F28] truncate">{s.value}</p>
              <p className={`inline-flex items-center gap-0.5 text-[10px] font-bold mt-0.5 ${s.up ? 'text-[#12B76A]' : 'text-[#F04452]'}`}>
                {s.up
                  ? <ArrowUp size={10} strokeWidth={2.75} />
                  : <ArrowDown size={10} strokeWidth={2.75} />}
                <span className="truncate">{s.sub}</span>
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
              {/* 30차-15-B: "지금 수집" 버튼 — 네이버 플레이스 연동됐을 때만 노출 */}
              {platforms.find(p => p.id === 'naver_place')?.connected ? (
                <button
                  onClick={handleCollectNaverReviews}
                  disabled={reviewsFetchState === 'fetching'}
                  className="text-[11px] px-2 py-1 rounded-lg bg-[#E8FBF0] text-[#015C2C] font-bold hover:bg-[#D1F7E0] disabled:opacity-50 transition-colors"
                  title="네이버 플레이스 공개 리뷰를 지금 불러옵니다"
                >
                  {reviewsFetchState === 'fetching' ? '수집 중...' : '↻ 지금 수집'}
                </button>
              ) : (
                <span className="text-[11px] text-[#8B95A1]">연동된 플랫폼만 표시</span>
              )}
            </div>
            <div className="p-5 space-y-4">
              {platforms.filter(p => p.connected).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#8B95A1] mb-3">아직 연동된 플랫폼이 없습니다</p>
                  <p className="text-xs text-[#8B95A1]">상단 로고를 클릭해 연동을 시작하세요</p>
                </div>
              ) : (
                platforms.filter(p => p.connected).map(p => {
                  const isFetchingThis = p.id === 'naver_place' && reviewsFetchState === 'fetching'
                  // 30차-23: 이 플랫폼의 최신 리뷰 2건 미니 리스트
                  const miniReviews = (platformReviews[p.id] || []).slice(0, 2)
                  return (
                  <div key={p.id} className="flex flex-col gap-3 pb-4 border-b border-[#F2F4F6] last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">{p.logo(36)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-[#191F28]">{p.name}</span>
                          {/* 30차-17: 리뷰 카운트 기준으로 분기. 네이버 공개 GraphQL 은 rating=null
                              반환(키워드 리뷰 시스템) 이므로 rating 기준 분기는 수집 성공해도
                              "아직 수집 전" 이 계속 노출되던 버그가 있었다. → reviews 개수 기준 */}
                          {typeof p.reviews === 'number' && p.reviews > 0 ? (
                            <div className="flex items-center gap-3">
                              {p.rating !== null ? (
                                <Stars rating={p.rating} />
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1] font-semibold">
                                  키워드 리뷰
                                </span>
                              )}
                              <span className="text-xs text-[#8B95A1]">리뷰 <strong className="text-[#191F28]">{p.reviews}건</strong></span>
                            </div>
                          ) : isFetchingThis ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#3182F6] font-semibold">
                              <span className="w-2 h-2 rounded-full bg-[#3182F6] animate-pulse" />
                              리뷰 수집 중...
                            </span>
                          ) : p.id === 'naver_place' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#8B95A1]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                              아직 수집 전 — 상단 "지금 수집" 클릭
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCollectWorkerPlatform(p.id)}
                              disabled={workerCollecting[p.id]}
                              className="text-[11px] px-2 py-1 rounded-lg bg-[#F0F4FF] text-[#3182F6] font-bold hover:bg-[#DBEAFE] disabled:opacity-50 transition-colors"
                            >
                              {workerCollecting[p.id] ? '요청 중…' : '↻ 지금 수집'}
                            </button>
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
                    {/* 30차-23: 최신 리뷰 2건 미니 카드 */}
                    {miniReviews.length > 0 && (
                      <div className="pl-[52px] space-y-1.5">
                        {miniReviews.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => openAIReplyFromReal(r, p.id)}
                            className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-[#FAFBFF] transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-bold text-[#4E5968] truncate">
                                  {r.author_mask || r.author_name || '익명'}
                                </span>
                                {typeof r.rating === 'number' && <Stars rating={r.rating} />}
                                <span className="text-[10px] text-[#8B95A1]">· {timeAgo(r.posted_at)}</span>
                                {(r.has_reply || r.reply_status === 'submitted') ? (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-[#E8FFF0] text-[#12B76A] px-1.5 py-0.5 rounded-full font-semibold">
                                    <Check size={9} strokeWidth={3} /> 답변완료
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-[#FFF0F0] text-[#F04452] px-1.5 py-0.5 rounded-full font-semibold">
                                    미답변
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#4E5968] line-clamp-1 group-hover:text-[#191F28]">
                                {r.content || '(내용 없음)'}
                              </p>
                            </div>
                            {!r.has_reply && r.reply_status !== 'submitted' && (
                              <span className="text-[10px] text-[#3182F6] font-bold flex-shrink-0 pt-0.5 group-hover:underline">
                                AI 답글 →
                              </span>
                            )}
                          </button>
                        ))}
                        {(platformReviews[p.id]?.length ?? 0) > 2 && (
                          <Link
                            href={p.id === 'naver_place' ? '/review-admin/naver' : p.id === 'baemin' ? '/review-admin/baemin' : p.id === 'yogiyo' ? '/review-admin/yogiyo' : p.id === 'coupangeats' ? '/review-admin/coupang' : p.id === 'kakao_map' ? '/review-admin/kakao' : '/reviews'}
                            className="block text-center text-[10px] text-[#3182F6] font-bold py-1 hover:underline"
                          >
                            {p.name} 리뷰 전체보기 ({platformReviews[p.id]?.length ?? 0}건) →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })
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

          {/* 우측: 지역 커뮤니티 + 인기 서비스 랭킹 */}
          <div className="flex flex-col gap-4">
            <CommunityWidget storeRegion={storeRegion} />
            <ServiceRanking />
          </div>
        </div>

        {/* ── 최근 리뷰 ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-[#F2F4F6] flex items-start md:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap min-w-0">
              <span className="text-sm font-bold text-[#191F28] shrink-0">최근 리뷰</span>
              {!hasRealReviews && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold">데모</span>
              )}
              {hasRealReviews && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#E8F4FD] text-[#3182F6] font-bold">전 플랫폼 통합</span>
              )}
              <span className="text-[11px] text-[#8B95A1]">
                미답변 {hasRealReviews ? mergedRealReviews.filter((r) => !r.has_reply && r.reply_status !== 'submitted').length : RECENT_REVIEWS.filter(r => !r.replied).length}건
              </span>
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
          {!hasRealReviews && !reviewPlatformConnected && (
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
          {/* 30차-23: 연결된 플랫폼 뱃지 행 — 리뷰가 어느 플랫폼에서 왔는지 한눈에 */}
          {hasRealReviews && (
            <div className="px-5 py-3 bg-[#FAFBFF] border-b border-[#F2F4F6] flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#8B95A1] font-semibold">집계 플랫폼:</span>
              {platforms
                .filter((p) => p.connected && (platformReviews[p.id]?.length ?? 0) > 0)
                .map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: p.color }}
                  >
                    {p.logo(12)}
                    {p.shortName}
                    <span className="bg-white/25 rounded-full px-1 text-[9px]">{platformReviews[p.id]?.length ?? 0}</span>
                  </span>
                ))}
            </div>
          )}
          <div className="divide-y divide-[#F2F4F6]">
            {hasRealReviews ? (
              mergedRealReviews.slice(0, 10).map((r) => {
                const pf = platforms.find((x) => x.id === r._platformId)
                const displayColor = pf?.color || '#03C75A'
                const shortLabel = pf?.shortName || r._platformId
                return (
                  <div key={`${r._platformId}-${r.id}`} className="px-5 py-4 hover:bg-[#FAFBFF] transition-colors flex items-start gap-4">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white mt-0.5"
                      style={{ background: displayColor }}
                      title={pf?.name}
                    >
                      {shortLabel.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-[#4E5968]">{r.author_mask || r.author_name || '익명'}</span>
                        {typeof r.rating === 'number' && <Stars rating={r.rating} />}
                        <span className="text-[10px] text-[#8B95A1]">{timeAgo(r.posted_at)}</span>
                        {(r.has_reply || r.reply_status === 'submitted') && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-[#E8FFF0] text-[#12B76A] px-1.5 py-0.5 rounded-full font-semibold">
                            <Check size={10} strokeWidth={3} />
                            답변완료
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#4E5968] line-clamp-1">{r.content || '(내용 없음)'}</p>
                    </div>
                    {!r.has_reply && r.reply_status !== 'submitted' && (
                      <button
                        onClick={() => openAIReplyFromReal(r, r._platformId)}
                        className="flex-shrink-0 ml-4 text-xs bg-[#3182F6] text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-[#1B64DA] transition-colors"
                      >
                        AI 답글
                      </button>
                    )}
                  </div>
                )
              })
            ) : (
              RECENT_REVIEWS.map((r, i) => (
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
              ))
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="-mx-4 md:-mx-6 mt-8">
          <Footer />
        </div>

      </main>

      {/* 모달들 */}
      {connectPlatform && (() => {
        // 30차-15-A: 서버에서 기존 저장값 계산해서 prefill
        const detail = serverPlatformDetails[connectPlatform.id]
        const isConn = !!detail?.connected || connectPlatform.connected
        let prefillUrl = ''
        if (isConn) {
          if (connectPlatform.id === 'naver_place') {
            // 1순위: stores.naver_url, 2순위: platform_credentials.platform_store_id 로 URL 재구성
            const pid = detail?.platform_store_id || serverStore?.naver_place_id
            prefillUrl =
              serverStore?.naver_url ||
              (pid ? `https://map.naver.com/p/entry/place/${pid}` : '')
          } else if (detail?.platform_store_id) {
            prefillUrl = detail.platform_store_id
          }
        }
        return (
          <ConnectModal
            platform={connectPlatform}
            initialUrl={prefillUrl}
            isConnected={isConn}
            savedStoreName={detail?.platform_store_name ?? null}
            onClose={() => setConnectPlatform(null)}
            onSave={handleSaveConnection}
            onDisconnect={handleDisconnect}
          />
        )
      })()}
      {replyReview && (
        <AIReplyModal
          review={replyReview}
          onClose={() => setReplyReview(null)}
        />
      )}
    </div>
  )
}

