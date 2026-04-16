import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: '고객 목록 | 로컬루션',
  description: '전체 고객 리스트 조회, 검색, 등급 관리. 단골·VIP·신규·휴면 자동 분류.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
