'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/review-admin', label: 'AI 리뷰·마케팅', icon: '⭐', badge: 3 },
  { href: '/crm', label: 'CRM · 고객관리', icon: '👥' },
  { href: '/admin-biz', label: '정산·행정', icon: '📋' },
  { href: '/qr-admin', label: '로컬 시너지', icon: '📍' },
  { href: '/community', label: '커뮤니티', icon: '💬' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 모바일 햄버거 */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <rect width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="6" width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      {/* 오버레이 */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/25 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 사이드바 본체 */}
      <aside className={`
        fixed top-0 left-0 h-full w-[220px] bg-white border-r border-gray-100 z-50
        flex flex-col transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* 로고 */}
        <div className="px-4 py-4 border-b border-gray-100">
          <Link href="/" onClick={() => setOpen(false)}>
            <img src="/logo.png" alt="로컬루션" className="h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg mt-3">
            <span className="text-blue-500 text-xs">✦</span>
            <span className="text-xs text-blue-600 font-semibold">PRO 멤버십 활성</span>
          </div>
        </div>

        {/* 네비 */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150
                  ${active
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/25 text-white' : 'bg-red-50 text-red-500'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* 하단 */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
          >
            <span>🛒</span> 기능 추가하기
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>⚙️</span> 설정
          </Link>
          <div className="px-3 py-2.5 bg-gray-50 rounded-xl">
            <div className="text-sm font-semibold text-gray-800">전태영 사장님</div>
            <div className="text-xs text-gray-400 mt-0.5">하랑마케팅</div>
          </div>
        </div>
      </aside>
    </>
  )
}
