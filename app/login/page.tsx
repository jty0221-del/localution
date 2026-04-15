'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로
    const hasCookie = document.cookie.split(';').some(function(c) {
      return c.trim().startsWith('localution_session=')
    })
    if (hasCookie) { router.replace('/'); return; }

    // URL 에러 파라미터 처리 (정규식 미사용)
    const search = window.location.search
    if (search.indexOf('error=') >= 0) {
      const pairs = search.slice(1).split('&')
      let errVal = ''
      pairs.forEach(function(p) {
        if (p.startsWith('error=')) errVal = p.slice(6)
      })
      if (errVal === 'kakao_denied')  setErrMsg('카카오 로그인이 취소되었습니다.')
      else if (errVal === 'google_denied') setErrMsg('구글 로그인이 취소되었습니다.')
      else if (errVal === 'naver_denied')  setErrMsg('네이버 로그인이 취소되었습니다.')
      else if (errVal)                setErrMsg('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F4F6] to-[#EFF6FF] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* 실제 LOCALUTION 로고 */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img
              src="/logo.png"
              alt="로컬루션"
              style={{ height: '56px', width: 'auto' }}
            />
          </div>
          <p className="text-sm text-[#8B95A1]">소상공인을 위한 AI 비즈니스 자동화 플랫폼</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-black text-[#191F28] mb-1 text-center">시작하기</h2>
          <p className="text-sm text-[#8B95A1] text-center mb-7">SNS 계정으로 간편하게 로그인하세요</p>

          {errMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-500 text-center">
              {errMsg}
            </div>
          )}

          <div className="space-y-3">

            {/* ── 카카오 로그인 (공식 노란색) */}
            <a
              href="/api/oauth/kakao"
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-[#191F28] text-sm transition-all hover:opacity-90 active:scale-[0.98] shadow-sm select-none"
              style={{ background: '#FEE500', textDecoration: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#191F28">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.717 1.643 5.112 4.132 6.548l-1.05 3.888c-.09.337.303.606.595.399l4.6-3.057c.569.078 1.147.12 1.723.12 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z"/>
              </svg>
              <span>카카오로 로그인</span>
            </a>

            {/* ── 구글 로그인 (공식 흰색 테두리) */}
            <a
              href="/api/oauth/google"
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-[#191F28] text-sm border border-[#DADCE0] transition-all hover:bg-[#F8F9FA] active:scale-[0.98] shadow-sm bg-white select-none"
              style={{ textDecoration: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>구글로 로그인</span>
            </a>

            {/* ── 네이버 로그인 (공식 초록색) */}
            <a
              href="/api/oauth/naver"
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] shadow-sm select-none"
              style={{ background: '#03C75A', textDecoration: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              <span>네이버로 로그인</span>
            </a>

          </div>

          <div className="mt-7 pt-6 border-t border-[#F2F4F6]">
            <p className="text-xs text-[#B0B8C1] text-center leading-relaxed">
              로그인 시 로컬루션의{' '}
              <a href="#" className="text-[#3182F6] hover:underline">이용약관</a>{' '}및{' '}
              <a href="#" className="text-[#3182F6] hover:underline">개인정보처리방침</a>에{' '}
              동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>

        {/* 서비스 특징 3종 */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: '📍', label: '리뷰 관리' },
            { icon: '✨', label: 'AI 답글' },
            { icon: '📊', label: '매출 분석' },
          ].map(function(item) { return (
            <div key={item.label} className="bg-white/70 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs text-[#4E5968] font-semibold">{item.label}</div>
            </div>
          )})}
        </div>

      </div>
    </div>
  )
}
