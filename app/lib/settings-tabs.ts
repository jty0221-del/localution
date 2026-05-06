// ═══════════════════════════════════════════════════════════
//  app/lib/settings-tabs.ts
//  settings 페이지 TABS / deep-link resolver / 히어로 메타 중앙 관리
// ═══════════════════════════════════════════════════════════

export const TABS = [
  '매장 정보',
  '알림 설정',
  'AI 설정',
  '연동 관리',
  '플랜 관리 (결제내역)',
] as const

export type Tab = typeof TABS[number]

// 영문 키 ↔ 한글 탭명 (외부 링크 `?tab=connect` 형태 지원)
export const TAB_MAP: Record<string, Tab> = {
  ai: 'AI 설정',
  store: '매장 정보',
  notify: '알림 설정',
  connect: '연동 관리',
  plan: '플랜 관리 (결제내역)',
}

// 탭별 브랜딩 배지 (lucide 아이콘 키 + 색상 + 서브헤드)
//   icon: lucide 아이콘 이름 (settings/page.tsx 에서 매핑하여 렌더)
export const TAB_HERO: Record<Tab, { icon: 'Store' | 'Bell' | 'Bot' | 'Link2' | 'CreditCard'; grad: string; sub: string }> = {
  '매장 정보':            { icon: 'Store',      grad: 'from-[#3182F6] to-[#1B64DA]', sub: '업체 프로필·주소·네이버 플레이스 연동' },
  '알림 설정':            { icon: 'Bell',       grad: 'from-[#F59E0B] to-[#D97706]', sub: '리뷰·결제·마케팅 알림 채널 관리' },
  'AI 설정':              { icon: 'Bot',        grad: 'from-[#8B5CF6] to-[#6D28D9]', sub: 'AI 답변 톤·금칙어·자동화 규칙' },
  '연동 관리':            { icon: 'Link2',      grad: 'from-[#059669] to-[#047857]', sub: '네이버·배민·쿠팡이츠·카카오톡 연결' },
  '플랜 관리 (결제내역)': { icon: 'CreditCard', grad: 'from-[#EC4899] to-[#BE185D]', sub: '베타 무료 플랜·기능 선택·토스 결제' },
}

/**
 * `?tab=...` 파라미터 → Tab 값으로 정규화
 * - 빈값 → '매장 정보'
 * - 영문 키(ai/store/notify/connect/plan)
 * - 한글 full name
 * - 한글 prefix(연동/알림/AI/플랜)
 */
export function resolveTab(p: string | null | undefined): Tab {
  if (!p) return '매장 정보'
  if (TAB_MAP[p]) return TAB_MAP[p]
  if ((TABS as readonly string[]).includes(p)) return p as Tab
  if (p.startsWith('연동')) return '연동 관리'
  if (p.startsWith('알림')) return '알림 설정'
  if (p.startsWith('AI') || p.startsWith('ai')) return 'AI 설정'
  if (p.startsWith('플랜')) return '플랜 관리 (결제내역)'
  return '매장 정보'
}

/**
 * Tab → 영문 슬러그 (외부 링크 생성용)
 */
export function tabToSlug(tab: Tab): string {
  const inv = Object.entries(TAB_MAP).find(([, v]) => v === tab)
  return inv ? inv[0] : 'store'
}

/**
 * 외부에서 /settings 로 이동할 때 쓰는 href 헬퍼
 * buildSettingsHref('connect', { platform: 'naver' }) → '/settings?tab=connect&platform=naver'
 */
export function buildSettingsHref(
  tab: keyof typeof TAB_MAP | Tab,
  extras?: Record<string, string>,
): string {
  const qs = new URLSearchParams()
  qs.set('tab', typeof tab === 'string' && TAB_MAP[tab] ? tab : tabToSlug(tab as Tab))
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      if (v != null && v !== '') qs.set(k, v)
    }
  }
  return `/settings?${qs.toString()}`
}
