'use client'

// ============================================================
// 스탬프 카드 시각 컴포넌트 — 깔끔/세련된 미니멀 디자인
//   · 아이콘·배경 패턴 제거 (사용자 요청 2026-05-03)
//   · 체크마크 기반 단순 그리드
// ============================================================
import { Check, Gift, Award } from 'lucide-react'

type Card = {
  title: string
  description?: string | null
  required_stamps: number
  reward_text: string
  theme_color: string
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
  const themeColor = card.theme_color || '#3182F6'

  return (
    <div
      className="rounded-2xl p-5 shadow-sm border bg-white"
      style={{ borderColor: themeColor + '30' }}>
      {/* 헤더 — 그라데이션 박스 + Award 아이콘 */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)` }}>
          <Award size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-[#191F28] leading-tight truncate">{card.title}</p>
          {card.description && (
            <p className="text-[11px] text-[#8B95A1] mt-0.5 line-clamp-1">{card.description}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: themeColor + '15', color: themeColor }}>
              <Gift size={10} strokeWidth={2.5} /> {card.reward_text}
            </span>
          </div>
        </div>
      </div>

      {/* 스탬프 그리드 — 체크마크만 */}
      <div className={`grid gap-2 ${total <= 5 ? 'grid-cols-5' : total <= 10 ? 'grid-cols-5' : 'grid-cols-6'}`}>
        {stamps.map((filled, i) => (
          <div
            key={i}
            className="aspect-square rounded-full flex items-center justify-center transition-all"
            style={{
              background: filled ? themeColor : themeColor + '15',
              boxShadow: filled ? `0 4px 8px -2px ${themeColor}50` : 'none',
            }}>
            {filled ? (
              <Check size={compact ? 14 : 18} className="text-white" strokeWidth={3} />
            ) : (
              <span className="text-[10px] font-bold" style={{ color: themeColor + '60' }}>
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
            <span style={{ color: themeColor }}>{current}</span>
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
            <p className="text-base font-black flex items-center gap-1" style={{ color: themeColor }}>
              {collection.rewards_claimed}회 <Gift size={14} strokeWidth={2.5} />
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
