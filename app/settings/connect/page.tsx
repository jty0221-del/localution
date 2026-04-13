'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

// ── 플랫폼 로고 SVG ──────────────────────────────────────────
function NaverPlaceIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#03C75A"/>
      <path d="M16 6C11.58 6 8 9.58 8 14c0 7 8 16 8 16s8-9 8-16c0-4.42-3.58-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z" fill="white"/>
    </svg>
  )
}
function NaverSearchIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#03C75A"/>
      <path d="M18 16.4L13.6 9H9v14h4.6V16.6L18.4 23H23V9h-5v7.4z" fill="white"/>
    </svg>
  )
}
function GoogleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="white" stroke="#E5E8EB"/>
      <path d="M28.8 16.3c0-1-.09-2-.26-3H16v5.67h7.1c-.31 1.63-1.23 3-2.63 3.93v3.3h4.26c2.5-2.3 3.94-5.69 3.94-9.9z" fill="#4285F4"/>
      <path d="M16 29c3.56 0 6.55-1.18 8.73-3.2l-4.26-3.3c-1.18.79-2.68 1.26-4.47 1.26-3.43 0-6.34-2.32-7.38-5.44H4.22v3.4C6.39 26.36 10.88 29 16 29z" fill="#34A853"/>
      <path d="M8.62 18.32A8.02 8.02 0 018.2 16c0-.81.14-1.6.38-2.32V10.28H4.22A13 13 0 003 16c0 2.1.5 4.08 1.38 5.85l4.4-3.4-.16-.13z" fill="#FBBC05"/>
      <path d="M16 9.27c1.95 0 3.69.67 5.07 1.98l3.8-3.8C22.54 5.22 19.56 4 16 4 10.88 4 6.4 6.64 4.22 10.73l4.4 3.4C9.67 11.59 12.58 9.27 16 9.27z" fill="#EA4335"/>
    </svg>
  )
}
function KakaoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#FEE500"/>
      <path d="M16 7C11.03 7 7 10.13 7 14c0 2.58 1.63 4.84 4.1 6.2L10.06 24l4.5-2.98c.47.07 1.13.12 1.77.12 4.97 0 9-3.13 9-7s-4.03-7-9.33-7z" fill="#3B1E1E"/>
    </svg>
  )
}
function BaeminIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#2AC1BC"/>
      <path d="M9 10h6.5c2.76 0 4.5 1.34 4.5 3.5 0 1.4-.8 2.5-2 3.1 1.5.5 2.5 1.7 2.5 3.4 0 2.4-1.8 4-5 4H9V10zm4 5.2h2c.9 0 1.5-.5 1.5-1.3 0-.8-.6-1.3-1.5-1.3h-2v2.6zm0 5.5h2.2c1 0 1.6-.5 1.6-1.4 0-.9-.6-1.4-1.6-1.4H13v2.8z" fill="white"/>
    </svg>
  )
}
function YogiyoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#FA0050"/>
      <text x="5" y="20" fontSize="12" fontWeight="900" fill="white" fontFamily="'Noto Sans KR', sans-serif">요기</text>
      <text x="5" y="28" fontSize="9" fontWeight="700" fill="white" fontFamily="'Noto Sans KR', sans-serif">요</text>
    </svg>
  )
}
function CoupangEatsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#FF4B30"/>
      <path d="M8 11h16M8 16h12M8 21h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F9A825"/>
          <stop offset="50%" stopColor="#E91E63"/>
          <stop offset="100%" stopColor="#9C27B0"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#ig2)"/>
      <circle cx="16" cy="16" r="5.5" stroke="white" strokeWidth="2" fill="none"/>
      <circle cx="22.5" cy="9.5" r="1.5" fill="white"/>
    </svg>
  )
}
function TossIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#3182F6"/>
      <path d="M10 16c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M14 22l2 2 2-2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

interface Platform {
  id: string
  name: string
  icon: React.ReactNode
  category: string
  desc: string
  connected: boolean
  badgeColor: string
  guideUrl?: string
}

const platformList: Platform[] = [
  { id: 'naver_place', name: '네이버 플레이스', icon: <NaverPlaceIcon/>, category: '검색/지도', desc: '네이버 지도 업체 정보, 리뷰, 키워드 순위 연동', connected: true, badgeColor: '#03C75A' },
  { id: 'naver_search', name: '네이버 검색', icon: <NaverSearchIcon/>, category: '검색/지도', desc: '네이버 검색 노출 현황 및 블로그 리뷰 집계', connected: true, badgeColor: '#03C75A' },
  { id: 'google', name: '구글 지도', icon: <GoogleIcon/>, category: '검색/지도', desc: '구글 마이비즈니스 리뷰, 평점, 방문 통계 연동', connected: true, badgeColor: '#4285F4' },
  { id: 'kakao', name: '카카오맵', icon: <KakaoIcon/>, category: '검색/지도', desc: '카카오맵 업체 정보 및 리뷰 관리', connected: false, badgeColor: '#FEE500' },
  { id: 'baemin', name: '배달의민족', icon: <BaeminIcon/>, category: '배달', desc: '배민 주문 현황, 리뷰, 사장님 댓글 관리', connected: false, badgeColor: '#2AC1BC' },
  { id: 'yogiyo', name: '요기요', icon: <YogiyoIcon/>, category: '배달', desc: '요기요 주문 통계 및 고객 리뷰 관리', connected: false, badgeColor: '#FA0050' },
  { id: 'coupangeats', name: '쿠팡이츠', icon: <CoupangEatsIcon/>, category: '배달', desc: '쿠팡이츠 주문 수, 평점, 리뷰 통합 관리', connected: false, badgeColor: '#FF4B30' },
  { id: 'instagram', name: '인스타그램', icon: <InstagramIcon/>, category: 'SNS', desc: '인스타그램 팔로워, 게시물 반응, 방문 유도 통계', connected: false, badgeColor: '#E91E63' },
  { id: 'toss', name: '토스페이먼츠', icon: <TossIcon/>, category: '결제', desc: '구독 결제 및 빌링키 관리', connected: false, badgeColor: '#3182F6' },
]

const categories = ['전체', '검색/지도', '배달', 'SNS', '결제']

export default function ConnectPage() {
  const [platforms, setPlatforms] = useState(platformList)
  const [selectedCat, setSelectedCat] = useState('전체')
  const [connecting, setConnecting] = useState<string | null>(null)

  const filtered = selectedCat === '전체' ? platforms : platforms.filter(p => p.category === selectedCat)
  const connectedCount = platforms.filter(p => p.connected).length

  function handleConnect(id: string) {
    setConnecting(id)
    setTimeout(() => {
      setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: true } : p))
      setConnecting(null)
    }, 1500)
  }

  function handleDisconnect(id: string) {
    setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: false } : p))
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar/>
      <main className="flex-1 ml-[220px] p-8">
        <div className="max-w-4xl mx-auto">

          <div className="mb-6">
            <h1 className="text-2xl font-black text-[#191F28]">연동 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-1">플랫폼을 연동하면 리뷰, 순위, 방문 통계를 한 곳에서 관리할 수 있어요</p>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
              <p className="text-xs text-[#8B95A1] mb-1">연동된 플랫폼</p>
              <p className="text-2xl font-black text-[#3182F6]">{connectedCount}<span className="text-sm text-[#8B95A1] ml-1">/ {platforms.length}</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
              <p className="text-xs text-[#8B95A1] mb-1">통합 리뷰 수</p>
              <p className="text-2xl font-black text-[#191F28]">190<span className="text-sm text-[#8B95A1] ml-1">건</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
              <p className="text-xs text-[#8B95A1] mb-1">통합 평균 평점</p>
              <p className="text-2xl font-black text-[#F5A623]">4.5<span className="text-sm text-[#8B95A1] ml-1">점</span></p>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 mb-5">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCat(cat)}
                className={['text-xs px-3 py-1.5 rounded-lg font-medium transition-colors', selectedCat === cat ? 'bg-[#3182F6] text-white' : 'bg-white text-[#8B95A1] border border-[#E5E8EB] hover:text-[#191F28]'].join(' ')}>
                {cat}
              </button>
            ))}
          </div>

          {/* 플랫폼 목록 */}
          <div className="grid grid-cols-1 gap-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-5 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">{p.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#191F28]">{p.name}</span>
                      <span className="text-[10px] bg-[#F2F4F6] text-[#8B95A1] px-2 py-0.5 rounded-full">{p.category}</span>
                      {p.connected && (
                        <span className="text-[10px] bg-[#F0FBF0] text-[#2DB400] font-bold px-2 py-0.5 rounded-full">● 연동중</span>
                      )}
                    </div>
                    <p className="text-xs text-[#8B95A1] mt-0.5">{p.desc}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  {p.connected ? (
                    <button onClick={() => handleDisconnect(p.id)}
                      className="text-xs text-[#8B95A1] border border-[#E5E8EB] px-4 py-2 rounded-xl hover:bg-[#F8F9FA] transition-colors font-medium">
                      연동 해제
                    </button>
                  ) : (
                    <button onClick={() => handleConnect(p.id)} disabled={connecting === p.id}
                      className="text-xs bg-[#3182F6] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60 min-w-[80px] text-center">
                      {connecting === p.id ? (
                        <span className="flex items-center gap-1 justify-center">
                          <span className="animate-spin inline-block">⟳</span> 연동 중
                        </span>
                      ) : '연동하기'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#8B95A1] mt-4 text-center">* 일부 플랫폼은 해당 플랫폼의 API 승인 후 연동됩니다</p>
        </div>
      </main>
    </div>
  )
}
