// 27차-7 복구: /marketing/place 공개 체험 layout (server component) + per-route metadata
// - 원본: 'use client' 공개 접근 placeholder (ad0e73c Phase0.5 #6)
// - 본 파일은 server component 로 재작성하여 metadata export 를 허용하되,
// 원본과 동일하게 children 그대로 반환 (가드 없음, 공개 체험 유지)
// - 비로그인 공개 1분 무료 진단 CTA 목적지이므로 GatedRoute 비적용 원칙 유지
import type { Metadata } from 'next'

const SITE_URL = 'https://www.localution.co.kr'
const PAGE_URL = `${SITE_URL}/marketing/place`

const TITLE = '네이버 플레이스 진단·상위노출'
const DESC =
 '네이버 플레이스 키워드 진단·리뷰수·답글률을 한 번에 분석하고 상위노출 체크리스트로 약점을 잡아주는 자영업자 전용 무료 도구. 매장 주소만 입력하면 즉시 결과 제공.'

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
 '네이버 플레이스', '플레이스 상위노출', '플레이스 진단',
 '네이버 지도 상위노출', '맛집 상위노출', '플레이스 키워드',
 '플레이스 리뷰 관리', '플레이스 마케팅', '자영업자 마케팅',
 ],
}

// 공개 접근 허용 — 페이지 내부에서 필요 시 인라인 LockedBanner 사용 (원본 주석 유지)
export default function PlaceLayout({ children }: { children: React.ReactNode }) {
 return <>{children}</>
}
