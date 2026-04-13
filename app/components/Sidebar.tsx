'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
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

const navItems = [
  { href: '/', label: '대시보드', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )},
  { href: '/marketing', label: '마케팅 관리', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  )},
  { href: '/reviews', label: '리뷰 관리', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )},
  { href: '/ai', label: 'AI 답글', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg>
  )},
  { href: '/report', label: '리포트', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )},
  { href: '/crm', label: 'CRM', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )},
  { href: '/qr', label: 'QR·SMS', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="21" y2="14"/>
      <line x1="14" y1="18" x2="21" y2="18"/><line x1="14" y1="21" x2="21" y2="21"/>
    </svg>
  )},
  { href: '/settings', label: '설정', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M21 12h-2M5 12H3M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 21v-2M12 5V3"/>
    </svg>
  )},
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-white border-r border-[#E5E8EB] flex flex-col z-30">
      <div className="p-5 pb-4">
        <Logo/>
      </div>
      <nav className="flex-1 px-3 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={['flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all', active ? 'bg-[#E8F1FE] text-[#3182F6] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] hover:text-[#191F28]'].join(' ')}>
              <span className={active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-[#F2F4F6]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">전</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#191F28] truncate">전태영</p>
            <p className="text-[10px] text-[#8B95A1] truncate">하랑마케팅</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
