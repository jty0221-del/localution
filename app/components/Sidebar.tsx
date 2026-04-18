'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  ChevronDown, ChevronRight, List, Map, MapPin, Search, BarChart3,
  Sparkles, MessageCircle, Settings, LogOut, FileText, LucideIcon,
} from 'lucide-react'

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
  { href: '/marketing/place',         label: '플레이스 진단',   Icon: MapPin,    badge: '' },
  { href: '/marketing/keyword-rank',  label: '키워드 순위',     Icon: Search,    badge: '' },
  { href: '/marketing/keyword-score', label: '키워드 점수분석', Icon: BarChart3, badge: '' },
  { href: '/marketing/reels',         label: '릴스·쇼츠 생성',  Icon: Sparkles,  badge: 'NEW' },
  { href: '/marketing/blog-post',     label: '블로그 포스팅',   Icon: FileText,  badge: 'NEW' },
]

const REGIONS: { key: string; label: string; color: string; sub: string[] }[] = [
  { key: 'seoul',    label: '서울', color: '#3182F6', sub: ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'] },
  { key: 'gyeonggi', label: '경기', color: '#10B981', sub: ['수원시','성남시','의정부시','안양시','부천시','광명시','평택시','동두천시','안산시','고양시','과천시','구리시','남양주시','오산시','시흥시','군포시','의왕시','하남시','용인시','파주시','이천시','안성시','김포시','화성시','광주시','양주시','포천시','여주시','연천군','가평군','양평군'] },
  { key: 'incheon',  label: '인천', color: '#0EA5E9', sub: ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'] },
  { key: 'busan',    label: '부산', color: '#0891B2', sub: ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'] },
  { key: 'daegu',    label: '대구', color: '#DC2626', sub: ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'] },
  { key: 'daejeon',  label: '대전', color: '#7C3AED', sub: ['동구','중구','서구','유성구','대덕구'] },
  { key: 'gwangju',  label: '광주', color: '#EC4899', sub: ['동구','서구','남구','북구','광산구'] },
  { key: 'ulsan',    label: '울산', color: '#F97316', sub: ['중구','남구','동구','북구','울주군'] },
  { key: 'sejong',   label: '세종', color: '#64748B', sub: ['세종시'] },
  { key: 'gangwon',  label: '강원', color: '#15803D', sub: ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'] },
  { key: 'chungbuk', label: '충북', color: '#CA8A04', sub: ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'] },
  { key: 'chungnam', label: '충남', color: '#D97706', sub: ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'] },
  { key: 'jeonbuk',  label: '전북', color: '#EAB308', sub: ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'] },
  { key: 'jeonnam',  label: '전남', color: '#059669', sub: ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'] },
  { key: 'gyeongbuk',label: '경북', color: '#B91C1C', sub: ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','군위군','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'] },
  { key: 'gyeongnam',label: '경남', color: '#0284C7', sub: ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'] },
  { key: 'jeju',     label: '제주', color: '#F59E0B', sub: ['제주시','서귀포시'] },
]

const BOTTOM_NAV: { href: string; label: string; Icon: LucideIcon; colors: { bg: string; text: string } }[] = [
  { href: '/inquiry',  label: '1:1 문의', Icon: MessageCircle, colors: { bg: '#FFF7ED', text: '#EA580C' } },
  { href: '/settings', label: '설정',     Icon: Settings,      colors: { bg: '#F2F4F6', text: '#4E5968' } },
]

/** 플랫폼 상태 점 (LED 대체) */
function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 0 2px ${color}22` }}
    />
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
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3182F6]" />}
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
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. 마케팅 관리 */}
      <div>
        <button onClick={() => setMarketingOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isMarketingSection ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isMarketingSection ? { background: '#EA580C', color: '#fff' } : { background: '#FFF7ED', color: '#EA580C' }}>마케</div>
          <span className="text-sm">마케팅 관리</span>
          <ChevronDown size={14} strokeWidth={2.5}
            className={`ml-auto transition-transform duration-200 ${marketingOpen ? 'rotate-180' : ''}`} />
        </button>
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
        return (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}
            style={active ? { background: item.colors.bg, color: item.colors.text } : {}}>
            <div className="w-7 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon size={16} strokeWidth={2}
                style={active ? { color: item.colors.text } : { color: '#8B95A1' }} />
            </div>
            <span className="text-sm">{item.label}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.colors.text }} />}
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
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-[#E5E8EB] z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-[#F2F4F6]">
          <Link href="/" className="block">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-[0_2px_8px_rgba(49,130,246,0.25)] ring-1 ring-[#E8F4FD] bg-white flex items-center justify-center">
                <img src="/favicon.ico" alt="로컬루션" width={28} height={28} style={{ objectFit: 'contain' }} />
              </div>
              <div>
                <p className="font-black text-[#191F28] text-[15px] tracking-tight leading-none">Localution</p>
                <p className="text-[10px] text-[#8B95A1] font-semibold leading-none mt-1 tracking-wide">로컬루션</p>
              </div>
            </div>
          </Link>
        </div>
        <NavItems />
        <div className="px-4 py-4 border-t border-[#F2F4F6] space-y-2">
          <Link href="/settings/profile" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F2F4F6] transition-all group">
            {user?.profile_image ? (
              <img src={user.profile_image} alt="" width={32} height={32}
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

