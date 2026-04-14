'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      try {
        const cached = sessionStorage.getItem('localution_user')
        if (cached) { router.replace('/dashboard'); return }
        const res = await fetch('/api/me', { credentials: 'include' })
        const data = await res.json()
        if (data?.user) {
          sessionStorage.setItem('localution_user', JSON.stringify(data.user))
          router.replace('/dashboard')
        }
      } catch {}
    }
    check()
  }, [router])

  function handleNaverLogin() {
    window.location.href = '/api/oauth/naver'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] to-[#F2F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <span className="text-2xl font-black text-[#191F28]">로컬루션</span>
          </Link>
          <p className="text-sm text-[#8B95A1]">소상공인을 위한 AI 비즈니스 자동화 플랫폼</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 p-8">
          <h2 className="text-xl font-black text-[#191F28] mb-2 text-center">로그인</h2>
          <p className="text-sm text-[#8B95A1] text-center mb-8">네이버 계정으로 간편하게 시작하세요</p>

          <button
            onClick={handleNaverLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#03C75A] hover:bg-[#02b350] text-white font-bold py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-green-200 active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            네이버로 시작하기
          </button>

          <p className="text-xs text-[#8B95A1] text-center mt-6 leading-relaxed">
            로그인 시 <Link href="/terms" className="text-[#3182F6] underline">이용약관</Link> 및{' '}
            <Link href="/privacy" className="text-[#3182F6] underline">개인정보처리방침</Link>에 동의하게 됩니다
          </p>
        </div>

        {/* 홈으로 */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-[#8B95A1] hover:text-[#3182F6] transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </div>

      </div>
    </div>
  )
}
