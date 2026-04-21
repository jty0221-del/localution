// 27차-7 SEO: /marketing/reels 전용 metadata layout
import type { Metadata } from 'next'

const SITE_URL = 'https://www.localution.co.kr'
const PAGE_URL = `${SITE_URL}/marketing/reels`

const TITLE = '인스타 릴스·쇼츠 대본 AI 자동 작성'
const DESC =
  '자영업자 매장 후킹·홍보·메뉴 소개 릴스 대본을 AI 가 30초 안에 5종 생성. 카피라이터 없이도 바로 촬영 가능한 30초 영상 시나리오 + 자막 + 해시태그 자동 제공.'

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
    '인스타 릴스 대본', '쇼츠 대본 AI', '릴스 자동 생성',
    '자영업자 릴스', '소상공인 인스타', '맛집 릴스',
    '매장 홍보 영상', '인스타 카피', 'AI 영상 대본',
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
