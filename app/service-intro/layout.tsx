import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: '서비스 소개 - 로컬루션 AI 마케팅 기능 총정리',
  description: '네이버 플레이스 AI 리뷰 답글, QR 리뷰 자동화, CRM 고객관리, AI 정산·행정. 소상공인·자영업자를 위한 올인원 마케팅 자동화 서비스.',
  alternates: { canonical: BASE + '/service-intro' },
  openGraph: {
    title: '서비스 소개 - 로컬루션 AI 마케팅 기능 총정리 | 로컬루션',
    description: '네이버 플레이스 AI 리뷰 답글, QR 리뷰 자동화, CRM 고객관리, AI 정산·행정. 소상공인·자영업자를 위한 올인원 마케팅 자동화 서비스.',
    url: BASE + '/service-intro',
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
