'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  // 배달의민족 로고 — 56px 컨테이너를 꽉 채움
  // overflow-hidden + rounded-2xl(16px) 클리핑 계산: 바 시작점 x≥12, y≥12 확보
  return (
    <svg width="56" height="56" viewBox="0 0 110 110" fill="none">
      <rect width="110" height="110" fill="#2DDDC8"/>
      {/* 왼쪽 쌍 바 (위/아래) */}
      <rect x="12" y="12" width="17" height="34" rx="3.5" fill="#111111"/>
      <rect x="12" y="52" width="17" height="34" rx="3.5" fill="#111111"/>
      {/* 중앙 좌 — 풀 높이 */}
      <rect x="35" y="12" width="17" height="74" rx="3.5" fill="#111111"/>
      {/* 중앙 우 — 풀 높이 */}
      <rect x="58" y="12" width="17" height="74" rx="3.5" fill="#111111"/>
      {/* 우측 절반 바 */}
      <rect x="81" y="12" width="17" height="46" rx="3.5" fill="#111111"/>
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
