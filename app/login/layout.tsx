import type { Metadata } from 'next'

const BASE = 'https://www.localution.co.kr'

export const metadata: Metadata = {
  title: '로그인',
  description: '로컬루션에 로그인하세요.',
  alternates: { canonical: BASE + '/login' },
  openGraph: {
    title: '로그인 | 로컬루션',
    description: '로컬루션에 로그인하세요.',
    url: BASE + '/login',
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
