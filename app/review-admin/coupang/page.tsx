'use client'

// ============================================================
// 30차-22 · /review-admin/coupang — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function CoupangEatsLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FF5A00"/>
      <path d="M32 14H16a6 6 0 00-6 6v8a6 6 0 006 6h4l4 4 4-4h4a6 6 0 006-6v-8a6 6 0 00-6-6z" fill="white"/>
      <path d="M19 22h10M19 27h7" stroke="#FF5A00" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'coupangeats',
  uiKey: 'coupang',
  label: '쿠팡이츠',
  color: '#FF5A00',
  bg: '#FFE7E3',
  textColor: '#A32A17',
  icon: 'C',
  iconLetter: '쿠',
  logoNode: <CoupangEatsLogo />,
  supportsFetch: true,
  collectEndpoint: '/api/review-reply/collect',
  connectHref: '/my/platforms/coupangeats/connect',
  reviewAdminUrl: 'https://store.coupangeats.com/',
}

export default function CoupangReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
