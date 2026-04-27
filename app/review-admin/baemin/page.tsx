'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#2AC1BC"/>
      <rect x="11" y="13" width="10" height="22" rx="3" fill="#1A1A1A"/>
      <path d="M21 18h5.5a5.5 5.5 0 010 11H21" stroke="#1A1A1A" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M21 24h6a5 5 0 010 10H21" stroke="#1A1A1A" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
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
  supportsFetch: true,
  collectEndpoint: '/api/review-reply/collect',
  connectHref: '/my/platforms/baemin/connect',
  reviewAdminUrl: 'https://self.baemin.com/',
}

export default function BaeminReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
