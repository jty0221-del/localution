'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/service-intro', label: '서비스 소개' },
  { href: '/pricing',       label: '요금' },
  { href: '/community',     label: '커뮤니티' },
  { href: '/inquiry',       label: '문의' },
]

export default function TopNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const cached = sessionStorage.getItem('localution_user')
        if (cached) { setIsLoggedIn(true); return }
        const res = await fetch('/api/me', { credentials: 'include' })
        const data = await res.json()
        if (data?.user) {
          sessionStorage.setItem('localution_user', JSON.stringify(data.user))
          setIsLoggedIn(true)
        }
      } catch {}
    }
    check()
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 select-none">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-[0_2px_10px_rgba(49,130,246,0.22)] ring-1 ring-[#E8F4FD] bg-white flex items-center justify-center">
            <img src="/favicon.ico" alt="로컬루션" width={32} height={32} style={{ objectFit: 'contain' }} />
          </div>
          <span className="text-xl font-black text-[#191F28] tracking-tight">로컬루션</span>
        </Link>

        {/* 데스크탑 메뉴 */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                pathname === l.href
                  ? 'text-[#3182F6] font-semibold'
                  : 'text-[#4E5968] hover:text-[#3182F6]'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* 우측 버튼 */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="text-sm font-semibold bg-[#3182F6] text-white px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors shadow-sm flex items-center gap-1"
            >
              대시보드 <span>→</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#4E5968] font-medium px-4 py-2 hover:text-[#3182F6] transition-colors">
                로그인
              </Link>
              <Link href="/login" className="text-sm font-semibold bg-[#3182F6] text-white px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors shadow-sm">
                무료 시작하기
              </Link>
            </>
          )}
        </div>

        {/* 모바일 메뉴 버튼 */}
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <div className="w-5 h-0.5 bg-gray-600 mb-1" />
          <div className="w-5 h-0.5 bg-gray-600 mb-1" />
          <div className="w-5 h-0.5 bg-gray-600" />
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`block text-sm font-medium py-1 ${
                pathname === l.href ? 'text-[#3182F6]' : 'text-[#4E5968]'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-center text-sm font-semibold bg-[#3182F6] text-white py-2 rounded-xl">
                대시보드 →
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-center text-sm text-[#4E5968] font-medium py-2 border border-gray-200 rounded-xl">
                  로그인
                </Link>
                <Link href="/login" className="text-center text-sm font-semibold bg-[#3182F6] text-white py-2 rounded-xl">
                  무료 시작하기
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
