import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: 'QR 리뷰 자동화 - QR 스캔 한 번으로 리뷰 완성',
  description: 'QR 코드 하나로 손님이 직접 AI 리뷰를 작성합니다. 별점 5점 기본, 6가지 말투, 네이버·구글·카카오 원클릭 등록.',
  alternates: { canonical: BASE + '/qr' },
  openGraph: {
    title: 'QR 리뷰 자동화 - QR 스캔 한 번으로 리뷰 완성 | 로컬루션',
    description: 'QR 코드 하나로 손님이 직접 AI 리뷰를 작성합니다. 별점 5점 기본, 6가지 말투, 네이버·구글·카카오 원클릭 등록.',
    url: BASE + '/qr',
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
