'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'

// ═══════════════════════════════════════════════════════════
//  플랫폼 로고 SVG (정확도 최우선)
// ═══════════════════════════════════════════════════════════

function NaverPlaceLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#03C75A"/>
      <path d="M24 9C17.37 9 12 13.25 12 18.5c0 3.5 2.2 6.6 5.6 8.47L15.8 33l6.12-4.06c.67.09 1.37.14 2.08.14 6.63 0 12-4.25 12-9.5S30.63 9 24 9z" fill="white"/>
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

function KakaoMapLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#FEE500"/>
      <path d="M24 8C16.27 8 10 12.69 10 18.5c0 3.89 2.46 7.3 6.2 9.38L14.6 34l6.8-4.5c.84.11 1.71.17 2.6.17 7.73 0 14-4.69 14-10.5S31.73 8 24 8z" fill="#3C1E1E"/>
    </svg>
  )
}

// ── 배달의민족 2025 새 아이콘: 밝은 민트 + 5개 세로 굵은 선 (배 글자 형상) ──
function BaeminLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#2AC1BC"/>
      {/* 5개 세로선 – '배' 글자의 세로 획 형태 */}
      <rect x="8"  y="10" width="5.5" height="28" rx="2.5" fill="white"/>
      <rect x="16" y="10" width="5.5" height="20" rx="2.5" fill="white"/>
      <rect x="24" y="10" width="5.5" height="28" rx="2.5" fill="white"/>
      <rect x="32" y="10" width="5.5" height="16" rx="2.5" fill="white"/>
      {/* 가로 연결선 */}
      <rect x="8" y="10" width="29" height="5" rx="2" fill="white"/>
    </svg>
  )
}

// ── 요기요: KPOP Red + 스마일(웃는 입) 모티브 ──
function YogiyoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#FA1A32"/>
      {/* 두 눈 */}
      <circle cx="17" cy="17" r="4.5" fill="white"/>
      <circle cx="31" cy="17" r="4.5" fill="white"/>
      {/* 스마일 호 */}
      <path d="M11 27 Q24 40 37 27" stroke="white" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

// ── 쿠팡이츠: 오렌지 (#FF5A00) + 로켓/포크 아이콘 ──
function CoupangEatsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#FF5A00"/>
      {/* 로켓 모양 */}
      <path d="M24 7 C24 7 33 14 33 24 L29 28 L19 28 L15 24 C15 14 24 7 24 7z" fill="white" opacity="0.95"/>
      <circle cx="24" cy="22" r="4" fill="#FF5A00"/>
      <path d="M19 28 L17 36 L24 32 L31 36 L29 28" fill="white" opacity="0.8"/>
      <path d="M15 22 L10 26 L15 28" fill="white" opacity="0.6"/>
      <path d="M33 22 L38 26 L33 28" fill="white" opacity="0.6"/>
    </svg>
  )
}

function NaverSearchLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#03C75A"/>
      <path d="M27 24.6L20.4 13.5H13.5v21H20V19.4l6.8 11.1H33.5v-21H27v15.1z" fill="white"/>
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
  | 'naver_place' | 'google' | 'kakao' | 'baemin'
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
  { id: 'naver_place',  name: '네이버 플레이스', shortName: '네이버',   logo: (s) => <NaverPlaceLogo size={s}/>,   category: '리뷰·검색', connected: true,  rating: 4.6, reviews: 127, color: '#03C75A' },
  { id: 'google',       name: '구글 비즈니스',   shortName: '구글',     logo: (s) => <GoogleLogo size={s}/>,       category: '리뷰·검색', connected: true,  rating: 4.4, reviews: 63,  color: '#4285F4' },
  { id: 'kakao',        name: '카카오맵',         shortName: '카카오',   logo: (s) => <KakaoMapLogo size={s}/>,     category: '리뷰·검색', connected: false, rating: null, reviews: null, color: '#F5C500' },
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

// ═══════════════════════════════════════════════════════════
//  별점 컴포넌트
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

// ═══════════════════════════════════════════════════════════
//  키워드 순위 변동 아이콘
// ═══════════════════════════════════════════════════════════
function RankBadge({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null) return <span className="text-[10px] text-[#8B95A1] font-medium">신규</span>
  const diff = prev - current
  if (diff > 0) return <span className="text-[10px] text-[#12B76A] font-bold">▲{diff}</span>
  if (diff < 0) return <span className="text-[10px] text-[#F04452] font-bold">▼{Math.abs(diff)}</span>
  return <span className="text-[10px] text-[#8B95A1] font-bold">–</span>
}

// ═══════════════════════════════════════════════════════════
//  메인 대시보드
// ═══════════════════════════════════════════════════════════
export default function Dashboard() {
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS)
  const [keywords, setKeywords] = useState<KeywordRank[]>(MOCK_KEYWORDS)
  const [lastSync, setLastSync] = useState('방금 전')
  const [isSyncing, setIsSyncing] = useState(false)
  const [storeName] = useState('하랑마케팅 강남점')
  const [mainKeyword] = useState('강남 맛집')

  const connectedCount = platforms.filter(p => p.connected).length
  const totalReviews   = platforms.reduce((s, p) => s + (p.reviews ?? 0), 0)
  const avgRating = (() => {
    const rated = platforms.filter(p => p.rating !== null)
    if (!rated.length) return 0
    return +(rated.reduce((s, p) => s + p.rating!, 0) / rated.length).toFixed(1)
  })()

  // 실시간 키워드 순위 갱신 (실제: Naver Search API)
  const refreshKeywords = useCallback(async () => {
    setIsSyncing(true)
    try {
      // 실 API 호출 예시:
      // const res = await fetch(`/api/naver-keyword?query=${mainKeyword}&display=5`)
      // const data = await res.json()
      // setKeywords(data.keywords)

      // ─ 현재: 목업 데이터 (변동 시뮬레이션) ─
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

  // 10분마다 자동 갱신
  useEffect(() => {
    const id = setInterval(refreshKeywords, 600_000)
    return () => clearInterval(id)
  }, [refreshKeywords])

  const stats = [
    { label: '이번 달 방문자', value: '2,847', change: '+12.4%', up: true,  icon: '👥' },
    { label: '총 리뷰 수',     value: `${totalReviews}건`,  change: '+34건', up: true,  icon: '💬' },
    { label: '평균 별점',      value: `${avgRating}점`,    change: '+0.1',  up: true,  icon: '⭐' },
    { label: '키워드 상위',    value: '3개',               change: '+1개',  up: true,  icon: '🔍' },
  ]

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-[220px] p-6 min-w-0">

        {/* ── ① 플랫폼 연동 현황 바 ── */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#191F28]">플랫폼 연동 현황</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E8F4FD] text-[#3182F6] font-semibold">
                {connectedCount}/{platforms.length} 연동
              </span>
            </div>
            <a href="/settings" className="text-[11px] text-[#3182F6] font-semibold hover:underline flex items-center gap-1">
              연동 관리 →
            </a>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {platforms.map(p => (
              <div
                key={p.id}
                className={[
                  'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all cursor-pointer',
                  p.connected
                    ? 'bg-white border border-[#E5E8EB] hover:border-[#3182F6]'
                    : 'bg-[#F8F9FA] border border-dashed border-[#E0E0E0] opacity-60 hover:opacity-80',
                ].join(' ')}
                onClick={() => {
                  setPlatforms(prev => prev.map(pl =>
                    pl.id === p.id ? { ...pl, connected: !pl.connected } : pl
                  ))
                }}
                title={p.connected ? '클릭하여 연동 해제' : '클릭하여 연동'}
              >
                {p.logo(32)}
                <span className="text-[10px] font-semibold text-[#4E5968] text-center leading-tight">{p.shortName}</span>
                <span className={[
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  p.connected ? 'bg-[#E8FFF0] text-[#12B76A]' : 'bg-[#F2F4F6] text-[#8B95A1]',
                ].join(' ')}>
                  {p.connected ? '연동됨' : '미연동'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── ② 통계 카드 4개 ── */}
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

        {/* ── ③ 메인 2컬럼 ── */}
        <div className="grid grid-cols-[1fr_340px] gap-5 mb-5">

          {/* 좌: 연동 플랫폼 별점·리뷰 현황 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
              <span className="text-sm font-bold text-[#191F28]">플랫폼별 별점 · 리뷰 현황</span>
              <span className="text-[11px] text-[#8B95A1]">연동된 플랫폼만 표시</span>
            </div>
            <div className="p-5 space-y-4">
              {/* 연동 플랫폼 */}
              {platforms.filter(p => p.connected).map(p => (
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
              ))}

              {/* 미연동 플랫폼 안내 */}
              {platforms.filter(p => !p.connected).length > 0 && (
                <div className="mt-4 p-4 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E0E0E0]">
                  <p className="text-xs text-[#8B95A1] mb-2 font-medium">미연동 플랫폼 — 연동하면 데이터가 표시됩니다</p>
                  <div className="flex flex-wrap gap-2">
                    {platforms.filter(p => !p.connected).map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-[#E5E8EB]">
                        {p.logo(18)}
                        <span className="text-[11px] text-[#8B95A1]">{p.shortName}</span>
                      </div>
                    ))}
                  </div>
                  <a href="/settings" className="inline-block mt-2 text-[11px] text-[#3182F6] font-semibold hover:underline">
                    연동하러 가기 →
                  </a>
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
                  <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">API 키 필요</span>
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
              {keywords.map((kw, i) => (
                <div key={kw.keyword} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#FAFBFF] transition-colors">
                  {/* 순위 */}
                  <div className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0',
                    kw.rank <= 3  ? 'bg-[#3182F6] text-white'
                    : kw.rank <= 10 ? 'bg-[#E8F4FD] text-[#3182F6]'
                    : 'bg-[#F2F4F6] text-[#8B95A1]',
                  ].join(' ')}>
                    {kw.rank}
                  </div>
                  {/* 키워드 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#191F28] truncate">{kw.keyword}</p>
                    <p className="text-[10px] text-[#8B95A1]">{kw.area} · {kw.updatedAt}</p>
                  </div>
                  {/* 변동 */}
                  <RankBadge current={kw.rank} prev={kw.prevRank} />
                </div>
              ))}
            </div>

            {/* Naver API 안내 */}
            <div className="px-5 py-3 bg-[#FAFBFF] border-t border-[#F2F4F6]">
              <p className="text-[10px] text-[#8B95A1] leading-relaxed">
                실시간 순위는 <strong className="text-[#3182F6]">네이버 Search API</strong> 키 설정 후 활성화됩니다.
                <a href="/settings" className="ml-1 underline text-[#3182F6]">설정 →</a>
              </p>
            </div>
          </div>
        </div>

        {/* ── ④ 최근 리뷰 전체 폭 ── */}
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
                {/* 플랫폼 뱃지 */}
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
                  <button className="flex-shrink-0 ml-4 text-xs bg-[#3182F6] text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-[#1B64DA] transition-colors">
                    AI 답글
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
