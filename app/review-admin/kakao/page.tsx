'use client'

// ============================================================
// 31차-1 · /review-admin/kakao — 공통 컴포넌트 사용 wrapper
//   30차-21 초안→편집→등록 + 30차-22 일괄 초안 생성
//   공개 commentlist 수집 파이프 (31차-3) 연동
// ============================================================

import PlatformReviewAdmin from '../components/PlatformReviewAdmin'
import type { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

const CONFIG: PlatformConfig = {
  platform: 'kakao_map',
  uiKey: 'kakao',
  label: '카카오맵',
  color: '#FEE500',
  bg: '#FFFBE5',
  textColor: '#6B5A00',
  icon: '🟡',
  iconLetter: '카',
  supportsFetch: true,                 // 31차-3: 공개 panel3 수집기 완료
  connectHref: '/my/platforms/kakao_map/connect',
  collectEndpoint: '/api/place/kakao/collect',
}

export default function KakaoReviewPage() {
  return <PlatformReviewAdmin config={CONFIG} />
}
