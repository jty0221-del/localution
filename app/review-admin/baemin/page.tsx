'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="14" fill="#2AC1BC"/>
      {/* 배달의민족 B 로고 — 수직 바 패턴 */}
      <rect x="14" y="14" width="8" height="36" rx="2" fill="#1A1A1A"/>
      <rect x="25" y="14" width="4" height="20" rx="2" fill="#1A1A1A"/>
      <rect x="32" y="14" width="4" height="36" rx="2" fill="#1A1A1A"/>
      <rect x="25" y="30" width="4" height="20" rx="2" fill="#1A1A1A"/>
      <rect x="39" y="14" width="4" height="14" rx="2" fill="#1A1A1A"/>
      <rect x="39" y="30" width="4" height="20" rx="2" fill="#1A1A1A"/>
      <rect x="46" y="20" width="4" height="8" rx="2" fill="#1A1A1A"/>
      <rect x="46" y="36" width="4" height="8" rx="2" fill="#1A1A1A"/>
    </svg>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'baemin',
  uiKey: 'baemin',
  label: '배달의민족',
  color: '#2AC1BC',
  bg: '#E0F7F6',
  textColor: '#0C6F6B',
  icon: 'B',
  iconLetter: '배',
  logoNode: <BaeminLogo />,
  supportsFetch: false,   // Worker 준비 전까지 비활성
  connectHref: '/my/platforms/baemin/connect',
  reviewAdminUrl: 'https://self.baemin.com/',
}

export default function BaeminReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
