'use client';

import { useState } from 'react';
import { MapPin, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNaverLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/naver/callback`);
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('naver_state', state);
    window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/';
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { store_name: storeName } }
        });
        if (error) throw error;
        setError('이메일을 확인해주세요! 인증 후 로그인 가능해요.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '오류가 발생했어요';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center px-5">

      {/* 로고 */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
          <MapPin size={28} className="text-white" />
        </div>
        <h1 className="text-white font-black text-2xl">로컬루션</h1>
        <p className="text-violet-400 text-sm mt-1">소상공인 AI 만능 비서</p>
      </div>

      <div className="w-full max-w-sm">

        {/* 탭 */}
        <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
          <button onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400'}`}>
            로그인
          </button>
          <button onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400'}`}>
            회원가입
          </button>
        </div>

        {/* ✅ 네이버 로그인 버튼 */}
        <button onClick={handleNaverLogin}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#03C75A] hover:bg-[#02b350] active:scale-95 transition-all mb-3 shadow-lg shadow-green-500/20">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
            <span className="text-[#03C75A] font-black text-sm">N</span>
          </div>
          <span className="text-white font-bold text-sm">네이버 아이디로 {isLogin ? '로그인' : '회원가입'}</span>
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-500 text-xs">또는 이메일로</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* 이메일 입력 */}
        <div className="space-y-3">
          {!isLogin && (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Sparkles size={16} className="text-gray-500" />
              </div>
              <input
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="매장명 (예: 하랑마케팅 카페)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Mail size={16} className="text-gray-500" />
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Lock size={16} className="text-gray-500" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-11 py-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
            />
            <button onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className={`mt-3 p-3 rounded-xl text-xs text-center ${
            error.includes('이메일을 확인') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading || !email || !password}
          className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-violet-500/25 active:scale-95 transition-all flex items-center justify-center gap-2">
          {loading ? '처리 중...' : <>{isLogin ? '로그인' : '회원가입'} <ArrowRight size={16} /></>}
        </button>

        <p className="text-center text-xs text-gray-600 mt-6 leading-relaxed">
          가입 시 <span className="text-gray-400">이용약관</span> 및 <span className="text-gray-400">개인정보처리방침</span>에 동의합니다
        </p>
      </div>
    </div>
  );
}
