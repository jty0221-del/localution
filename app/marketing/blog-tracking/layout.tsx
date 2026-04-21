// 27차-7 SEO: /marketing/blog-tracking 전용 metadata layout
import type { Metadata } from 'next'

const SITE_URL = 'https://www.localution.co.kr'
const PAGE_URL = `${SITE_URL}/marketing/blog-tracking`

const TITLE = '블로그 순위 자동 추적'
const DESC =
  '네이버 검색 상위노출·스마트블록·인플루언서 포함 영역까지 매일 자동 모니터링. 키워드별 노출 변동 한눈에 확인하고 이탈 시 카카오톡 알림으로 즉시 대응하는 자영업자 전용 블로그 순위 추적기.'

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
    '블로그 순위 추적', '네이버 블로그 순위', '스마트블록 순위',
    '네이버 상위노출', '인플루언서 블로그', '블로그 키워드 모니터링',
    '블로그 순위 변동 알림', '자영업자 블로그 마케팅',
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
