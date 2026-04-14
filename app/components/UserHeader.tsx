'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface NaverUser {
  id: string
  name: string
  email: string
  nickname?: string
  profile_image?: string
}

export default function UserHeader() {
  const [user, setUser] = useState<NaverUser | null>(null)

  useEffect(() => {
    // sessionStorage 캐시
    const cached = sessionStorage.getItem('localution_user')
    if (cached) {
      try { setUser(JSON.parse(cached)); return } catch {}
    }
    // API 조회
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user)
          sessionStorage.setItem('localution_user', JSON.stringify(data.user))
        }
      })
      .catch(() => {})
  }, [])

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#03C75A] text-white text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
        </svg>
        로그인
      </Link>
    )
  }

  const initials = user.name ? user.name.charAt(0) : '?'

  return (
    <Link href="/my" className="flex items-center gap-2.5 group">
      {/* 아바타 */}
      <div className="relative">
        {user.profile_image ? (
          <img
            src={user.profile_image}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center shadow-sm border-2 border-white">
            <span className="text-white text-sm font-black">{initials}</span>
          </div>
        )}
        {/* 네이버 온라인 배지 */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#03C75A] border-2 border-white"/>
      </div>
      {/* 이름 */}
      <span className="text-sm font-bold text-[#191F28] group-hover:text-[#3182F6] transition-colors">
        {user.name}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </Link>
  )
}
