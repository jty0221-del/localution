'use client'

// ============================================================
// DashboardRightSidebar — 대시보드 우측 사이드바 (lg 이상에서만 노출)
//   · 인기 서비스 TOP 10 (실시간 순위 애니메이션)
//   · 실시간 리뷰 알림 안내
//   · 도움말 / 1:1 문의 / 업데이트 빠른 링크
//
//   ⚠️ DO_NOT_TOUCH:
//     - QuickActions 위젯 추가 X (사장님 요청으로 ServiceRanking 으로 대체됨, 2026-05-06)
//     - 사이드바는 sticky top-4 + 자체 overflow-y-auto 로 스크롤 따라 고정
// ============================================================
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BellRing, HelpCircle, Mail, Sparkles, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'

// 인기 서비스 TOP 10 (실시간 순위 애니메이션)
const SERVICE_RANKING_INIT = [
  { id: 1, name: 'AI 리뷰 자동 답글', category: '리뷰', badge: 'HOT', color: '#F04452' },
  { id: 2, name: '네이버 플레이스 관리', category: '플레이스', badge: '', color: '#03C75A' },
  { id: 3, name: 'QR 리뷰 자동화', category: 'QR', badge: 'NEW', color: '#7C3AED' },
  { id: 4, name: '매출 캘린더 · 정산', category: '정산', badge: '', color: '#3182F6' },
  { id: 5, name: '고객 CRM 관리', category: 'CRM', badge: '', color: '#F59E0B' },
  { id: 6, name: '키워드 순위 추적', category: 'SEO', badge: '', color: '#10B981' },
  { id: 7, name: '숏폼 퍼블리셔', category: '마케팅', badge: '', color: '#EC4899' },
  { id: 8, name: '배민 리뷰 연동', category: '배달', badge: '', color: '#2AC1BC' },
  { id: 9, name: '구글 리뷰 연동', category: '구글', badge: '', color: '#4285F4' },
  { id: 10, name: '세금계산서 자동 발행', category: '행정', badge: '', color: '#6B7280' },
]

// 한국 증시 컨벤션: 상승 = 빨강 / 하락 = 파랑 / 변동 없음 = 회색
function RankBadge({ diff }: { diff: number }) {
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#DC2626]">
      <ArrowUp size={9} strokeWidth={3} /> {diff}
    </span>
  )
  if (diff < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#3182F6]">
      <ArrowDown size={9} strokeWidth={3} /> {Math.abs(diff)}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#9CA3AF]">
      <Minus size={9} strokeWidth={3} />
    </span>
  )
}

function ServiceRankingMini() {
  const [items, setItems] = useState(
    SERVICE_RANKING_INIT.map((s, i) => ({ ...s, rank: i + 1, prevRank: i + 1, score: 100 - i * 8 }))
  )
  const [isShuffling, setIsShuffling] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsShuffling(true)
      setTimeout(() => {
        setItems(prev => {
          const arr = prev.map(p => ({ ...p }))
          const swapCount = 2 + Math.floor(Math.random() * 2)
          for (let s = 0; s < swapCount; s++) {
            const a = Math.floor(Math.random() * arr.length)
            let b = Math.floor(Math.random() * arr.length)
            while (b === a) b = Math.floor(Math.random() * arr.length)
            arr[a].score += Math.floor(Math.random() * 10) - 4
            arr[b].score += Math.floor(Math.random() * 10) - 4
          }
          arr.sort((a, b) => b.score - a.score)
          arr.forEach((item, i) => {
            item.prevRank = item.rank
            item.rank = i + 1
          })
          return arr
        })
        setIsShuffling(false)
      }, 300)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#F2F4F6]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-[#191F28]">인기 서비스 TOP 10</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F04452] animate-pulse inline-block" />
          </div>
        </div>
        <p className="text-[10px] text-[#8B95A1] mt-0.5">실시간 사용량 · 5초마다 갱신</p>
      </div>
      <div className="py-1">
        {items.map((item) => {
          const diff = item.prevRank - item.rank
          return (
            <div
              key={item.id}
              className="px-3 py-2 flex items-center gap-2 border-b border-[#F8F9FA] last:border-0 hover:bg-[#FAFBFF]"
              style={{
                opacity: isShuffling ? 0.7 : 1,
                transform: isShuffling ? 'translateX(2px)' : 'translateX(0)',
                transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              <div className={'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 ' + (item.rank <= 3 ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#8B95A1]')}>
                {item.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-[#191F28] truncate">{item.name}</span>
                  {item.badge && (
                    <span className="text-[8px] font-black text-white px-1 py-0.5 rounded flex-shrink-0"
                      style={{ background: item.color }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-[#8B95A1]">{item.category}</span>
              </div>
              <RankBadge diff={diff} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardRightSidebar() {
  return (
    // self-start — flex container 안에서 stretch 안 되도록 (sticky 정상 작동 조건)
    // sticky top-4 — 스크롤 시 viewport 상단 16px 에서 고정
    // overflow / max-h 는 내부 div 가 처리 (sticky 와 같은 element 에 두면 충돌)
    <aside className="hidden lg:block w-[280px] flex-shrink-0 self-start sticky top-4">
      <div className="max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 space-y-3"
        style={{ scrollbarWidth: 'thin' }}>

        {/* 1) 인기 서비스 TOP 10 (실시간 애니메이션) */}
        <ServiceRankingMini />

        {/* 2) 실시간 리뷰 알림 안내 */}
        <div className="rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <BellRing size={13} className="text-[#D97706]" strokeWidth={2.5} />
            <h3 className="text-xs font-bold text-[#92400E]">실시간 리뷰 알림</h3>
          </div>
          <p className="text-[11px] text-[#92400E] leading-relaxed">
            15분마다 자동 수집 · 별점 1-2점 부정 리뷰 우선 알림.
            웹푸시·카카오톡 두 채널로 즉시 받아 보세요.
          </p>
        </div>

        {/* 3) 도움이 필요하세요? — 빠른 링크 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-xs font-bold text-[#191F28] mb-2">도움이 필요하세요?</h3>
          <div className="space-y-1.5">
            <Link href="/help"
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#FAFBFF] text-[12px] font-bold text-[#4E5968] transition-colors">
              <HelpCircle size={13} className="text-[#3182F6]" strokeWidth={2.5} />
              <span>도움말 · 가이드</span>
              <ArrowRight size={11} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
            </Link>
            <Link href="/inquiry"
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#FAFBFF] text-[12px] font-bold text-[#4E5968] transition-colors">
              <Mail size={13} className="text-[#7C3AED]" strokeWidth={2.5} />
              <span>1:1 문의</span>
              <ArrowRight size={11} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
            </Link>
            <Link href="/updates"
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#FAFBFF] text-[12px] font-bold text-[#4E5968] transition-colors">
              <Sparkles size={13} className="text-[#EC4899]" strokeWidth={2.5} />
              <span>업데이트 내역</span>
              <ArrowRight size={11} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
