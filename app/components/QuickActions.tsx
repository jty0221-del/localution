'use client'

// ============================================================
// QuickActions — 대시보드 상단 빠른 액션 위젯
//   사장님이 자주 쓰는 7가지 작업을 한 클릭으로 접근
// ============================================================
import Link from 'next/link'
import {
  MessageSquare, Megaphone, Calendar, Coins, Image as ImageIcon,
  PenLine, Users, ArrowRight, Zap,
} from 'lucide-react'

const ACTIONS = [
  { href: '/review-admin', label: '리뷰 답글', desc: '신규 리뷰 확인', Icon: MessageSquare, color: 'from-[#F59E0B] to-[#D97706]' },
  { href: '/marketing/instagram-feed', label: '인스타 발행', desc: 'AI 캡션 생성', Icon: ImageIcon, color: 'from-[#EC4899] to-[#BE185D]' },
  { href: '/marketing/blog-post', label: '블로그 글', desc: 'AI 자동 작성', Icon: PenLine, color: 'from-[#10B981] to-[#059669]' },
  { href: '/marketing/events', label: '이벤트 만들기', desc: '단속 / 시즌', Icon: Megaphone, color: 'from-[#7C3AED] to-[#6D28D9]' },
  { href: '/customers', label: '고객 메시지', desc: 'VIP / 단골', Icon: Users, color: 'from-[#3182F6] to-[#1B64DA]' },
  { href: '/reservations', label: '예약 추가', desc: '단체 / 행사', Icon: Calendar, color: 'from-[#0EA5E9] to-[#0284C7]' },
  { href: '/settlement', label: '오늘 매출', desc: '카드 / 현금', Icon: Coins, color: 'from-[#22C55E] to-[#16A34A]' },
]

export default function QuickActions() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-sm md:text-base font-bold text-[#191F28]">빠른 액션</h2>
        <span className="ml-auto text-[11px] text-[#8B95A1]">자주 쓰는 7가지</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {ACTIONS.map(a => (
          <Link key={a.href} href={a.href}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:bg-[#FAFBFF] transition-all">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-sm`}>
              <a.Icon size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-bold text-[#191F28] text-center leading-tight">{a.label}</p>
            <p className="text-[9px] text-[#8B95A1] text-center leading-tight hidden sm:block">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
