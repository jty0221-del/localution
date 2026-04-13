'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'

// ── SVG 로고 ──────────────────────────────────────────────────

function NaverLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#03C75A"/>
      <path d="M27 24.6L20.4 13.5H13.5v21H20V19.4l6.8 11.1H33.5v-21H27v15.1z" fill="white"/>
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="12" fill="white" stroke="#E5E8EB" strokeWidth="1.5"/>
      <path d="M43.6 24.5c0-1.5-.14-3-.38-4.5H24v8.5h10.94c-.5 2.5-1.96 4.6-4.16 6v5h6.74c3.94-3.62 6.08-9 6.08-15z" fill="#4285F4"/>
      <path d="M24 44c5.4 0 9.92-1.8 13.24-4.86l-6.46-5c-1.8 1.2-4.1 1.92-6.78 1.92-5.22 0-9.64-3.52-11.22-8.26H6.12v5.14C9.42 40.02 16.28 44 24 44z" fill="#34A853"/>
      <path d="M12.78 27.8A11.94 11.94 0 0112.2 24c0-1.32.22-2.6.58-3.8v-5.14H6.12A20 20 0 004 24c0 3.22.78 6.28 2.12 9.14l6.66-5.34z" fill="#FBBC05"/>
      <path d="M24 12.08c2.94 0 5.58 1.02 7.66 3l5.74-5.74C33.9 6.06 29.38 4 24 4 16.28 4 9.42 7.98 6.12 14.86l6.66 5.14C14.36 15.6 18.78 12.08 24 12.08z" fill="#EA4335"/>
    </svg>
  )
}

function KakaoLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FEE500"/>
      <path d="M24 10C16.27 10 10 14.69 10 20.5c0 3.89 2.46 7.3 6.2 9.38L14.6 36l6.8-4.5c.84.11 1.71.17 2.6.17 7.73 0 14-4.69 14-10.5S31.73 10 24 10z" fill="#3B1E1E"/>
    </svg>
  )
}

function BaeminLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#2AC1BC"/>
      <path d="M13 15h9.8c4.14 0 6.76 2.01 6.76 5.26 0 2.1-1.2 3.76-3 4.64 2.26.76 3.76 2.56 3.76 5.1 0 3.6-2.7 6-7.5 6H13V15zm6 7.8h3c1.36 0 2.26-.76 2.26-1.96 0-1.2-.9-1.94-2.26-1.94h-3v3.9zm0 8.27h3.3c1.5 0 2.4-.76 2.4-2.1 0-1.34-.9-2.1-2.4-2.1H19v4.2z" fill="white"/>
    </svg>
  )
}

function YogiyoLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FA0050"/>
      <text x="9" y="28" fontSize="16" fontWeight="900" fill="white" fontFamily="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif">요기</text>
      <text x="9" y="40" fontSize="12" fontWeight="700" fill="white" fontFamily="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif">요</text>
    </svg>
  )
}

function CoupangEatsLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FF4B30"/>
      <path d="M12 17h24M12 24h18M12 31h12" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  )
}

function YeoshinLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#003087"/>
      {/* Credit card */}
      <rect x="10" y="16" width="28" height="18" rx="3" stroke="white" strokeWidth="2.2" fill="none"/>
      <rect x="10" y="22" width="28" height="4" fill="white"/>
      <rect x="13" y="28" width="8" height="2.5" rx="1" fill="white" opacity="0.6"/>
      <text x="24" y="12" fontSize="7" fontWeight="800" fill="white" fontFamily="Arial" textAnchor="middle">여신금융</text>
    </svg>
  )
}

function HometaxLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#006AB4"/>
      {/* House icon */}
      <path d="M24 11L9 22h4v14h10V28h2v8h10V22h4L24 11z" fill="white"/>
      <text x="24" y="44" fontSize="6.5" fontWeight="800" fill="white" fontFamily="Arial" textAnchor="middle">홈택스</text>
    </svg>
  )
}

// ── 타입 ────────────────────────────────────────────────────

type Platform = {
  id: string
  name: string
  logo: React.ReactNode
  category: '리뷰·검색' | '배달' | '금융·세무'
  desc: string
  connected: boolean
  brandColor: string
  helpText: string
}

const initialPlatforms: Platform[] = [
  {
    id: 'naver',
    name: '네이버',
    logo: <NaverLogo />,
    category: '리뷰·검색',
    desc: '네이버 플레이스 리뷰, 별점, 키워드 순위 통합 관리',
    connected: true,
    brandColor: '#03C75A',
    helpText: '네이버 사업자 계정으로 연동',
  },
  {
    id: 'google',
    name: '구글',
    logo: <GoogleLogo />,
    category: '리뷰·검색',
    desc: '구글 마이비즈니스 리뷰·평점·방문 통계 연동',
    connected: true,
    brandColor: '#4285F4',
    helpText: 'Google 비즈니스 프로필로 연동',
  },
  {
    id: 'kakao',
    name: '카카오맵',
    logo: <KakaoLogo />,
    category: '리뷰·검색',
    desc: '카카오맵 업체 정보, 리뷰, 즐겨찾기 수 관리',
    connected: false,
    brandColor: '#F5C500',
    helpText: '카카오 사업자 계정으로 연동',
  },
  {
    id: 'baemin',
    name: '배달의민족',
    logo: <BaeminLogo />,
    category: '배달',
    desc: '배민 주문 현황, 고객 리뷰, 사장님 댓글 일괄 관리',
    connected: false,
    brandColor: '#2AC1BC',
    helpText: '배민 사장님 계정으로 연동',
  },
  {
    id: 'yogiyo',
    name: '요기요',
    logo: <YogiyoLogo />,
    category: '배달',
    desc: '요기요 주문 수, 평점, 고객 리뷰 통합 분석',
    connected: false,
    brandColor: '#FA0050',
    helpText: '요기요 사장님 계정으로 연동',
  },
  {
    id: 'coupangeats',
    name: '쿠팡이츠',
    logo: <CoupangEatsLogo />,
    category: '배달',
    desc: '쿠팡이츠 주문 현황, 별점, 리뷰 모니터링',
    connected: false,
    brandColor: '#FF4B30',
    helpText: '쿠팡이츠 사장님 계정으로 연동',
  },
  {
    id: 'yeoshin',
    name: '여신금융',
    logo: <YeoshinLogo />,
    category: '금융·세무',
    desc: '카드 매출 현황, 월별 결제 데이터, 상권 순위 분석',
    connected: false,
    brandColor: '#003087',
    helpText: '여신금융협회 사업자 인증으로 연동',
  },
  {
    id: 'hometax',
    name: '홈택스',
    logo: <HometaxLogo />,
    category: '금융·세무',
    desc: '부가세 신고, 현금영수증, 사업자 세금 데이터 연동',
    connected: false,
    brandColor: '#006AB4',
    helpText: '국세청 홈택스 공동인증서로 연동',
  },
]

type CategoryFilter = '전체' | '리뷰·검색' | '배달' | '금융·세무'

export default function SettingsConnect() {
  const [platforms, setPlatforms] = useState(initialPlatforms)
  const [filter, setFilter] = useState<CategoryFilter>('전체')
  const [connecting, setConnecting] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<string | null>(null)

  const categories: CategoryFilter[] = ['전체', '리뷰·검색', '배달', '금융·세무']

  const filtered = filter === '전체' ? platforms : platforms.filter(p => p.category === filter)
  const connectedList = platforms.filter(p => p.connected)
  const disconnectedList = platforms.filter(p => !p.connected)

  function handleConnect(id: string) {
    setConnecting(id)
    setTimeout(() => {
      setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: true } : p))
      setConnecting(null)
    }, 1800)
  }

  function handleDisconnect(id: string) {
    setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: false } : p))
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-4xl mx-auto">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#191F28]">플랫폼 연동 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-1">여러 플랫폼을 한눈에! 리뷰·매출·세무를 통합 관리해요</p>
          </div>

          {/* 요약 배너 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 flex items-center gap-6">
            <div className="flex-1">
              <p className="text-xs text-[#8B95A1] mb-1">연동된 플랫폼</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#3182F6]">{connectedList.length}</span>
                <span className="text-sm text-[#8B95A1]">/ {platforms.length}개</span>
              </div>
            </div>
            <div className="h-12 w-px bg-[#F2F4F6]" />
            <div className="flex-1">
              <p className="text-xs text-[#8B95A1] mb-1">통합 리뷰</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#191F28]">190</span>
                <span className="text-sm text-[#8B95A1]">건</span>
              </div>
            </div>
            <div className="h-12 w-px bg-[#F2F4F6]" />
            <div className="flex-1">
              <p className="text-xs text-[#8B95A1] mb-1">통합 평점</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#F5A623]">4.5</span>
                <span className="text-sm text-[#8B95A1]">점</span>
              </div>
            </div>
            <div className="h-12 w-px bg-[#F2F4F6]" />
            <div className="flex-1">
              <p className="text-xs text-[#8B95A1] mb-2">연동 현황</p>
              <div className="flex gap-1">
                {platforms.map(p => (
                  <div
                    key={p.id}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.connected ? p.brandColor : '#E5E8EB' }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 mb-5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={[
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  filter === cat
                    ? 'bg-[#3182F6] text-white'
                    : 'bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-[#3182F6] hover:text-[#3182F6]',
                ].join(' ')}
              >
                {cat === '전체' ? '전체' : cat === '리뷰·검색' ? '🔍 ' + cat : cat === '배달' ? '🛵 ' + cat : '💳 ' + cat}
              </button>
            ))}
          </div>

          {/* 플랫폼 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filtered.map(p => (
              <div
                key={p.id}
                className={[
                  'bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center text-center transition-all group relative',
                  p.connected ? 'ring-2 ring-[#3182F6]/20' : 'hover:shadow-md',
                ].join(' ')}
              >
                {/* 연동됨 뱃지 */}
                {p.connected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-[#00C896] rounded-full flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* 로고 */}
                <div className="mb-3 mt-1">
                  {p.logo}
                </div>

                {/* 이름 */}
                <p className="text-sm font-bold text-[#191F28] mb-1">{p.name}</p>

                {/* 카테고리 */}
                <span className="text-[10px] text-[#8B95A1] bg-[#F2F4F6] px-2 py-0.5 rounded-full mb-3">
                  {p.category}
                </span>

                {/* 설명 (hover) */}
                <p className="text-[11px] text-[#8B95A1] leading-snug mb-4 hidden group-hover:block absolute top-full left-0 right-0 bg-[#191F28] text-white p-2 rounded-xl z-10 shadow-lg mt-1 text-left">
                  {p.desc}
                </p>

                {/* 버튼 */}
                {p.connected ? (
                  <div className="w-full space-y-2">
                    <div className="text-xs text-[#00C896] font-semibold">✓ 연동됨</div>
                    <button
                      onClick={() => handleDisconnect(p.id)}
                      className="w-full text-xs text-[#8B95A1] border border-[#E5E8EB] py-2 rounded-xl hover:bg-[#F2F4F6] transition-colors"
                    >
                      연동 해제
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(p.id)}
                    disabled={connecting === p.id}
                    className={[
                      'w-full text-xs font-bold py-2.5 rounded-xl transition-all',
                      connecting === p.id
                        ? 'bg-[#E5E8EB] text-[#8B95A1] cursor-not-allowed'
                        : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]',
                    ].join(' ')}
                  >
                    {connecting === p.id ? (
                      <span className="flex items-center justify-center gap-1">
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/>
                        </svg>
                        연동 중...
                      </span>
                    ) : '연결하러가기'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 안내 */}
          <div className="mt-6 bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-sm font-semibold text-[#191F28] mb-1">연동 도움말</p>
              <p className="text-xs text-[#4E5968] leading-relaxed">
                <span className="font-semibold">여신금융</span>은 카드사 매출 조회를 위해 사업자등록번호 인증이 필요해요.
                <span className="font-semibold ml-1">홈택스</span>는 공동인증서(구 공인인증서) 또는 간편인증으로 연동 가능합니다.
                배달 플랫폼은 각 사장님 계정의 API 키가 필요해요.
              </p>
            </div>
          </div>

          <p className="text-xs text-[#8B95A1] mt-4 text-center">
            * 일부 플랫폼은 해당 플랫폼의 API 승인 후 연동됩니다
          </p>
        </div>
      </main>
    </div>
  )
}
