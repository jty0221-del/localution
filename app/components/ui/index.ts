// app/components/ui/index.ts
// ============================================================
// 공용 UI 키트 배럴 익스포트
//
// 사용: import { IconBadge, StatCard, SectionCard } from '@/app/components/ui'
//
// 이 폴더의 컴포넌트만으로 화면을 조립하면 카드·간격·아이콘·숫자 정렬이
// 자동으로 통일된다. 새 화면을 만들 때 hex 값을 직접 쓰기 전에
// 여기에 이미 있는지 먼저 확인할 것.
// ============================================================
export { default as IconBadge } from './IconBadge'
export type { IconBadgeTone, IconBadgeSize } from './IconBadge'

export { default as StatCard } from './StatCard'
export { default as SectionCard } from './SectionCard'
export { default as EmptyState } from './EmptyState'
export { default as Delta } from './Delta'
export { default as ConfidenceBadge } from './ConfidenceBadge'
