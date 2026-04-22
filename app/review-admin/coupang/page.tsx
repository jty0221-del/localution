'use client'

// ============================================================
// 30차-22 · /review-admin/coupang — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
// 35차-5 hotfix: import 를 맨 위로, type 은 분리 (SWC parser 요구)
// ============================================================

import PlatformReviewAdmin from '../components/PlatformReviewAdmin'
import type { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

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
