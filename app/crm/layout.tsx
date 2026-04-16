import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '고객 관리(CRM) | 로컬루션',
  description: '단골·VIP 고객 자동 분류, 재방문 유도 메시지 자동화. 소상공인 전용 CRM.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
