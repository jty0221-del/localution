// ═══════════════════════════════════════════════════════════
//  /signup layout — 회원가입 전용 메타데이터 (SEO + a11y)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '회원가입 — 월 990원 자영업자 AI 마케팅 시작',
  description: '네이버·배민·요기요 리뷰 자동 답글과 인스타·유튜브 쇼츠 자동화를 월 990원부터. 네이버 카카오 계정으로 1초 가입.',
  robots: { index: false, follow: true }, // OAuth 리다이렉트 페이지는 색인 제외
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
