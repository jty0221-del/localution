// 27차-7 SEO: /marketing/card-news 전용 metadata layout (server component)
// 'use client' page.tsx 위에 server layout 을 두어 페이지별 SEO 메타 부여
import type { Metadata } from 'next'

const SITE_URL = 'https://www.localution.co.kr'
const PAGE_URL = `${SITE_URL}/marketing/card-news`

const TITLE = '인스타 카드뉴스 AI 자동 생성기'
const DESC =
  '주제만 던지면 인스타그램 캐러셀 10장이 1080×1080 PNG 로 즉시 완성되는 자영업자 전용 AI 카드뉴스 제작 도구. 6테마 × 30주제, 바로 다운로드 후 업로드.'

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
    '인스타 카드뉴스', '카드뉴스 AI', '인스타 캐러셀',
    '자영업자 인스타', '소상공인 인스타 마케팅', '인스타 콘텐츠 자동화',
    '1080px 카드뉴스', '카드뉴스 템플릿', 'AI 인포그래픽',
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
