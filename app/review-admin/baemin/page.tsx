'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  // 배달의민족 공식 로고 — 민트 배경 + 흑색 수직 바 패턴 (ㅂ×2)
  // 배경 rect 없이 바 심볼만 — PageHeader 뱃지 안에서 자연스러운 여백 확보
  return (
    <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
      <rect x="6"  y="6"  width="8" height="18" rx="2" fill="#111111"/>
      <rect x="6"  y="32" width="8" height="18" rx="2" fill="#111111"/>
      <rect x="20" y="6"  width="8" height="44" rx="2" fill="#111111"/>
      <rect x="36" y="6"  width="8" height="44" rx="2" fill="#111111"/>
      <rect x="50" y="6"  width="8" height="26" rx="2" fill="#111111"/>
    </svg>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'baemin',
  uiKey: 'baemin',
  label: '배달의민족',
  color: '#2DDDC8',
  bg: '#E0FAF8',
  textColor: '#0A5E5A',
  icon: 'B',
  iconLetter: '배',
  logoNode: <BaeminLogo />,
  supportsFetch: true,
  collectEndpoint: '/api/review-reply/collect',
  connectHref: '/my/platforms/baemin/connect',
  reviewAdminUrl: 'https://self.baemin.com/',
  platformInfoBanner: {
    title: '배달의민족 리뷰 자동 수집 중',
    desc: 'AI가 배민 감성에 맞는 친근한 답글을 자동으로 작성해드려요',
    links: [
      { label: '배민 사장님 리뷰 관리 ↗', href: 'https://self.baemin.com/', dark: true },
      { label: '배민 사장님광장 ↗', href: 'https://ceo.baemin.com/', dark: false },
    ],
  },
}

export default function BaeminReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
