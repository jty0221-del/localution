import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: '1:1 문의 - 로컬루션 고객 지원',
  description: '로컬루션 서비스 이용 중 궁금한 점을 1:1 문의로 남겨주세요. 평균 응답 시간 2시간 이내.',
  alternates: { canonical: BASE + '/inquiry' },
  openGraph: {
    title: '1:1 문의 - 로컬루션 고객 지원 | 로컬루션',
    description: '로컬루션 서비스 이용 중 궁금한 점을 1:1 문의로 남겨주세요. 평균 응답 시간 2시간 이내.',
    url: BASE + '/inquiry',
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
