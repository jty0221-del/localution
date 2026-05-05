// ═══════════════════════════════════════════════════════════
// /pricing layout — 요금제 페이지 메타데이터 (SEO + a11y)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from 'next'

export const metadata: Metadata = {
 title: '요금제 — 월 6,900원부터, 기능 선택형 AI 마케팅',
 description: '필요한 기능만 고르는 선택형 요금제. 리뷰 자동 답글·SNS 자동 포스팅·AI 매장 진단을 커피 한 잔 값 월 6,900원부터. 1인 사장님 맞춤 플랜.',
 openGraph: {
 title: '요금제 | 로컬루션 - 기능 선택형 AI 마케팅',
 description: ' 커피 한 잔 값 월 6,900원부터의 선택형 플랜.',
 type: 'website',
 },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
 return children
}
