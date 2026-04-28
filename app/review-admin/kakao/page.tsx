'use client'

// ============================================================
// 31차-1 · /review-admin/kakao — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
//   공개 commentlist 수집 파이프 (31차-3) 연동
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

// 카카오 공식 로고 SVG (노란 말풍선 + 진한 눈·입)
const KakaoLogo = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="10" fill="#FEE500"/>
    <ellipse cx="16" cy="15.2" rx="10.4" ry="8.8" fill="#3C1E1E"/>
    <path
      d="M16 7.6C10.256 7.6 5.6 11.12 5.6 15.46c0 2.8 1.84 5.26 4.64 6.72-.208.768-.8 2.88-.912 3.264-.144.496.176.488.4.352.176-.112 2.8-1.888 3.936-2.64.752.128 1.536.192 2.336.192 5.744 0 10.4-3.52 10.4-7.888C26.4 11.12 21.744 7.6 16 7.6z"
      fill="#FEE500"
    />
    {/* 눈 두 개 */}
    <circle cx="12.8" cy="15" r="1.2" fill="#3C1E1E"/>
    <circle cx="19.2" cy="15" r="1.2" fill="#3C1E1E"/>
    {/* 입 */}
    <path d="M13 17.8 Q16 20 19 17.8" stroke="#3C1E1E" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
  </svg>
)

const CONFIG: PlatformConfig = {
  platform: 'kakao_map',
  uiKey: 'kakao',
  label: '카카오맵',
  color: '#FAE100',
  bg: '#FFFBE5',
  textColor: '#5C4A00',
  icon: '🟡',
  iconLetter: '카',
  logoNode: KakaoLogo,
  supportsFetch: true,
  connectHref: '/my/platforms/kakao_map/connect',
  reviewAdminUrl: 'https://place.map.kakao.com/',
  collectEndpoint: '/api/place/kakao/collect',
}

export default function KakaoReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
