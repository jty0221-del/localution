'use client'

// ============================================================
// 30차-22 · /review-admin/coupang — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function CoupangEatsLogo() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" fill="white"/>
      <text x="28" y="23" textAnchor="middle" fontSize="10" fontWeight="800"
        fontFamily="Arial,'Helvetica Neue',sans-serif" letterSpacing="0.3">
        <tspan fill="#E31837">c</tspan><tspan fill="#F4A900">o</tspan><tspan fill="#E31837">u</tspan>
        <tspan fill="#5BAD48">p</tspan><tspan fill="#3B79BE">a</tspan><tspan fill="#E31837">n</tspan>
        <tspan fill="#F4A900">g</tspan>
      </text>
      <text x="28" y="41" textAnchor="middle" fontSize="18" fontWeight="900"
        fill="#5C3317" fontFamily="Arial,'Helvetica Neue',sans-serif">eats</text>
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
