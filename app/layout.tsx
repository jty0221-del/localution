import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QuickSlot from './components/QuickSlot'
import BottomTabBar from './components/BottomTabBar'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = 'https://www.localution.co.kr'
const SITE_NAME = '로컬루션'
const SITE_TITLE = '로컬루션 | 사장님의 모든 업무, AI가 대신합니다'
const SITE_DESC  = '리뷰·정산·CRM·마케팅 올인원 자동화. 네이버·배민·구글 통합 관리. 월 9,900원부터 시작하세요.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | 로컬루션',
  },
  description: SITE_DESC,
  keywords: [
    '로컬루션', '자영업자 마케팅', '소상공인 CRM', '네이버 플레이스 관리',
    'AI 리뷰 답글', '배달의민족 리뷰', '구글 리뷰 관리', '매장 정산 자동화',
    '사장님 마케팅', '하랑마케팅', '세금계산서 자동화', '고객 단체 메시지',
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
  other: {
    'naver-site-verification': '',
  },
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
