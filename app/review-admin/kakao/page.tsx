'use client'

// ============================================================
// 31차-1 · /review-admin/kakao — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
//   공개 commentlist 수집 파이프 (31차-3) 연동
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

function KakaoLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FEE500"/>
      <path d="M24 11C15.16 11 8 16.82 8 24.02c0 4.7 3.11 8.83 7.8 11.2l-1.98 7.28c-.17.63.53 1.14 1.08.77L22.6 38.1c.45.05.93.08 1.4.08 8.84 0 16-5.82 16-13.02S32.84 11 24 11z" fill="#3C1E1E"/>
    </svg>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'kakao_map',
  uiKey: 'kakao',
  label: '카카오맵',
  color: '#FEE500',
  bg: '#FFFBE5',
  textColor: '#6B5A00',
  icon: '🟡',
  iconLetter: '카',
  logoNode: <KakaoLogo />,
  supportsFetch: true,                 // 31차-3: 공개 panel3 수집기 완료
  connectHref: '/my/platforms/kakao_map/connect',
  reviewAdminUrl: 'https://business.kakao.com/',
  collectEndpoint: '/api/place/kakao/collect',
}

export default function KakaoReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
