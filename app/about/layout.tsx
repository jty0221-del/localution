import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로컬루션 소개 — 자영업자를 위한 AI 마케팅 OS',
  description: '리뷰 답글·SNS 운영·광고 집행을 AI가 자동으로. 500곳 매장 데이터를 학습한 로컬루션, 월 990원부터.',
  openGraph: {
    title: '로컬루션 — 자영업자를 위한 AI 마케팅 OS',
    description: '하루 10분이면 사장님 마케팅 끝. AI가 리뷰·SNS·광고를 24시간 대신 돌립니다.',
    type: 'website',
    url: 'https://www.localution.co.kr/about',
  },
  alternates: {
    canonical: 'https://www.localution.co.kr/about',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
