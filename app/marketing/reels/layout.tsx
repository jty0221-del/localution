// 27차-7 복구: /marketing/reels GatedRoute(sns-manage) layout 복구 + per-route metadata
// - 원본: 'use client' GatedRoute moduleId="sns-manage" (f6c1635 Phase0.5 #8)
// - 본 파일은 server component 로 재작성하여 metadata export 를 허용하면서도
//   GatedRoute 클라이언트 가드를 그대로 wrap 하여 구독 모듈 가드 동작 유지
import type { Metadata } from 'next'
import GatedRoute from '../../components/GatedRoute'

const SITE_URL = 'https://www.localution.co.kr'
const PAGE_URL = `${SITE_URL}/marketing/reels`

const TITLE = '인스타 릴스·쇼츠 대본 AI 자동 작성'
const DESC =
  '자영업자 매장 후킹·홍보·메뉴 소개 릴스 대본을 AI 가 30초 안에 5종 생성. 카피라이터 없이도 바로 촬영 가능한 30초 영상 시나리오 + 자막 + 해시태그 자동 제공.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: `${TITLE} | 로컬루션`,
    description: DESC,
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | 로컬루션`,
    description: DESC,
  },
  keywords: [
    '인스타 릴스 대본', '쇼츠 대본 AI', '릴스 자동 생성',
    '자영업자 릴스', '소상공인 인스타', '맛집 릴스',
    '매장 홍보 영상', '인스타 카피', 'AI 영상 대본',
  ],
}

// 요구 모듈: sns-manage (원본 가드 유지)
export default function ReelsLayout({ children }: { children: React.ReactNode }) {
  return <GatedRoute moduleId="sns-manage">{children}</GatedRoute>
}
