'use client'

// ============================================================
// 30차-22 · /review-admin/baemin — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
// 35차-5 hotfix: import 를 맨 위로, type 은 분리 (SWC parser 요구)
// ============================================================

import PlatformReviewAdmin from '../components/PlatformReviewAdmin'
import type { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

const CONFIG: PlatformConfig = {
  platform: 'baemin',
  uiKey: 'baemin',
  label: '배달의민족',
  color: '#2AC1BC',
  bg: '#E0F7F6',
  textColor: '#0C6F6B',
  icon: '🍔',
  iconLetter: '배',
  supportsFetch: true,               // 32차-2 BaeminAdapter 완료
  collectEndpoint: '/api/review-reply/collect?platform=baemin',
  connectHref: '/my/platforms/baemin/connect',
}

export default function BaeminReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
