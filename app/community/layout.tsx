import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: '소상공인 커뮤니티 - 지역별 사장님 정보 공유',
  description: '전국 소상공인·자영업자 사장님들의 마케팅 노하우, 정부지원금, 상권 정보를 지역별로 공유하는 커뮤니티.',
  alternates: { canonical: BASE + '/community' },
  openGraph: {
    title: '소상공인 커뮤니티 - 지역별 사장님 정보 공유 | 로컬루션',
    description: '전국 소상공인·자영업자 사장님들의 마케팅 노하우, 정부지원금, 상권 정보를 지역별로 공유하는 커뮤니티.',
    url: BASE + '/community',
    locale: 'ko_KR',
    type: 'website',
    siteName: '로컬루션',
    images: [{ url: BASE + '/og-image.png', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
