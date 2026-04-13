import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '로컬루션 — 소상공인 AI 만능 비서',
  description: '리뷰 관리, CRM, AI 마케팅을 하나로. 소상공인을 위한 올인원 솔루션.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: '로컬루션 — 소상공인 AI 만능 비서',
    description: '리뷰 관리, CRM, AI 마케팅을 하나로.',
    images: ['https://localution.co.kr/logo.png'],
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
