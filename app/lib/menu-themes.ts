// app/lib/menu-themes.ts
// ============================================================
// 메뉴판 업종별 프리셋 테마
//   · 8개 업종 프리셋 + default 1개
//   · 사장님이 선택 후 추가 커스텀 가능
// ============================================================

export type MenuTheme = {
  primary_color: string       // 헤더/강조 색
  accent_color: string        // 보조 강조 (배지, 버튼)
  bg_color: string            // 페이지 배경
  surface_color: string       // 카드 배경
  text_color: string          // 본문 색
  text_muted: string          // 부가 텍스트
  border_color: string        // 카드 테두리
  font_family: 'sans' | 'serif' | 'rounded'
  card_style: 'minimal' | 'bordered' | 'shadow' | 'photo-large'
  category_layout: 'tabs' | 'sections'
  header_style: 'gradient' | 'solid' | 'image'
  header_image_url?: string | null
  badge_style: 'pill' | 'flat'
}

export type ThemePreset = {
  id: string
  label: string
  desc: string
  industries: string[]   // 추천 업종
  theme: MenuTheme
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default-clean',
    label: '미니멀 화이트',
    desc: '깔끔한 화이트 + 블루 강조 (모든 업종)',
    industries: ['공통'],
    theme: {
      primary_color: '#3182F6',
      accent_color: '#7C3AED',
      bg_color: '#FFFFFF',
      surface_color: '#F8FAFB',
      text_color: '#191F28',
      text_muted: '#8B95A1',
      border_color: '#E5E8EB',
      font_family: 'sans',
      card_style: 'minimal',
      category_layout: 'tabs',
      header_style: 'gradient',
      badge_style: 'pill',
    },
  },
  {
    id: 'korean-traditional',
    label: '한식 전통',
    desc: '따뜻한 베이지 + 갈색 강조 (한식, 정식, 백반)',
    industries: ['한식', '정식', '백반', '국밥', '찌개'],
    theme: {
      primary_color: '#92400E',
      accent_color: '#DC2626',
      bg_color: '#FEF7ED',
      surface_color: '#FFFFFF',
      text_color: '#1F1612',
      text_muted: '#78716C',
      border_color: '#E7E5E4',
      font_family: 'serif',
      card_style: 'bordered',
      category_layout: 'sections',
      header_style: 'solid',
      badge_style: 'flat',
    },
  },
  {
    id: 'cafe-cozy',
    label: '카페 코지',
    desc: '부드러운 베이지 + 모카 (카페, 베이커리, 디저트)',
    industries: ['카페', '베이커리', '디저트', '브런치'],
    theme: {
      primary_color: '#78350F',
      accent_color: '#D97706',
      bg_color: '#FAF6F0',
      surface_color: '#FFFFFF',
      text_color: '#292524',
      text_muted: '#A8A29E',
      border_color: '#E7E5E4',
      font_family: 'rounded',
      card_style: 'shadow',
      category_layout: 'tabs',
      header_style: 'gradient',
      badge_style: 'pill',
    },
  },
  {
    id: 'pizza-italian',
    label: '피자/이탈리안',
    desc: '레드+그린 액센트 (피자, 파스타, 이탈리안)',
    industries: ['피자', '파스타', '이탈리안'],
    theme: {
      primary_color: '#DC2626',
      accent_color: '#16A34A',
      bg_color: '#FFF8F0',
      surface_color: '#FFFFFF',
      text_color: '#1C1917',
      text_muted: '#78716C',
      border_color: '#FED7AA',
      font_family: 'serif',
      card_style: 'shadow',
      category_layout: 'sections',
      header_style: 'gradient',
      badge_style: 'pill',
    },
  },
  {
    id: 'japanese-sushi',
    label: '일식/스시',
    desc: '검정+빨강 강조 (스시, 라멘, 이자카야)',
    industries: ['일식', '스시', '라멘', '이자카야', '돈카츠'],
    theme: {
      primary_color: '#0F172A',
      accent_color: '#DC2626',
      bg_color: '#F8FAFC',
      surface_color: '#FFFFFF',
      text_color: '#0F172A',
      text_muted: '#64748B',
      border_color: '#CBD5E1',
      font_family: 'serif',
      card_style: 'bordered',
      category_layout: 'tabs',
      header_style: 'solid',
      badge_style: 'flat',
    },
  },
  {
    id: 'chicken-beer',
    label: '치킨/맥주',
    desc: '진한 노랑+검정 (치킨, 호프, 술집)',
    industries: ['치킨', '호프', '맥주', '술집'],
    theme: {
      primary_color: '#1F2937',
      accent_color: '#F59E0B',
      bg_color: '#FFFBEB',
      surface_color: '#FFFFFF',
      text_color: '#111827',
      text_muted: '#6B7280',
      border_color: '#FDE68A',
      font_family: 'sans',
      card_style: 'shadow',
      category_layout: 'tabs',
      header_style: 'gradient',
      badge_style: 'pill',
    },
  },
  {
    id: 'fine-dining',
    label: '고급 다이닝',
    desc: '검정+골드 (오마카세, 코스, 호텔 레스토랑)',
    industries: ['오마카세', '파인다이닝', '코스', '호텔'],
    theme: {
      primary_color: '#0F172A',
      accent_color: '#CA8A04',
      bg_color: '#FAFAF9',
      surface_color: '#FFFFFF',
      text_color: '#0F172A',
      text_muted: '#78716C',
      border_color: '#E7E5E4',
      font_family: 'serif',
      card_style: 'photo-large',
      category_layout: 'sections',
      header_style: 'image',
      badge_style: 'flat',
    },
  },
  {
    id: 'bunsik-pop',
    label: '분식/빠른식사',
    desc: '활기찬 노랑+빨강 (분식, 김밥, 떡볶이)',
    industries: ['분식', '김밥', '떡볶이', '라면'],
    theme: {
      primary_color: '#DC2626',
      accent_color: '#FBBF24',
      bg_color: '#FFFBEB',
      surface_color: '#FFFFFF',
      text_color: '#1F1612',
      text_muted: '#6B7280',
      border_color: '#FDE68A',
      font_family: 'rounded',
      card_style: 'shadow',
      category_layout: 'tabs',
      header_style: 'gradient',
      badge_style: 'pill',
    },
  },
  {
    id: 'beauty-salon',
    label: '미용실/네일',
    desc: '파스텔 핑크+퍼플 (미용실, 네일, 에스테틱)',
    industries: ['미용실', '네일', '에스테틱', '왁싱'],
    theme: {
      primary_color: '#9333EA',
      accent_color: '#EC4899',
      bg_color: '#FAF5FF',
      surface_color: '#FFFFFF',
      text_color: '#1F1612',
      text_muted: '#A8A29E',
      border_color: '#E9D5FF',
      font_family: 'rounded',
      card_style: 'minimal',
      category_layout: 'tabs',
      header_style: 'gradient',
      badge_style: 'pill',
    },
  },
]

export function getThemeByPreset(presetId: string): MenuTheme {
  const preset = THEME_PRESETS.find(p => p.id === presetId)
  return preset?.theme || THEME_PRESETS[0].theme
}

export function getEffectiveTheme(menuTheme: any | null): MenuTheme {
  // menuTheme = { preset, custom } 구조
  if (!menuTheme) return THEME_PRESETS[0].theme
  const baseTheme = getThemeByPreset(menuTheme.preset || 'default-clean')
  if (menuTheme.custom && typeof menuTheme.custom === 'object') {
    return { ...baseTheme, ...menuTheme.custom }
  }
  return baseTheme
}
