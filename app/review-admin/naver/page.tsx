'use client'

// ============================================================
// 30차-22 · /review-admin/naver — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function NaverLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="14" fill="#03C75A"/>
      <path d="M13 51V13h10.5L40 38.5V13H51v38H40.5L24 25.5V51H13Z" fill="white"/>
    </svg>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'naver_place',
  uiKey: 'naver',
  label: '네이버 플레이스',
  color: '#03C75A',
  bg: '#E8FBF0',
  textColor: '#015C2C',
  icon: 'N',
  iconLetter: 'N',
  logoNode: <NaverLogo />,
  supportsFetch: true,
  connectHref: '/my/platforms/naver_place/connect',
}

export default function NaverRe