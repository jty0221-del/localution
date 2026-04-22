'use client'

// ============================================================
// 30차-22 · /review-admin/naver — 공통 컴포넌트 사용 wrapper
//   실제 로직은 app/review-admin/components/PlatformReviewAdmin.tsx 참고
//   (30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성)
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

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
  connectHref: '/my/platforms/naver_place/connect',
}

export default function NaverReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
