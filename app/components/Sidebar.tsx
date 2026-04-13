'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: '대시보드', icon: 'DB' },
  { href: '/review-admin', label: '리뷰 관리', icon: '리뷰' },
  { href: '/qr', label: 'QR 관리', icon: 'QR' },
  { href: '/customers', label: '고객 관리', icon: '고객' },
  { href: '/store', label: '매장 관리', icon: '매장' },
  { href: '/community', label: '커뮤니티', icon: '커뮤' },
]

const NAV_COLORS: Record<string, { bg: string; text: string }> = {
  DB: { bg: '#EFF6FF', text: '#3182F6' },
  '리뷰': { bg: '#FFFBEB', text: '#F59E0B' },
  QR: { bg: '#F5F3FF', text: '#8B5CF6' },
  '고객': { bg: '#ECFDF5', text: '#059669' },
  '매장': { bg: '#FFF1F2', text: '#E11D48' },
  '커뮤': { bg: '#FDF2F8', text: '#EC4899' },
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavItems = () => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(item => {
        const isActive = pathname === item.href
        const colors = NAV_COLORS[item.icon]
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isActive
                ? 'bg-[#EFF6FF] text-[#3182F6] font-semibold'
                : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'
            }`}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={isActive ? { background: '#3182F6', color: '#fff' } : { background: colors.bg, color: colors.text }}
            >
              {item.icon}
            </div>
            <span className="text-sm">{item.label}</span>
            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3182F6]" />}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile Header */}
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

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-[260px] bg-white z-50 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-5 border-b border-[#E5E8EB]">
          <div>
            <div className="font-black text-[#191F28] text-xl tracking-tight">Localution</div>
            <div className="text-xs text-[#8B95A1] font-medium">(로컬루션)</div>
          </div>
        </div>
        <div className="flex flex-col h-[calc(100%-4rem)]">
          <NavItems />
          <div className="px-3 pb-6 space-y-1 border-t border-[#F2F4F6] pt-3">
            <Link href="/pricing" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#3182F6] text-white font-semibold text-sm hover:bg-[#1B64DA] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-bold">+</div>
              기능 추가하기
            </Link>
            <Link href="/settings" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#4E5968] hover:bg-[#F2F4F6] font-medium text-sm transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center text-[10px] font-bold text-[#4E5968]">설정</div>
              설정
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[220px] bg-white border-r border-[#E5E8EB] z-30 flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-[#E5E8EB]">
          <div>
            <div className="font-black text-[#191F28] text-xl tracking-tight leading-tight">Localution</div>
            <div className="text-[11px] text-[#8B95A1] font-medium leading-tight">(로컬루션)</div>
          </div>
        </div>

        <NavItems />

        {/* Bottom actions */}
        <div className="px-3 pb-6 space-y-1 border-t border-[#F2F4F6] pt-3">
          <Link href="/settings?tab=plan"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#3182F6] text-white font-semibold text-sm hover:bg-[#1B64DA] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-bold">+</div>
            기능 추가하기
          </Link>
          <Link href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              pathname === '/settings' ? 'bg-[#EFF6FF] text-[#3182F6]' : 'text-[#4E5968] hover:bg-[#F2F4F6]'
            }`}>
            <div className="w-7 h-7 rounded-lg bg-[#F2F4F6] flex items-center justify-center text-[10px] font-bold text-[#4E5968]">설정</div>
            설정
          </Link>
        </div>
      </aside>
    </>
  )
}
