'use client'

// ============================================================
// 관리자 전용 floating 버튼 — 좌측 하단
//   · isAdminEmail() 검증 통과한 사용자만 표시
//   · /api/me 호출로 email 확인 (httpOnly 쿠키 호환)
//   · 클릭 → /admin/users
//   · Harang 팝업 (우측 하단) 반대편 — 충돌 없음
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { isAdminEmail } from '@/app/lib/admin-emails'

const HIDE_PREFIXES = ['/admin', '/login', '/signup', '/review/']
const HIDE_EXACT = ['/', '/pricing', '/about', '/terms', '/privacy']

export default function AdminFloatingButton() {
  const pathname = usePathname() || '/'
  const [isAdmin, setIsAdmin] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store', credentials: 'include' })
        if (!r.ok) return
        const j = await r.json()
        const email = String(j?.user?.email || '').toLowerCase().trim()
        if (!cancelled && isAdminEmail(email)) setIsAdmin(true)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // 숨김 페이지 검사
  const hide =
    HIDE_EXACT.includes(pathname) ||
    HIDE_PREFIXES.some(p => pathname === p || pathname.startsWith(p))

  if (!isAdmin || hide || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Link
        href="/admin/users"
        className="group inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full shadow-lg shadow-red-300/40 bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white text-xs font-bold hover:scale-105 transition-transform"
        aria-label="관리자 콘솔"
        title="관리자 콘솔"
      >
        <Shield size={14} strokeWidth={2.5} />
        <span className="hidden sm:inline">관리자</span>
      </Link>
    </div>
  )
}
