'use client'

// ============================================================
// 30차-22 · /review-admin/yogiyo — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function YogiyoLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FA0050"/>
      <circle cx="24" cy="16" r="7" fill="white"/>
      <path d="M17 26c0 0 2-4 7-4s7 4 7 4v10c0 2-1.5 3-3.5 3h-7C18.5 39 17 38 17 36V26z" fill="white"/>
      <circle cx="21" cy="15" r="2" fill="#FA0050"/>
      <circle cx="27" cy="15" r="2" fill="#FA0050"/>
      <path d="M21 20 Q24 22 27 20" stroke="#FA0050" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'yogiyo',
  uiKey: 'yogiyo',
  label: '요기요',
  color: '#E5007F',
  bg: '#FFE5ED',
  textColor: '#A3003A',
  icon: 'Y',
  iconLetter: '요',
  logoNode: <YogiyoLogo />,
  supportsFetch: true,
  collectEndpoint: '/api/review-reply/collect',
  connectHref: '/my/platforms/yogiyo/connect',
  reviewAdminUrl: 'https://ceo.yogiyo.co.kr/self-service-home/',
}

export default function YogiyoReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
