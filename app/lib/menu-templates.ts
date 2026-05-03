// app/lib/menu-templates.ts
// ============================================================
// 메뉴판 템플릿 — 진짜 인쇄 메뉴판 같은 5가지 레이아웃
//   각 템플릿은 별도 React 컴포넌트로 렌더링
//   업종/분위기에 맞춰 사장님이 선택
// ============================================================

export type MenuTemplateId =
  | 'list-default'           // 기본 미니멀 (현재)
  | 'classic-korean'         // 클래식 한식 정식
  | 'vintage-parchment'      // 빈티지 양피지
  | 'dark-premium'           // 블랙 프리미엄
  | 'elegant-western'        // 엘레강스 양식
  | 'three-column-photo'     // 3컬럼 사진 그리드

export type MenuTemplateInfo = {
  id: MenuTemplateId
  label: string
  desc: string
  preview_color: string
  industries: string[]
  // 자동 적용되는 색상 팔레트 (사장님이 추가 커스텀 가능)
  default_theme: {
    primary_color: string
    accent_color: string
    bg_color: string
    surface_color: string
    text_color: string
    text_muted: string
    border_color: string
  }
}

export const MENU_TEMPLATES: MenuTemplateInfo[] = [
  {
    id: 'list-default',
    label: '미니멀 리스트',
    desc: '깔끔한 모바일 리스트 (모든 업종 무난)',
    preview_color: '#3182F6',
    industries: ['공통'],
    default_theme: {
      primary_color: '#3182F6',
      accent_color: '#7C3AED',
      bg_color: '#FFFFFF',
      surface_color: '#F8FAFB',
      text_color: '#191F28',
      text_muted: '#8B95A1',
      border_color: '#E5E8EB',
    },
  },
  {
    id: 'classic-korean',
    label: '클래식 한식 정식',
    desc: '청록 헤더 + 점선 가격 + 사진 하단 (백반/한식/분식)',
    preview_color: '#0E7490',
    industries: ['한식', '백반', '국밥', '정식', '분식'],
    default_theme: {
      primary_color: '#0E7490',
      accent_color: '#0891B2',
      bg_color: '#FFFFFF',
      surface_color: '#F0F9FF',
      text_color: '#0F172A',
      text_muted: '#64748B',
      border_color: '#CBD5E1',
    },
  },
  {
    id: 'vintage-parchment',
    label: '빈티지 양피지',
    desc: '크라프트지 + 검정박스 카테고리 (한우/연탄집/전통)',
    preview_color: '#78350F',
    industries: ['한우', '연탄구이', '곱창', '전통', '족발'],
    default_theme: {
      primary_color: '#78350F',
      accent_color: '#92400E',
      bg_color: '#F4EBD0',
      surface_color: '#FAF6F0',
      text_color: '#1F1612',
      text_muted: '#78716C',
      border_color: '#A8A29E',
    },
  },
  {
    id: 'dark-premium',
    label: '블랙 프리미엄',
    desc: '검정 + 화이트 + 영문 병기 (이자카야/양꼬치/펍)',
    preview_color: '#0F172A',
    industries: ['이자카야', '양꼬치', '와인바', '펍', '오마카세'],
    default_theme: {
      primary_color: '#FFFFFF',
      accent_color: '#FBBF24',
      bg_color: '#0F172A',
      surface_color: '#1E293B',
      text_color: '#FFFFFF',
      text_muted: '#94A3B8',
      border_color: '#334155',
    },
  },
  {
    id: 'elegant-western',
    label: '엘레강스 양식',
    desc: 'Cursive 영문 + Signature 도장 (파스타/스테이크/카페)',
    preview_color: '#DC2626',
    industries: ['파스타', '피자', '이탈리안', '브런치', '레스토랑'],
    default_theme: {
      primary_color: '#DC2626',
      accent_color: '#CA8A04',
      bg_color: '#FAFAF9',
      surface_color: '#FFFFFF',
      text_color: '#1C1917',
      text_muted: '#78716C',
      border_color: '#D6D3D1',
    },
  },
  {
    id: 'three-column-photo',
    label: '3컬럼 사진 그리드',
    desc: '3분할 + 사진 박스 + 한/영 병기 (돈까스/일식/세트메뉴)',
    preview_color: '#EA580C',
    industries: ['돈까스', '일식', '냉면', '라멘', '세트메뉴'],
    default_theme: {
      primary_color: '#EA580C',
      accent_color: '#F59E0B',
      bg_color: '#FFFFFF',
      surface_color: '#FFFBEB',
      text_color: '#1C1917',
      text_muted: '#78716C',
      border_color: '#FED7AA',
    },
  },
]

export function getTemplateInfo(id: MenuTemplateId): MenuTemplateInfo {
  return MENU_TEMPLATES.find(t => t.id === id) || MENU_TEMPLATES[0]
}
