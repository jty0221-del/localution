'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface NaverUser {
  id: string
  name: string
  email: string
  nickname?: string
  profile_image?: string
  mobile?: string
}

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<NaverUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)

  useEffect(() => {
    // 1) sessionStorage 캐시 먼저 확인
    const cached = sessionStorage.getItem('localution_user')
    if (cached) {
      try { setUser(JSON.parse(cached)); setLoading(false); return } catch {}
    }
    // 2) API에서 세션 확인
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

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
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
            {/* 프로필 이미지 */}
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
              {/* 네이버 배지 */}
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#03C75A] flex items-center justify-center shadow-sm border-2 border-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
                </svg>
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-[#191F28]">{user.name}</div>
              <div className="text-sm text-[#8B95A1] mt-0.5">
                {user.nickname && user.nickname !== user.name ? user.nickname + ' · ' : ''}
                네이버 계정
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
              source="네이버 제공"
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
              source="네이버 제공"
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
                value={user.mobile.replace(/-/g, '').replace(/(d{3})(d{4})(d{4})/, '$1-$2-$3')}
                source="네이버 제공"
              />
            )}
          </div>
        </div>

        {/* 서비스 이용 현황 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#191F28] mb-4">서비스 이용 현황</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: '관리 매장', value: '1', unit: '곳' },
              { label: '등록 리뷰', value: '24', unit: '개' },
              { label: 'AI 답글', value: '18', unit: '건' },
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
                네이버에서 제공받은 이름, 이메일은 로컬루션 서비스 로그인 및 계정 식별 목적으로만 사용됩니다.
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

        {/* 하단 여백 */}
        <div className="h-6"/>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, source }: {
  icon: React.ReactNode
  label: string
  value: string
  source: string
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
        <span className="text-[10px] text-[#03C75A] font-semibold bg-[#03C75A]/10 rounded-full px-2 py-0.5">
          {source}
        </span>
      </div>
    </div>
  )
}
