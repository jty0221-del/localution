// 27차-7 SEO: /marketing/blog-post 전용 metadata layout
import type { Metadata } from 'next'

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

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
