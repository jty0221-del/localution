// ═══════════════════════════════════════════════════════════
//  app/lib/brand-colors.ts
//  로컬루션 브랜드 컬러·그라데이션 토큰
//  — 하드코딩 hex 반복을 줄이기 위해 자주 쓰는 조합만 정의한다.
// ═══════════════════════════════════════════════════════════

export const BRAND = {
  // 기본 단색 (Toss 계열 블루)
  primary:   '#3182F6',
  primaryDark: '#1B64DA',
  accent:    '#8B5CF6',  // 보라
  accentDark: '#6D28D9',

  // 상태
  success:   '#12B76A',
  warn:      '#F59E0B',
  danger:    '#F04452',

  // 중립
  ink:       '#191F28',  // 본문
  sub:       '#4E5968',
  mute:      '#8B95A1',
  line:      '#E5E8EB',
  bg:        '#F2F4F6',
  bgAlt:     '#F8F9FA',
} as const

// Tailwind arbitrary-value 형태로 자주 쓰는 그라데이션 조합
// 사용: <div className={BRAND_GRAD.avatar}>...</div>
export const BRAND_GRAD = {
  // 사용자 프로필 아바타 — 블루→퍼플
  avatar:    'bg-gradient-to-br from-[#3182F6] to-[#8B5CF6]',
  // 대시보드 기본 브랜딩 — 블루 톤
  primary:   'bg-gradient-to-br from-[#3182F6] to-[#1B64DA]',
  // 보라 액센트 (AI/스마트 기능)
  accent:    'bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9]',
  // 주의 / 경고
  warn:      'bg-gradient-to-br from-[#F59E0B] to-[#D97706]',
  // 성공 / 긍정
  success:   'bg-gradient-to-br from-[#12B76A] to-[#059669]',
  // 마케팅 프로모션 (보라→핑크)
  promo:     'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#EC4899]',
  // 네이버 브랜드 그라데이션
  naver:     'bg-gradient-to-r from-[#03C75A] via-[#00A645] to-[#059669]',
  // 리뷰 플랫폼별 (review-admin 하위 페이지 PageHeader 용 — 15차-2)
  google:    'bg-gradient-to-r from-[#4285F4] via-[#3367D6] to-[#1A56DB]',
  baemin:    'bg-gradient-to-r from-[#2AC1BC] via-[#1DA5A0] to-[#0E877F]',
  yogiyo:    'bg-gradient-to-r from-[#FA0050] via-[#DA003C] to-[#B00030]',
  coupang:   'bg-gradient-to-r from-[#FF4B30] via-[#E03B20] to-[#C02A15]',
  // 카카오 공식 브랜드 옐로우 (텍스트는 PageHeader에서 dark 모드 적용)
  kakao:     'bg-gradient-to-r from-[#FEE500] via-[#FAD900] to-[#F0C600]',
  // 마케팅 하위 페이지별 (15차-4)
  // 블로그 포스팅 — 에메랄드 (네이버 톤과 차별화)
  emerald:   'bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857]',
  // 키워드 순위 — 스카이 블루
  sky:       'bg-gradient-to-r from-[#0EA5E9] via-[#0284C7] to-[#0369A1]',
  // 키워드 점수 — 오렌지
  orange:    'bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]',
  // 플레이스 진단 — 브라이트 그린
  placeGreen:'bg-gradient-to-r from-[#22C55E] via-[#16A34A] to-[#15803D]',
  // 숏폼·릴스 — 핑크/로즈
  pink:      'bg-gradient-to-r from-[#EC4899] via-[#DB2777] to-[#BE185D]',
} as const

export type BrandGradientKey = keyof typeof BRAND_GRAD
