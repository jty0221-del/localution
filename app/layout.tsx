import type { Metadata } from 'next'
import './globals.css'
import ServiceWorkerRegistrar from './components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: '로컬루션 — 소상공인 AI 만능 비서',
  description: '리뷰 관리, CRM, 알림톡, 정산까지. 필요한 기능만 골라 월 990원부터. 소상공인을 위한 AI 올인원 플랫폼.',
  keywords: '소상공인, AI 마케팅, 리뷰 관리, CRM, 알림톡, 네이버 플레이스, 배달앱',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: '로컬루션 — 소상공인 AI 만능 비서',
    description: '리뷰 관리, CRM, 알림톡, 정산까지. 필요한 기능만 골라 월 990원부터.',
    url: 'https://localution.co.kr',
    siteName: '로컬루션',
    images: [
      {
        url: 'https://localution.co.kr/logo.png',
        width: 512,
        height: 512,
        alt: '로컬루션 로고',
      }
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '로컬루션 — 소상공인 AI 만능 비서',
    description: '필요한 기능만 골라 월 990원부터.',
    images: ['https://localution.co.kr/logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}
