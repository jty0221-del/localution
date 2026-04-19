'use client'

/**
 * /marketing/blog-post 권한 가드
 * 요구 모듈: blog-ai
 */

import GatedRoute from '../../components/GatedRoute'

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="blog-ai">{children}</GatedRoute>
}
