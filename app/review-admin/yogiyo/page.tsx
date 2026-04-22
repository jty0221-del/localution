'use client'

// ============================================================
// 30차-22 · /review-admin/yogiyo — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
// 35차-5 hotfix: import 를 맨 위로, type 은 분리 (SWC parser 요구)
// ============================================================

import PlatformReviewAdmin from '../components/PlatformReviewAdmin'
import type { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

const CONFIG: PlatformConfig = {
  platform: 'yogiyo',
  uiKey: 'yogiyo',
  label: '요기요',
  color: '#FA0050',
  bg: '#FFF0F5',
  textColor: '#A0003A',
  icon: '🛵',
  iconLetter: '요',
  supportsFetch: true,               // 32차-2 YogiyoAdapter 완료
  collectEndpoint: '/api/review-reply/collect?platform=yogiyo',
  connectHref: '/my/platforms/yogiyo/connect',
}

export default function YogiyoReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
