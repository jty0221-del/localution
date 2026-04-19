'use client'

/**
 * /marketing/keyword-score 권한 가드
 * 요구 모듈: keyword
 */

import GatedRoute from '../../components/GatedRoute'

export default function KeywordScoreLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="keyword">{children}</GatedRoute>
}
