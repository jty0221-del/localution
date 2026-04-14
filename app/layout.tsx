import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QuickSlot from './components/QuickSlot'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Localution | 소상공인 스마트 마케팅',
  description: '네이버 플레이스·구글·카카오 리뷰를 한 곳에서 관리하는 소상공인 전용 마케팅 플랫폼',
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
      </body>
    </html>
  )
}
