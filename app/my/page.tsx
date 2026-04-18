'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '../components/Footer'

interface AuthUser {
  id: string
  name: string
  email: string
  nickname?: string
  profile_image?: string
  mobile?: string
  provider?: 'naver' | 'kakao' | 'google'
}

interface ProviderMeta {
  label: string
  badgeBg: string
  tag: string
  tagBg: string
  tagText: string
  icon: React.ReactNode
}

const PROVIDERS: Record<string, ProviderMeta> = {
  naver: {
    label: '네이버 계정',
    badgeBg: '#03C75A',
    tag: '네이버 제공',
    tagBg: 'rgba(3,199,90,0.1)',
    tagText: '#03C75A',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
      </svg>
    ),
  },
  kakao: {
    label: '카카오 계정',
    badgeBg: '#FEE500',
    tag: '카카오 제공',
    tagBg: 'rgba(255,214,0,0.2)',
    tagText: '#191919',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#191919">
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.76-.2.73-.72 2.61-.82 3.02-.13.5.18.5.38.36.16-.11 2.55-1.73 3.58-2.43.72.1 1.45.16 2.18.16 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
      </svg>
    ),
  },
  google: {
    label: '구글 계정',
    badgeBg: '#FFFFFF',
    tag: '구글 제공',
    tagBg: 'rgba(234,67,53,0.1)',
    tagText: '#EA4335',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
}

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [stats, setStats] = useState({ stores: 0, customers: 0, platforms: 0 })

  useEffect(() => {
    const cached = sessionStorage.getItem('localution_user')
    if (cached) {
      try { setUser(JSON.parse(cached)); setLoading(false); return } catch {}
    }
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user)
          sessionStorage.setItem('localution_user', JSON.stringify(data.user))
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  // 실제 사용 현황 localStorage 기반 집계
  useEffect(() => {
    if (!user) return
    try {
      // 등록 매장
      const storeRaw = localStorage.getItem('localution_store')
      const stores = storeRaw ? 1 : 0

      // 등록 고객
      let customers = 0
      try {
        const c = localStorage.getItem('localution.customers')
        if (c) {
          const arr = JSON.parse(c)
          if (Array.isArray(arr)) customers = arr.length
        }
      } catch {}

      // 연결된 플랫폼 수
      let platforms = 0
      try {
        const pl = localStorage.getItem('localution.platform_links')
        if (pl) {
          const obj = JSON.parse(pl)
          platforms = Object.values(obj).filter((v: any) => v?.connected).length
        } else {
          // 레거시 키 fallback
          const legacy = ['naver','kakao','google','baemin','coupang','yogiyo']
          platforms = legacy.filter(k => localStorage.getItem(`localution.${k}.connected`) === 'true').length
        }
      } catch {}

      setStats({ stores, customers, platforms })
    } catch {}
  }, [user])

  async function handleLogout() {
    setLogoutLoading(true)
    await fetch('/api/me', { method: 'DELETE' })
    sessionStorage.removeItem('localution_user')
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="text-[#8B95A1] text-sm">불러오는 중...</div>
      </div>
    )
  }

  if (!user) return null

  const initials = user.name ? user.name.charAt(0) : '?'
  const provider = user.provider || 'naver'
  const meta = PROVIDERS[provider] || PROVIDERS.naver

  // 휴대폰 하이픈 포맷 (이스케이프 수정: d → \d)
  const formatPhone = (raw?: string) => {
    if (!raw) return ''
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
    if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
    return raw
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      {/* LOCALUTION_HERO_BANNER */}
      <section className="bg-gradient-to-r from-[#3182F6] to-[#1B64DA] text-white px-4 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="text-4xl sm:text-5xl drop-shadow-sm">🧑‍💼</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">내 정보</h1>
            <p className="text-white/85 text-xs sm:text-sm mt-1 leading-relaxed">내 활동과 즐겨찾는 기능을 한눈에 — 로컬루션이 당신의 비서</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
            로컬루션
          </div>
        </div>
      </section>

      {/* 상단 헤더 */}
      <div className="bg-white border-b border-[#E5E8EB] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-lg font-black text-[#191F28]">내 정보</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center shadow-md">
                  <span className="text-white text-3xl font-black">{initials}</span>
                </div>
              )}
              {/* 공급자 배지 */}
              <div
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-sm border-2 border-white"
                style={{ background: meta.badgeBg }}
              >
                {meta.icon}
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-[#191F28]">{user.name}</div>
              <div className="text-sm text-[#8B95A1] mt-0.5">
                {user.nickname && user.nickname !== user.name ? user.nickname + ' · ' : ''}
                {meta.label}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-full px-2.5 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]"/>
                <span className="text-xs text-[#3182F6] font-semibold">로컬루션 멤버</span>
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-[#F2F4F6] -mx-6 mb-5"/>

          {/* 정보 항목들 */}
          <div className="space-y-4">
            <InfoRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              }
              label="이름"
              value={user.name}
              sourceLabel={meta.tag}
              sourceBg={meta.tagBg}
              sourceText={meta.tagText}
            />
            <InfoRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="3"/>
                  <path d="m22 7-10 7L2 7"/>
                </svg>
              }
              label="이메일"
              value={user.email}
              sourceLabel={meta.tag}
              sourceBg={meta.tagBg}
              sourceText={meta.tagText}
            />
            {user.mobile && (
              <InfoRow
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                    <circle cx="12" cy="17" r="1"/>
                  </svg>
                }
                label="휴대폰 번호"
                value={formatPhone(user.mobile)}
                sourceLabel={meta.tag}
                sourceBg={meta.tagBg}
                sourceText={meta.tagText}
              />
            )}
          </div>
        </div>

        {/* 서비스 이용 현황 (localStorage 실시간) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#191F28] mb-4">서비스 이용 현황</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '등록 매장',    value: stats.stores,    unit: '곳' },
              { label: '등록 고객',    value: stats.customers, unit: '명' },
              { label: '연결 플랫폼',  value: stats.platforms, unit: '개' },
            ].map(item => (
              <div key={item.label} className="bg-[#F8F9FA] rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-[#3182F6]">
                  {item.value}
                  <span className="text-sm font-bold text-[#8B95A1] ml-0.5">{item.unit}</span>
                </div>
                <div className="text-xs text-[#8B95A1] mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          {stats.stores === 0 && stats.customers === 0 && stats.platforms === 0 && (
            <div className="mt-4 text-xs text-[#8B95A1] bg-[#F8F9FA] rounded-xl p-3 text-center">
              아직 등록된 데이터가 없어요. 홈에서 매장을 먼저 등록해보세요.
            </div>
          )}
        </div>

        {/* 개인정보 처리 안내 */}
        <div className="bg-[#EFF6FF] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3182F6]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#3182F6] mb-1">개인정보 처리 안내</p>
              <p className="text-xs text-[#4E5968] leading-relaxed">
                {meta.label.replace(' 계정','')}에서 제공받은 이름, 이메일은 로컬루션 서비스 로그인 및 계정 식별 목적으로만 사용됩니다.
                별도의 서버에 저장되지 않으며, 세션 종료 시 자동 삭제됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="w-full py-3.5 rounded-2xl border-2 border-[#FF3B30]/20 text-[#FF3B30] font-bold text-sm hover:bg-[#FF3B30]/5 transition-colors disabled:opacity-50"
        >
          {logoutLoading ? '로그아웃 중...' : '로그아웃'}
        </button>

        <div className="h-6"/>
      </div>
      <Footer />
    </div>
  )
}

function InfoRow({ icon, label, value, sourceLabel, sourceBg, sourceText }: {
  icon: React.ReactNode
  label: string
  value: string
  sourceLabel: string
  sourceBg: string
  sourceText: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#F2F4F6] flex items-center justify-center text-[#8B95A1] flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#8B95A1] mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-[#191F28] truncate">{value}</div>
      </div>
      <div className="flex-shrink-0">
        <span
          className="text-[10px] font-semibold rounded-full px-2 py-0.5"
          style={{ background: sourceBg, color: sourceText }}
        >
          {sourceLabel}
        </span>
      </div>
    </div>
  )
}
