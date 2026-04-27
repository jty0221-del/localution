'use client'

/**
 * /marketing/keyword-rank — 플레이스 실시간 순위
 * 요구 모듈: keyword
 */

import GatedRoute from '../../components/GatedRoute'

export default function PlaceRealtimeLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="keyword">{children}</GatedRoute>
}
