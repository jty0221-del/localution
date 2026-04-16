import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'QR 리뷰 자동화 | 로컬루션',
  description: 'QR 코드 한 번 스캔으로 리뷰 자동 생성. 네이버·구글·카카오 원클릭 등록.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
