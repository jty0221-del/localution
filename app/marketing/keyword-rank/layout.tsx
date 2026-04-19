'use client'

/**
 * /marketing/keyword-rank 권한 가드
 * 요구 모듈: keyword
 */

import GatedRoute from '../../components/GatedRoute'

export default function KeywordRankLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="keyword">{children}</GatedRoute>
}
