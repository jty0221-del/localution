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
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-700"
        onClick={() => setOpen(!open)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect y="2" width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="8" width="18" height="2" rx="1" fill="currentColor"/>
          <rect y="14" width="18" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-[220px] bg-white border-r border-gray-100 z-40
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="10" r="3" fill="white"/>
                <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 14 8 14s8-8.75 8-14c0-4.42-3.58-8-8-8z" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-[15px] leading-tight">로컬루션</div>
              <div className="text-[11px] text-gray-400 font-medium">Localution AI</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg">
            <span className="text-blue-500 text-xs">✦</span>
            <span className="text-xs text-blue-600 font-semibold">PRO 멤버십 활성</span>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
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
        <div className="p-4 border-t border-gray-100">
          <Link href="/settings" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors mb-2">
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
