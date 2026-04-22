'use client'

// ============================================================
// 30차-22 · /review-admin/naver — 공통 컴포넌트 사용 wrapper
//   실제 로직은 app/review-admin/components/PlatformReviewAdmin.tsx 참고
//   (30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성)
// 35차-5 hotfix: import 를 맨 위로, type 은 분리 (SWC parser 요구)
// ============================================================

import PlatformReviewAdmin from '../components/PlatformReviewAdmin'
import type { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

const CONFIG: PlatformConfig = {
  platform: 'naver_place',
  uiKey: 'naver',
  label: '네이버 플레이스',
  color: '#03C75A',
  bg: '#E8FBF0',
  textColor: '#015C2C',
  icon: '🟢',
  iconLetter: 'N',
  supportsFetch: true,               // 23차-15-B 에서 이미 수집 파이프 완료
  collectEndpoint: '/api/place/reviews/fetch',
  connectHref: '/my/platforms/naver_place/connect',
}

export default function NaverReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
