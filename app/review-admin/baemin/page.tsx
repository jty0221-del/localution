'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  // 배달의민족 로고 — 민트 배경 + 흑색 수직 바 5개
  // viewBox 80×80, 사방 10px 내부 여백으로 잘림 없음
  return (
    <svg width="34" height="34" viewBox="0 0 80 80" fill="none">
      <rect width="80" height="80" rx="16" fill="#2DDDC8"/>
      {/* 왼쪽 쌍 바 (위/아래) */}
      <rect x="10" y="10" width="11" height="22" rx="2.5" fill="#111111"/>
      <rect x="10" y="38" width="11" height="22" rx="2.5" fill="#111111"/>
      {/* 중앙 좌 — 풀 높이 */}
      <rect x="26" y="10" width="11" height="50" rx="2.5" fill="#111111"/>
      {/* 중앙 우 — 풀 높이 */}
      <rect x="42" y="10" width="11" height="50" rx="2.5" fill="#111111"/>
      {/* 오른쪽 — 위에서 절반 */}
      <rect x="58" y="10" width="11" height="32" rx="2.5" fill="#111111"/>
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
