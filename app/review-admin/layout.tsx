import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'AI 리뷰·마케팅',
  description: '네이버·구글·배민 리뷰 AI 자동 답글. 플랫폼별 맞춤 말투로 답글률 100% 유지.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
