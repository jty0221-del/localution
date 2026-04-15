import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: '대시보드',
  description: '로컬루션 대시보드',
  alternates: { canonical: BASE + '/dashboard' },
  openGraph: {
    title: '대시보드 | 로컬루션',
    description: '로컬루션 대시보드',
    url: BASE + '/dashboard',
    locale: 'ko_KR',
    type: 'website',
    siteName: '로컬루션',
    images: [{ url: BASE + '/og-image.png', width: 1200, height: 630 }],
  },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
