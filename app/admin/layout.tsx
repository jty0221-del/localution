'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

const ADMIN_EMAILS = ['jty0221@gmail.com']

const NAV = [
  { href: '/admin/dashboard',    label: '대시보드',     icon: '📊' },
  { href: '/admin/subscriptions',label: '구독 현황',    icon: '💳' },
  { href: '/admin/users',        label: '사용자',       icon: '👥' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const email = data?.user?.email?.toLowerCase() ?? null
      if (!mounted) return
      if (email && ADMIN_EMAILS.includes(email)) {
        setStatus('ok')
      } else {
        setStatus('denied')
        router.replace('/')
      }
    })()
    return () => { mounted = false }
  }, [router])

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F4F6]">
        <div className="text-sm text-[#8B95A1]">관리자 인증 확인 중…</div>
      </div>
    )
  }
  if (status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F4F6]">
        <div className="text-sm text-[#E11D48] font-bold">접근 권한이 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      {/* Admin Sidebar */}
      <aside className="w-[220px] bg-[#0F172A] text-white flex-shrink-0 min-h-screen sticky top-0 hidden md:block">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="text-xs text-white/60 font-semibold mb-1">LOCALUTION</div>
          <div className="text-lg font-black tracking-tight">관리자 콘솔</div>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map(n => {
            const active = pathname === n.href
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}>
                <span className="text-base">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-4 left-0 right-0 px-5 text-[10px] text-white/40">
          이 화면은 관리자 전용입니다.<br />일반 사용자는 접근 불가
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0F172A] text-white z-40 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-black text-sm">관리자 콘솔</div>
          <div className="flex gap-1.5">
            {NAV.map(n => {
              const active = pathname === n.href
              return (
                <Link key={n.href} href={n.href}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
                    active ? 'bg-white/20 text-white' : 'text-white/70'
                  }`}>
                  {n.icon}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 pt-14 md:pt-0 min-w-0">
        {children}
      </main>
    </div>
  )
}
