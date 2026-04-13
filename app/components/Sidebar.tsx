'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: '대시보드', short: 'DB', bg: '#EFF6FF', color: '#3182F6' },
  { href: '/review-admin', label: '리뷰 관리', short: '리뷰', bg: '#FFFBEB', color: '#F59E0B' },
  { href: '/qr', label: 'QR 관리', short: 'QR', bg: '#F5F3FF', color: '#8B5CF6' },
  { href: '/customers', label: '고객 관리', short: '고객', bg: '#ECFDF5', color: '#059669' },
  { href: '/store', label: '매장 관리', short: '매장', bg: '#FFF1F2', color: '#E11D48' },
  { href: '/community', label: '커뮤니티', short: '커뮤', bg: '#FDF2F8', color: '#EC4899' },
]

// 로컬루션 로고 (파비콘 + 텍스트)
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* 파비콘 역할의 로고 뱃지 */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-sm">
        L
      </div>
      <div>
        <div className="font-black text-[#191F28] text-[17px] tracking-tight leading-none">Localution</div>
        <div className="text-[10px] text-[#8B95A1] font-medium leading-none mt-0.5">(로컬루션)</div>
      </div>
    </div>
  )
}

function NavItem({ item, active, onClick }: { item: typeof NAV[0]; active: boolean; onClick?: () => void }) {
  return (
    <Link href={item.href} onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-[#EFF6FF] text-[#3182F6] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={active ? { background: '#3182F6', color: '#fff' } : { background: item.bg, color: item.color }}>
        {item.short}
      </div>
      <span className="text-sm">{item.label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3182F6]" />}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* 모바일 헤더 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E8EB] z-30 flex items-center justify-between px-4">
        <Logo />
        <button onClick={() => setMobileOpen(v => !v)} className="w-9 h-9 flex flex-col justify-center items-center gap-1.5">
          <span className={`block w-5 h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? 'opacity-0 w-0' : 'w-5'}`} />
          <span className={`block w-5 h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* 모바일 오버레이 */}
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />}

      {/* 모바일 드로어 */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-[260px] bg-white z-50 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 flex items-center px-5 border-b border-[#E5E8EB]"><Logo /></div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => <NavItem key={item.href} item={item} active={pathname === item.href} onClick={() => setMobileOpen(false)} />)}
        </nav>
        <div className="px-3 pb-6 border-t border-[#F2F4F6] pt-3 space-y-1">
          <Link href="/settings?tab=plan" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#3182F6] text-white font-semibold text-sm">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-bold">+</div>
            기능 추가하기
          </Link>
          <Link href="/settings" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#4E5968] hover:bg-[#F2F4F6] text-sm font-medium">
            <div className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center text-[10px] font-bold text-[#4E5968]">설정</div>
            설정
          </Link>
        </div>
      </div>

      {/* 데스크탑 사이드바 */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[220px] bg-white border-r border-[#E5E8EB] z-30 flex-col">
        <div className="h-16 flex items-center px-5 border-b border-[#E5E8EB]"><Logo /></div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => <NavItem key={item.href} item={item} active={pathname === item.href} />)}
        </nav>
        <div className="px-3 pb-6 border-t border-[#F2F4F6] pt-3 space-y-1">
          <Link href="/settings?tab=plan"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#3182F6] text-white font-semibold text-sm hover:bg-[#1B64DA] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-bold">+</div>
            기능 추가하기
          </Link>
          <Link href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === '/settings' ? 'bg-[#EFF6FF] text-[#3182F6]' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}>
            <div className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center text-[10px] font-bold text-[#4E5968]">설정</div>
            설정
          </Link>
        </div>
      </aside>
    </>
  )
}
