// app/components/ui/SectionCard.tsx
// ============================================================
// 섹션 카드 — 화면 안의 내용 블록을 감싸는 표준 껍데기
//
// 카드마다 padding·border·title 크기가 제각각이면 전문적으로 안 보인다.
// 여기 하나만 쓰면 모든 섹션이 같은 리듬을 갖는다.
// ============================================================
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import IconBadge, { type IconBadgeTone } from './IconBadge'

export default function SectionCard({
  title,
  subtitle,
  icon,
  tone = 'primary',
  right,
  children,
  padded = true,
  className = '',
}: {
  title?: string
  subtitle?: string
  icon?: LucideIcon
  tone?: IconBadgeTone
  /** 헤더 우측 액션 (버튼·탭 등) */
  right?: ReactNode
  children: ReactNode
  /** 본문에 기본 패딩을 줄지. 표를 넣을 땐 false */
  padded?: boolean
  className?: string
}) {
  const hasHeader = Boolean(title || right)

  return (
    <section
      className={`bg-white rounded-2xl border border-[#E5E8EB] shadow-sm overflow-hidden ${className}`}
    >
      {hasHeader && (
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F2F4F6]">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <IconBadge icon={icon} tone={tone} size="sm" />}
            <div className="min-w-0">
              {title && (
                <h3 className="text-[15px] font-bold text-[#191F28] truncate">{title}</h3>
              )}
              {subtitle && (
                <p className="text-[12px] text-[#8B95A1] mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}
