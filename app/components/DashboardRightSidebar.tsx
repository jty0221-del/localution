'use client'

// ============================================================
// DashboardRightSidebar — 대시보드 우측 사이드바 (lg 이상에서만 노출)
//   · 빠른 액션 (자주 쓰는 7가지)
//   · 도움말 / 문의 빠른 링크
// ============================================================
import Link from 'next/link'
import {
  MessageSquare, Megaphone, Calendar, Image as ImageIcon,
  PenLine, Users, ArrowRight, Zap, BarChart3, Sparkles,
  HelpCircle, Mail, BellRing,
} from 'lucide-react'

const QUICK_ACTIONS = [
  { href: '/review-admin',            label: '리뷰 답글',     desc: '신규 리뷰 확인',  Icon: MessageSquare, color: 'from-[#F59E0B] to-[#D97706]' },
  { href: '/marketing/instagram-feed', label: '인스타 발행',   desc: 'AI 캡션 생성',    Icon: ImageIcon,     color: 'from-[#EC4899] to-[#BE185D]' },
  { href: '/marketing/blog-post',     label: '블로그 글',     desc: 'AI 자동 작성',    Icon: PenLine,       color: 'from-[#10B981] to-[#059669]' },
  { href: '/marketing/events',        label: '이벤트 만들기', desc: '단속 / 시즌',     Icon: Megaphone,     color: 'from-[#7C3AED] to-[#6D28D9]' },
  { href: '/customers',               label: '고객 메시지',   desc: 'VIP / 단골',      Icon: Users,         color: 'from-[#3182F6] to-[#1B64DA]' },
  { href: '/reservations',            label: '예약 추가',     desc: '단체 / 행사',     Icon: Calendar,      color: 'from-[#0EA5E9] to-[#0284C7]' },
  { href: '/review-admin/stats',      label: '발행 통계',     desc: '답변률·실패원인', Icon: BarChart3,     color: 'from-[#8B5CF6] to-[#6D28D9]' },
]

export default function DashboardRightSidebar() {
  return (
    <aside className="hidden lg:block w-[260px] flex-shrink-0">
      <div className="sticky top-4 space-y-3">
        {/* 빠른 액션 — 세로 리스트 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
              <Zap size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-sm font-bold text-[#191F28]">빠른 액션</h3>
          </div>
          <div className="space-y-1.5">
            {QUICK_ACTIONS.map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#FAFBFF] border border-transparent hover:border-[#E5E8EB] transition-all group">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <a.Icon size={13} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#191F28] truncate">{a.label}</p>
                  <p className="text-[10px] text-[#8B95A1] truncate">{a.desc}</p>
                </div>
                <ArrowRight size={11} className="text-[#D1D5DB] group-hover:text-[#3182F6] flex-shrink-0" strokeWidth={2.5} />
              </Link>
            ))}
          </div>
        </div>

        {/* 알림 안내 */}
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

        {/* 도움말 / 문의 */}
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
