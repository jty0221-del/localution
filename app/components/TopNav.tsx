'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
 { href: '/about', label: '회사 소개' }, // 🆕 2026-04-19 — 대표의 편지 & 브랜드 스토리
 { href: '/service-intro', label: '서비스 소개' },
 { href: '/pricing', label: '요금' },
 { href: '/community', label: '커뮤니티' },
 { href: '/inquiry', label: '문의' },
]

export default function TopNav() {
 const pathname = usePathname()
 const [menuOpen, setMenuOpen] = useState(false)
 const [isLoggedIn, setIsLoggedIn] = useState(false)

 useEffect(() => {
 const check = async () => {
 try {
 // 항상 서버에서 최신 사용자 확인 (캐시는 fallback 으로만 사용 — 계정 변경 후 stale 방지)
 const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' })
 const data = await res.json().catch(() => null)
 if (data?.user) {
 sessionStorage.setItem('localution_user', JSON.stringify(data.user))
 setIsLoggedIn(true)
 } else {
 // 서버 세션 없음 → stale 캐시 제거
 sessionStorage.removeItem('localution_user')
 setIsLoggedIn(false)
 }
 } catch {
 // 네트워크 오류 시에만 캐시로 fallback
 try {
 const cached = sessionStorage.getItem('localution_user')
 if (cached) setIsLoggedIn(true)
 } catch {}
 }
 }
 check()
 }, [])

 return (
 <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
 <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

 {/* 로고 */}
 <Link href="/" className="flex items-center gap-2 select-none active:opacity-70 transition-opacity">
 <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center shadow-[0_2px_10px_rgba(49,130,246,0.28)]">
 <span className="text-white font-black text-base md:text-lg tracking-tight leading-none">L</span>
 </div>
 <span className="text-base md:text-xl font-black text-[#191F28] tracking-tight">로컬루션</span>
 </Link>

 {/* 데스크탑 메뉴 */}
 <div className="hidden md:flex items-center gap-5 lg:gap-6">
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
 <Link href="/signup" className="text-sm font-semibold bg-[#3182F6] text-white px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors shadow-sm">
 무료 시작하기
 </Link>
 </>
 )}
 </div>

 {/* 모바일 메뉴 버튼 */}
 <button
 className="md:hidden p-2 min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
 onClick={() => setMenuOpen(!menuOpen)}
 aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
 aria-expanded={menuOpen}
 >
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
 <Link href="/signup" className="text-center text-sm font-semibold bg-[#3182F6] text-white py-2 rounded-xl">
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
