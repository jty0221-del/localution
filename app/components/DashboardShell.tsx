'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import Sidebar from './Sidebar'

// 사이드바를 표시하지 않는 공개 경로
const NO_SIDEBAR_PATHS = ['/', '/login', '/pricing', '/clear']

function shouldShowSidebar(pathname: string): boolean {
  if (!pathname) return false
  for (let i = 0; i < NO_SIDEBAR_PATHS.length; i++) {
    if (pathname === NO_SIDEBAR_PATHS[i]) return false
  }
  // QR 공개 페이지 (고객용)
  if (pathname === '/qr' || pathname.startsWith('/qr/')) return false
  return true
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const showSidebar = shouldShowSidebar(pathname)

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
