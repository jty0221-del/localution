'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
//   Worker 구현 전까지 "지금 수집" 은 비활성 (23차-5 대기)
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

const CONFIG: PlatformConfig = {
  platform: 'baemin',
  uiKey: 'baemin',
  label: '배달의민족',
  color: '#2AC1BC',
  bg: '#E0F7F6',
  textColor: '#0C6F6B',
  icon: '🍔',
  iconLetter: '배',
  supportsFetch: false,              // 23차-5 BaeminAdapter 대기
  connectHref: '/my/platforms/baemin/connect',
}

export default function BaeminReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
