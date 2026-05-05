// ═══════════════════════════════════════════════════════════
// /login layout — 로그인 페이지 메타데이터 (SEO + a11y)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: '로그인',
 description: '네이버·카카오 간편 로그인으로 내 매장 AI 마케팅 대시보드에 접속하세요.',
 robots: { index: false, follow: true },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
 return children
}
