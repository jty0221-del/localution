'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

const NO_SIDEBAR_PATHS = ['/', '/login', '/pricing', '/clear']

function shouldShowSidebar(pathname: string): boolean {
  for (let i = 0; i < NO_SIDEBAR_PATHS.length; i++) {
    if (pathname === NO_SIDEBAR_PATHS[i]) return false
  }
  if (pathname === '/qr' || pathname.startsWith('/qr/')) return false
  return true
}

export default function DashboardShell({ children }: { children: ReactNode }) {
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
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}
