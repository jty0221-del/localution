'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { isAdminEmail } from '@/app/lib/admin-emails'

const NAV = [
  { href: '/admin/dashboard',    label: '대시보드',      icon: '📊' },
  { href: '/admin/subscriptions',label: '구독 현황',     icon: '💳' },
  { href: '/admin/users',        label: '사용자',        icon: '👥' },
  { href: '/admin/naver-check',   label: '네이버 연동 진단',  icon: '🔍' },
  { href: '/admin/review-health', label: '리뷰 수집 점검',   icon: '📋' },
]

// ------------------------------------------------------------
// 클라이언트 사이드 이메일 추출 — 듀얼 모드
// ------------------------------------------------------------
function readLocalutionUserEmail(): string | null {
  try {
    if (typeof document === 'undefined') return null
    const raw = document.cookie.split('; ').find(r => r.startsWith('localution_user='))
    if (!raw) return null
    const value = raw.slice('localution_user='.length)
    const decoded = decodeURIComponent(value)
    const parsed = JSON.parse(decoded)
    const email = (parsed?.email || '').toString().toLowerCase().trim()
    return email || null
  } catch {
    return null
  }
}

async function readSupabaseEmail(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser()
    const email = data?.user?.email?.toLowerCase()?.trim() || null
    return email
  } catch {
    return null
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking')
  const [reason, setReason] = useState<string>('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      // 1) localution_user 쿠키 (네이버/카카오/구글 OAuth)
      const luEmail = readLocalutionUserEmail()
      if (luEmail) {
        if (!mounted) return
        if (isAdminEmail(luEmail)) {
          setStatus('ok')
        } else {
          setReason(`${luEmail} 계정은 관리자 권한이 없습니다.`)
          setStatus('denied')
          setTimeout(() => router.replace('/'), 1200)
        }
        return
      }

      // 2) Supabase 세션
      const sbEmail = await readSupabaseEmail()
      if (!mounted) return
      if (sbEmail && isAdminEmail(sbEmail)) {
        setStatus('ok')
      } else if (sbEmail) {
        setReason(`${sbEmail} 계정은 관리자 권한이 없습니다.`)
        setStatus('denied')
        setTimeout(() => router.replace('/'), 1200)
      } else {
        setReason('로그인이 필요합니다.')
        setStatus('denied')
        setTimeout(() => router.replace('/login?redirect=/admin/dashboard'), 800)
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
      <div className="min-h-screen flex items-center justify-center bg-[#F2F4F6] px-6">
        <div className="text-center">
          <div className="text-base text-[#E11D48] font-bold mb-1">접근 권한이 없습니다.</div>
          <div className="text-xs text-[#8B95A1]">{reason}</div>
        </div>
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
