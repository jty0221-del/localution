'use client'

/**
 * /marketing/reels 권한 가드
 * 요구 모듈: sns-manage
 */

import GatedRoute from '../../components/GatedRoute'

export default function ReelsLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="sns-manage">{children}</GatedRoute>
}
