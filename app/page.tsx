'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import QuickSlot from './components/QuickSlot'

// ── 플랫폼 로고 SVG ──────────────────────────────────────────
function NaverLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#03C75A"/>
      <path d="M13.5 12.3L10.2 7H7v10h3.5v-5.3L13.8 17H17V7h-3.5v5.3z" fill="white"/>
    </svg>
  )
}
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
function KakaoLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FEE500"/>
      <path d="M12 5C8.13 5 5 7.46 5 10.5c0 1.93 1.22 3.63 3.08 4.65l-.78 2.9 3.38-2.24c.42.06.85.09 1.32.09 3.87 0 7-2.46 7-5.5S15.87 5 12 5z" fill="#3B1E1E"/>
    </svg>
  )
}
function BaeminLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#2AC1BC"/>
      <text x="4" y="17" fontSize="12" fontWeight="900" fill="white" fontFamily="Arial">B</text>
      <text x="11" y="17" fontSize="8" fontWeight="700" fill="white" fontFamily="Arial">M</text>
    </svg>
  )
}
function YogiyoLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FA0050"/>
      <text x="3" y="16" fontSize="9" fontWeight="900" fill="white" fontFamily="Arial">요기</text>
      <text x="3" y="22" fontSize="7" fontWeight="700" fill="white" fontFamily="Arial">요</text>
    </svg>
  )
}
function CoupangEatsLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FF4B30"/>
      <path d="M5 8h14M5 12h10M5 16h7" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
function NaverPlaceLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#03C75A"/>
      <path d="M12 3C8.69 3 6 5.69 6 9c0 5.25 6 12 6 12s6-6.75 6-12c0-3.31-2.69-6-6-6zm0 8.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="white"/>
    </svg>
  )
}
function InstagramLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F9A825"/>
          <stop offset="50%" stopColor="#E91E63"/>
          <stop offset="100%" stopColor="#9C27B0"/>
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig)"/>
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
    </svg>
  )
}

const platforms = [
  { id: 'naver_place', name: '네이버 플레이스', logo: <NaverPlaceLogo/>, connected: true, status: '정상', rating: 4.6, reviews: 127 },
  { id: 'google', name: '구글 지도', logo: <GoogleLogo/>, connected: true, status: '정상', rating: 4.4, reviews: 63 },
  { id: 'kakao', name: '카카오맵', logo: <KakaoLogo/>, connected: false, status: '미연동', rating: null, reviews: null },
  { id: 'baemin', name: '배달의민족', logo: <BaeminLogo/>, connected: false, status: '미연동', rating: null, reviews: null },
  { id: 'yogiyo', name: '요기요', logo: <YogiyoLogo/>, connected: false, status: '미연동', rating: null, reviews: null },
  { id: 'coupangeats', name: '쿠팡이츠', logo: <CoupangEatsLogo/>, connected: false, status: '미연동', rating: null, reviews: null },
  { id: 'naver', name: '네이버 검색', logo: <NaverLogo/>, connected: true, status: '정상', rating: null, reviews: null },
  { id: 'instagram', name: '인스타그램', logo: <InstagramLogo/>, connected: false, status: '미연동', rating: null, reviews: null },
]

const stats = [
  { label: '이번 달 방문자', value: '2,847', change: '+12.4%', up: true },
  { label: '리뷰 응답률', value: '84%', change: '+6%', up: true },
  { label: '키워드 상위노출', value: '3개', change: '+1', up: true },
  { label: '이번 달 리뷰', value: '34건', change: '-2건', up: false },
]

const recentReviews = [
  { platform: '네이버', name: '김**', rating: 5, text: '음식도 맛있고 서비스도 친절해요. 다음에 또 올게요!', time: '2시간 전', replied: false },
  { platform: '구글', name: 'J**', rating: 4, text: 'Great food and nice atmosphere. Will visit again.', time: '5시간 전', replied: true },
  { platform: '네이버', name: '박**', rating: 5, text: '회식으로 왔는데 정말 만족스러웠습니다!', time: '1일 전', replied: false },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-[#F5A623] text-xs">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))} {rating}
    </span>
  )
}

export default function Dashboard() {
  const [storeName] = useState('하랑마케팅 강남점')
  const [storeAddr] = useState('서울시 강남구 테헤란로 123-4')
  const [mainKeyword] = useState('강남 맛집')

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar/>
      <main className="flex-1 ml-[220px] p-8">
        <div className="max-w-5xl mx-auto">

          {/* 상단 매장 정보 카드 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-[#E8F1FE] text-[#3182F6] px-2 py-0.5 rounded-full font-semibold">연동됨</span>
                  <span className="text-xs text-[#8B95A1]">네이버 플레이스 · 구글 · 네이버 검색</span>
                </div>
                <h2 className="text-xl font-black text-[#191F28]">{storeName}</h2>
                <p className="text-sm text-[#8B95A1] mt-0.5">{storeAddr}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs bg-[#F2F4F6] text-[#4E5968] px-2 py-1 rounded-lg font-medium">주요 키워드: {mainKeyword}</span>
                  <StarRating rating={4.6}/>
                  <span className="text-xs text-[#8B95A1]">리뷰 127건</span>
                </div>
              </div>
              <button className="text-xs text-[#3182F6] font-semibold border border-[#3182F6] px-3 py-1.5 rounded-lg hover:bg-[#E8F1FE] transition-colors">
                정보 수정
              </button>
            </div>
          </div>

          {/* 플랫폼 현황 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#191F28]">플랫폼 연동 현황</h3>
              <a href="/settings" className="text-xs text-[#3182F6] font-medium hover:underline">연동 관리 →</a>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {platforms.map(p => (
                <div key={p.id} className={['rounded-xl border p-3.5 flex flex-col gap-2', p.connected ? 'bg-white border-[#E5E8EB]' : 'bg-[#F8F9FA] border-dashed border-[#E5E8EB] opacity-70'].join(' ')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.logo}
                      <span className="text-xs font-semibold text-[#191F28] leading-tight">{p.name}</span>
                    </div>
                    <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full', p.connected ? 'bg-[#F0FBF0] text-[#2DB400]' : 'bg-[#F2F4F6] text-[#8B95A1]'].join(' ')}>
                      {p.connected ? '연동' : '미연동'}
                    </span>
                  </div>
                  {p.connected && p.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-[#F5A623] text-xs">★</span>
                      <span className="text-xs font-bold text-[#191F28]">{p.rating}</span>
                      <span className="text-[10px] text-[#8B95A1]">({p.reviews})</span>
                    </div>
                  )}
                  {!p.connected && (
                    <a href="/settings" className="text-[10px] text-[#3182F6] font-medium hover:underline">연동하기 →</a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {stats.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
                <p className="text-xs text-[#8B95A1] mb-1">{s.label}</p>
                <p className="text-2xl font-black text-[#191F28]">{s.value}</p>
                <p className={['text-xs font-semibold mt-1', s.up ? 'text-[#2DB400]' : 'text-[#F04452]'].join(' ')}>{s.change}</p>
              </div>
            ))}
          </div>

          {/* 최근 리뷰 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F6]">
              <h3 className="text-sm font-bold text-[#191F28]">최근 리뷰</h3>
              <a href="/reviews" className="text-xs text-[#3182F6] font-medium hover:underline">전체보기 →</a>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {recentReviews.map((r, i) => (
                <div key={i} className="px-5 py-4 hover:bg-[#FAFBFF] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#4E5968]">{r.platform}</span>
                        <span className="text-xs text-[#8B95A1]">{r.name}</span>
                        <StarRating rating={r.rating}/>
                        <span className="text-[10px] text-[#8B95A1]">{r.time}</span>
                      </div>
                      <p className="text-sm text-[#4E5968] line-clamp-1">{r.text}</p>
                    </div>
                    {!r.replied && (
                      <button className="ml-4 text-xs bg-[#3182F6] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#1B64DA] transition-colors flex-shrink-0">
                        AI 답글
                      </button>
                    )}
                    {r.replied && (
                      <span className="ml-4 text-xs text-[#2DB400] font-semibold flex-shrink-0">답변완료</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
      <QuickSlot/>
    </div>
  )
}
