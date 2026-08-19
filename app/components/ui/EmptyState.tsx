// app/components/ui/EmptyState.tsx
// ============================================================
// 빈 상태 — 데이터가 없을 때 보여주는 표준 안내
//
// 소상공인 사장님은 "왜 화면이 비었는지" 를 모르면 바로 이탈한다.
// 그래서 빈 상태는 반드시 다음 3가지를 갖춘다:
//   1) 지금 상황 (왜 비었는가)
//   2) 다음에 할 행동 1개 (버튼)
//   3) 그렇게 하면 무엇이 좋아지는지
// ============================================================
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import IconBadge, { type IconBadgeTone } from './IconBadge'

export default function EmptyState({
  icon,
  tone = 'primary',
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon
  tone?: IconBadgeTone
  title: string
  /** 줄바꿈은 \n 대신 ReactNode 로 넘겨도 된다 */
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`text-center ${compact ? 'py-8 px-4' : 'py-14 px-6'}`}>
      <div className="flex justify-center mb-4">
        <IconBadge icon={icon} tone={tone} size="lg" ring />
      </div>
      <h3 className="font-bold text-[#191F28] text-[15px] mb-1.5">{title}</h3>
      {description && (
        <div className="text-[13px] text-[#8B95A1] leading-relaxed mb-5 max-w-sm mx-auto">
          {description}
        </div>
      )}
      {action}
    </div>
  )
}
