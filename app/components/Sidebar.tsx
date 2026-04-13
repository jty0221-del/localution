'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const navItems = [
  { href: '/', label: '대시보드', icon: '🏠' },
  { href: '/review-admin', label: '리뷰 관리', icon: '⭐' },
  { href: '/crm', label: '고객 관리', icon: '👥' },
  { href: '/admin-biz', label: '매장 관리', icon: '🏪' },
  { href: '/qr-admin', label: 'QR 관리', icon: '📱' },
  { href: '/community', label: '커뮤니티', icon: '💬' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const NavContent = () => (
    <>
      <div className="p-5 border-b border-[#F2F4F6]">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="로컬루션" width={32} height={32} className="rounded-lg" />
          <span className="font-bold text-[#191F28] text-lg">로컬루션</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#EFF6FF] text-[#3182F6]'
                  : 'text-[#4E5968] hover:bg-[#F2F4F6]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-[#F2F4F6] space-y-1">
        <Link
          href="/pricing"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#3182F6] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-colors"
        >
          <span>✨</span>
          기능 추가하기
        </Link>
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4E5968] hover:bg-[#F2F4F6] transition-colors"
        >
          <span>⚙️</span>
          설정
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-xl shadow-md"
      >
        <svg className="w-5 h-5 text-[#191F28]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 모바일 드로어 */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-[220px] bg-white z-50 flex flex-col shadow-xl transition-transform ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <NavContent />
      </div>

      {/* 데스크탑 사이드바 */}
      <div className="hidden md:flex fixed top-0 left-0 h-full w-[220px] bg-white border-r border-[#E5E8EB] flex-col z-30">
        <NavContent />
      </div>
    </>
  )
}
