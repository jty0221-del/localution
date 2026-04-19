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
} as const

export type BrandGradientKey = keyof typeof BRAND_GRAD
