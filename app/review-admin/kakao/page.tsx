'use client'

// ============================================================
// 31차-1 · /review-admin/kakao — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
//   공개 commentlist 수집 파이프 (31차-3) 연동
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

// 카카오맵 공식 로고 SVG (노란 배경 + 파란 위치 핀)
const KakaoLogo = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#FEE500"/>
    {/* 파란 위치 핀 */}
    <path
      d="M16 4C11.582 4 8 7.582 8 12c0 6.627 8 16 8 16s8-9.373 8-16c0-4.418-3.582-8-8-8z"
      fill="#3478F6"
    />
    {/* 핀 가운데 노란 원 */}
    <circle cx="16" cy="12" r="3.2" fill="#FEE500"/>
  </svg>
)

const CONFIG: PlatformConfig = {
  platform: 'kakao_map',
  uiKey: 'kakao',
  label: '카카오맵',
  color: '#FAE100',
  bg: '#FFFBE5',
  textColor: '#5C4A00',
  icon: '🟡',
  iconLetter: '카',
  logoNode: KakaoLogo,
  supportsFetch: true,
  connectHref: '/my/platforms/kakao_map/connect',
  reviewAdminUrl: 'https://place.map.kakao.com/',
  collectEndpoint: '/api/place/kakao/collect',
  platformInfoBanner: {
    title: '카카오맵 리뷰 자동 수집 중',
    desc: 'AI가 카카오 감성에 맞는 따뜻한 답글을 자동으로 작성해드려요',
    links: [
      { label: '카카오맵 리뷰 관리 ↗', href: 'https://place.map.kakao.com/', dark: false },
      { label: '카카오 비즈니스 ↗',    href: 'https://business.kakao.com/',  dark: true  },
    ],
  },
}

export default function KakaoReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
