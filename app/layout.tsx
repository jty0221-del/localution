import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QuickSlot from './components/QuickSlot'
import BottomTabBar from './components/BottomTabBar'
import UpdatesPopupBanner from './components/UpdatesPopupBanner'
import ScrollToTop from './components/ScrollToTop'
import OnboardingBanner from './components/OnboardingBanner'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = 'https://www.localution.co.kr'
const SITE_NAME = '로컬루션'
const SITE_TITLE = '로컬루션 | 사장님의 네이버·구글·배민 마케팅, AI가 대신합니다'
// 네이버 서치어드바이저 80자 제한 대응 (2026-04-19)
// 23차-SEO: og:image 추가 (opengraph-image.tsx 자동 생성) (2026-04-21)
// 민감 표현(AI 블로그 생성) 제거 → 리뷰 관리·SNS 자동화·AI 진단 중심으로 재작성
const SITE_DESC = '네이버·구글·배민·요기요 리뷰 자동 답글, 인스타·유튜브 쇼츠 자동화, AI 매장 진단까지. 커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰답글 자동.'

export const metadata: Metadata = {
 metadataBase: new URL(SITE_URL),
 title: {
 default: SITE_TITLE,
 template: '%s | 로컬루션',
 },
 description: SITE_DESC,
 keywords: [
 '로컬루션', 'Localution', '자영업자 마케팅', '소상공인 마케팅',
 'AI 마케팅 자동화', 'AI 마케팅 OS', '자영업 SaaS',
 '네이버 플레이스 진단', '네이버 플레이스 상위노출',
 'AI 블로그 초안', '인스타 릴스 대본', 'QR 리뷰 자동화',
 'AI 리뷰 답글', '배달의민족 리뷰 관리', '구글 리뷰 관리',
 '1인 사장님 마케팅', '매장 키워드 추적', '고객 재방문 CRM',
 ],
 authors: [{ name: '로컬루션', url: SITE_URL }],
 creator: '로컬루션',
 publisher: '로컬루션',
 alternates: { canonical: SITE_URL },
 openGraph: {
 type: 'website',
 url: SITE_URL,
 siteName: SITE_NAME,
 title: SITE_TITLE,
 description: SITE_DESC,
 locale: 'ko_KR',
 images: [
 {
 url: `${SITE_URL}/opengraph-image`,
 width: 1200,
 height: 630,
 alt: '로컬루션 – 사장님 마케팅 플랫폼',
 },
 ],
 },
 twitter: {
 card: 'summary_large_image',
 title: SITE_TITLE,
 description: SITE_DESC,
 images: [`${SITE_URL}/opengraph-image`],
 },
 // icons: Next.js app router가 app/icon.png, app/apple-icon.png, app/favicon.ico를
 // 자동 감지하여 <link rel="icon|apple-touch-icon"> 태그를 생성함. 명시적 설정 불필요.
 // (네이버/구글 크롤러용 고해상도 아이콘: icon.png 512x512, apple-icon.png 180x180)
 robots: {
 index: true,
 follow: true,
 googleBot: {
 index: true,
 follow: true,
 'max-image-preview': 'large',
 'max-snippet': -1,
 },
 },
 // 네이버 서치어드바이저 토큰은 별도 환경변수로 관리 (값 없으면 meta 태그 자체 미출력)
 ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
 ? {
 other: {
 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
 },
 }
 : {}),
}

export const viewport: Viewport = {
 themeColor: '#3182F6',
 width: 'device-width',
 initialScale: 1,
}

export default function RootLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return (
 <html lang="ko">
 <body className={inter.className}>
 {/* 2-D · 매장 미등록 사용자 글로벌 onboarding 배너 (워크스페이스 한정) */}
 <OnboardingBanner />
 {children}
 <QuickSlot />
 <BottomTabBar />
 {/* 19차-2 · 새 업데이트 팝업 배너 (클라이언트 컴포넌트, 공개 랜딩 제외) */}
 <UpdatesPopupBanner />
 {/* 스크롤 최상단 이동 버튼 (모바일/PC, 워크스페이스에서만 노출) */}
 <ScrollToTop />
 </body>
 </html>
 )
}
