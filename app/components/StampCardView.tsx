'use client'

// ============================================================
// 스탬프 카드 시각 컴포넌트 — 깔끔/세련된 미니멀 디자인
//   · 아이콘·배경 패턴 제거 (사용자 요청 2026-05-03)
//   · 체크마크 기반 단순 그리드
// ============================================================
import { Check, Gift, Award, Phone, User } from 'lucide-react'

type Card = {
  title: string
  description?: string | null
  required_stamps: number
  reward_text: string
  theme_color: string
  milestones?: Array<{ at: number; reward: string }> | null
  owner_name?: string | null
  owner_phone?: string | null
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

      {/* 스탬프 그리드 — 체크마크 + milestone 골드 테두리 */}
      <div className={`grid gap-2 ${total <= 5 ? 'grid-cols-5' : total <= 10 ? 'grid-cols-5' : 'grid-cols-6'}`}>
        {stamps.map((filled, i) => {
          const milestone = card.milestones?.find(m => m.at === i + 1)
          return (
            <div
              key={i}
              className="aspect-square rounded-full flex items-center justify-center transition-all relative"
              style={{
                background: filled ? themeColor : themeColor + '15',
                boxShadow: filled ? `0 4px 8px -2px ${themeColor}50` : 'none',
                border: milestone ? `2px solid #F59E0B` : 'none',
              }}
              title={milestone ? `${milestone.at}회: ${milestone.reward}` : undefined}>
              {filled ? (
                <Check size={compact ? 14 : 18} className="text-white" strokeWidth={3} />
              ) : (
                <span className="text-[10px] font-bold" style={{ color: themeColor + '60' }}>
                  {i + 1}
                </span>
              )}
              {milestone && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#F59E0B] border-2 border-white flex items-center justify-center">
                  <Gift size={7} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* milestone 안내 */}
      {card.milestones && card.milestones.length > 0 && (
        <div className="mt-3 space-y-1">
          {card.milestones.map((m, i) => {
            const reached = current >= m.at
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
                  reached ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F8FAFB] text-[#8B95A1]'
                }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${reached ? 'bg-[#F59E0B]' : 'bg-[#E5E8EB]'}`}>
                  <Gift size={10} className="text-white" strokeWidth={3} />
                </div>
                <span className="font-bold">{m.at}회 - {m.reward}</span>
                {reached && <span className="ml-auto text-[10px] font-bold">달성!</span>}
              </div>
            )
          })}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
            current >= total ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F8FAFB] text-[#8B95A1]'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${current >= total ? 'bg-[#F59E0B]' : 'bg-[#E5E8EB]'}`}>
              <Award size={10} className="text-white" strokeWidth={3} />
            </div>
            <span className="font-bold">최종 {total}회 - {card.reward_text}</span>
            {current >= total && <span className="ml-auto text-[10px] font-bold">달성!</span>}
          </div>
        </div>
      )}

      {/* 사장님 연락처 (있으면) */}
      {(card.owner_name || card.owner_phone) && (
        <div className="mt-3 p-2.5 rounded-lg bg-[#F8FAFB] border border-[#E5E8EB] flex items-center gap-2 text-[11px]">
          {card.owner_name && (
            <span className="flex items-center gap-1 text-[#4E5968]">
              <User size={11} strokeWidth={2.5} />
              <span className="font-bold">{card.owner_name}</span>
            </span>
          )}
          {card.owner_phone && (
            <a href={`tel:${card.owner_phone}`} className="flex items-center gap-1 text-[#3182F6] font-bold ml-auto">
              <Phone size={11} strokeWidth={2.5} />
              {card.owner_phone}
            </a>
          )}
        </div>
      )}

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
