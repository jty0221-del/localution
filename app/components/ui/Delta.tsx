// app/components/ui/Delta.tsx
// ============================================================
// 변동 표시 — 전일 대비 증감을 일관되게 그린다.
//
// 지표 종류마다 "올라가는 게 좋은지" 가 다르다.
//   · 순위: 숫자가 줄어야 좋음 (3위 → 1위)
//   · 리뷰수·점수: 숫자가 늘어야 좋음
// 이걸 화면마다 따로 판단하면 색이 반대로 나오는 사고가 난다.
// invert 플래그 하나로 통일한다.
// ============================================================
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function Delta({
  curr,
  prev,
  /** true 면 값이 줄어드는 것이 좋음 (순위 등) */
  invert = false,
  size = 11,
  showZero = true,
}: {
  curr: number | null | undefined
  prev: number | null | undefined
  invert?: boolean
  size?: number
  showZero?: boolean
}) {
  if (curr == null || prev == null) {
    return <span className="text-[11px] text-[#C3CAD1]">-</span>
  }

  const diff = curr - prev
  if (diff === 0) {
    if (!showZero) return null
    return (
      <span className="inline-flex items-center text-[11px] text-[#C3CAD1]">
        <Minus size={size - 1} strokeWidth={3} />
      </span>
    )
  }

  const rose = diff > 0
  // 좋은 방향인가
  const good = invert ? !rose : rose
  const color = good ? '#059669' : '#DC2626'
  // 화살표 방향은 "값의 변화" 를 따른다 (순위 3→1 이면 숫자가 줄었으니 아래 화살표가 아니라
  // 사용자 직관상 '상승' 이므로, invert 인 경우 화살표도 뒤집는다)
  const ArrowUp = invert ? !rose : rose

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums"
      style={{ color }}
    >
      {ArrowUp ? (
        <TrendingUp size={size} strokeWidth={3} />
      ) : (
        <TrendingDown size={size} strokeWidth={3} />
      )}
      {Math.abs(diff).toLocaleString('ko-KR')}
    </span>
  )
}
