// app/components/ui/IconBadge.tsx
// ============================================================
// 그라데이션 아이콘 배지 — CLAUDE.md 가 지정한 표준 패턴의 단일 구현
//
// 배경:
//   `w-9 h-9 rounded-xl bg-gradient-to-br from-X to-Y shadow-sm` 조합이
//   레포 78곳에 복붙되어 있었다. 크기·라운드·아이콘 굵기가 조금씩 달라
//   화면마다 톤이 어긋나 보이는 주된 원인이었다.
//
// 사용:
//   <IconBadge icon={Trophy} tone="primary" />
//   <IconBadge icon={Store} tone="success" size="lg" />
// ============================================================
import type { LucideIcon } from 'lucide-react'

export type IconBadgeTone =
  | 'primary'   // 블루 — 기본
  | 'accent'    // 퍼플 — AI·스마트 기능
  | 'success'   // 그린 — 긍정·완료
  | 'warn'      // 앰버 — 주의
  | 'danger'    // 레드 — 경고·오류
  | 'neutral'   // 그레이 — 비활성

export type IconBadgeSize = 'sm' | 'md' | 'lg'

const TONE_CLASS: Record<IconBadgeTone, string> = {
  primary: 'bg-gradient-to-br from-[#3182F6] to-[#1B64DA] ring-[#3182F6]/20',
  accent: 'bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] ring-[#8B5CF6]/20',
  success: 'bg-gradient-to-br from-[#12B76A] to-[#059669] ring-[#12B76A]/20',
  warn: 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] ring-[#F59E0B]/20',
  danger: 'bg-gradient-to-br from-[#F04452] to-[#DC2626] ring-[#F04452]/20',
  neutral: 'bg-gradient-to-br from-[#8B95A1] to-[#6B7280] ring-[#8B95A1]/20',
}

const SIZE_CLASS: Record<IconBadgeSize, { box: string; icon: number }> = {
  sm: { box: 'w-7 h-7 rounded-lg', icon: 13 },
  md: { box: 'w-9 h-9 rounded-xl', icon: 16 },
  lg: { box: 'w-11 h-11 rounded-xl', icon: 19 },
}

export default function IconBadge({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  ring = false,
  className = '',
}: {
  icon: LucideIcon
  tone?: IconBadgeTone
  size?: IconBadgeSize
  /** 은은한 링 추가 — 밝은 배경 위에서 경계를 살릴 때 */
  ring?: boolean
  className?: string
}) {
  const s = SIZE_CLASS[size]
  return (
    <div
      className={[
        s.box,
        TONE_CLASS[tone],
        'flex items-center justify-center flex-shrink-0 shadow-sm',
        ring ? 'ring-4' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon size={s.icon} className="text-white" strokeWidth={2.5} />
    </div>
  )
}
