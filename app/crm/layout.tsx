import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: '고객 관리(CRM)',
  description: '단골·VIP 고객 자동 분류, 재방문 유도 메시지 자동화. 소상공인 전용 CRM.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
