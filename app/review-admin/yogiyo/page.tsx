'use client'

// ============================================================
// 30차-22 · /review-admin/yogiyo — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
//   Worker 구현 전까지 "지금 수집" 은 비활성 (23차-5 대기)
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

const CONFIG: PlatformConfig = {
  platform: 'yogiyo',
  uiKey: 'yogiyo',
  label: '요기요',
  color: '#FA0050',
  bg: '#FFE5ED',
  textColor: '#A3003A',
  icon: '🛵',
  iconLetter: '요',
  supportsFetch: false,
  connectHref: '/my/platforms/yogiyo/connect',
}

export default function YogiyoReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
