'use client'

// ============================================================
// 30차-22 · /review-admin/yogiyo — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function YogiyoLogo() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" fill="#E5007F"/>
      <text x="28" y="36" textAnchor="middle" fontSize="19" fontWeight="900"
        fill="white" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        letterSpacing="-0.8">요기요</text>
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
