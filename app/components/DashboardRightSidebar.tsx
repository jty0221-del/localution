'use client'

// ============================================================
// DashboardRightSidebar — 대시보드 우측 사이드바
//   · xl 이상 (1280px+): 우측 컬럼에 sticky 로 표시
//   · xl 미만: 메인 콘텐츠 하단에 일반 흐름으로 표시 (스크롤 시 나타남)
//
//   ⚠️ DO_NOT_TOUCH:
//     - QuickActions 추가 금지 (/DO_NOT_TOUCH.md)
//     - 부모는 xl:grid xl:grid-cols-[1fr_280px] 로 공간 분배 (콘텐츠 침범 방지)
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
      <div className="px-3 py-2 border-b border-[#F2F4F6]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-[#191F28]">인기 서비스 TOP 10</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F04452] animate-pulse inline-block" />
          </div>
        </div>
      </div>
      <div>
        {items.map((item) => {
          const diff = item.prevRank - item.rank
          return (
            <div
              key={item.id}
              className="px-3 py-1.5 flex items-center gap-2 border-b border-[#F8F9FA] last:border-0 hover:bg-[#FAFBFF]"
              style={{
                opacity: isShuffling ? 0.7 : 1,
                transform: isShuffling ? 'translateX(2px)' : 'translateX(0)',
                transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              <div className={'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 ' + (item.rank <= 3 ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#8B95A1]')}>
                {item.rank}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-[11px] font-bold text-[#191F28] truncate">{item.name}</span>
                {item.badge && (
                  <span className="text-[8px] font-black text-white px-1 rounded flex-shrink-0"
                    style={{ background: item.color }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <RankBadge diff={diff} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 사이드바 카드 3종 (재사용 — desktop sticky / mobile inline 양쪽에 동일하게 사용)
function SidebarCards() {
  return (
    <>
      {/* 1) 인기 서비스 TOP 10 */}
      <ServiceRankingMini />

      {/* 2) 실시간 리뷰 알림 */}
      <div className="rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <BellRing size={12} className="text-[#D97706]" strokeWidth={2.5} />
          <h3 className="text-[12px] font-bold text-[#92400E]">실시간 리뷰 알림</h3>
        </div>
        <p className="text-[10px] text-[#92400E] leading-relaxed">
          15분 자동 수집 · 별점 1-2점 부정 리뷰 우선 알림 (웹푸시·카카오톡)
        </p>
      </div>

      {/* 3) 도움이 필요하세요? */}
      <div className="bg-white rounded-2xl shadow-sm p-3">
        <h3 className="text-[12px] font-bold text-[#191F28] mb-1.5">도움이 필요하세요?</h3>
        <div className="space-y-0.5">
          <Link href="/help"
            className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-[#FAFBFF] text-[11px] font-bold text-[#4E5968] transition-colors">
            <HelpCircle size={12} className="text-[#3182F6]" strokeWidth={2.5} />
            <span>도움말 · 가이드</span>
            <ArrowRight size={10} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
          </Link>
          <Link href="/inquiry"
            className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-[#FAFBFF] text-[11px] font-bold text-[#4E5968] transition-colors">
            <Mail size={12} className="text-[#7C3AED]" strokeWidth={2.5} />
            <span>1:1 문의</span>
            <ArrowRight size={10} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
          </Link>
          <Link href="/updates"
            className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-[#FAFBFF] text-[11px] font-bold text-[#4E5968] transition-colors">
            <Sparkles size={12} className="text-[#EC4899]" strokeWidth={2.5} />
            <span>업데이트 내역</span>
            <ArrowRight size={10} className="ml-auto text-[#D1D5DB]" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </>
  )
}

// 데스크톱 (xl+, 1280px+): grid 우측 컬럼 안에 sticky 로 main 옆에 바로 붙어서 표시
//   · 부모는 xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-5 사용
//   · gap-5 (20px) 만 사이에 두고 main 과 사이드바 자연스럽게 인접
//
// ⚠️ DO_NOT_TOUCH (사장님 명시 요건):
//   1) 카드 3개 모두 보임 (인기 TOP10 → 알림 → 도움말)
//   2) main 과 사이드바 사이 간격 좁게 (gap-5 = 20px)
//   3) 모바일/태블릿 (xl 미만): DashboardRightSidebarMobile 로 인라인 표시
export default function DashboardRightSidebar() {
  return (
    <aside
      className="hidden xl:block self-start sticky top-4 space-y-3 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      <SidebarCards />
    </aside>
  )
}

// xl 미만 (1280px 미만): 메인 콘텐츠 하단에 인라인 표시 (lg+ 3열, mobile 1열)
export function DashboardRightSidebarMobile() {
  return (
    <div className="xl:hidden mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <SidebarCards />
      </div>
    </div>
  )
}
