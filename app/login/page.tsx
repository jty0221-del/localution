'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  // 이미 로그인된 경우 대시보드로
  useEffect(() => {
    const user = sessionStorage.getItem('localution_user')
    if (user) router.replace('/')
  }, [router])

  function handleNaverLogin() {
    window.location.href = '/api/oauth/naver'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F4F6] to-[#EFF6FF] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <span className="text-2xl font-black text-[#191F28]">로컬루션</span>
          </div>
          <p className="text-sm text-[#8B95A1]">소상공인을 위한 AI 비즈니스 자동화 플랫폼</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-black text-[#191F28] mb-1 text-center">로그인</h2>
          <p className="text-sm text-[#8B95A1] text-center mb-8">네이버 계정으로 간편하게 시작하세요</p>

          {/* 네이버 로그인 버튼 (공식 디자인 가이드 준수) */}
          <button
            onClick={handleNaverLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
            style={{ background: '#03C75A' }}
          >
            {/* 네이버 N 로고 */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            <span>네이버로 로그인</span>
          </button>

          <div className="mt-6 pt-6 border-t border-[#F2F4F6]">
            <p className="text-xs text-[#B0B8C1] text-center leading-relaxed">
              로그인 시 로컬루션의{' '}
              <a href="#" className="text-[#3182F6] hover:underline">이용약관</a>{' '}및{' '}
              <a href="#" className="text-[#3182F6] hover:underline">개인정보처리방침</a>에<br/>
              동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-6 bg-white/70 rounded-xl p-4">
          <p className="text-xs text-[#8B95A1] text-center leading-relaxed">
            별도 회원가입 없이 네이버 계정으로<br/>
            바로 로컬루션 서비스를 이용하실 수 있습니다.
          </p>
        </div>

        {/* 서비스 특징 */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: '📍', label: '리뷰 관리' },
            { icon: '✨', label: 'AI 답글' },
            { icon: '📊', label: '매출 분석' },
          ].map(item => (
            <div key={item.label} className="bg-white/70 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs text-[#4E5968] font-semibold">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
