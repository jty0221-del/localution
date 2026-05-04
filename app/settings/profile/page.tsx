'use client'

// ============================================================
// 32차-5 · /settings/profile — 무효 naver 이름 필터링
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import { User, Store, MapPin, Save, Check, ArrowLeft, Mail, Phone, LogOut, Link2, RefreshCw, Tag } from 'lucide-react'
import Footer from '../../components/Footer'
import { confirmDialog, toast } from '../../lib/toast'

type UserCookie = {
  id?: string; name?: string; email?: string; provider?: string; profile_image?: string;
}
type StoreInfo = {
  storeName?: string; category?: string; address?: string; phone?: string;
}
type NaverLink = {
  external_id?: string | null
  external_name?: string | null
  external_url?: string | null
  address?: string | null
  category?: string | null
}
type PlatformRow = {
  platform: string
  label: string
  connected: boolean
  platform_store_id: string | null
  platform_store_name: string | null
  review_count: number
  rating_avg: number | null
}

function readCookieUser(): UserCookie | null {
  if (typeof document === 'undefined') return null
  try {
    const m = document.cookie.match(/(?:^|;\s*)localution_user=([^;]+)/)
    if (!m) return null
    return JSON.parse(decodeURIComponent(m[1]))
  } catch { return null }
}

const GENERIC_NAMES = ['네이버 플레이스', '네이버플레이스', 'naver place', '스마트플레이스']
function isValidStoreName(name: string | null | undefined): boolean {
  if (!name) return false
  const lower = name.trim().toLowerCase()
  if (lower.length < 2) return false
  return !GENERIC_NAMES.some(g => lower === g.toLowerCase())
}

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오', naver: '네이버', google: '구글',
}
const PLATFORM_COLOR: Record<string, { bg: string; fg: string }> = {
  naver_place: { bg: '#EDF7ED', fg: '#03C75A' },
  baemin:      { bg: '#E6FAF9', fg: '#00A4A6' },
  yogiyo:      { bg: '#FEECEE', fg: '#FA0050' },
  coupangeats: { bg: '#F3E9FF', fg: '#8B4CE8' },
  kakao_map:   { bg: '#FFFBE5', fg: '#6B5A00' },
}

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<UserCookie | null>(null)
  const [form, setForm] = useState<StoreInfo>({ storeName: '', category: '', address: '', phone: '' })
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [platforms, setPlatforms] = useState<PlatformRow[]>([])
  const [serverReady, setServerReady] = useState(false)
  const [naverAutoFilled, setNaverAutoFilled] = useState(false)
  const [naverLink, setNaverLink] = useState<NaverLink | null>(null)

  const loadServer = useCallback(async () => {
    try {
      const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data?.ok) return

      const rawNaverName  = data.naver_link?.external_name || ''
      const naverName     = isValidStoreName(rawNaverName) ? rawNaverName : ''
      const naverAddress  = data.naver_link?.address   || ''
      const naverCategory = data.naver_link?.category  || ''  // 서버에서 이미 보충됨

      if (data.naver_link && (naverName || data.naver_link.external_id)) {
        setNaverLink(data.naver_link)
      }

      if (data.store || data.naver_link) {
        setForm((prev) => ({
          // 서버저장값 > 네이버연동값 > localStorage
          storeName: data.store?.name     || naverName     || prev.storeName || '',
          category:  data.store?.category || naverCategory || prev.category  || '',
          address:   data.store?.address  || naverAddress  || prev.address   || '',
          phone:     data.store?.phone    || prev.phone    || '',
        }))
      }
      if (naverName || data.naver_link?.external_id) setNaverAutoFilled(true)

      if (Array.isArray(data.platforms)) {
        setPlatforms(
          (data.platforms as PlatformRow[]).filter((p) => p.connected || p.review_count > 0),
        )
      }
      setServerReady(true)
    } catch (e) {
      console.warn('[profile] stores/me load failed', e)
    }
  }, [])

  useEffect(() => {
    setUser(readCookieUser())
    try {
      const raw = localStorage.getItem('localution_store')
      if (raw) {
        const parsed = JSON.parse(raw)
        setForm({
          storeName: parsed.storeName || '',
          category:  parsed.category  || parsed.branch || '',
          address:   parsed.address   || '',
          phone:     parsed.phone     || '',
        })
      }
    } catch {}
    setLoaded(true)
    loadServer()
  }, [loadServer])

  function applyNaverData() {
    if (!naverLink) return
    const rawName = naverLink.external_name || ''
    // 무효 이름("네이버 플레이스" 등)으로 매장명 덮어쓰기 방지
    const validName = isValidStoreName(rawName) ? rawName : ''
    setForm(f => ({
      ...f,
      storeName: validName  || f.storeName || '',
      category:  naverLink.category || f.category  || '',
      address:   naverLink.address  || f.address   || '',
    }))
    toast.info('네이버 플레이스 정보를 다시 가져왔어요.')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.storeName) return
    setSaving(true)
    try {
      localStorage.setItem('localution_store', JSON.stringify(form))
      window.dispatchEvent(new CustomEvent('localution:user-change'))
    } catch {}
    try {
      if (user?.id) {
        const res = await fetch('/api/stores/register', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.storeName, category: form.category || null,
            address: form.address || null, phone: form.phone || null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.ok) toast.error(data?.error || '서버 저장 실패 (로컬은 저장됨)')
        else toast.success('저장 완료 — 사이드바에 즉시 반영됩니다')
      } else {
        toast.info('로컬 저장됨 (로그인하면 서버에도 자동 동기화돼요)')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      loadServer()
    } catch (err: any) {
      toast.error('저장 중 오류: ' + (err?.message || err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] p-4 pt-20 md:p-6 md:pt-6 min-w-0 pb-24 md:pb-6 max-w-[1400px]">
        <section className="bg-gradient-to-r from-[#6366F1] to-[#4338CA] text-white px-4 py-10 sm:py-14">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <User size={26} className="text-white" strokeWidth={2.5} />
            </div>
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

          {/* 로그인 계정 정보 */}
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
                  <LogOut size={12} strokeWidth={2.5} /> 로그아웃
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
                <a href="/api/auth/logout"
                  onClick={async (e) => {
                    e.preventDefault()
                    const ok = await confirmDialog('로그아웃 하시겠어요?', { title: '로그아웃', okText: '로그아웃', danger: true })
                    if (ok) window.location.href = '/api/auth/logout'
                  }}
                  className="md:hidden mt-3 flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] active:bg-[#FECACA] transition-all text-sm font-bold">
                  <LogOut size={15} strokeWidth={2.5} /> <span>로그아웃</span>
                </a>
              </>
            ) : (
              <div className="text-center py-6 text-sm text-[#8B95A1]">
                로그인 상태가 아닙니다. <Link href="/login" className="text-[#3182F6] font-semibold underline">로그인</Link>
              </div>
            )}
          </div>

          {/* 연결된 플랫폼 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 size={14} strokeWidth={2.5} className="text-[#3182F6]" />
                <h2 className="text-sm font-bold text-[#191F28]">연결된 플랫폼</h2>
              </div>
              <Link href="/my/platforms" className="text-[11px] font-bold text-[#3182F6] hover:underline">관리 →</Link>
            </div>
            {!serverReady ? (
              <p className="text-xs text-[#8B95A1]">서버에서 조회 중...</p>
            ) : platforms.length === 0 ? (
              <p className="text-xs text-[#8B95A1]">
                아직 연결된 플랫폼이 없어요. <Link href="/my/platforms" className="text-[#3182F6] font-semibold underline">연결하러 가기</Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => {
                  const color = PLATFORM_COLOR[p.platform] ?? { bg: '#F2F4F6', fg: '#4E5968' }
                  return (
                    <div key={p.platform} className="px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2"
                      style={{ background: color.bg, color: color.fg }}>
                      <span>{p.label}</span>
                      {p.review_count > 0 && (
                        <span className="text-[10px] opacity-80">
                          리뷰 {p.review_count}{p.rating_avg != null ? ' · ' + p.rating_avg.toFixed(1) + '★' : ''}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 매장 정보 폼 */}
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-[#191F28]">매장 정보</h2>
                {naverAutoFilled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF7ED] text-[#03C75A]">
                    <svg width="10" height="10" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#03C75A"/><path d="M9 39V9h8L31 27V9h8v30h-8L17 21v18H9Z" fill="white"/></svg>
                    네이버 연동
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {naverLink && (
                  <button type="button" onClick={applyNaverData}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#EDF7ED] text-[#03C75A] hover:bg-[#D1F0D9] transition-all">
                    <RefreshCw size={11} strokeWidth={2.5} /> 다시 가져오기
                  </button>
                )}
                {saved && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#12B76A] font-bold">
                    <Check size={12} strokeWidth={3} /> 저장됨
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
                  <Store size={12} strokeWidth={2.5} className="inline mr-1" />
                  매장명 <span className="text-[#F04452]">*</span>
                </label>
                <input type="text" value={form.storeName || ''}
                  onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                  placeholder="예) 강남치과, 라떼커피, 홍대미용실 등" maxLength={24}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm" />
                <p className="text-[10px] text-[#8B95A1] mt-1">사이드바 타이틀로 표시됩니다</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
                  <Tag size={12} strokeWidth={2.5} className="inline mr-1" />
                  카테고리 / 업종
                </label>
                <input type="text" value={form.category || ''}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="예) 카페, 한식, 미용실, 네일샵 등" maxLength={30}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm" />
                <p className="text-[10px] text-[#8B95A1] mt-1">네이버 플레이스 연동 시 자동으로 채워집니다</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">주소</label>
                <input type="text" value={form.address || ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="예) 서울시 강남구 테헤란로 123"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">
                  <Phone size={12} strokeWidth={2.5} className="inline mr-1" />
                  대표 전화
                </label>
                <input type="tel" value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="예) 02-1234-5678"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 text-sm" />
              </div>
            </div>

            <button type="submit" disabled={!loaded || !form.storeName || saving}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3182F6] text-white font-bold text-sm hover:bg-[#1B64DA] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={15} strokeWidth={2.5} />
              {saving ? '저장 중…' : '저장하기'}
            </button>

            <p className="text-[10px] text-[#8B95A1] text-center mt-3">
              저장하면 사이드바에 즉시 반영됩니다. 플랫폼 연결은 <Link href="/my/platforms" className="text-[#3182F6] underline">플랫폼 관리</Link>에서.
            </p>
          </form>
        </div>
        <Footer />
      </main>
    </div>
  )
}
