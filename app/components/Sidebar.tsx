'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const FLAT_NAV = [
  { href: '/',          label: '대시보드',  icon: 'DB',  colors: { bg: '#EFF6FF', text: '#3182F6' } },
  { href: '/qr-admin',  label: 'QR 관리',   icon: 'QR',  colors: { bg: '#F5F3FF', text: '#8B5CF6' } },
  { href: '/customers', label: '고객 관리', icon: '고객', colors: { bg: '#ECFDF5', text: '#059669' } },
  { href: '/store',     label: '매장 관리', icon: '매장', colors: { bg: '#FFF1F2', text: '#E11D48' } },
  { href: '/community', label: '커뮤니티',  icon: '커뮤', colors: { bg: '#FDF2F8', text: '#EC4899' } },
]

const REVIEW_SUB = [
  { href: '/review-admin/naver',  label: '네이버',     icon: '🟢', color: '#03C75A' },
  { href: '/review-admin/google', label: '구글',       icon: '🔵', color: '#4285F4' },
  { href: '/review-admin/kakao',  label: '카카오',     icon: '🟡', color: '#F59E0B' },
  { href: '/review-admin/baemin', label: '배달의민족', icon: '🩵', color: '#2AC1BC' },
  { href: '/review-admin/yogiyo', label: '요기요',     icon: '🔴', color: '#FA0050' },
  { href: '/review-admin/coupang',label: '쿠팡이츠',   icon: '🟠', color: '#FF4B30' },
]

const MARKETING_SUB = [
  { href: '/marketing/place',          label: '플레이스 진단',   icon: '📍', desc: '네이버 플레이스 종합 점수' },
  { href: '/marketing/keyword-rank',   label: '키워드 순위',     icon: '🔍', desc: '실시간 키워드 검색 순위' },
  { href: '/marketing/keyword-score',  label: '키워드 점수분석', icon: '📊', desc: '키워드 최적화 점수 분석' },
]

const BOTTOM_NAV = [
  { href: '/inquiry', label: '1:1 문의', icon: '💬', colors: { bg: '#FFF7ED', text: '#EA580C' } },
  { href: '/settings', label: '설정',    icon: '⚙️', colors: { bg: '#F2F4F6', text: '#4E5968' } },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isReviewSection    = pathname.startsWith('/review-admin')
  const isMarketingSection = pathname.startsWith('/marketing')

  const [reviewOpen,    setReviewOpen]    = useState(isReviewSection)
  const [marketingOpen, setMarketingOpen] = useState(isMarketingSection)

  const NavItems = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {FLAT_NAV.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-[#EFF6FF] text-[#3182F6] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={active ? { background: '#3182F6', color: '#fff' } : { background: item.colors.bg, color: item.colors.text }}>
              {item.icon}
            </div>
            <span className="text-sm">{item.label}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3182F6]" />}
          </Link>
        )
      })}

      {/* ── 리뷰 관리 아코디언 ── */}
      <div>
        <button onClick={() => setReviewOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isReviewSection ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isReviewSection ? { background: '#F59E0B', color: '#fff' } : { background: '#FFFBEB', color: '#F59E0B' }}>
            리뷰
          </div>
          <span className="text-sm">리뷰 관리</span>
          <span className={`ml-auto text-xs transition-transform duration-200 ${reviewOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {reviewOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FDE68A] space-y-0.5">
            <Link href="/review-admin" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-xs font-medium ${pathname === '/review-admin' ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA]'}`}>
              <span className="text-sm leading-none">📋</span>
              <span>전체 리뷰</span>
              {pathname === '/review-admin' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F59E0B] flex-shrink-0" />}
            </Link>
            {REVIEW_SUB.map(sub => {
              const active = pathname === sub.href || pathname.startsWith(sub.href + '/')
              return (
                <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${active ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                  <span className="text-sm leading-none">{sub.icon}</span>
                  <span className="text-xs">{sub.label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sub.color }} />}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 마케팅 관리 아코디언 ── */}
      <div>
        <button onClick={() => setMarketingOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isMarketingSection ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isMarketingSection ? { background: '#EA580C', color: '#fff' } : { background: '#FFF7ED', color: '#EA580C' }}>
            마케
          </div>
          <span className="text-sm">마케팅 관리</span>
          <span className={`ml-auto text-xs transition-transform duration-200 ${marketingOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {marketingOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FFE4CC] space-y-0.5">
            {MARKETING_SUB.map(sub => {
              const active = pathname === sub.href || pathname.startsWith(sub.href + '/')
              return (
                <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${active ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                  <span className="text-base leading-none">{sub.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-tight">{sub.label}</p>
                    {active && <p className="text-[10px] text-[#EA580C] opacity-70 truncate">{sub.desc}</p>}
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] flex-shrink-0" />}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-[#F2F4F6] my-2" />

      {BOTTOM_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}
            style={active ? { background: item.colors.bg, color: item.colors.text } : {}}>
            <span className="text-base w-7 text-center flex-shrink-0">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.colors.text }} />}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* 모바일 헤더 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E8EB] z-30 flex items-center justify-between px-4">
        <div>
          <span className="font-black text-[#191F28] text-lg tracking-tight">Localution</span>
          <span className="text-[11px] text-[#8B95A1] ml-1.5 font-medium">(로컬루션)</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 flex flex-col justify-center items-center gap-1.5">
          <span className={`block w-5 h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? 'opacity-0 w-0' : 'w-5'}`} />
          <span className={`block w-5 h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobileOpen(false)} />}

      {/* 데스크탑 사이드바 */}
      <aside className={`fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-[#E5E8EB] z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-[#F2F4F6]">
          <Link href="/" className="block">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#3182F6] flex items-center justify-center">
                <span className="text-white font-black text-sm">L</span>
              </div>
              <div>
                <p className="font-black text-[#191F28] text-sm tracking-tight leading-none">Localution</p>
                <p className="text-[10px] text-[#8B95A1] font-medium leading-none mt-0.5">로컬루션</p>
              </div>
            </div>
          </Link>
        </div>

        <NavItems />

        {/* 하단 사용자 */}
        <div className="px-4 py-4 border-t border-[#F2F4F6]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F8F9FA]">
            <div className="w-8 h-8 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">하</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#191F28] truncate">하랑마케팅</p>
              <p className="text-[10px] text-[#8B95A1] truncate">강남점</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
