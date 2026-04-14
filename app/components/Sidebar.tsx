'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const FLAT_NAV = [
  { href: '/',          label: '대시보드',  icon: 'DB',  colors: { bg: '#EFF6FF', text: '#3182F6' } },
  { href: '/qr-admin',  label: 'QR 관리',   icon: 'QR',  colors: { bg: '#F5F3FF', text: '#8B5CF6' } },
  { href: '/customers', label: '고객 관리', icon: '고객', colors: { bg: '#ECFDF5', text: '#059669' } },
  { href: '/store',     label: '매장 관리', icon: '매장', colors: { bg: '#FFF1F2', text: '#E11D48' } },
]

const REVIEW_SUB = [
  { href: '/review-admin/naver',  label: '네이버',     icon: '🟢', color: '#03C75A' },
  { href: '/review-admin/google', label: '구글',       icon: '🔵', color: '#4285F4' },
  { href: '/review-admin/kakao',  label: '카카오',     icon: '🟡', color: '#F59E0B' },
  { href: '/review-admin/baemin', label: '배달의민족', icon: '🩵', color: '#2AC1BC' },
  { href: '/review-admin/yogiyo', label: '요기요',     icon: '🔴', color: '#FA0050' },
  { href: '/review-admin/coupang',label: '쿠팡이츠',   icon: '🟠', color: '#FF4B30' },
]

const MARKETING_SUB = [
  { href: '/marketing/place',         label: '플레이스 진단',   icon: '📍' },
  { href: '/marketing/keyword-rank',  label: '키워드 순위',     icon: '🔍' },
  { href: '/marketing/keyword-score', label: '키워드 점수분석', icon: '📊' },
]

// 대한민국 전체 지역 데이터
const REGIONS = [
  { key: 'seoul', label: '서울', icon: '🏙️', sub: [
    '강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구',
    '노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구',
    '성동구','성북구','송파구','양천구','영등포구','용산구','은평구',
    '종로구','중구','중랑구',
  ]},
  { key: 'gyeonggi', label: '경기', icon: '🌿', sub: [
    '수원시','성남시','의정부시','안양시','부천시','광명시','평택시',
    '동두천시','안산시','고양시','과천시','구리시','남양주시','오산시',
    '시흥시','군포시','의왕시','하남시','용인시','파주시','이천시',
    '안성시','김포시','화성시','광주시','양주시','포천시','여주시',
    '연천군','가평군','양평군',
  ]},
  { key: 'incheon', label: '인천', icon: '✈️', sub: [
    '중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군',
  ]},
  { key: 'busan', label: '부산', icon: '🌊', sub: [
    '중구','서구','동구','영도구','부산진구','동래구','남구','북구',
    '해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군',
  ]},
  { key: 'daegu', label: '대구', icon: '🍎', sub: [
    '중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군',
  ]},
  { key: 'daejeon', label: '대전', icon: '🔬', sub: [
    '동구','중구','서구','유성구','대덕구',
  ]},
  { key: 'gwangju', label: '광주', icon: '🌸', sub: [
    '동구','서구','남구','북구','광산구',
  ]},
  { key: 'ulsan', label: '울산', icon: '🏭', sub: [
    '중구','남구','동구','북구','울주군',
  ]},
  { key: 'sejong', label: '세종', icon: '🏛️', sub: ['세종시'] },
  { key: 'gangwon', label: '강원', icon: '⛰️', sub: [
    '춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시',
    '홍천군','횡성군','영월군','평창군','정선군','철원군','화천군',
    '양구군','인제군','고성군','양양군',
  ]},
  { key: 'chungbuk', label: '충북', icon: '🌾', sub: [
    '청주시','충주시','제천시','보은군','옥천군','영동군','증평군',
    '진천군','괴산군','음성군','단양군',
  ]},
  { key: 'chungnam', label: '충남', icon: '🦀', sub: [
    '천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시',
    '금산군','부여군','서천군','청양군','홍성군','예산군','태안군',
  ]},
  { key: 'jeonbuk', label: '전북', icon: '🌻', sub: [
    '전주시','군산시','익산시','정읍시','남원시','김제시',
    '완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군',
  ]},
  { key: 'jeonnam', label: '전남', icon: '🐚', sub: [
    '목포시','여수시','순천시','나주시','광양시',
    '담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군',
    '해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군',
  ]},
  { key: 'gyeongbuk', label: '경북', icon: '🏯', sub: [
    '포항시','경주시','김천시','안동시','구미시','영주시','영천시',
    '상주시','문경시','경산시','군위군','의성군','청송군','영양군',
    '영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군',
  ]},
  { key: 'gyeongnam', label: '경남', icon: '🏖️', sub: [
    '창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시',
    '의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군',
  ]},
  { key: 'jeju', label: '제주', icon: '🍊', sub: ['제주시','서귀포시'] },
]

const BOTTOM_NAV = [
  { href: '/inquiry', label: '1:1 문의', icon: '💬', colors: { bg: '#FFF7ED', text: '#EA580C' } },
  { href: '/settings', label: '설정',    icon: '⚙️', colors: { bg: '#F2F4F6', text: '#4E5968' } },
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentRegion = searchParams?.get('r') || ''
  const currentDistrict = searchParams?.get('d') || ''
  const [mobileOpen, setMobileOpen] = useState(false)

  const isReviewSection    = pathname.startsWith('/review-admin')
  const isMarketingSection = pathname.startsWith('/marketing')
  const isCommunitySection = pathname === '/community'

  const [reviewOpen,    setReviewOpen]    = useState(isReviewSection)
  const [marketingOpen, setMarketingOpen] = useState(isMarketingSection)
  const [communityOpen, setCommunityOpen] = useState(isCommunitySection)
  // 열려있는 지역 (하나만 열리게)
  const [openRegion, setOpenRegion] = useState<string>(currentRegion)

  const toggleRegion = (key: string) => {
    setOpenRegion(prev => prev === key ? '' : key)
  }

  const NavItems = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

      {/* ── 일반 메뉴 ── */}
      {FLAT_NAV.map(item => {
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
      })}

      {/* ── 리뷰 관리 ── */}
      <div>
        <button onClick={() => setReviewOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isReviewSection ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isReviewSection ? { background: '#F59E0B', color: '#fff' } : { background: '#FFFBEB', color: '#F59E0B' }}>
            리뷰
          </div>
          <span className="text-sm">리뷰 관리</span>
          <span className={`ml-auto text-xs transition-transform duration-200 ${reviewOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {reviewOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FDE68A] space-y-0.5">
            <Link href="/review-admin" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-xs font-medium ${pathname === '/review-admin' ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA]'}`}>
              <span className="text-sm leading-none">📋</span><span>전체 리뷰</span>
              {pathname === '/review-admin' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F59E0B] flex-shrink-0" />}
            </Link>
            {REVIEW_SUB.map(sub => {
              const active = pathname === sub.href || pathname.startsWith(sub.href + '/')
              return (
                <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${active ? 'bg-[#FFFBEB] text-[#F59E0B] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                  <span className="text-sm leading-none">{sub.icon}</span>
                  <span className="text-xs">{sub.label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sub.color }} />}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 마케팅 관리 ── */}
      <div>
        <button onClick={() => setMarketingOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isMarketingSection ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isMarketingSection ? { background: '#EA580C', color: '#fff' } : { background: '#FFF7ED', color: '#EA580C' }}>
            마케
          </div>
          <span className="text-sm">마케팅 관리</span>
          <span className={`ml-auto text-xs transition-transform duration-200 ${marketingOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {marketingOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FFE4CC] space-y-0.5">
            {MARKETING_SUB.map(sub => {
              const active = pathname === sub.href
              return (
                <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${active ? 'bg-[#FFF7ED] text-[#EA580C] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                  <span className="text-base leading-none">{sub.icon}</span>
                  <span className="text-xs">{sub.label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#EA580C] flex-shrink-0" />}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 커뮤니티 (지역 3단계) ── */}
      <div>
        <button onClick={() => setCommunityOpen(v => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isCommunitySection ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={isCommunitySection ? { background: '#EC4899', color: '#fff' } : { background: '#FDF2F8', color: '#EC4899' }}>
            커뮤
          </div>
          <span className="text-sm">커뮤니티</span>
          <span className={`ml-auto text-xs transition-transform duration-200 ${communityOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {communityOpen && (
          <div className="mt-1 ml-3 pl-4 border-l-2 border-[#FBCFE8] space-y-0.5">

            {/* 전국 */}
            <Link href="/community" onClick={() => { setMobileOpen(false); setOpenRegion('') }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-xs font-medium ${pathname === '/community' && !currentRegion ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA]'}`}>
              <span className="text-sm">🗺️</span>
              <span>전국</span>
              {pathname === '/community' && !currentRegion && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#EC4899] flex-shrink-0" />}
            </Link>

            {/* 시/도별 */}
            {REGIONS.map(region => {
              const isRegionActive = currentRegion === region.label
              const isRegionOpen   = openRegion === region.key

              return (
                <div key={region.key}>
                  {/* 시/도 헤더 */}
                  <button
                    onClick={() => toggleRegion(region.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all text-left ${isRegionActive ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#4E5968] hover:bg-[#F8F9FA] font-medium'}`}>
                    <span className="text-sm leading-none w-5 text-center flex-shrink-0">{region.icon}</span>
                    <Link
                      href={`/community?r=${encodeURIComponent(region.label)}`}
                      onClick={e => { e.stopPropagation(); setMobileOpen(false) }}
                      className="text-xs flex-1 text-left"
                    >
                      {region.label}
                    </Link>
                    <span className={`text-[10px] transition-transform duration-150 flex-shrink-0 ${isRegionOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {/* 구/시/군 목록 */}
                  {isRegionOpen && (
                    <div className="mt-0.5 ml-2 pl-3 border-l border-[#FBCFE8] space-y-0.5 max-h-48 overflow-y-auto">
                      {region.sub.map(district => {
                        const active = currentRegion === region.label && currentDistrict === district
                        return (
                          <Link
                            key={district}
                            href={`/community?r=${encodeURIComponent(region.label)}&d=${encodeURIComponent(district)}`}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-[11px] ${active ? 'bg-[#FDF2F8] text-[#EC4899] font-semibold' : 'text-[#8B95A1] hover:bg-[#F8F9FA] hover:text-[#4E5968]'}`}>
                            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: active ? '#EC4899' : '#D1D5DB' }} />
                            {district}
                            {active && <span className="ml-auto w-1 h-1 rounded-full bg-[#EC4899] flex-shrink-0" />}
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

      {/* ── 하단 메뉴 ── */}
      {BOTTOM_NAV.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'font-semibold' : 'text-[#4E5968] hover:bg-[#F2F4F6] font-medium'}`}
            style={active ? { background: item.colors.bg, color: item.colors.text } : {}}>
            <span className="text-base w-7 text-center flex-shrink-0">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.colors.text }} />}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* 모바일 헤더 */}
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

      {/* 데스크탑 사이드바 */}
      <aside className={`fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-[#E5E8EB] z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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

        <div className="px-4 py-4 border-t border-[#F2F4F6]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F8F9FA]">
            <div className="w-8 h-8 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">하</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#191F28] truncate">하랑마케팅</p>
              <p className="text-[10px] text-[#8B95A1] truncate">강남점</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
