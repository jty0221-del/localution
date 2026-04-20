'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  ChevronDown, ChevronRight, List, Map, MapPin, Search, BarChart3,
  Sparkles, MessageCircle, Settings, LogOut, FileText, Lock, LucideIcon,
  Plus, ArrowRight, Package, Bell, TrendingUp,
} from 'lucide-react'
import { REGIONS } from '../lib/regions'
import { useEntitlements } from '../lib/entitlements'
import { getRequiredModuleForPath, getModule } from '../lib/modules'

// ─────────────────────────────────────────────────────────────
// 로그인 사용자 프로필 읽기 (cookie: localution_user, httpOnly:false)
// ─────────────────────────────────────────────────────────────
type UserProfile = {
  id?: string
  name?: string
  email?: string
  provider?: string
  profile_image?: string
}
type StoreInfo = { storeName?: string; branch?: string }

function readCookieUser(): UserProfile | null {
  if (typeof document === 'undefined') return null
  try {
    const m = document.cookie.match(/(?:^|;\s*)localution_user=([^;]+)/)
    if (!m) return null
    const raw = decodeURIComponent(m[1])
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch { return null }
}
function readStoreInfo(): StoreInfo {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('localution_store')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch { return {} }
}
const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오 로그인', naver: '네이버 로그인', google: '구글 로그인',
}

// 최상단(대시보드) — 고정
const TOP_FLAT = [
  { href: '/dashboard', label: '대시보드', icon: 'DB', colors: { bg: '#EFF6FF', text: '#3182F6' } },
]
// 리뷰/마케팅 섹션 이후에 오는 플랫 항목
const MID_FLAT = [
  { href: '/qr-admin',  label: 'QR 관리',   icon: 'QR',  colors: { bg: '#F5F3FF', text: '#8B5CF6' } },
  { href: '/customers', label: '고객 관리', icon: '고객', colors: { bg: '#ECFDF5', text: '#059669' } },
]

const REVIEW_SUB = [
  { href: '/review-admin/naver',   label: '네이버',     color: '#03C75A' },
  { href: '/review-admin/google',  label: '구글',       color: '#4285F4' },
  { href: '/review-admin/baemin',  label: '배달의민족', color: '#2AC1BC' },
  { href: '/review-admin/yogiyo',  label: '요기요',     color: '#FA0050' },
  { href: '/review-admin/coupang', label: '쿠팡이츠',   color: '#FF4B30' },
]

const MARKETING_SUB: { href: string; label: string; Icon: LucideIcon; badge: string }[] = [
  { href: '/marketing/place',         label: '플레이스 진단',   Icon: MapPin,     badge: '' },
  { href: '/marketing/keyword-rank',  label: '키워드 순위',     Icon: Search,     badge: '' },
  { href: '/marketing/keyword-score', label: '키워드 점수분석', Icon: BarChart3,  badge: '' },
  { href: '/marketing/blog-tracking', label: '블로그 순위 추적', Icon: TrendingUp, badge: 'NEW' },
  { href: '/marketing/reels',         label: '릴스·쇼츠 생성',  Icon: Sparkles,   badge: 'NEW' },
  { href: '/marketing/blog-post',     label: '블로그 포스팅',   Icon: FileText,   badge: 'NEW' },
]

// REGIONS 는 app/lib/regions.ts 에서 중앙 관리

const BOTTOM_NAV: { href: string; label: string; Icon: LucideIcon; colors: { bg: string; text: string } }[] = [
  { href: '/updates',  label: '업데이트 내역', Icon: Bell,          colors: { bg: '#EFF6FF', text: '#3182F6' } },
  { href: '/inquiry',  label: '1:1 문의',       Icon: MessageCircle, colors: { bg: '#FFF7ED', text: '#EA580C' } },
  { href: '/settings', label: '설정',           Icon: Settings,      colors: { bg: '#F2F4F6', text: '#4E5968' } },
]

// 19차-2 · 업데이트 내역 미확인 배지용 localStorage 키 (UpdatesPopupBanner와 동일)
const LS_UPDATES_LAST_SEEN = 'localution.updates.lastSeenId'

/** 플랫폼 상태 점 (LED 대체) */
function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 0 2px ${color}22` }}
    />
  )
}

/** 잠금 아이콘 + 월 구독료 툴팁 (사이드바 전용) */
function LockBadge({ href, active }: { href: string; active: boolean }) {
  const { has, loading } = useEntitlements()
  if (loading) return null
  const moduleId = getRequiredModuleForPath(href)
  if (!moduleId) return null
  if (has(moduleId)) return null
  const mod = getModule(moduleId)
  if (!mod) return null
  return (
    <span
      className="ml-auto flex items-center gap-1 flex-shrink-0"
      title={`${mod.name} · 월 ${mod.price.toLocaleString('ko-KR')}원 구독 필요`}
    >
      <Lock size={11} strokeWidth={2.5} className={active ? 'text-current' : 'text-[#9CA3AF]'} />
    </span>
  )
}

export default function Sidebar() {
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const currentRegion  = searchParams?.get('r') || ''
  const currentDistrict = searchParams?.get('d') || ''
  const [mobileOpen, setMobileOpen] = useState(false)

  const isReviewSection    = pathname.startsWith('/review-admin')
  const isMarketingSection = pathname.startsWith('/marketing')
  const isCommunitySection = pathname === '/community'

  const [reviewOpen,    setReviewOpen]    = useState(isReviewSection)
  const [marketingOpen, setMarketingOpen] = useState(isMarketingSection)
  const [communityOpen, setCommunityOpen] = useState(isCommunitySection)
  const [openRegion, setOpenRegion] = useState<string>(currentRegion)

  // 로그인 사용자 프로필 + 매장 정보
  const [user, setUser] = useState<UserProfile | null>(null)
  const [store, setStore] = useState<StoreInfo>({})

  // 19차-2 · 업데이트 내역 미확인 배지
  const [hasUnseenUpdate, setHasUnseenUpdate] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/updates', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json() as { updates?: { id: string }[] }
        const latestId = Array.isArray(data?.updates) && data.updates.length > 0 ? data.updates[0].id : null
        if (cancelled || !latestId) return
        const seen = typeof window !== 'undefined' ? localStorage.getItem(LS_UPDATES_LAST_SEEN) : null
        setHasUnseenUpdate(seen !== latestId)
      } catch {}
    })()
    // /updates 페이지 들어가면 즉시 last_seen 갱신 + 배지 끄기
    if (pathname === '/updates') {
      ;(async () => {
        try {
          const res = await fetch('/api/updates', { cache: 'no-store' })
          if (!res.ok) return
          const data = await res.json() as { updates?: { id: string }[] }
          const latestId = Array.isArray(data?.updates) && data.updates.length > 0 ? data.updates[0].id : null
          if (latestId) {
            try { localStorage.setItem(LS_UPDATES_LAST_SEEN, latestId) } catch {}
            if (!cancelled) setHasUnseenUpdate(false)
          }
        } catch {}
      })()
    }
    return () => { cancelled = true }
  }, [pathname])
  useEffect(() => {
    setUser(readCookieUser())
    setStore(readStoreInfo())
    // 로컬 스토리지 변경 감지 (설정 페이지에서 매장명 수정 시 즉시 반영)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'localution_store') setStore(readStoreInfo())
    }
    const onCustom = () => { setUser(readCookieUser()); setStore(readStoreInfo()) }
    window.addEventListener('storage', onStorage)
    window.addEventListener('localution:user-change', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('localution:user-change', onCustom)
    }
  }, [])

  const displayName   = store.storeName || user?.name || '로그인 필요'
  const displaySubtext = store.branch
    || (user ? (PROVIDER_LABEL[user.provider || ''] || user.email || '로그인 완료') : '로그인하여 시작하세요')
  const avatarInitial = (store.storeName || user?.name || '?').trim()[0]?.toUpperCase() || '?'

  const toggleRegion = (key: string) => setOpenRegion(prev => prev === key ? '' : key)

  const renderFlatItem = (item: typeof TOP_FLAT[number]) => {
    const active = pathname === item.href
    return (
      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-[#EFF6FF] text-[#3182F6] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={active ? { background: '#3182F6', color: '#fff' } : { background: item.colors.bg, color: item.colors.text }}>
          {item.icon}
        </div>
        <span className="text-sm">{item.label}</span>
        <LockBadge href={item.href} active={active} />
        {active && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-[#3182F6]" />}
      </Link>
    )
  }

  const NavItems = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

      {/* 1. 대시보드 */}
      {TOP_FLAT.map(renderFlatItem)}

      {/* 2. 리뷰 관리 */}
      <div>
        <button onClick={() => setReviewOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isReviewSection ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isReviewSection ? { background: '#F59E0B', color: '#fff' } : { background: '#FFFBEB', color: '#F59E0B' }}>리뷰</div>
          <span className="text-sm">리뷰 관리</span>
          <ChevronDown size={14} strokeWidth={2.5}
            className={`ml-auto transition-transform duration-200 ${reviewOpen ? 'rotate-180' : ''}`} />
        </button>
        {reviewOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FDE68A] space-y-0.5">
            <Link href="/review-admin" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${pathname === '/review-admin' ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA]'}`}>
              <List size={13} strokeWidth={2.25} /><span>전체 리뷰</span>
            </Link>
            {REVIEW_SUB.map(sub => {
              const active = pathname === sub.href || pathname.startsWith(sub.href + '/')
              return (
                <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl ${active ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                  <StatusDot color={sub.color} />
                  <span className="text-xs">{sub.label}</span>
                  <LockBadge href={sub.href} active={active} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. 마케팅 관리 — 좌측(허브 링크) + 우측(쉐브론 토글) 분할 */}
      <div>
        <div className={`w-full flex items-center rounded-xl transition-all overflow-hidden ${isMarketingSection && pathname === '/marketing' ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : isMarketingSection ? 'bg-[#FFF7ED]/60 text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <Link href="/marketing"
            onClick={() => { setMobileOpen(false); setMarketingOpen(true) }}
            className="flex-1 flex items-center gap-3 px-3 py-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={isMarketingSection ? { background: '#EA580C', color: '#fff' } : { background: '#FFF7ED', color: '#EA580C' }}>마케</div>
            <span className="text-sm">마케팅 관리</span>
          </Link>
          <button onClick={() => setMarketingOpen(v => !v)}
            aria-label={marketingOpen ? '마케팅 하위 메뉴 닫기' : '마케팅 하위 메뉴 열기'}
            className="px-3 py-2.5 hover:bg-black/5 transition-colors flex-shrink-0">
            <ChevronDown size={14} strokeWidth={2.5}
              className={`transition-transform duration-200 ${marketingOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {marketingOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FFE4CC] space-y-0.5">
            {MARKETING_SUB.map(sub => {
              const active = pathname === sub.href
              const Icon = sub.Icon
              return (
                <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${active ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                  <Icon size={14} strokeWidth={2.25}
                    className={active ? 'text-[#EA580C]' : 'text-[#8B95A1]'} />
                  <span className="text-xs">{sub.label}</span>
                  {sub.badge && (
                    <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white tracking-wide">{sub.badge}</span>
                  )}
                  <LockBadge href={sub.href} active={active} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. QR 관리 / 5. 고객 관리 */}
      {MID_FLAT.map(renderFlatItem)}

      {/* 6. 커뮤니티 (지역 3단계) */}
      <div>
        <button onClick={() => setCommunityOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isCommunitySection ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isCommunitySection ? { background: '#EC4899', color: '#fff' } : { background: '#FDF2F8', color: '#EC4899' }}>커뮤</div>
          <span className="text-sm">커뮤니티</span>
          <ChevronDown size={14} strokeWidth={2.5}
            className={`ml-auto transition-transform duration-200 ${communityOpen ? 'rotate-180' : ''}`} />
        </button>
        {communityOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FBCFE8] space-y-0.5">
            <Link href="/community" onClick={() => { setMobileOpen(false); setOpenRegion('') }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${pathname === '/community' && !currentRegion ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA]'}`}>
              <Map size={13} strokeWidth={2.25} /><span>전국</span>
            </Link>
            {REGIONS.map(region => {
              const isRegionActive = currentRegion === region.label
              const isRegionOpen   = openRegion === region.key
              return (
                <div key={region.key}>
                  <button onClick={() => toggleRegion(region.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-left ${isRegionActive ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                    <MapPin size={12} strokeWidth={2.25} style={{ color: region.color }} className="flex-shrink-0" />
                    <Link href={`/community?r=${encodeURIComponent(region.label)}`}
                      onClick={e => { e.stopPropagation(); setMobileOpen(false) }}
                      className="text-xs flex-1 text-left">{region.label}</Link>
                    <ChevronRight size={12} strokeWidth={2.5}
                      className={`transition-transform duration-150 flex-shrink-0 ${isRegionOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isRegionOpen && (
                    <div className="mt-0.5 ml-2 pl-3 border-l border-[#FBCFE8] space-y-0.5 max-h-48 overflow-y-auto">
                      {region.sub.map(district => {
                        const active = currentRegion === region.label && currentDistrict === district
                        return (
                          <Link key={district}
                            href={`/community?r=${encodeURIComponent(region.label)}&d=${encodeURIComponent(district)}`}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${active ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#8B95A1] hover:bg-[#F8F9FA] hover:text-[#4E5968]'}`}>
                            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: active ? '#EC4899' : '#D1D5DB' }} />
                            {district}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-[#F2F4F6] my-2" />

      {BOTTOM_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.Icon
        const showUnseenDot = item.href === '/updates' && hasUnseenUpdate && !active
        return (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative ${active ? 'font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}
            style={active ? { background: item.colors.bg, color: item.colors.text } : {}}>
            <div className="w-7 rounded-lg flex items-center justify-center flex-shrink-0 relative">
              <Icon size={16} strokeWidth={2}
                style={active ? { color: item.colors.text } : { color: '#8B95A1' }} />
              {showUnseenDot && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white"
                  style={{ background: '#EF4444' }}
                  aria-label="새로운 업데이트 있음"
                />
              )}
            </div>
            <span className="text-sm">{item.label}</span>
            {showUnseenDot && (
              <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#EF4444] text-white tracking-wide">N</span>
            )}
            {active && !showUnseenDot && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.colors.text }} />}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E8EB] z-30 flex items-center justify-between px-4">
        <div>
          <span className="font-black text-[#191F28] text-lg tracking-tight">Localution</span>
          <span className="text-[11px] text-[#8B95A1] ml-1.5 font-medium">(로컬루션)</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 flex flex-col justify-center items-center gap-1.5">
          <span className={`block w-5 h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? 'opacity-0 w-0' : 'w-5'}`} />
          <span className={`block w-5 h-0.5 bg-[#191F28] rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <aside className={`fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-[#E5E8EB] z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-[#F2F4F6]">
          <Link href="/" className="block">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-[0_2px_8px_rgba(49,130,246,0.25)] ring-1 ring-[#E8F4FD] bg-white flex items-center justify-center">
                <Image src="/favicon.ico" alt="로컬루션" width={28} height={28} style={{ objectFit: 'contain' }} priority />
              </div>
              <div>
                <p className="font-black text-[#191F28] text-[15px] tracking-tight leading-none">Localution</p>
                <p className="text-[10px] text-[#8B95A1] font-semibold leading-none mt-1 tracking-wide">로컬루션</p>
              </div>
            </div>
          </Link>
        </div>
        <NavItems />

        {/* 구독 추가 CTA — 수익 유도 동선 (12차 추가) */}
        <div className="px-4 pt-3 pb-0 border-t border-[#F2F4F6] space-y-1.5">
          <Link href="/pricing" onClick={() => setMobileOpen(false)}
            className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#3182F6] to-[#1B64DA] text-white hover:shadow-md hover:brightness-110 transition-all text-sm font-bold">
            <Plus size={14} strokeWidth={2.75} className="flex-shrink-0" />
            <span>모듈 추가</span>
            <ArrowRight size={13} strokeWidth={2.5} className="ml-auto opacity-80 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="/my/subscription" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#4E5968] hover:bg-[#F2F4F6] transition-all text-xs font-semibold">
            <Package size={12} strokeWidth={2.5} className="text-[#8B95A1] flex-shrink-0" />
            <span>내 구독 관리</span>
          </Link>
        </div>

        <div className="px-4 py-4 border-t border-[#F2F4F6] space-y-2">
          <Link href="/settings/profile" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F2F4F6] transition-all group">
            {user?.profile_image ? (
              <Image src={user.profile_image} alt="" width={32} height={32}
                unoptimized
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-white" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {avatarInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#191F28] truncate">{displayName}</p>
              <p className="text-[10px] text-[#8B95A1] truncate">{displaySubtext}</p>
            </div>
            <Settings size={14} strokeWidth={2} className="text-[#8B95A1] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </Link>
          {user ? (
            <a href="/api/auth/logout"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] transition-all text-sm font-semibold">
              <LogOut size={15} strokeWidth={2.25} />
              <span>로그아웃</span>
            </a>
          ) : (
            <Link href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#3182F6] text-white hover:bg-[#1B64DA] transition-all text-sm font-semibold">
              <span>로그인</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}

