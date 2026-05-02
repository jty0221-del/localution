'use client'

// ============================================================
// 스탬프 카드 시각 컴포넌트
//   · 사장님 미리보기 / 손님 카드 / 마이 페이지 공통 사용
//   · theme_color, bg_pattern, icon_emoji 반영
// ============================================================
import { Check } from 'lucide-react'

type Card = {
  title: string
  description?: string | null
  required_stamps: number
  reward_text: string
  theme_color: string
  bg_pattern: string
  icon_emoji: string
}

type Collection = {
  current_stamps: number
  total_collected?: number
  rewards_claimed?: number
  last_visit_at?: string
} | null

export default function StampCardView({
  card,
  collection,
  compact = false,
}: {
  card: Card | null
  collection: Collection
  compact?: boolean
}) {
  if (!card) return null
  const total = card.required_stamps
  const current = collection?.current_stamps ?? 0
  const stamps = Array.from({ length: total }, (_, i) => i < current)

  // 배경 패턴
  const bgStyle = (() => {
    if (card.bg_pattern === 'dots') {
      return {
        backgroundImage: `radial-gradient(circle at 1px 1px, ${card.theme_color}22 1px, transparent 0)`,
        backgroundSize: '12px 12px',
      }
    }
    if (card.bg_pattern === 'stripes') {
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${card.theme_color}11 0, ${card.theme_color}11 8px, transparent 8px, transparent 16px)`,
      }
    }
    if (card.bg_pattern === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${card.theme_color}11, ${card.theme_color}22)`,
      }
    }
    return {}
  })()

  return (
    <div
      className="rounded-2xl p-5 shadow-sm relative overflow-hidden border"
      style={{ ...bgStyle, borderColor: card.theme_color + '30', background: card.bg_pattern === 'gradient' ? undefined : 'white' }}>
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
          style={{ background: card.theme_color + '20' }}>
          {card.icon_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-[#191F28] leading-tight truncate">{card.title}</p>
          {card.description && (
            <p className="text-[11px] text-[#8B95A1] mt-0.5 line-clamp-1">{card.description}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: card.theme_color + '15', color: card.theme_color }}>
              🎁 {card.reward_text}
            </span>
          </div>
        </div>
      </div>

      {/* 스탬프 그리드 */}
      <div className={`grid gap-2 ${total <= 5 ? 'grid-cols-5' : total <= 10 ? 'grid-cols-5' : 'grid-cols-6'}`}>
        {stamps.map((filled, i) => (
          <div
            key={i}
            className="aspect-square rounded-full flex items-center justify-center transition-all"
            style={{
              background: filled ? card.theme_color : card.theme_color + '15',
              boxShadow: filled ? `0 4px 8px -2px ${card.theme_color}50` : 'none',
            }}>
            {filled ? (
              <Check size={compact ? 14 : 18} className="text-white" strokeWidth={3} />
            ) : (
              <span className="text-[10px] font-bold" style={{ color: card.theme_color + '60' }}>
                {i + 1}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 진행 상태 */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#8B95A1]">진행률</p>
          <p className="text-base font-black text-[#191F28]">
            <span style={{ color: card.theme_color }}>{current}</span>
            <span className="text-[#8B95A1]"> / {total}</span>
          </p>
        </div>
        {collection && (collection.total_collected ?? 0) > 0 && (
          <div className="text-right">
            <p className="text-[11px] text-[#8B95A1]">누적 방문</p>
            <p className="text-base font-black text-[#191F28]">{collection.total_collected}회</p>
          </div>
        )}
        {collection && (collection.rewards_claimed ?? 0) > 0 && (
          <div className="text-right">
            <p className="text-[11px] text-[#8B95A1]">받은 보상</p>
            <p className="text-base font-black" style={{ color: card.theme_color }}>{collection.rewards_claimed}회 🎉</p>
          </div>
        )}
      </div>
    </div>
  )
}
