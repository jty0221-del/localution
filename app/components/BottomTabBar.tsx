'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// 하단 탭바가 보이지 않아야 하는 경로 (로그인 전/랜딩)
const HIDE_PREFIXES = [
  '/login',
  '/signup',
  '/signin',
  '/onboarding',
]
const HIDE_EXACT = ['/', '/pricing', '/about', '/terms', '/privacy']

const TABS = [
  { href: '/dashboard',     label: '홈',     icon: '🏠', prefix: ['/dashboard'] },
  { href: '/review-admin',  label: '리뷰',   icon: '💬', prefix: ['/review-admin', '/reviews', '/review'] },
  { href: '/customers',     label: '고객',   icon: '👥', prefix: ['/customers', '/crm'] },
  { href: '/store',         label: '매장',   icon: '🏪', prefix: ['/store', '/reservations', '/settlement'] },
  { href: '/settings',      label: '설정',   icon: '⚙️', prefix: ['/settings', '/my', '/inquiry'] },
]

export default function BottomTabBar() {
  const pathname = usePathname() || '/'
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    try {
      const u = document.cookie.includes('localution_session=')
      setLoggedIn(u)
    } catch { setLoggedIn(false) }
  }, [pathname])

  // 숨겨야 할 페이지
  const hide =
    HIDE_EXACT.includes(pathname) ||
    HIDE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))

  // 모바일에서만 보이므로 body에 패딩 클래스 토글
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!hide && loggedIn) {
      document.body.classList.add('has-bottom-tab')
    } else {
      document.body.classList.remove('has-bottom-tab')
    }
  }, [hide, loggedIn])

  if (hide || !loggedIn) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E8EB]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-5 max-w-screen-sm mx-auto">
        {TABS.map(tab => {
          const active = tab.prefix.some(p => pathname === p || pathname.startsWith(p + '/'))
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'} hover:text-[#3182F6] transition-colors`}>
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
              {active && <span className="absolute top-0 w-8 h-0.5 rounded-b bg-[#3182F6]"/>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
