'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  // 배달의민족 로고 — 민트 배경 + 흑색 수직 바 패턴
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="14" fill="#2DDDC8"/>
      <rect x="8"  y="8"  width="9" height="19" rx="2" fill="#111111"/>
      <rect x="8"  y="34" width="9" height="19" rx="2" fill="#111111"/>
      <rect x="22" y="8"  width="9" height="46" rx="2" fill="#111111"/>
      <rect x="36" y="8"  width="9" height="46" rx="2" fill="#111111"/>
      <rect x="50" y="8"  width="9" height="27" rx="2" fill="#111111"/>
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
