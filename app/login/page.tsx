'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    if (!supabase) { setError('서버 설정을 확인해주세요.'); setLoading(false); return }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) setError(error.message)
      else setError('✅ 이메일을 확인해주세요!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('이메일 또는 비밀번호를 확인해주세요.')
      else window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="로컬루션" className="w-28 h-28 mx-auto object-contain" />
          <p className="text-gray-400 text-sm mt-2">소상공인 AI 만능 비서</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <p className="text-sm text-gray-400 mb-5">
            {mode === 'login' ? '계속하려면 로그인해주세요.' : '새 계정을 만들어보세요.'}
          </p>

          <a href="/api/auth/naver"
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm mb-3 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: '#03C75A', color: 'white' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            네이버로 시작하기
          </a>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center"><span className="text-xs text-gray-400 bg-white px-3">또는</span></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
            <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
            {error && (
              <div className={`text-sm px-3 py-2 rounded-lg ${error.startsWith('✅') ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'}`}>{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-500 text-white font-semibold text-sm rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-200 disabled:opacity-50">
              {loading ? '처리 중...' : mode === 'login' ? '이메일로 로그인' : '이메일로 가입'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-sm text-gray-400 hover:text-blue-500 transition-colors">
              {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">로그인하면 이용약관과 개인정보처리방침에 동의합니다.</p>
      </div>
    </div>
  )
}
