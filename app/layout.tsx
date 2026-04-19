import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QuickSlot from './components/QuickSlot'
import BottomTabBar from './components/BottomTabBar'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = 'https://www.localution.co.kr'
const SITE_NAME = '로컬루션'
const SITE_TITLE = '로컬루션 | 사장님의 네이버·구글·배민 마케팅, AI가 대신합니다'
const SITE_DESC  = '네이버 플레이스 진단·AI 블로그 초안·인스타 릴스 대본·QR 리뷰 자동화. 1인 사장님도 5분 안에 시작. 월 990원부터, 회원가입 없이 바로 체험.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | 로컬루션',
  },
  description: SITE_DESC,
  keywords: [
    '로컬루션', '자영업자 마케팅', '소상공인 마케팅', '네이버 플레이스 진단',
    '네이버 플레이스 상위노출', 'AI 블로그 초안', '인스타 릴스 대본', 'QR 리뷰 자동화',
    'AI 리뷰 답글', '배달의민족 리뷰 관리', '구글 리뷰 관리', '1인 사장님 마케팅',
    '하랑마케팅', '매장 키워드 추적', '고객 재방문 CRM',
  ],
  authors: [{ name: '로컬루션', url: SITE_URL }],
  creator: '하랑마케팅',
  publisher: '로컬루션',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESC,
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // 네이버 서치어드바이저 토큰은 별도 환경변수로 관리 (값 없으면 meta 태그 자체 미출력)
  ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
    ? {
        other: {
          'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
        },
      }
    : {}),
}

export const viewport: Viewport = {
  themeColor: '#3182F6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
        <QuickSlot />
        <BottomTabBar />
      </body>
    </html>
  )
}
