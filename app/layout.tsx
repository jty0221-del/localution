import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QuickSlot from './components/QuickSlot'
import JsonLd from './components/JsonLd'

const inter = Inter({ subsets: ['latin'] })

const BASE = 'https://www.localution.co.kr'
const OG_IMAGE = BASE + '/og-image.png'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: '로컬루션 | 소상공인·자영업자 AI 마케팅 자동화 플랫폼',
    template: '%s | 로컬루션',
  },
  description: '네이버 플레이스·구글·배민 리뷰 AI 자동 답글, QR 리뷰 자동화, CRM 고객관리, AI 정산까지. 소상공인·자영업자를 위한 올인원 마케팅 자동화 플랫폼. 월 9,900원부터 시작.',
  keywords: [
    '로컬루션', '소상공인 마케팅', '자영업자 마케팅', '네이버 플레이스 관리',
    'AI 리뷰 답글', '리뷰 자동화', '네이버 리뷰 관리', '구글 리뷰 관리',
    '배달의민족 리뷰', '카카오 리뷰', '쿠팡이츠 리뷰', 'QR 리뷰',
    '소상공인 CRM', '고객 관리 앱', '매출 자동화', '세금계산서 자동화',
    '카페 마케팅', '식당 마케팅', '미용실 마케팅', '학원 마케팅',
    '하랑마케팅', 'AI 마케팅 플랫폼', '마케팅 대행', '네이버 SEO',
    '플레이스 상위노출', '블로그 마케팅', '소상공인 AI', '자영업자 앱',
  ],
  authors: [{ name: '로컬루션', url: BASE }],
  creator: '하랑마케팅',
  publisher: '로컬루션',
  category: '마케팅 소프트웨어',
  themeColor: '#3182F6',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: BASE,
    languages: { 'ko-KR': BASE },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: BASE,
    siteName: '로컬루션',
    title: '로컬루션 | 소상공인·자영업자 AI 마케팅 자동화 플랫폼',
    description: '네이버 플레이스·구글·배민 리뷰 AI 자동 답글, QR 리뷰 자동화, CRM 고객관리. 소상공인 올인원 마케팅 플랫폼.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: '로컬루션 - 소상공인 AI 마케팅 자동화 플랫폼' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@localution',
    creator: '@localution',
    title: '로컬루션 | 소상공인 AI 마케팅 자동화',
    description: '네이버·구글·배민 리뷰 AI 자동 답글, QR 리뷰, CRM 올인원. 월 9,900원.',
    images: [OG_IMAGE],
  },
  verification: {
    google: 'L3FR0l46_P0ajJiq4coVnEv_zvEJdnLJineApVy586Y',
    other: {
      'naver-site-verification': '12af504298bf38505d03768d50aecb6da1803249',
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <JsonLd />
        {children}
        <QuickSlot />
      </body>
    </html>
  )
}
