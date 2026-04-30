'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'

const FLAT_NAV = [
  { href: '/dashboard',        label: '대시보드', icon: 'DB',  colors: { bg: '#EFF6FF', text: '#3182F6' } },
  { href: '/qr-admin',         label: 'QR 관리',  icon: 'QR',  colors: { bg: '#F5F3FF', text: '#8B5CF6' } },
  { href: '/customers',        label: '고객 관리',icon: '고객', colors: { bg: '#ECFDF5', text: '#059669' } },
  { href: '/settings/profile', label: '매장 관리',icon: '매장', colors: { bg: '#FFF1F2', text: '#E11D48' } },
]

const REVIEW_SUB = [
  { href: '/review-admin/naver',   label: '네이버',     platform: 'naver',   color: '#03C75A' },
  { href: '/review-admin/google',  label: '구글',       platform: 'google',  color: '#4285F4' },
  { href: '/review-admin/kakao',   label: '카카오',     platform: 'kakao',   color: '#FEE500' },
  { href: '/review-admin/baemin',  label: '배달의민족', platform: 'baemin',  color: '#2AC1BC' },
  { href: '/review-admin/yogiyo',  label: '요기요',     platform: 'yogiyo',  color: '#E5007F' },
  { href: '/review-admin/coupang', label: '쿠팡이츠',   platform: 'coupang', color: '#FF4B30' },
]

const MARKETING_TOP = { href: '/my/platforms', label: '플랫폼 통합관리', icon: '🔗' }

const MARKETING_GROUPS = [
  {
    platform: '네이버',
    color: '#03C75A',
    items: [
      { href: '/marketing/place',         label: '플레이스 진단' },
      { href: '/marketing/keyword-rank',  label: '플레이스(실시간)' },
      { href: '/marketing/keyword-score', label: '플레이스 분석' },
      { href: '/marketing/blog-post',     label: '블로그 글 작성' },
      { href: '/marketing/blog-tracking', label: '블로그 순위 추적' },
      { href: '/marketing/naver-ads',     label: '키워드 조회/분석' },
      { href: '/marketing/naver-check',  label: '네이버 연동 진단' },
    ],
  },
  {
    platform: '인스타',
    color: '#E1306C',
    items: [
      { href: '/marketing/reels',     label: '릴스·숏폼' },
      { href: '/marketing/card-news', label: '카드뉴스' },
    ],
  },
  {
    platform: '구글',
    color: '#4285F4',
    items: [
      { href: '/marketing/place', label: '구글 마케팅', badge: '준비중' },
    ],
  },
  {
    platform: '카카오',
    color: '#F5A623',
    items: [
      { href: '/marketing/place', label: '카카오 마케팅', badge: '준비중' },
    ],
  },
]

const REGIONS = [
  { key: 'seoul',    label: '서울', icon: '🏙️', sub: ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'] },
  { key: 'gyeonggi', label: '경기', icon: '🌿', sub: ['수원시','성남시','의정부시','안양시','부천시','광명시','평택시','동두천시','안산시','고양시','과천시','구리시','남양주시','오산시','시흥시','군포시','의왕시','하남시','용인시','파주시','이천시','안성시','김포시','화성시','광주시','양주시','포천시','여주시','연천군','가평군','양평군'] },
  { key: 'incheon',  label: '인천', icon: '✈️', sub: ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'] },
  { key: 'busan',    label: '부산', icon: '🌊', sub: ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'] },
  { key: 'daegu',    label: '대구', icon: '🍎', sub: ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'] },
  { key: 'daejeon',  label: '대전', icon: '🔬', sub: ['동구','중구','서구','유성구','대덕구'] },
  { key: 'gwangju',  label: '광주', icon: '🌸', sub: ['동구','서구','남구','북구','광산구'] },
  { key: 'ulsan',    label: '울산', icon: '🏭', sub: ['중구','남구','동구','북구','울주군'] },
  { key: 'sejong',   label: '세종', icon: '🏛️', sub: ['세종시'] },
  { key: 'gangwon',  label: '강원', icon: '⛰️', sub: ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'] },
  { key: 'chungbuk', label: '충북', icon: '🌾', sub: ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'] },
  { key: 'chungnam', label: '충남', icon: '🦀', sub: ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'] },
  { key: 'jeonbuk',  label: '전북', icon: '🌻', sub: ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'] },
  { key: 'jeonnam',  label: '전남', icon: '🐚', sub: ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'] },
  { key: 'gyeongbuk',label: '경북', icon: '🏯', sub: ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','군위군','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'] },
  { key: 'gyeongnam',label: '경남', icon: '🏖️', sub: ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'] },
  { key: 'jeju',     label: '제주', icon: '🍊', sub: ['제주시','서귀포시'] },
]

// 플랫폼 SVG 로고 (18×18, 대시보드와 동일한 path 재사용)
function PlatformLogoSmall({ platform }: { platform: string }) {
  if (platform === 'naver') return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" style={{flexShrink:0}}>
      <rect width="48" height="48" rx="10" fill="#03C75A"/>
      <path d="M9 39V9h8L31 27V9h8v30h-8L17 21v18H9Z" fill="white"/>
    </svg>
  )
  if (platform === 'google') return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
      <rect width="48" height="48" rx="10" fill="white" stroke="#E5E8EB" strokeWidth="1.5"/>
      <path d="M43.6 24.5c0-1.5-.14-3-.38-4.5H24v8.5h10.94c-.5 2.5-1.96 4.6-4.16 6v5h6.74c3.94-3.62 6.08-9 6.08-15z" fill="#4285F4"/>
      <path d="M24 44c5.4 0 9.92-1.8 13.24-4.86l-6.46-5c-1.8 1.2-4.1 1.92-6.78 1.92-5.22 0-9.64-3.52-11.22-8.26H6.12v5.14C9.42 40.02 16.28 44 24 44z" fill="#34A853"/>
      <path d="M12.78 27.8A11.94 11.94 0 0112.2 24c0-1.32.22-2.6.58-3.8v-5.14H6.12A20 20 0 004 24c0 3.22.78 6.28 2.12 9.14l6.66-5.34z" fill="#FBBC05"/>
      <path d="M24 12.08c2.94 0 5.58 1.02 7.66 3l5.74-5.74C33.9 6.06 29.38 4 24 4 16.28 4 9.42 7.98 6.12 14.86l6.66 5.14C14.36 15.6 18.78 12.08 24 12.08z" fill="#EA4335"/>
    </svg>
  )
  if (platform === 'kakao') return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" style={{flexShrink:0}}>
      <rect width="48" height="48" rx="12" fill="#FEE500"/>
      <path d="M24 11c-7 0-12.5 4.4-12.5 10 0 3.7 2.5 7 6.3 8.9l-1.5 5.3c-.1.3.3.5.5.3l6.2-4.3c.3 0 .7.1 1 .1 7 0 12.5-4.4 12.5-10S31 11 24 11Z" fill="#191919"/>
    </svg>
  )
  if (platform === 'baemin') return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style={{flexShrink:0}}>
      <rect width="32" height="32" rx="7" fill="#2DDDC8"/>
      <text x="16" y="22" textAnchor="middle" fontSize="13" fontWeight="900"
        fill="white" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        letterSpacing="-0.3">배민</text>
    </svg>
  )
  if (platform === 'yogiyo') return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" style={{flexShrink:0}}>
      <rect width="48" height="48" rx="12" fill="#E5007F"/>
      <text x="24" y="32" textAnchor="middle" fontSize="16" fontWeight="900"
        fill="white" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        letterSpacing="-0.8">요기요</text>
    </svg>
  )
  if (platform === 'coupang') return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" style={{flexShrink:0}}>
      <rect width="48" height="48" rx="10" fill="white" stroke="#E5E7EB" strokeWidth="2"/>
      <text x="24" y="19" textAnchor="middle" fontSize="9" fontWeight="800"
        fontFamily="Arial,sans-serif" letterSpacing="0.3">
        <tspan fill="#E31837">c</tspan><tspan fill="#F4A900">o</tspan><tspan fill="#E31837">u</tspan>
        <tspan fill="#5BAD48">p</tspan><tspan fill="#3B79BE">a</tspan><tspan fill="#E31837">n</tspan>
        <tspan fill="#F4A900">g</tspan>
      </text>
      <text x="24" y="35" textAnchor="middle" fontSize="14" fontWeight="900"
        fill="#5C3317" fontFamily="Arial,sans-serif">eats</text>
    </svg>
  )
  return null
}

interface StoreInfo {
  storeName: string
  branch: string
  address: string
}

interface UserInfo {
  name: string
  email: string
  provider: string
}

export default function Sidebar() {
  const pathname       = usePathname()
  const searchParams   = useSearchParams()
  const router         = useRouter()
  const currentRegion  = searchParams?.get('r') || ''
  const currentDistrict = searchParams?.get('d') || ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const isReviewSection    = pathname.startsWith('/review-admin')
  const isMarketingSection = pathname.startsWith('/marketing')
  const isCommunitySection = pathname === '/community'

  const [reviewOpen,    setReviewOpen]    = useState(isReviewSection)
  const [marketingOpen, setMarketingOpen] = useState(isMarketingSection)
  const [communityOpen, setCommunityOpen] = useState(isCommunitySection)
  const [openRegion, setOpenRegion] = useState<string>(currentRegion)

  function applyStoreData(serverName: string, serverAddr: string, serverBranch: string) {
    setStoreInfo(prev => ({
      storeName: serverName || (prev ? prev.storeName : ''),
      branch:    serverBranch || (prev ? prev.branch : ''),
      address:   serverAddr || (prev ? prev.address : ''),
    }))
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem('localution_store')
      if (raw) {
        const p = JSON.parse(raw)
        setStoreInfo({ storeName: p.storeName || '', branch: p.branch || '', address: p.address || '' })
      }
    } catch (_) {}

    fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data || !data.ok) return
        const naverName = (data.naver_link && data.naver_link.external_name) ? data.naver_link.external_name : ''
        const naverAddr = (data.naver_link && data.naver_link.address) ? data.naver_link.address : ''
        const sName = (data.store && data.store.name) ? data.store.name : naverName
        const sAddr = (data.store && data.store.address) ? data.store.address : naverAddr
        if (sName) {
          applyStoreData(sName, sAddr, '')
          try {
            const curr = JSON.parse(localStorage.getItem('localution_store') || '{}')
            if (!curr.storeName) {
              curr.storeName = sName
              if (!curr.address && sAddr) curr.address = sAddr
              localStorage.setItem('localution_store', JSON.stringify(curr))
            }
          } catch (_) {}
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(data => {
      if (data && data.user && data.user.name) setUser(data.user)
    }).catch(() => {})

    loadStore()

    function onUserChange() { loadStore() }
    window.addEventListener('localution:user-change', onUserChange)
    return () => window.removeEventListener('localution:user-change', onUserChange)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch (_) {}
    document.cookie = 'localution_session=; max-age=0; path=/'
    document.cookie = 'localution_user=; max-age=0; path=/'
    router.push('/login')
    router.refresh()
  }

  const toggleRegion = (key: string) => setOpenRegion(prev => prev === key ? '' : key)

  const storeName   = (storeInfo && storeInfo.storeName) ? storeInfo.storeName : ''
  const storeBranch = (storeInfo && storeInfo.branch)    ? storeInfo.branch    : ''
  const storeAddr   = (storeInfo && storeInfo.address)   ? storeInfo.address   : ''
  const userEmail   = (user && user.email)  ? user.email  : ''
  const userName    = (user && user.name)   ? user.name   : ''

  const avatarChar  = storeName ? storeName.charAt(0) : (userName ? userName.charAt(0) : '?')
  const displayName = storeName || userName || '매장 설정 필요'
  const displaySub  = storeBranch
    ? storeBranch
    : (storeAddr ? storeAddr.slice(0, 18) : (userEmail || ''))

  const renderFlatNav = (item: typeof FLAT_NAV[0]) => {
    const active = pathname === item.href
    return (
      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
        className={"flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all " + (active ? 'bg-[#EFF6FF] text-[#3182F6] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium')}>
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
      {renderFlatNav(FLAT_NAV[0])}

      {/* 1-1. 플랫폼 통합관리 — STEP 1 강조 */}
      <Link href="/my/platforms" onClick={() => setMobileOpen(false)}
        className={"relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border " + (pathname === '/my/platforms' ? 'bg-[#EFF6FF] text-[#3182F6] font-semibold border-[#3182F6]/30' : 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold border-[#BFDBFE] hover:bg-[#DBEAFE]')}>
        <div className="relative w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: '#3182F6', color: '#fff' }}>
          🔗
          {pathname !== '/my/platforms' && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-white animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-none">플랫폼 연결</p>
          <p className="text-[10px] text-[#3182F6] font-normal leading-none mt-0.5">리뷰·마케팅 시작 전 필수</p>
        </div>
        {pathname !== '/my/platforms' && (
          <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#3182F6] text-white">STEP 1</span>
        )}
        {pathname === '/my/platforms' && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
        )}
      </Link>

      {/* 2. 리뷰 관리 */}
      <div>
        <button onClick={() => setReviewOpen(v => !v)}
          className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left " + (isReviewSection ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium')}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isReviewSection ? { background: '#F59E0B', color: '#fff' } : { background: '#FFFBEB', color: '#F59E0B' }}>리뷰</div>
          <span className="text-sm">리뷰 관리</span>
          <span className={"ml-auto text-xs transition-transform duration-200 " + (reviewOpen ? 'rotate-180' : '')}>▾</span>
        </button>
        {reviewOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FDE68A] space-y-0.5">
            <Link href="/review-admin" onClick={() => setMobileOpen(false)}
              className={"flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium " + (pathname === '/review-admin' ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA]')}>
              <span>📋</span><span>전체 리뷰</span>
            </Link>
            {REVIEW_SUB.map(sub => {
              const active = pathname === sub.href || pathname.startsWith(sub.href + '/')
              return (
                <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)}
                  className={"flex items-center gap-2.5 px-3 py-1.5 rounded-xl " + (active ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium')}>
                  <PlatformLogoSmall platform={sub.platform} />
                  <span className="text-xs">{sub.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 마케팅 관리 */}
      <div>
        <button onClick={() => setMarketingOpen(v => !v)}
          className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left " + (isMarketingSection ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium')}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isMarketingSection ? { background: '#EA580C', color: '#fff' } : { background: '#FFF7ED', color: '#EA580C' }}>마케</div>
          <span className="text-sm">마케팅 관리</span>
          <span className={"ml-auto text-xs transition-transform duration-200 " + (marketingOpen ? 'rotate-180' : '')}>▾</span>
        </button>
        {marketingOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FFE4CC] space-y-1">
            {/* 플랫폼 그룹 */}
            {MARKETING_GROUPS.map(group => (
              <div key={group.platform}>
                <div className="flex items-center gap-2 px-3 py-1 mt-1">
                  <span className="text-[10px] font-black tracking-wide" style={{ color: group.color }}>{group.platform}</span>
                  <div className="flex-1 h-px" style={{ background: group.color + '33' }} />
                </div>
                <div className="space-y-0.5">
                  {group.items.map((sub, si) => {
                    const active = pathname === sub.href && !('badge' in sub && sub.badge === '준비중')
                    const isReady = !('badge' in sub && sub.badge === '준비중')
                    return (
                      <Link key={sub.href + si} href={isReady ? sub.href : '#'} onClick={() => isReady && setMobileOpen(false)}
                        className={"flex items-center gap-2.5 px-3 py-1.5 rounded-xl " + (active ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : isReady ? 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium' : 'text-[#B0B8C1] cursor-default font-medium')}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? '#EA580C' : isReady ? '#D1D5DB' : '#E5E8EB' }} />
                        <span className="text-xs flex-1">{sub.label}</span>
                        {'badge' in sub && sub.badge && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1] font-bold flex-shrink-0">{sub.badge}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. QR 관리 */}
      {renderFlatNav(FLAT_NAV[1])}

      {/* 5. 고객 관리 */}
      {renderFlatNav(FLAT_NAV[2])}

      {/* 6. 매장 관리 */}
      {renderFlatNav(FLAT_NAV[3])}

      {/* 7. 커뮤니티 */}
      <div>
        <button onClick={() => setCommunityOpen(v => !v)}
          className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left " + (isCommunitySection ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium')}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isCommunitySection ? { background: '#EC4899', color: '#fff' } : { background: '#FDF2F8', color: '#EC4899' }}>커뮤</div>
          <span className="text-sm">커뮤니티</span>
          <span className={"ml-auto text-xs transition-transform duration-200 " + (communityOpen ? 'rotate-180' : '')}>▾</span>
        </button>
        {communityOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FBCFE8] space-y-0.5">
            <Link href="/community" onClick={() => { setMobileOpen(false); setOpenRegion('') }}
              className={"flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium " + (pathname === '/community' && !currentRegion ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA]')}>
              <span>🗺️</span><span>전국</span>
            </Link>
            {REGIONS.map(region => {
              const isRegionActive = currentRegion === region.label
              const isRegionOpen   = openRegion === region.key
              return (
                <div key={region.key}>
                  <button onClick={() => toggleRegion(region.key)}
                    className={"w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-left " + (isRegionActive ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium')}>
                    <span className="text-sm w-5 text-center flex-shrink-0">{region.icon}</span>
                    <Link href={"/community?r=" + encodeURIComponent(region.label)}
                      onClick={e => { e.stopPropagation(); setMobileOpen(false) }}
                      className="text-xs flex-1 text-left">{region.label}</Link>
                    <span className={"text-[10px] transition-transform duration-150 flex-shrink-0 " + (isRegionOpen ? 'rotate-180' : '')}>▾</span>
                  </button>
                  {isRegionOpen && (
                    <div className="mt-0.5 ml-2 pl-3 border-l border-[#FBCFE8] space-y-0.5 max-h-48 overflow-y-auto">
                      {region.sub.map(district => {
                        const active = currentRegion === region.label && currentDistrict === district
                        return (
                          <Link key={district}
                            href={"/community?r=" + encodeURIComponent(region.label) + "&d=" + encodeURIComponent(district)}
                            onClick={() => setMobileOpen(false)}
                            className={"flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] " + (active ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#8B95A1] hover:bg-[#F8F9FA] hover:text-[#4E5968]')}>
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
    </nav>
  )

  return (
    <>
      {/* 모바일 상단 바 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E5E8EB] z-30 flex items-center justify-between px-4">
        <div>
          <span className="font-black text-[#191F28] text-lg tracking-tight">Localution</span>
          <span className="text-[11px] text-[#8B95A1] ml-1.5 font-medium">(로컬루션)</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 flex flex-col justify-center items-center gap-1.5">
          <span className={"block w-5 h-0.5 bg-[#191F28] rounded transition-all " + (mobileOpen ? 'rotate-45 translate-y-2' : '')} />
          <span className={"block h-0.5 bg-[#191F28] rounded transition-all " + (mobileOpen ? 'opacity-0 w-0' : 'w-5')} />
          <span className={"block w-5 h-0.5 bg-[#191F28] rounded transition-all " + (mobileOpen ? '-rotate-45 -translate-y-2' : '')} />
        </button>
      </div>

      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setMobileOpen(false)} />}

      <aside className={"fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-[#E5E8EB] z-40 flex flex-col transition-transform duration-300 " + (mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-[#F2F4F6]">
          <Link href="/" className="block">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#3182F6] flex items-center justify-center">
                <span className="text-white font-black text-sm">L</span>
              </div>
              <div>
                <p className="font-black text-[#191F28] text-sm tracking-tight leading-none">Localution</p>
                <p className="text-[10px] text-[#8B95A1] font-medium leading-none mt-0.5">로컬루션</p>
              </div>
            </div>
          </Link>
        </div>

        <NavItems />

        {/* 하단 매장 프로필 영역 */}
        <div className="px-4 py-4 border-t border-[#F2F4F6] relative" ref={profileRef}>

          {profileOpen && (
            <div className="absolute bottom-[72px] left-4 right-4 bg-white rounded-xl shadow-lg border border-[#E5E8EB] overflow-hidden z-50">
              <Link href="/settings/profile"
                onClick={() => { setProfileOpen(false); setMobileOpen(false) }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                <span className="text-base">🏪</span>
                <span className="font-medium">매장 설정</span>
              </Link>
              <div className="h-px bg-[#F2F4F6]" />
              <Link href="/settings"
                onClick={() => { setProfileOpen(false); setMobileOpen(false) }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                <span className="text-base">⚙️</span>
                <span className="font-medium">설정</span>
              </Link>
              <div className="h-px bg-[#F2F4F6]" />
              <Link href="/inquiry"
                onClick={() => { setProfileOpen(false); setMobileOpen(false) }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                <span className="text-base">💬</span>
                <span className="font-medium">1:1 문의</span>
              </Link>
              <div className="h-px bg-[#F2F4F6]" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#E11D48] hover:bg-[#FFF1F2] transition-colors">
                <span className="text-base">🚪</span>
                <span className="font-medium">로그아웃</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setProfileOpen(v => !v)}
            className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all " + (profileOpen ? 'bg-[#EFF6FF]' : 'bg-[#F8F9FA] hover:bg-[#F2F4F6]')}>
            <div className="w-8 h-8 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {avatarChar}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-[#191F28] truncate">{displayName}</p>
              <p className="text-[10px] text-[#8B95A1] truncate">{displaySub}</p>
            </div>
            <span className={"text-[10px] text-[#8B95A1] flex-shrink-0 transition-transform " + (profileOpen ? 'rotate-180' : '')}>▴</span>
          </button>
        </div>
      </aside>
    </>
  )
}
