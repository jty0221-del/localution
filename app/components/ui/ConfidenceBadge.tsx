// app/components/ui/ConfidenceBadge.tsx
// ============================================================
// 확정 / 추정 배지
//
// 왜 필요한가:
//   순위 화면의 숫자는 출처가 두 가지로 완전히 다르다.
//     · 확정 — 네이버가 응답에 그대로 실어 보낸 값 (totalScore, 리뷰수, 순위)
//     · 추정 — 우리가 만든 해석 점수 (경쟁률 가중합 등)
//   이 둘을 구분 없이 보여주면 사장님이 추정치를 사실로 믿고
//   잘못된 의사결정을 하게 된다. 그래서 숫자 옆에 항상 출처를 붙인다.
// ============================================================
import { ShieldCheck, Sigma } from 'lucide-react'
import type { MetricConfidence } from '../../lib/place-competition'

const STYLE: Record<
  MetricConfidence,
  { label: string; text: string; bg: string; border: string; Icon: typeof ShieldCheck }
> = {
  measured: {
    label: '확정',
    text: '#0F766E',
    bg: '#F0FDFA',
    border: '#99F6E4',
    Icon: ShieldCheck,
  },
  estimated: {
    label: '추정',
    text: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
    Icon: Sigma,
  },
}

export default function ConfidenceBadge({
  confidence,
  withIcon = true,
}: {
  confidence: MetricConfidence
  withIcon?: boolean
}) {
  const s = STYLE[confidence]
  const Icon = s.Icon
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap"
      style={{ color: s.text, background: s.bg, borderColor: s.border }}
      title={
        confidence === 'measured'
          ? '네이버가 준 값 그대로예요'
          : '로컬루션이 계산한 해석 점수예요'
      }
    >
      {withIcon && <Icon size={10} strokeWidth={3} />}
      {s.label}
    </span>
  )
}
