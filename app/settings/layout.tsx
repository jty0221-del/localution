import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: '설정',
  description: '로컬루션 설정',
  alternates: { canonical: BASE + '/settings' },
  openGraph: {
    title: '설정 | 로컬루션',
    description: '로컬루션 설정',
    url: BASE + '/settings',
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
