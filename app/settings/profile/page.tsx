'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import { User, Store, MapPin, Save, Check, ArrowLeft, Mail, Phone, LogOut } from 'lucide-react'
import Footer from '../../components/Footer'
import { confirmDialog } from '../../lib/toast'

type UserCookie = {
  id?: string; name?: string; email?: string; provider?: string; profile_image?: string;
}
type StoreInfo = {
  storeName?: string; branch?: string; address?: string; phone?: string;
}

function readCookieUser(): UserCookie | null {
  if (typeof document === 'undefined') return null
  try {
    const m = document.cookie.match(/(?:^|;\s*)localution_user=([^;]+)/)
    if (!m) return null
    return JSON.parse(decodeURIComponent(m[1]))
  } catch { return null }
}

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오', naver: '네이버', google: '구글',
}

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<UserCookie | null>(null)
  const [form, setForm] = useState<StoreInfo>({ storeName: '', branch: '', address: '', phone: '' })
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setUser(readCookieUser())
    try {
      const raw = localStorage.getItem('localution_store')
      if (raw) {
        const parsed = JSON.parse(raw)
        setForm({
          storeName: parsed.storeName || '',
          branch:    parsed.branch    || '',
          address:   parsed.address   || '',
          phone:     parsed.phone     || '',
        })
      }
    } catch {}
    setLoaded(true)
  }, [])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      localStorage.setItem('localution_store', JSON.stringify(form))
      window.dispatchEvent(new CustomEvent('localution:user-change'))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] p-4 pt-20 md:p-6 md:pt-6 min-w-0 pb-24 md:pb-6">
        {/* LOCALUTION_HERO_BANNER */}
        <section className="bg-gradient-to-r from-[#6366F1] to-[#4338CA] text-white px-4 py-10 sm:py-14">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="text-4xl sm:text-5xl drop-shadow-sm">👤</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">프로필 설정</h1>
              <p className="text-white/85 text-xs sm:text-sm mt-1 leading-relaxed">계정 정보와 알림을 내 업체에 맞게 — 설정은 한 번, 결과는 오래</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
              로컬루션
            </div>
          </div>
        </section>
        <div className="max-w-3xl mx-auto">

          <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-[#8B95A1] hover:text-[#3182F6] mb-3">
            <ArrowLeft size={14} strokeWidth={2.25} /> 설정으로
          </Link>

          <div className="bg-white rounded-2xl shadow-sm px-6 py-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={18} strokeWidth={2.25} className="text-[#3182F6]" />
              <h1 className="text-lg font-black text-[#191F28]">내 프로필</h1>
            </div>
            <p className="text-xs text-[#8B95A1]">사이드바·대시보드에 표시되는 매장 정보를 설정합니다</p>
          </div>

          {/* 로그인 계정 정보 (읽기 전용) */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#191F28]">로그인 계정</h2>
              {user && (
                <a href="/api/auth/logout"
                  onClick={async (e) => {
                    e.preventDefault()
                    const ok = await confirmDialog('로그아웃 하시겠어요?', { title: '로그아웃', okText: '로그아웃', danger: true })
                    if (ok) window.location.href = '/api/auth/logout'
                  }}
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] transition-all">
                  <LogOut size={12} strokeWidth={2.5} />
                  로그아웃
                </a>
              )}
            </div>
            {user ? (
              <>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F9FA]">
                  {user.profile_image ? (
                    <img src={user.profile_image} alt="" width={48} height={48}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {(user.name || '?')[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#191F28]">{user.name || '이름 미설정'}</p>
                    <p className="text-[11px] text-[#8B95A1] flex items-center gap-1 mt-0.5">
                      <Mail size={10} /> {user.email || '이메일 미공개'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#E8F4FD] text-[#3182F6] flex-shrink-0">
                    {PROVIDER_LABEL[user.provider || ''] || 'OAuth'} 로그인
                  </span>
                </div>
                {/* 모바일 전용 로그아웃 버튼 */}
                <a href="/api/auth/logout"
                  onClick={async (e) => {
                    e.preventDefault()
                    const ok = await confirmDialog('로그아웃 하시겠어요?', { title: '로그아웃', okText: '로그아웃', danger: true })
                    if (ok) window.location.href = '/api/auth/logout'
                  }}
                  className="md:hidden mt-3 flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] active:bg-[#FECACA] transition-all text-sm font-bold">
                  <LogOut size={15} strokeWidth={2.5} />
                  <span>로그아웃</span>
                </a>
              </>
            ) : (
              <div className="text-center py-6 text-sm text-[#8B95A1]">
                로그인 상태가 아닙니다. <Link href="/login" className="text-[#3182F6] font-semibold underline">로그인</Link>
              </div>
            )}
          </div>

          {/* 매장 정보 폼 */}
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#191F28]">매장 정보</h2>
              {saved && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#12B76A] font-bold">
                  <Check size={12} strokeWidth={3} /> 저장됨
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
                  <Store size={12} strokeWidth={2.5} className="inline mr-1" />
                  매장명 <span className="text-[#F04452]">*</span>
                </label>
                <input
                  type="text"
                  value={form.storeName || ''}
                  onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                  placeholder="예) 하랑마케팅, 강남치과, 라떼커피 등"
                  maxLength={24}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm"
                />
                <p className="text-[10px] text-[#8B95A1] mt-1">사이드바 메인 타이틀로 표시됩니다</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
                  <MapPin size={12} strokeWidth={2.5} className="inline mr-1" />
                  지점 / 구분
                </label>
                <input
                  type="text"
                  value={form.branch || ''}
                  onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                  placeholder="예) 강남점, 본점, 일산동구점 등"
                  maxLength={24}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">주소</label>
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="예) 서울시 강남구 테헤란로 123"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
                  <Phone size={12} strokeWidth={2.5} className="inline mr-1" />
                  대표 전화
                </label>
                <input
                  type="tel"
                  value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="예) 02-1234-5678"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!loaded || !form.storeName}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3182F6] text-white font-bold text-sm hover:bg-[#1B64DA] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={15} strokeWidth={2.5} />
              저장하기
            </button>

            <p className="text-[10px] text-[#8B95A1] text-center mt-3">
              브라우저에 저장됩니다. 여러 기기에서 사용하려면 추후 업데이트로 동기화 예정
            </p>
          </form>
        </div>
        <Footer />
      </main>
    </div>
  )
}
