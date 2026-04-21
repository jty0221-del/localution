// 27차-7 복구: /marketing/blog-post GatedRoute(blog-ai) layout 복구 + per-route metadata
// - 원본: 'use client' GatedRoute moduleId="blog-ai" (8505628 Phase0.5 #7)
// - 본 파일은 server component 로 재작성하여 metadata export 를 허용하면서도
//   GatedRoute 클라이언트 가드를 그대로 wrap 하여 구독 모듈 가드 동작 유지
import type { Metadata } from 'next'
import GatedRoute from '../../components/GatedRoute'

const SITE_URL = 'https://www.localution.co.kr'
const PAGE_URL = `${SITE_URL}/marketing/blog-post`

const TITLE = '네이버 블로그 AI 초안 생성기'
const DESC =
  '자영업자 업종·키워드만 입력하면 네이버 검색 SEO 최적화된 블로그 초안이 3000자 이내로 즉시 완성. 헤드라인·본문·해시태그 자동 구성으로 블로그 마케팅 시간 90% 단축.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: `${TITLE} | 로컬루션`,
    description: DESC,
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | 로컬루션`,
    description: DESC,
  },
  keywords: [
    '네이버 블로그 AI', '블로그 초안 생성', 'AI 블로그 작성',
    '블로그 SEO', '자영업자 블로그', '소상공인 블로그',
    '블로그 마케팅', '네이버 SEO 블로그', '블로그 키워드',
  ],
}

// 요구 모듈: blog-ai (원본 가드 유지)
export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="blog-ai">{children}</GatedRoute>
}
