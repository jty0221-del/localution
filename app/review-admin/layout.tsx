'use client'

/**
 * /review-admin 전체 권한 가드
 * 요구 모듈: ai-review
 * 하위 경로(naver·kakao·google·baemin·yogiyo·coupang) 자동 상속
 */

import GatedRoute from '../components/GatedRoute'

export default function ReviewAdminLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="ai-review">{children}</GatedRoute>
}
