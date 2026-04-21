// 27차-7 SEO: /marketing/place 전용 metadata layout
import type { Metadata } from 'next'

const SITE_URL = 'https://www.localution.co.kr'
const PAGE_URL = `${SITE_URL}/marketing/place`

const TITLE = '네이버 플레이스 진단·상위노출'
const DESC =
  '네이버 플레이스 키워드 진단·리뷰수·답글률을 한 번에 분석하고 상위노출 체크리스트로 약점을 잡아주는 자영업자 전용 무료 도구. 매장 주소만 입력하면 즉시 결과 제공.'

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
    '네이버 플레이스', '플레이스 상위노출', '플레이스 진단',
    '네이버 지도 상위노출', '맛집 상위노출', '플레이스 키워드',
    '플레이스 리뷰 관리', '플레이스 마케팅', '자영업자 마케팅',
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
