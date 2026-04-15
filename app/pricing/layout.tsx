import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: '요금제 - 기능별 구독, 월 9,900원부터',
  description: 'AI 리뷰 답글, QR 리뷰, CRM, 정산 등 필요한 기능만 선택. 3개+ 10%, 5개+ 15%, 8개+ 20% 번들 할인. 소상공인·자영업자 맞춤 요금제.',
  alternates: { canonical: BASE + '/pricing' },
  openGraph: {
    title: '요금제 - 기능별 구독, 월 9,900원부터 | 로컬루션',
    description: 'AI 리뷰 답글, QR 리뷰, CRM, 정산 등 필요한 기능만 선택. 3개+ 10%, 5개+ 15%, 8개+ 20% 번들 할인. 소상공인·자영업자 맞춤 요금제.',
    url: BASE + '/pricing',
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
