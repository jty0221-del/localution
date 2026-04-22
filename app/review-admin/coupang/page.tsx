'use client'

// ============================================================
// 30차-22 · /review-admin/coupang — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
//   Worker 구현 전까지 "지금 수집" 은 비활성 (23차-5 대기)
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

const CONFIG: PlatformConfig = {
  platform: 'coupangeats',
  uiKey: 'coupang',
  label: '쿠팡이츠',
  color: '#FF4B30',
  bg: '#FFE7E3',
  textColor: '#A32A17',
  icon: '🚀',
  iconLetter: '쿠',
  supportsFetch: true,               // 32차-2 CoupangEatsAdapter 완료
  collectEndpoint: '/api/review-reply/collect?platform=coupangeats',
  connectHref: '/my/platforms/coupangeats/connect',
}

export default function CoupangReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
