import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '회사 소개 — 마케팅의 본질을 지키는 하랑',
  description: '10년차 마케터 전태영이 직접 운영. 500+ 자영업자와 함께한 하랑마케팅의 철학, 5가지 약속, All-in-One 서비스, 대표의 편지.',
  openGraph: {
    title: '회사 소개 — 마케팅의 본질을 지키는 하랑',
    description: '해병대 장교, 카페 창업 실패, 500+ 고객사 — 대표가 직접 겪은 이야기와 자영업자를 위한 마케팅의 정답.',
    type: 'article',
    url: 'https://www.localution.co.kr/about',
  },
  alternates: {
    canonical: 'https://www.localution.co.kr/about',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
