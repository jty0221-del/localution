'use client'
import { useSearchParams } from 'next/navigation'
export const dynamic = 'force-dynamic'
import { useState, Suspense, useEffect, useRef } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { useConnections, PlatformId } from '../lib/connections'
import { TABS, TAB_HERO, resolveTab, type Tab } from '../lib/settings-tabs'
import { toast, confirmDialog, promptDialog } from '../lib/toast'
import { INDUSTRY_CATALOG, INDUSTRY_LABELS, DEFAULT_INDUSTRY_GROUP_ID, findIndustryGroup } from '../lib/industry-catalog'
import PlatformLogo from '../components/PlatformLogo'

// 토스페이먼츠 — 공식 SDK 테스트 클라이언트 키 (공개됨)
// 실서비스 전환 시 env에서 주입: NEXT_PUBLIC_TOSS_CLIENT_KEY
const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm'

// TABS / Tab 타입은 app/lib/settings-tabs.ts 에서 중앙 관리

// /pricing 페이지와 동기화된 12개 기능 — 베타 기간 전체 무료 (price=0, 정식 요금 임시)
const FEATURES: Array<{
  id: string; name: string; price: number; short: string; bg: string; color: string;
  desc: string; category: '사장님' | '마케터' | '공통'; popular?: boolean;
}> = [
  { id: 'ai-review',     name: 'AI 리뷰 자동 답글',   price: 0, short: 'AI',     bg: '#EFF6FF', color: '#3182F6', desc: '네이버·배민·쿠팡이츠 리뷰를 AI가 분석·자동 답글',  category: '사장님', popular: true },
  { id: 'alimtalk',      name: '알림톡 마케팅',       price: 0, short: '알림',   bg: '#FFFBEB', color: '#F59E0B', desc: '카카오 알림톡으로 단골에게 쿠폰·이벤트 발송',       category: '사장님' },
  { id: 'accounting',    name: 'AI 정산·행정',        price: 0, short: '정산',   bg: '#FFF7ED', color: '#FF8C00', desc: '매출 정리·세금계산서·경비 관리 AI 지원',            category: '사장님' },
  { id: 'local-synergy', name: '로컬 시너지',         price: 0, short: '로컬',   bg: '#FEF2F2', color: '#EF4444', desc: '주변 가게와 QR 공동이벤트·상권 분석',               category: '사장님' },
  { id: 'qr-stamp',      name: 'QR 스탬프 적립',      price: 0, short: 'QR',     bg: '#ECFDF5', color: '#00C471', desc: '디지털 스탬프로 재방문율 향상',                     category: '사장님' },
  { id: 'keyword',       name: '키워드 분석',         price: 0, short: '키워드', bg: '#F5F3FF', color: '#8B5CF6', desc: '네이버 검색량·경쟁도·연관 키워드 실시간 분석',      category: '마케터', popular: true },
  { id: 'blog-ai',       name: 'AI 블로그 포스팅',    price: 0, short: '블로그', bg: '#FDF2F8', color: '#EC4899', desc: 'SEO 최적화 블로그 초안 AI 작성',                    category: '마케터' },
  { id: 'competitor',    name: '경쟁사 분석',         price: 0, short: '경쟁',   bg: '#F0F9FF', color: '#0EA5E9', desc: '경쟁 업체 리뷰·키워드·마케팅 자동 모니터링',        category: '마케터' },
  { id: 'report',        name: '마케팅 성과 리포트',  price: 0, short: '리포트', bg: '#ECFDF5', color: '#10B981', desc: '유입·전환·매출 주간·월간 자동 리포트',              category: '마케터' },
  { id: 'crm',           name: 'CRM 고객관리',        price: 0, short: 'CRM',    bg: '#EEF2FF', color: '#6366F1', desc: '고객 방문·결제·등급 자동 분류, 단골 관리',           category: '공통',   popular: true },
  { id: 'ai-chat',       name: 'AI 비서 채팅',        price: 0, short: '비서',   bg: '#F0FDFA', color: '#14B8A6', desc: '사장님 전용 24시간 AI 상담사',                       category: '공통' },
  { id: 'sns-manage',    name: 'SNS 자동 포스팅',     price: 0, short: 'SNS',    bg: '#FFF7ED', color: '#F97316', desc: '인스타·블로그 AI 콘텐츠 예약 자동 발행',             category: '공통' },
]

const CATEGORY_COLOR: Record<string, string> = {
  '사장님': 'bg-blue-100 text-blue-700',
  '마케터': 'bg-purple-100 text-purple-700',
  '공통':   'bg-green-100 text-green-700',
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

interface NaverPlace {
  title: string;
  link: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

// 28차-4: Kakao Maps SDK 위젯 (무료·간편)
// env 필요: NEXT_PUBLIC_KAKAO_MAP_KEY (JavaScript 키)
// 발급: https://developers.kakao.com/console → 앱 생성 → 앱 키 → JavaScript 키
// 플랫폼 등록: Web 플랫폼 도메인에 https://www.localution.co.kr 추가
function KakaoMapBox({ address }: { address: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    if (!key) { setError('카카오 지도 API 키 미설정'); return }
    if (!address) { setError('주소 입력 대기 중'); return }

    const w = window as unknown as { kakao?: any }
    const init = () => {
      if (!w.kakao || !w.kakao.maps || !mapRef.current) return
      w.kakao.maps.load(() => {
        const geocoder = new w.kakao.maps.services.Geocoder()
        geocoder.addressSearch(address, (result: any[], status: string) => {
          if (status !== w.kakao.maps.services.Status.OK || !result || !result[0]) {
            setError('해당 주소를 찾을 수 없습니다')
            return
          }
          const latlng = new w.kakao.maps.LatLng(parseFloat(result[0].y), parseFloat(result[0].x))
          const map = new w.kakao.maps.Map(mapRef.current, {
            center: latlng,
            level: 3,
          })
          new w.kakao.maps.Marker({ position: latlng, map })
          setError('')
        })
      })
    }

    if (w.kakao && w.kakao.maps) { init(); return }
    const existing = document.getElementById('kakao-maps-sdk')
    if (existing) { existing.addEventListener('load', init); return }
    const script = document.createElement('script')
    script.id = 'kakao-maps-sdk'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`
    script.async = true
    script.onload = init
    script.onerror = () => setError('카카오 지도 스크립트 로드 실패')
    document.head.appendChild(script)
  }, [address])

  return (
    <div className="relative w-full bg-[#F8FAFF]" style={{ height: 620 }}>
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FFFBEB] via-[#FFFDF5] to-[#FFFBEB] text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FEE500] flex items-center justify-center text-[#3B1E1E] font-black text-2xl mb-3 shadow-lg">K</div>
          <p className="text-base font-bold text-[#191F28] mb-1">카카오 지도</p>
          <p className="text-xs text-[#8B95A1] mb-4">{error}</p>
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm max-w-[300px]">
            <p className="text-xs font-semibold text-[#4E5968] mb-1">주소</p>
            <p className="text-sm text-[#191F28] leading-relaxed">{address || '주소 미입력'}</p>
          </div>
          <a href={'https://map.kakao.com/?q=' + encodeURIComponent(address || '')} target="_blank" rel="noopener noreferrer" className="mt-4 px-5 py-2.5 rounded-xl bg-[#FEE500] text-[#3B1E1E] text-xs font-bold hover:brightness-95 transition-all">
            카카오맵에서 열기 →
          </a>
        </div>
      )}
    </div>
  )
}

// Map 선택기 — 둘 중 환경변수가 있는 쪽 자동 사용 (Kakao 우선)
function SmartMapBox({ address }: { address: string }) {
  const hasKakao = !!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
  if (hasKakao) return <KakaoMapBox address={address} />
  return <NaverMapBox address={address} />
}

function NaverMapBox({ address }: { address: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
    if (!clientId) { setError('API 키 미설정'); return }
    if (!address) { setError('주소 입력 대기 중'); return }

    const w = window as unknown as { naver?: any }
    const init = () => {
      if (!w.naver || !w.naver.maps || !mapRef.current) return
      try {
        w.naver.maps.Service.geocode({ query: address }, (status: number, res: any) => {
          if (status !== w.naver.maps.Service.Status.OK) { setError('주소 검색 실패'); return }
          const item = res && res.v2 && res.v2.addresses && res.v2.addresses[0]
          if (!item) { setError('해당 주소를 찾을 수 없습니다'); return }
          const latlng = new w.naver.maps.LatLng(parseFloat(item.y), parseFloat(item.x))
          const map = new w.naver.maps.Map(mapRef.current, {
            center: latlng,
            zoom: 16,
            zoomControl: true,
            zoomControlOptions: { position: w.naver.maps.Position.TOP_RIGHT },
          })
          new w.naver.maps.Marker({ position: latlng, map })
          setError('')
        })
      } catch (_e) {
        setError('지도 초기화 오류')
      }
    }

    if (w.naver && w.naver.maps) { init(); return }
    const existing = document.getElementById('naver-maps-sdk')
    if (existing) { existing.addEventListener('load', init); return }
    const script = document.createElement('script')
    script.id = 'naver-maps-sdk'
    script.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=' + clientId + '&submodules=geocoder'
    script.async = true
    script.onload = init
    script.onerror = () => setError('네이버 지도 스크립트 로드 실패')
    document.head.appendChild(script)
  }, [address])

  return (
    <div className="relative w-full bg-[#F8FAFF]" style={{ height: 620 }}>
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-[#F8FAFF] to-[#EFF6FF] text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#03C75A] flex items-center justify-center text-white font-black text-2xl mb-3 shadow-lg">N</div>
          <p className="text-base font-bold text-[#191F28] mb-1">네이버 지도</p>
          <p className="text-xs text-[#8B95A1] mb-4">{error}</p>
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm max-w-[300px]">
            <p className="text-xs font-semibold text-[#4E5968] mb-1">주소</p>
            <p className="text-sm text-[#191F28] leading-relaxed">{address || '주소 미입력'}</p>
          </div>
          <a href={'https://map.naver.com/v5/search/' + encodeURIComponent(address || '')} target="_blank" rel="noopener noreferrer" className="mt-4 px-5 py-2.5 rounded-xl bg-[#03C75A] text-white text-xs font-bold hover:bg-[#02A84A] transition-colors">
            네이버지도 앱에서 열기 →
          </a>
        </div>
      )}
    </div>
  )
}

function StoreTab() {
  const [form, setForm] = useState({
    name: '', category: '', phone: '', address: '',
    naverUrl: '', mainKeyword: '', subKeywords: '', desc: '',
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [searchResults, setSearchResults] = useState<NaverPlace[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isMock, setIsMock] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [serverPlatforms, setServerPlatforms] = useState<Array<{
    platform: string; label: string; connected: boolean;
    platform_store_id: string | null; platform_store_name: string | null;
    account_id_masked: string
  }>>([])

  // 28차-3: /api/stores/me 에서 매장 정보 불러와 form 채우기
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) { setLoadingInitial(false); return }
        const j = await res.json()
        if (!j?.ok) { setLoadingInitial(false); return }
        setServerPlatforms(j.platforms || [])
        const s = j.store || null
        const nl = j.naver_link || null
        setForm(prev => ({
          ...prev,
          name: s?.name || nl?.external_name || prev.name,
          category: s?.category || nl?.category || prev.category,
          address: s?.address || nl?.address || prev.address,
          phone: s?.phone || prev.phone,
          naverUrl: s?.naver_url || s?.naver_place_url || nl?.external_url || prev.naverUrl,
          mainKeyword: s?.main_keyword || prev.mainKeyword,
          subKeywords: Array.isArray(s?.sub_keywords) ? s.sub_keywords.join(', ') : (s?.sub_keywords || prev.subKeywords),
          // 2026-04-22: stores.description 컬럼으로 이전. 레거시 s?.desc 도 호환.
          desc: s?.description || s?.desc || prev.desc,
        }))
      } catch (_) {}
      setLoadingInitial(false)
    })()
  }, [])

  // 30차-7: URL 입력 → /api/place/lookup (HTML 스크래핑, API 키 불필요)
  //         입력 형식 자동 판별 — placeId/URL 이면 lookup, 아니면 (fallback) /api/naver-place/search
  const handleNaverSync = async () => {
    const raw = form.naverUrl.trim()
    if (!raw) { setSyncError('네이버 플레이스 URL 또는 placeId 를 입력해주세요 (예: https://m.place.naver.com/restaurant/1129864566/home)'); return }
    setSyncing(true); setSyncError(''); setShowResults(false); setIsMock(false)

    // 1) URL 또는 숫자 ID 패턴 검출
    const url = raw
    let placeId: string | null = null
    let category: string | null = null

    // m.place.naver.com/{category}/{id}
    const m1 = url.match(/m\.place\.naver\.com\/([a-z]+)\/(\d+)/i)
    if (m1) { category = m1[1]; placeId = m1[2] }
    if (!placeId) {
      // map.naver.com/.../place/{id}
      const m2 = url.match(/map\.naver\.com\/[^\s]*place\/(\d+)/i)
      if (m2) placeId = m2[1]
    }
    if (!placeId) {
      // place.naver.com/{cat}/{id}
      const m3 = url.match(/place\.naver\.com\/([a-z]+)\/(\d+)/i)
      if (m3) { category = m3[1]; placeId = m3[2] }
    }
    if (!placeId) {
      // 순수 숫자만
      const m4 = raw.match(/^(\d{6,})$/)
      if (m4) placeId = m4[1]
    }

    try {
      if (placeId) {
        // URL 기반 정확 조회
        const qs = new URLSearchParams({ id: placeId })
        if (category) qs.set('category', category)
        const res = await fetch(`/api/place/lookup?${qs.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data?.ok || !data?.info) {
          setSyncError(data?.message || data?.error || '네이버 플레이스에서 해당 ID를 찾지 못했습니다')
          return
        }
        applyPlaceInfo(data.info)
        return
      }

      // placeId 추출 실패 → fallback 으로 매장명 검색 (API 키 있는 환경에서만 동작)
      const res = await fetch(`/api/naver-place/search?query=${encodeURIComponent(raw)}`)
      const data = await res.json()
      if (!res.ok) { setSyncError(data.error || 'URL 붙여넣기를 권장합니다 (예: https://m.place.naver.com/restaurant/1129864566/home)'); return }
      if (!data.items || data.items.length === 0) {
        setSyncError('검색 결과가 없습니다. 네이버 플레이스 URL 을 붙여넣어주세요.')
        return
      }
      if (data._mock) {
        setIsMock(true)
        setSyncError('검색 API 키 미설정 — 네이버 플레이스 URL 로 입력하시면 바로 연동됩니다')
      }
      if (data.items.length === 1) {
        applyPlace(data.items[0])
      } else {
        setSearchResults(data.items)
        setShowResults(true)
        setSynced(false)
      }
    } catch {
      setSyncError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSyncing(false)
    }
  }

  // 30차-7: /api/place/lookup 응답 → form 전체 자동 채움
  //   매장명 / 업종 / 전화 / 주소 + 메인키워드(자동추론) + 서브키워드(자동추론) + 매장소개
  const applyPlaceInfo = (info: {
    placeId: string
    name: string
    categoryName?: string
    address?: string
    roadAddress?: string
    phone?: string
    description?: string
    mainKeyword?: string
    subKeywords?: string[]
    sourceUrl?: string
  }) => {
    setForm(p => {
      const newAddress = info.roadAddress || info.address || p.address
      const newCategory = info.categoryName?.split('>').pop()?.trim() || info.categoryName || p.category
      const newMain = info.mainKeyword?.trim() || p.mainKeyword
      const newSubs = Array.isArray(info.subKeywords) && info.subKeywords.length
        ? info.subKeywords.join(', ')
        : p.subKeywords
      const newDesc = info.description?.trim() || p.desc
      return {
        ...p,
        name: info.name || p.name,
        category: newCategory,
        address: newAddress,
        phone: info.phone || p.phone,
        naverUrl: info.sourceUrl || p.naverUrl,
        mainKeyword: newMain,
        subKeywords: newSubs,
        desc: newDesc,
      }
    })
    setShowResults(false)
    setSynced(true)
    setIsMock(false)
    setTimeout(() => setSynced(false), 4000)
  }

  // 구형 네이버 검색 API 응답용 (fallback)
  const applyPlace = (place: NaverPlace) => {
    setForm(p => ({
      ...p,
      name: place.title,
      category: place.category,
      address: place.roadAddress || place.address,
      phone: place.telephone || p.phone,
      mainKeyword: place.category.split('>').pop()?.trim() || p.mainKeyword,
    }))
    setShowResults(false)
    setSynced(true)
    setTimeout(() => setSynced(false), 4000)
  }

  const handleSave = async () => {
    setSaving(true); setSaveError('')
    try {
      const res = await fetch('/api/stores/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          address: form.address,
          phone: form.phone,
          naver_url: form.naverUrl,
          main_keyword: form.mainKeyword,
          sub_keywords: form.subKeywords.split(',').map(s => s.trim()).filter(Boolean),
          // 2026-04-22: 서버는 description(신규) / desc(레거시) 둘 다 받음. 신규 필드로 전송.
          description: form.desc,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        setSaveError(data?.error || '저장 실패')
      } else {
        setSaved(true); setTimeout(() => setSaved(false), 2500)
      }
    } catch (e: any) {
      setSaveError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }
  const mapAddress = form.address || '서울특별시 마포구 합정동'

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-4">
        <div className="bg-[#EFF6FF] rounded-2xl p-4 border border-[#BFDBFE]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#03C75A] flex items-center justify-center text-white text-[10px] font-black">N</div>
            <span className="text-sm font-bold text-[#191F28]">네이버 플레이스 연동</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3182F6] text-white font-semibold">자동 입력</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={form.naverUrl}
              onChange={e => { setForm(p => ({ ...p, naverUrl: e.target.value })); setSyncError(''); setShowResults(false) }}
              placeholder="https://m.place.naver.com/restaurant/1129864566/home"
              className="flex-1 border border-[#BFDBFE] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] bg-white transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleNaverSync()}
            />
            <button
              onClick={handleNaverSync}
              disabled={syncing}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${synced && !isMock ? 'bg-green-500 text-white' : syncing ? 'bg-[#93C5FD] text-white cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}
            >
              {syncing ? '검색 중...' : synced && !isMock ? '연동 완료' : '연동하기'}
            </button>
          </div>
          {syncError && (
            <p className={`text-xs mt-2 font-medium ${isMock ? 'text-orange-600' : 'text-red-500'}`}>
              {isMock ? '⚠️' : '❌'} {syncError}
            </p>
          )}
          {synced && !isMock && !syncError && (
            <p className="text-xs text-green-600 font-semibold mt-2">네이버 플레이스에서 매장 정보를 가져왔습니다!</p>
          )}
          {showResults && searchResults.length > 0 && (
            <div className="mt-3 bg-white rounded-xl border border-[#BFDBFE] overflow-hidden shadow-md">
              <p className="text-xs font-bold text-[#8B95A1] px-4 py-2 border-b border-[#F2F4F6]">
                검색 결과 {searchResults.length}개 — 해당하는 매장을 선택해주세요
              </p>
              {searchResults.map((place, i) => (
                <button key={i} onClick={() => applyPlace(place)} className="w-full text-left px-4 py-3 hover:bg-[#EFF6FF] transition-colors border-b border-[#F2F4F6] last:border-0">
                  <p className="text-sm font-semibold text-[#191F28]">{place.title}</p>
                  <p className="text-xs text-[#8B95A1] mt-0.5">{place.category} · {place.roadAddress || place.address}</p>
                  {place.telephone && <p className="text-xs text-[#3182F6] mt-0.5">{place.telephone}</p>}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-[#3182F6] mt-2 opacity-70">네이버 플레이스 URL 붙여넣기 → 매장명·업종·전화·주소·메인/서브 키워드·매장 소개 자동 입력 (API 키 불필요)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="form-name" className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장명</label>
            <input id="form-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="우리 카페" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
          <div>
            <label htmlFor="form-category" className="block text-xs font-semibold text-[#4E5968] mb-1.5">업종</label>
            <input id="form-category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="카페·베이커리" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
        </div>
        <div>
          <label htmlFor="form-phone" className="block text-xs font-semibold text-[#4E5968] mb-1.5">전화번호</label>
          <input id="form-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="02-1234-5678" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
        </div>
        <div>
          <label htmlFor="form-address" className="block text-xs font-semibold text-[#4E5968] mb-1.5">주소</label>
          <input id="form-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="서울시 마포구 합정동 123-4" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
        </div>
        <div>
          <label htmlFor="form-main-keyword" className="block text-xs font-semibold text-[#4E5968] mb-1.5">키워드</label>
          <div className="flex gap-2">
            <div className="w-[38%]">
              <input id="form-main-keyword" value={form.mainKeyword} onChange={e => setForm(p => ({ ...p, mainKeyword: e.target.value }))} placeholder="메인 키워드" aria-label="메인 키워드" className="w-full border-2 border-[#3182F6] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B64DA]/30 bg-[#F8FAFF] font-semibold" />
              <p className="text-[10px] text-[#3182F6] mt-1 font-semibold pl-0.5">메인 키워드 1개</p>
            </div>
            <div className="flex-1">
              <input value={form.subKeywords} onChange={e => setForm(p => ({ ...p, subKeywords: e.target.value }))} placeholder="서브 키워드 (쉼표로 구분)" aria-label="서브 키워드" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#1B64DA]/20 transition-colors" />
              <p className="text-[10px] text-[#8B95A1] mt-1 pl-0.5">여러 개 입력 가능</p>
            </div>
          </div>
          {(form.mainKeyword || form.subKeywords) && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {form.mainKeyword && (
                <span className="text-[11px] px-2.5 py-1 bg-[#3182F6] text-white rounded-full font-bold">#{form.mainKeyword}</span>
              )}
              {form.subKeywords.split(',').filter(k => k.trim()).map(kw => (
                <span key={kw.trim()} className="text-[11px] px-2.5 py-1 bg-[#EFF6FF] text-[#3182F6] rounded-full font-medium">#{kw.trim()}</span>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="form-desc" className="block text-xs font-semibold text-[#4E5968]">
              매장 소개
              <span className="ml-1.5 text-[10px] text-[#8B95A1] font-normal">AI 리뷰·블로그 작성 참고용 · 최대 2000자</span>
            </label>
            <button
              type="button"
              onClick={handleNaverSync}
              disabled={syncing || !form.naverUrl.trim()}
              title="네이버 플레이스 /information 페이지에서 매장 소개 가져오기"
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
                syncing || !form.naverUrl.trim()
                  ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed'
                  : 'bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE]'
              }`}
            >
              {syncing ? '불러오는 중...' : '네이버에서 가져오기'}
            </button>
          </div>
          <textarea
            id="form-desc"
            value={form.desc}
            onChange={e => {
              const v = e.target.value.slice(0, 2000)
              setForm(p => ({ ...p, desc: v }))
            }}
            maxLength={2000}
            rows={10}
            placeholder="예: 포항 용흥동에서 10년째 운영 중인 스페셜티 카페입니다. 제주산 원두 직접 로스팅, 수제 디저트, 반려동물 동반 가능. 주차 20대, 와이파이 제공. 매주 수요일 원두 할인 이벤트.&#10;&#10;⚙️ AI 가 리뷰 답글·블로그 포스팅을 쓸 때 이 소개를 참고합니다. 매장 특징·대표 메뉴·위치·이벤트 등을 자세히 적을수록 품질이 올라갑니다."
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-y leading-relaxed"
            style={{ minHeight: '240px' }}
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-[#8B95A1]">
              네이버 플레이스 URL 이 위에 있으면 "네이버에서 가져오기" 한 번으로 자동 채움 (information 페이지 전문 수집)
            </p>
            <p className={`text-[11px] font-semibold tabular-nums ${
              form.desc.length > 1900 ? 'text-red-500' : form.desc.length > 1500 ? 'text-orange-500' : 'text-[#8B95A1]'
            }`}>
              {form.desc.length.toLocaleString()} / 2,000
            </p>
          </div>
        </div>
        {serverPlatforms.some(p => p.connected) && (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3">
            <p className="text-xs font-bold text-[#166534] mb-2">🔗 연결된 플랫폼 ({serverPlatforms.filter(p => p.connected).length}개)</p>
            <div className="flex flex-wrap gap-1.5">
              {serverPlatforms.filter(p => p.connected).map(p => (
                <span key={p.platform} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-[#BBF7D0] text-[#166534] font-semibold">
                  {p.label}{p.platform_store_name ? ` · ${p.platform_store_name}` : ''}
                </span>
              ))}
            </div>
            <a href="/my/platforms" className="inline-block text-[11px] text-[#3182F6] hover:underline mt-2 font-semibold">플랫폼 연결 관리 →</a>
          </div>
        )}
        {saveError && (
          <p className="text-xs text-red-500 font-medium">❌ {saveError}</p>
        )}
        <button onClick={handleSave} disabled={saving} className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${saved ? 'bg-green-500 text-white' : saving ? 'bg-[#93C5FD] text-white cursor-not-allowed' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'}`}>
          {saving ? '저장 중...' : saved ? '저장됨' : '저장하기'}
        </button>
      </div>
      <div className="flex-1 min-w-0 hidden lg:block space-y-4">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(17,24,39,0.06)] overflow-hidden sticky top-8">
          <div className="px-5 pt-5 pb-4 border-b border-[#F2F4F6] flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-[#03C75A] flex items-center justify-center text-white text-[10px] font-black">N</div>
                <p className="font-bold text-[#191F28] text-base">우리 매장 위치</p>
              </div>
              <p className="text-xs text-[#8B95A1] truncate">{form.address || '주소를 입력하면 지도가 표시됩니다'}</p>
            </div>
            {form.address && (
              <a href={`https://map.naver.com/v5/search/${encodeURIComponent(form.address)}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#03C75A] text-white text-[11px] font-bold hover:bg-[#02A84A] transition-colors whitespace-nowrap">
                앱에서 열기 →
              </a>
            )}
          </div>
          <SmartMapBox address={mapAddress} />
        </div>
        <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FDE68A]">
          <p className="text-xs font-bold text-[#92400E] mb-2">지도 API 키 설정 (Kakao 추천)</p>
          <p className="text-[11px] text-[#78350F] leading-relaxed mb-2">둘 중 하나만 설정해도 지도가 표시됩니다. Kakao 가 발급·사용이 더 간단합니다:</p>
          <div className="bg-white rounded-lg p-2 font-mono text-[10px] text-[#4E5968] space-y-1">
            <p className="text-[#FF6B00] font-bold"># 카카오 지도 (우선·추천)</p>
            <p>NEXT_PUBLIC_KAKAO_MAP_KEY=JavaScript_키</p>
            <p className="text-[#9CA3AF]"># Kakao Developers Web 플랫폼 도메인 등록 필요</p>
            <p className="text-[#03C75A] font-bold mt-2"># 네이버 지도 (폴백)</p>
            <p>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=발급받은_ID</p>
            <p>NAVER_CLIENT_ID=발급받은_ID</p>
            <p>NAVER_CLIENT_SECRET=발급받은_시크릿</p>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <a href="https://developers.kakao.com/console/app" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#FF6B00] hover:underline font-semibold">
              카카오 JS 키 발급 →
            </a>
            <a href="https://console.ncloud.com/naver-service/application" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#03C75A] hover:underline font-semibold">
              네이버 Maps API 발급 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotifyTab() {
  const [alerts, setAlerts] = useState({ review: true, customer: true, report: false, payment7: true, payment3: true })
  const [channels, setChannels] = useState({ kakao: true, email: false, sms: false })
  const [payChannels, setPayChannels] = useState({ kakao: true, email: true, sms: false })
  const CH = [
    { key: 'kakao' as const, label: '카카오톡' },
    { key: 'email' as const, label: '이메일' },
    { key: 'sms' as const, label: 'SMS' },
  ]

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">알림 받을 항목</h3>
        <div className="space-y-4">
          {[
            { key: 'review' as const, label: '새 리뷰 알림', desc: '새로운 리뷰가 등록되면 알려드려요' },
            { key: 'customer' as const, label: '신규 고객 알림', desc: '새 고객이 등록되면 알려드려요' },
            { key: 'report' as const, label: '주간 리포트 알림', desc: '매주 월요일 성과 리포트를 발송해요' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#191F28]">{item.label}</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">{item.desc}</p>
              </div>
              <Toggle checked={alerts[item.key]} onChange={v => setAlerts(p => ({ ...p, [item.key]: v }))} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-[#3182F6]">
        <h3 className="font-bold text-[#191F28] mb-1">결제 알림</h3>
        <p className="text-xs text-[#8B95A1] mb-5">결제일 전 미리 알림을 받아 놓치지 마세요</p>
        <div className="space-y-4 mb-5">
          {[
            { key: 'payment7' as const, label: '결제 7일 전 알림', desc: '결제 예정 7일 전 안내' },
            { key: 'payment3' as const, label: '결제 3일 전 알림', desc: '결제 예정 3일 전 최종 안내' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#191F28]">{item.label}</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">{item.desc}</p>
              </div>
              <Toggle checked={alerts[item.key]} onChange={v => setAlerts(p => ({ ...p, [item.key]: v }))} />
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-[#F2F4F6]">
          <p className="text-sm font-medium text-[#191F28] mb-3">결제 알림 채널</p>
          <div className="flex gap-2">
            {CH.map(ch => (
              <button key={ch.key} onClick={() => setPayChannels(p => ({ ...p, [ch.key]: !p[ch.key] }))} className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${payChannels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}>
                {ch.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">기본 알림 채널</h3>
        <div className="flex gap-2">
          {CH.map(ch => (
            <button key={ch.key} onClick={() => setChannels(p => ({ ...p, [ch.key]: !p[ch.key] }))} className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${channels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}>
              {ch.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function buildPrompt(cfg: {
  bizType: string; tone: string; length: string;
  gender: string; age: string;
  includes: Record<string, boolean>; closing: string; excludes: string; storeDesc: string;
}) {
  const toneMap: Record<string,string> = {
    warm: '따뜻하고 다정한',
    polite: '정중하고 예의 바른',
    pro: '전문적이고 신뢰감 있는',
    witty: '재치 있고 유쾌한',
    calm: '차분하고 담백한',
    energetic: '밝고 에너지 넘치는'
  }
  const lengthMap: Record<string,string> = { short:'150자 내외', medium:'250자 내외', long:'400자 내외' }
  const genderMap: Record<string,string> = { male:'남성', female:'여성', neutral:'중성' }
  const ageMap: Record<string,string> = { '20s':'20대', '30s':'30대', '40s':'40대', '50s':'50대 이상' }
  const parts: string[] = []
  parts.push('당신은 ' + (cfg.bizType || '소상공인 매장') + '의 사장님을 대신해 리뷰에 답변하는 AI입니다.')
  if (cfg.storeDesc) parts.push('매장 소개: ' + cfg.storeDesc)
  parts.push('')
  parts.push('[답변 스타일]')
  parts.push('- 톤: ' + (toneMap[cfg.tone] || '따뜻하고 다정한') + ' 어투')
  parts.push('- 길이: ' + (lengthMap[cfg.length] || '250자 내외'))
  if (cfg.gender && cfg.gender !== 'none') parts.push('- 화자 성별감: ' + (genderMap[cfg.gender] || '중성') + ' 느낌')
  if (cfg.age && cfg.age !== 'none') parts.push('- 화자 연령대: ' + (ageMap[cfg.age] || '30대') + ' 느낌의 말투')
  parts.push('')
  parts.push('[필수 포함 요소]')
  if (cfg.includes['thanks'])    parts.push('- 방문 감사 인사를 자연스럽게 포함')
  if (cfg.includes['revisit'])   parts.push('- 재방문 유도 문구 포함 (예: "다음에도 꼭 찾아주세요")')
  if (cfg.includes['mention'])   parts.push('- 리뷰에서 언급된 메뉴 또는 서비스를 직접 언급')
  if (cfg.includes['personalize']) parts.push('- 리뷰어의 닉네임으로 개인화 인사 (예: "OO님,")')
  if (cfg.includes['improve'])   parts.push('- 부정적 내용은 개선 의지와 사과를 진정성 있게 표현')
  if (cfg.includes['keyword'])   parts.push('- 매장 핵심 키워드를 자연스럽게 1~2회 포함')
  if (cfg.closing) parts.push('\n[고정 마무리 문구]\n답변 마지막에 반드시 포함: "' + cfg.closing + '"')
  if (cfg.excludes) parts.push('\n[사용 금지 표현]\n다음 표현은 절대 사용하지 마세요: ' + cfg.excludes)
  parts.push('\n[추가 규칙]\n- 이모지는 1~2개 이하로 절제\n- 같은 표현을 반복하지 말 것\n- 번역투 / 기계적 표현 금지\n- 리뷰 내용을 읽고 맞춤 답변')
  return parts.join('\n')
}

function AITab() {
  const [tone, setTone] = useState('warm')
  const [length, setLength] = useState('medium')
  const [gender, setGender] = useState('none')
  const [age, setAge] = useState('none')
  const [autoReply, setAutoReply] = useState(false)
  const [bizType, setBizType] = useState('')
  const [industryGroup, setIndustryGroup] = useState<string>(DEFAULT_INDUSTRY_GROUP_ID)
  const [industrySearch, setIndustrySearch] = useState('')
  const [storeDesc, setStoreDesc] = useState('')
  const [closing, setClosing] = useState('')
  const [excludes, setExcludes] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [testReview, setTestReview] = useState('')
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)
  const [includes, setIncludes] = useState({
    thanks: true, revisit: true, mention: true,
    personalize: false, improve: true, keyword: false,
  })

  const prompt = buildPrompt({ bizType, tone, length, gender, age, includes, closing, excludes, storeDesc })

  const handleTest = async () => {
    if (!testReview.trim()) return
    setTesting(true); setTestResult('')
    try {
      const res = await fetch('/api/ai-review-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: prompt, review: testReview }),
      })
      const data = await res.json()
      setTestResult(data.reply || '답변 생성 실패')
    } catch {
      setTestResult('API 연결 오류 — 연동 관리에서 설정을 확인하세요.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* 업종 + 매장 소개 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">매장 기본 설정</h3>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-[#4E5968]">
              업종 선택
              {bizType && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] text-[11px] font-bold">
                  {findIndustryGroup(bizType)?.emoji || '✓'} {bizType}
                  <button
                    type="button"
                    onClick={() => setBizType('')}
                    className="ml-1 hover:text-[#1B64DA]"
                    aria-label="선택 해제"
                  >×</button>
                </span>
              )}
            </label>
            <span className="text-[10px] text-[#8B95A1]">총 {INDUSTRY_LABELS.length}개 업종</span>
          </div>

          {/* 대분류 탭 */}
          <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-[#F1F3F5]">
            {INDUSTRY_CATALOG.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => { setIndustryGroup(g.id); setIndustrySearch('') }}
                title={g.desc}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${industryGroup === g.id ? 'border-[#3182F6] bg-[#3182F6] text-white' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6]'}`}
              >
                <span className="mr-1">{g.emoji}</span>{g.label}
              </button>
            ))}
          </div>

          {/* 소분류 pills */}
          {!industrySearch && (
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
              {(INDUSTRY_CATALOG.find(g => g.id === industryGroup)?.items || []).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setBizType(item)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${bizType === item ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#BFDBFE]'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* 전체 업종 검색 */}
          <div className="mt-3">
            <div className="relative">
              <input
                type="text"
                value={industrySearch}
                onChange={e => setIndustrySearch(e.target.value)}
                placeholder="업종 직접 검색 (예: 치과, 필라테스, 인테리어)"
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 pr-8 text-xs focus:outline-none focus:border-[#3182F6] transition-colors"
              />
              {industrySearch && (
                <button
                  type="button"
                  onClick={() => setIndustrySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B95A1] hover:text-[#4E5968]"
                  aria-label="검색 초기화"
                >×</button>
              )}
            </div>
            {industrySearch && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                {INDUSTRY_LABELS
                  .filter(l => l.toLowerCase().includes(industrySearch.toLowerCase()))
                  .slice(0, 40)
                  .map(l => {
                    const grp = findIndustryGroup(l)
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setBizType(l)
                          if (grp) setIndustryGroup(grp.id)
                          setIndustrySearch('')
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${bizType === l ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#BFDBFE]'}`}
                      >
                        {grp?.emoji} {l}
                      </button>
                    )
                  })}
                {INDUSTRY_LABELS.filter(l => l.toLowerCase().includes(industrySearch.toLowerCase())).length === 0 && (
                  <span className="text-[11px] text-[#8B95A1] py-1">검색 결과 없음 — 아래 매장 소개에 자유롭게 입력하세요</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="store-desc" className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장 소개 (AI 참고용)</label>
          <textarea id="store-desc" value={storeDesc} onChange={e => setStoreDesc(e.target.value)} rows={2}
            placeholder="예: 강남역 10번 출구 도보 2분, 제주 원두 사용 스페셜티 카페. 감성 인테리어와 직접 구운 크로아상이 인기."
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-none" />
          <p className="text-[10px] text-[#8B95A1] mt-1">입력할수록 AI가 매장에 맞는 답변을 생성합니다</p>
        </div>
      </div>

      {/* 톤 + 길이 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="font-bold text-[#191F28] mb-3">답변 톤</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { v:'warm',      label:'따뜻하게',   desc:'다정하고 부드러운 어투' },
              { v:'polite',    label:'정중하게',   desc:'예의 바르고 격식 있는 어투' },
              { v:'pro',       label:'전문적으로', desc:'신뢰감 있는 전문가 어투' },
              { v:'witty',     label:'재치있게',   desc:'유머러스하고 센스 있는 어투' },
              { v:'calm',      label:'담백하게',   desc:'차분하고 간결한 어투' },
              { v:'energetic', label:'활발하게',   desc:'밝고 에너지 넘치는 어투' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setTone(opt.v)}
                className={`p-3 rounded-xl border-2 text-center transition-colors ${tone === opt.v ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#BFDBFE]'}`}>
                <div className="text-sm font-bold text-[#191F28]">{opt.label}</div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-[#191F28] mb-3">답변 길이</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { v:'short',  label:'짧게',  desc:'150자\u00B1' },
              { v:'medium', label:'보통',  desc:'250자\u00B1' },
              { v:'long',   label:'길게',  desc:'400자\u00B1' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setLength(opt.v)}
                className={`p-3 rounded-xl border-2 text-center transition-colors ${length === opt.v ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#BFDBFE]'}`}>
                <div className="text-sm font-bold text-[#191F28]">{opt.label}</div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* 성별 · 나이 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="font-bold text-[#191F28] mb-3">화자 성별</h3>
          <p className="text-xs text-[#8B95A1] mb-3">답변의 말투 느낌을 설정합니다</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { v:'none',    label:'미설정', desc:'기본' },
              { v:'male',    label:'남성',   desc:'남성적 어투' },
              { v:'female',  label:'여성',   desc:'여성적 어투' },
              { v:'neutral', label:'중성',   desc:'성별 무관' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setGender(opt.v)}
                className={`p-3 rounded-xl border-2 text-center transition-colors ${gender === opt.v ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#BFDBFE]'}`}>
                <div className="text-sm font-bold text-[#191F28]">{opt.label}</div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-[#191F28] mb-3">화자 연령대</h3>
          <p className="text-xs text-[#8B95A1] mb-3">답변 어투의 연령대 느낌을 설정합니다</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { v:'none', label:'미설정', desc:'기본' },
              { v:'20s',  label:'20대',  desc:'젊고 발랄' },
              { v:'30s',  label:'30대',  desc:'균형 잡힌' },
              { v:'40s',  label:'40대',  desc:'안정적인' },
              { v:'50s',  label:'50대+', desc:'노련한' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setAge(opt.v)}
                className={`p-3 rounded-xl border-2 text-center transition-colors ${age === opt.v ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#BFDBFE]'}`}>
                <div className="text-sm font-bold text-[#191F28]">{opt.label}</div>
                <div className="text-[10px] text-[#8B95A1] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 포함 요소 체크리스트 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">답변에 포함할 요소</h3>
        <div className="space-y-3">
          {([
            { k:'thanks',      label:'방문 감사 인사',        desc:'항상 감사 인사로 시작' },
            { k:'revisit',     label:'재방문 유도 문구',      desc:'"다음에도 꼭 찾아주세요" 류' },
            { k:'mention',     label:'리뷰 내용 직접 언급',   desc:'고객이 언급한 메뉴·서비스 호응' },
            { k:'personalize', label:'닉네임 개인화 인사',    desc:'"OO님," 으로 시작' },
            { k:'improve',     label:'개선 의지 표현',        desc:'부정 리뷰 시 진정성 있는 사과' },
            { k:'keyword',     label:'키워드 자연 포함',      desc:'SEO 핵심 키워드 1~2회 삽입' },
          ] as { k: keyof typeof includes; label: string; desc: string }[]).map(item => (
            <div key={item.k} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#191F28]">{item.label}</p>
                <p className="text-xs text-[#8B95A1]">{item.desc}</p>
              </div>
              <Toggle checked={includes[item.k]} onChange={v => setIncludes(p => ({ ...p, [item.k]: v }))} />
            </div>
          ))}
        </div>
      </div>

      {/* 고정 문구 + 제외 표현 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="closing" className="block text-xs font-semibold text-[#4E5968] mb-1.5">고정 마무리 문구</label>
          <input id="closing" value={closing} onChange={e => setClosing(e.target.value)}
            placeholder="예: 오늘도 행복한 하루 되세요 🌿"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          <p className="text-[10px] text-[#8B95A1] mt-1">모든 답변 마지막에 고정으로 들어갈 문구</p>
        </div>
        <div>
          <label htmlFor="excludes" className="block text-xs font-semibold text-[#4E5968] mb-1.5">사용 금지 표현</label>
          <input id="excludes" value={excludes} onChange={e => setExcludes(e.target.value)}
            placeholder="예: 죄송, 유감, 어떠셨나요"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          <p className="text-[10px] text-[#8B95A1] mt-1">쉼표로 구분 — AI가 절대 사용하지 않을 표현</p>
        </div>
      </div>

      {/* 자동 답변 ON/OFF */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#191F28]">자동 답변 활성화</p>
            <p className="text-xs text-[#8B95A1] mt-0.5">새 리뷰가 등록되면 AI가 즉시 자동 답변</p>
          </div>
          <Toggle checked={autoReply} onChange={setAutoReply} />
        </div>
        {autoReply && (
          <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-[#3182F6] font-medium">
            ⚡ 자동 답변 ON — 연동된 플랫폼에 리뷰가 등록되면 즉시 답변이 달립니다
          </div>
        )}
      </div>

      {/* AI 프롬프트 미리보기 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <button onClick={() => setShowPrompt(v => !v)}
          className="w-full flex items-center justify-between text-sm font-bold text-[#191F28]">
          <span>📄 AI 시스템 프롬프트 미리보기</span>
          <span className="text-[#8B95A1] font-normal text-xs">{showPrompt ? '접기' : '펼치기'}</span>
        </button>
        {showPrompt && (
          <pre className="mt-4 p-4 bg-[#F8F9FA] rounded-xl text-[11px] text-[#4E5968] whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto">
            {prompt}
          </pre>
        )}
      </div>

      {/* 테스트 답변 생성 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-1">테스트 답변 생성</h3>
        <p className="text-xs text-[#8B95A1] mb-4">실제 리뷰를 입력하면 AI 답변을 미리 확인할 수 있어요</p>
        <textarea value={testReview} onChange={e => setTestReview(e.target.value)} rows={3}
          placeholder="예: 커피가 정말 맛있었어요! 인테리어도 너무 예쁘고 직원분들도 친절하셨어요. 다음에 또 올게요~"
          className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-none mb-3" />
        <button onClick={handleTest} disabled={testing || !testReview.trim()}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${testing || !testReview.trim() ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
          {testing ? '생성 중...' : '답변 생성하기'}
        </button>
        {testResult && (
          <div className="mt-4 p-4 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
            <p className="text-[10px] font-bold text-[#3182F6] mb-2">AI 생성 답변</p>
            <p className="text-sm text-[#191F28] leading-relaxed whitespace-pre-wrap">{testResult}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NaverLogoS() { return <PlatformLogo platform="naver_place" size={32} /> }

function GoogleLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="white" stroke="#E5E8EB" strokeWidth="1.5"/><path d="M43.6 24.5c0-1.5-.14-3-.38-4.5H24v8.5h10.94c-.5 2.5-1.96 4.6-4.16 6v5h6.74c3.94-3.62 6.08-9 6.08-15z" fill="#4285F4"/><path d="M24 44c5.4 0 9.92-1.8 13.24-4.86l-6.46-5c-1.8 1.2-4.1 1.92-6.78 1.92-5.22 0-9.64-3.52-11.22-8.26H6.12v5.14C9.42 40.02 16.28 44 24 44z" fill="#34A853"/><path d="M12.78 27.8A11.94 11.94 0 0112.2 24c0-1.32.22-2.6.58-3.8v-5.14H6.12A20 20 0 004 24c0 3.22.78 6.28 2.12 9.14l6.66-5.34z" fill="#FBBC05"/><path d="M24 12.08c2.94 0 5.58 1.02 7.66 3l5.74-5.74C33.9 6.06 29.38 4 24 4 16.28 4 9.42 7.98 6.12 14.86l6.66 5.14C14.36 15.6 18.78 12.08 24 12.08z" fill="#EA4335"/></svg>)
}

function KakaoLogoS() { return <PlatformLogo platform="kakao_map" size={32} /> }

function BaeminLogoS() { return <PlatformLogo platform="baemin" size={32} /> }

function YogiyoLogoS() { return <PlatformLogo platform="yogiyo" size={32} /> }

function CoupangLogoS() { return <PlatformLogo platform="coupangeats" size={32} /> }

function YeoshinLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#003087"/><rect x="10" y="16" width="28" height="18" rx="3" stroke="white" strokeWidth="2.2" fill="none"/><rect x="10" y="22" width="28" height="4" fill="white"/><rect x="13" y="28" width="8" height="2.5" rx="1" fill="white" opacity="0.6"/><text x="24" y="12" fontSize="7" fontWeight="800" fill="white" fontFamily="Arial" textAnchor="middle">여신금융</text></svg>)
}

function HometaxLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#006AB4"/><path d="M24 11L9 22h4v14h10V28h2v8h10V22h4L24 11z" fill="white"/><text x="24" y="44" fontSize="6.5" fontWeight="800" fill="white" fontFamily="Arial" textAnchor="middle">홈택스</text></svg>)
}


function ConnectTab() {
  const PLATFORMS_8: Array<{ key: PlatformId; label: string; logo: any; color: string; desc: string; cat: string }> = [
    { key: 'naver',   label: '네이버 플레이스', logo: <NaverLogoS />,   color: '#03C75A', desc: '네이버 리뷰·검색 연동',      cat: '리뷰·검색' },
    { key: 'google',  label: '구글 비즈니스',   logo: <GoogleLogoS />,  color: '#4285F4', desc: '구글 마이비즈니스 연동',     cat: '리뷰·검색' },
    { key: 'kakao',   label: '카카오톡 채널',   logo: <KakaoLogoS />,   color: '#FEE500', desc: '카톡 알림톡·채널 연동',       cat: '메시지' },
    { key: 'baemin',  label: '배달의민족',      logo: <BaeminLogoS />,  color: '#2AC1BC', desc: '배민 주문·리뷰 관리',         cat: '배달' },
    { key: 'yogiyo',  label: '요기요',          logo: <YogiyoLogoS />,  color: '#FA3C00', desc: '요기요 주문·리뷰 연동',       cat: '배달' },
    { key: 'coupang', label: '쿠팡이츠',        logo: <CoupangLogoS />, color: '#FF4B30', desc: '쿠팡이츠 주문·리뷰 연동',     cat: '배달' },
    { key: 'yeoshin', label: '여신금융',        logo: <YeoshinLogoS />, color: '#003087', desc: '카드 매출·결제 데이터 연동',  cat: '금융·세무' },
    { key: 'hometax', label: '홈택스',          logo: <HometaxLogoS />, color: '#006AB4', desc: '부가세·세금 데이터 연동',     cat: '금융·세무' },
  ]

  const { connections, isConnected, connectedCount, setConnection, removeConnection } = useConnections()

  // 28차-3: 서버(platform_credentials) 연결 상태 병합
  const [serverConnected, setServerConnected] = useState<Record<string, { connected: boolean; storeName: string | null; accountMasked: string }>>({})

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        if (!j?.ok) return
        // slug → settings ConnectTab key 매핑 (37차-3: kakao_map 추가)
        const slugToKey: Record<string, string> = {
          naver_place: 'naver',
          baemin: 'baemin',
          yogiyo: 'yogiyo',
          coupangeats: 'coupang',
          kakao_map: 'kakao',
        }
        const map: Record<string, any> = {}
        for (const p of (j.platforms || [])) {
          const key = slugToKey[p.platform]
          if (!key) continue
          map[key] = {
            connected: !!p.connected,
            storeName: p.platform_store_name || null,
            accountMasked: p.account_id_masked || '',
          }
        }
        setServerConnected(map)
      } catch (_) {}
    })()
  }, [])

  // 서버 연결 정보 + 로컬 훅 정보 병합 (서버가 우선)
  const effectiveConnected = (key: PlatformId) => !!serverConnected[key]?.connected || isConnected(key)
  // 37차-3: kakao 도 서버 기반(kakao_map)으로 이동 → legacy 카운트에서 제거
  const effectiveCount =
    Object.values(serverConnected).filter(v => v.connected).length +
    (['google', 'yeoshin', 'hometax'] as PlatformId[]).filter(k => isConnected(k)).length

  // 37차-3: kakao → kakao_map 서버 슬러그 매핑 추가 (동의·자격증명 저장 경로 통일)
  const PLATFORM_SLUG_SERVER: Record<string, string> = {
    naver: 'naver_place',
    baemin: 'baemin',
    yogiyo: 'yogiyo',
    coupang: 'coupangeats',
    kakao: 'kakao_map',
  }

  const handleConnect = async (key: PlatformId, label: string) => {
    const serverPlatformSlug = PLATFORM_SLUG_SERVER[key]

    // 서버 기반 4개 플랫폼 → /my/platforms 로 이동 (실제 아이디/비번 연결)
    if (serverPlatformSlug) {
      if (serverConnected[key]?.connected) {
        // 해제 확인 → DELETE API 호출
        const ok = await confirmDialog(`${label} 연동을 해제할까요? (서버 자격증명 삭제)`, {
          title: '연동 해제',
          okText: '해제',
          danger: true,
        })
        if (!ok) return
        try {
          const res = await fetch(`/api/platform-accounts?platform=${serverPlatformSlug}`, {
            method: 'DELETE', credentials: 'include',
          })
          if (!res.ok) { toast.error('해제 실패'); return }
          setServerConnected(prev => ({ ...prev, [key]: { connected: false, storeName: null, accountMasked: '' } }))
          toast.success(`${label} 연동을 해제했어요`)
        } catch (_) { toast.error('네트워크 오류') }
        return
      }
      // 미연결 → /my/platforms 연결 페이지로 이동
      if (typeof window !== 'undefined') {
        window.location.href = `/my/platforms/${serverPlatformSlug}/connect`
      }
      return
    }

    // legacy 플랫폼 (google, kakao, yeoshin, hometax) → 기존 localStorage 플로우
    if (isConnected(key)) {
      const ok = await confirmDialog(`${label} 연동을 해제할까요?`, {
        title: '연동 해제',
        okText: '해제',
        danger: true,
      })
      if (!ok) return
      removeConnection(key)
      toast.success(`${label} 연동을 해제했어요`)
      return
    }
    const name = await promptDialog(`${label} 연동 매장명을 입력해주세요`, {
      title: `${label} 연동`,
      placeholder: '예: 하랑마케팅 본점',
      okText: '연동',
    })
    if (!name) return
    setConnection(key, { externalName: name })
    toast.success(`${label} 연동이 완료됐어요`)
  }

  return (
    <div className="space-y-5">
      {/* 헤더 + 카운터 */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#E5E8EB]">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="font-bold text-[#191F28]">플랫폼 연동 관리</h2>
          <span className="text-xs font-bold text-[#3182F6] bg-[#EFF6FF] px-2.5 py-1 rounded-full whitespace-nowrap">
            {effectiveCount} / {PLATFORMS_8.length} 연결됨
          </span>
        </div>
        <p className="text-xs text-[#8B95A1]">리뷰·주문·매출 데이터를 한 곳에서 관리해요. 네이버/카카오맵/배민/요기요/쿠팡이츠는 <a href="/my/platforms" className="text-[#3182F6] font-bold hover:underline">플랫폼 연결 관리</a>에서 아이디·비번 저장. 연동 상태는 /dashboard · /review-admin · /qr-admin 과 자동 동기화됩니다.</p>
      </div>

      {/* 카드 그리드 — review-admin 과 동일한 스타일 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {PLATFORMS_8.map(p => {
          const c = connections[p.key]
          const sv = serverConnected[p.key]
          const connected = effectiveConnected(p.key)
          return (
            <div key={p.key} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex-shrink-0">{p.logo}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#191F28] truncate">{p.label}</p>
                  {connected ? (
                    <p className="text-[10px] text-[#10B981] font-semibold">● 연결됨</p>
                  ) : (
                    <p className="text-[10px] text-[#8B95A1] font-medium">미연결</p>
                  )}
                </div>
              </div>

              {connected ? (
                <>
                  <div className="bg-[#F9FAFB] rounded-lg px-2.5 py-2 mb-2.5 min-h-[44px]">
                    <p className="text-[11px] text-[#8B95A1] mb-0.5">{sv?.connected ? '서버 저장' : '연결된 계정'}</p>
                    <p className="text-xs font-semibold text-[#191F28] truncate">{sv?.storeName || c?.externalName || '—'}</p>
                    {sv?.accountMasked && (
                      <p className="text-[10px] text-[#8B95A1] truncate mt-0.5">ID: {sv.accountMasked}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleConnect(p.key, p.label)}
                    className="w-full bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] text-xs font-bold py-2 rounded-lg transition"
                  >
                    연동 해제
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-[#8B95A1] mb-2.5 min-h-[44px]">
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1] font-medium mr-1">{p.cat}</span>
                    {p.desc}
                  </p>
                  <button
                    onClick={() => handleConnect(p.key, p.label)}
                    className="w-full text-xs font-bold py-2 rounded-lg text-white transition"
                    style={{ background: p.color }}
                  >
                    + 연결하기
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-[11px] text-[#8B95A1] px-1 space-y-1">
        <p>* 네이버/배민/요기요/쿠팡이츠는 <a href="/my/platforms" className="text-[#3182F6] hover:underline font-semibold">플랫폼 연결 관리</a>에서 아이디·비번이 AES-256 암호화되어 서버에 저장됩니다.</p>
        <p>* 구글/카카오/여신금융/홈택스는 이 기기의 브라우저에만 저장되며, /dashboard · /review-admin 에서 즉시 반영됩니다.</p>
      </div>
    </div>
  )
}

function ShowcaseCarousel({ items }: { items: Array<{ metric: string; label: string; feature: string; who: string; story: string; grad: string }> }) {
  const [idx, setIdx] = useState(0)
  const [visible] = useState(true)
  const s = items[idx]

  return (
    <div>
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.38s ease, transform 0.38s ease' }}>
        <div className={`bg-gradient-to-br ${s.grad} rounded-xl p-4 text-white mb-3`}>
          <p className="text-3xl font-black mb-0.5">{s.metric}</p>
          <p className="text-sm opacity-80">{s.label}</p>
        </div>
        <p className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold inline-block mb-1">{s.feature}</p>
        <p className="text-xs font-semibold text-[#191F28] mb-1">{s.who}</p>
        <p className="text-xs text-[#8B95A1]">{s.story}</p>
      </div>
      <div className="flex justify-center gap-1.5 mt-4">
        {items.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className="rounded-full transition-all duration-300" style={{ width: i === idx ? '16px' : '6px', height: '6px', background: i === idx ? '#3182F6' : '#E5E8EB' }} />
        ))}
      </div>
    </div>
  )
}

function PlanTab() {
  const SHOWCASE = [
    { metric: '98%',     label: '리뷰 답변률',    feature: 'AI 리뷰 자동 답글',   who: '강남구 네일샵',   story: 'AI가 매일 쏟아지는 리뷰를 진심 답변으로 처리',       grad: 'from-[#3182F6] to-[#1B64DA]' },
    { metric: '+47명',   label: '월 신규 고객',   feature: 'CRM 고객관리',        who: '홍대 카페',       story: '재방문 유도 메시지로 충성 고객 3배 확보',             grad: 'from-[#7C3AED] to-[#5B21B6]' },
    { metric: '+34%',    label: '재방문율 상승',  feature: '마케팅 성과 리포트',  who: '이태원 헤어샵',   story: '데이터 분석으로 마케팅 전략 최적화',                   grad: 'from-[#059669] to-[#047857]' },
    { metric: '1,200회', label: 'QR 월 스캔',     feature: 'QR 스탬프 적립',      who: '신촌 레스토랑',   story: 'QR 쿠폰 하나로 재방문율 2배 달성',                     grad: 'from-[#DC2626] to-[#B91C1C]' },
    { metric: '28%',     label: '알림톡 전환율',  feature: '알림톡 마케팅',       who: '합정 베이커리',   story: '타겟 알림톡 한 통에 당일 매출 폭발',                   grad: 'from-[#D97706] to-[#B45309]' },
  ]
  type CategoryFilter = '전체' | '사장님' | '마케터' | '공통'
  const [cart, setCart] = useState<string[]>([])
  const [filter, setFilter] = useState<CategoryFilter>('전체')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<{ cardName: string; last4: string } | null>(null)
  const [tossKey, setTossKey] = useState({ client: TOSS_CLIENT_KEY, secret: '' })
  const [tossSaved, setTossSaved] = useState(false)
  const [tossMode, setTossMode] = useState<'test' | 'live'>('test')
  const [tossReady, setTossReady] = useState(false)
  const [tossError, setTossError] = useState<string>('')
  // 베타 기간 — 정식 요금제 준비 중 (임시)
  const addToCart = (id: string) => { if (!cart.includes(id)) setCart(p => [...p, id]) }
  const removeFromCart = (id: string) => setCart(p => p.filter(i => i !== id))

  // 저장된 결제 수단 / 토스 키 복원 + 토스 SDK 로드 감지
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const pm = localStorage.getItem('localution.payment_method')
      if (pm) setPaymentMethod(JSON.parse(pm))
      const saved = localStorage.getItem('localution.toss_key')
      if (saved) {
        const parsed = JSON.parse(saved)
        setTossKey(prev => ({ client: parsed.client || prev.client, secret: parsed.secret || '' }))
      }
    } catch {}
    // 토스 SDK 로드 폴링 — 최대 10초
    let tries = 0
    const iv = setInterval(() => {
      tries += 1
      const w = window as unknown as { TossPayments?: unknown }
      if (w.TossPayments) { setTossReady(true); clearInterval(iv) }
      else if (tries > 50) { clearInterval(iv) }
    }, 200)
    return () => clearInterval(iv)
  }, [])

  // 토스페이먼츠 결제 수단 등록 (정기결제 빌링 인증)
  const openTossBillingAuth = async () => {
    setTossError('')
    if (typeof window === 'undefined') return
    const w = window as unknown as { TossPayments?: (key: string) => any }
    if (!w.TossPayments) {
      setTossError('토스페이먼츠 SDK 로딩 중입니다. 잠시 후 다시 눌러주세요.')
      return
    }
    try {
      const tp = w.TossPayments(tossKey.client || TOSS_CLIENT_KEY)
      // customerKey는 사용자별 고유 — 실서비스에서는 로그인 유저 ID 사용
      const customerKey = (() => {
        try {
          const existing = localStorage.getItem('localution.customer_key')
          if (existing) return existing
          const created = 'cust_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
          localStorage.setItem('localution.customer_key', created)
          return created
        } catch {
          return 'cust_anonymous_' + Date.now()
        }
      })()
      await tp.requestBillingAuth('카드', {
        customerKey,
        successUrl: window.location.origin + '/api/payments/billing/success?returnTo=' + encodeURIComponent('/settings?tab=plan&billing=ok'),
        failUrl:    window.location.origin + '/api/payments/billing/fail?returnTo='    + encodeURIComponent('/settings?tab=plan&billing=fail'),
      })
    } catch (e: any) {
      setTossError('결제창 호출 실패: ' + (e?.message || String(e)))
    }
  }

  const saveTossKey = () => {
    try { localStorage.setItem('localution.toss_key', JSON.stringify(tossKey)) } catch {}
    setTossSaved(true)
    setTimeout(() => setTossSaved(false), 2500)
  }

  const removePaymentMethod = () => {
    setPaymentMethod(null)
    try { localStorage.removeItem('localution.payment_method') } catch {}
  }

  // URL 쿼리 ?billing=ok 이면 성공 표시 (billing 등록 후 리다이렉트)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'ok') {
      const demo = { cardName: '토스 빌링 등록 완료', last4: '****' }
      setPaymentMethod(demo)
      try { localStorage.setItem('localution.payment_method', JSON.stringify(demo)) } catch {}
    }
  }, [])
  const cartFeatures = FEATURES.filter(f => cart.includes(f.id))
  const filteredFeatures = filter === '전체' ? FEATURES : FEATURES.filter(f => f.category === filter)
  // /pricing 페이지와 동일한 묶음 할인 티어 — 정식 요금제 시 적용 예정 (임시 안내)
  const nextTier = cart.length < 3 ? { need: 3 - cart.length, rate: 10 }
                 : cart.length < 5 ? { need: 5 - cart.length, rate: 15 }
                 : cart.length < 8 ? { need: 8 - cart.length, rate: 20 }
                 : null

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-[#191F28]">베타 무료 플랜</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-[#3182F6] font-semibold">임시 요금제</span>
                {cancelled
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">해지 예약됨</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">이용 중</span>
                }
              </div>
              <p className="text-[#8B95A1] text-sm mt-1">
                <span className="text-[#191F28] font-bold">월 0원 · 전 기능 무료</span>
                <span className="ml-1">(정식 요금제 준비 중)</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8B95A1]">다음 결제일</p>
              <p className="text-sm font-semibold text-[#191F28] mt-0.5">—</p>
              <p className="text-[10px] text-[#B0B8C1] mt-0.5">베타 기간 무료</p>
            </div>
          </div>
          {cancelled && (
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold text-red-700 mb-1">해지가 예약되었습니다</p>
              <p className="text-red-600 text-xs">베타 기간 종료 후 자동 종료 · 해지 후 7일 재가입 제한</p>
            </div>
          )}
          <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-[#3182F6] leading-relaxed">
            <p className="font-semibold mb-0.5">🎁 베타 오픈 기념 — 전 기능 무료 이용 중</p>
            <p className="text-[#4E5968]">정식 요금제 안내는 <Link href="/pricing" className="underline font-semibold text-[#3182F6]">요금제 페이지</Link>에서 미리 확인하실 수 있어요. 금액은 임시이며, 베타 종료 전 사전 공지드립니다.</p>
          </div>
          <div className="flex items-center justify-between border-t border-[#F2F4F6] pt-4">
            <p className="text-xs text-[#8B95A1]">포함: 리뷰·CRM·QR·키워드·블로그·SNS 등 12개 전체</p>
            {!cancelled && <button onClick={() => setShowCancelModal(true)} className="text-xs text-red-400 hover:text-red-600 underline">해지하기</button>}
          </div>
        </div>
        {/* 1) 기능 선택 — 결제 수단보다 위에 배치 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#191F28]">기능 선택 · 12개</h3>
            <span className="text-xs text-[#8B95A1]">베타 기간 전체 무료</span>
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {(['전체', '사장님', '마케터', '공통'] as const).map(f => {
              const active = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    active ? 'bg-[#3182F6] text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB] hover:bg-gray-50'
                  }`}>
                  {f === '전체' ? '전체' : `${f}용`}
                </button>
              )
            })}
          </div>
          <div className="space-y-3">
            {filteredFeatures.map(f => {
              const inCart = cart.includes(f.id)
              return (
                <div key={f.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0" style={{ background: f.bg, color: f.color }}>{f.short}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[#191F28] text-sm">{f.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${CATEGORY_COLOR[f.category]}`}>{f.category}용</span>
                        {f.popular && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-600">인기</span>}
                      </div>
                      <p className="text-xs text-[#8B95A1] mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-[#00C471]">무료</span>
                    <button onClick={() => inCart ? removeFromCart(f.id) : addToCart(f.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${inCart ? 'bg-[#F2F4F6] text-[#4E5968]' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
                      {inCart ? '담김' : '담기'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2) 결제 수단 — 토스페이먼츠 빌링 인증 실제 호출 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#191F28]">결제 수단</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#3182F6] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6] animate-pulse"></span>
              토스페이먼츠 보안 결제
            </span>
          </div>
          {paymentMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-[#3182F6] to-[#1B64DA] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CARD</span>
                </div>
                <div>
                  <p className="font-semibold text-[#191F28] text-sm">{paymentMethod.cardName}</p>
                  <p className="text-xs text-[#8B95A1]">**** **** **** {paymentMethod.last4}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={openTossBillingAuth} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]">변경</button>
                <button onClick={removePaymentMethod} className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50">제거</button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={openTossBillingAuth} className="w-full py-4 rounded-xl border-2 border-dashed border-[#E5E8EB] text-sm font-medium text-[#3182F6] hover:border-[#3182F6] hover:bg-[#EFF6FF] transition-colors">
                + 카드 등록하기 (토스페이먼츠 보안 결제창)
              </button>
              <p className="text-[11px] text-[#B0B8C1] mt-2 text-center">실제 결제 없음 · 베타 기간은 결제 수단 등록만 진행</p>
            </>
          )}
          {tossError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{tossError}</div>
          )}
        </div>

        {/* 3) 토스페이먼츠 연동 설정 — 운영자(대표님) 전용 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#E5E8EB]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center text-xs font-black text-white">Toss</div>
            <div>
              <p className="font-bold text-[#191F28]">토스페이먼츠 연동 설정</p>
              <p className="text-xs text-[#8B95A1]">정기결제 API 키 · 운영자 전용</p>
            </div>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${tossReady ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-[#3182F6]'}`}>
              {tossReady ? 'SDK 로드 완료' : 'SDK 로딩 중'}
            </span>
          </div>
          <div className="flex gap-2 mb-4">
            {(['test', 'live'] as const).map(m => (
              <button key={m} onClick={() => setTossMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tossMode === m ? (m === 'live' ? 'bg-red-500 text-white' : 'bg-[#3182F6] text-white') : 'bg-[#F2F4F6] text-[#4E5968]'}`}>
                {m === 'test' ? '테스트 모드' : '라이브 모드'}
              </button>
            ))}
          </div>
          <div className="space-y-3 mb-4">
            <div>
              <label htmlFor="toss-key-client" className="block text-xs font-semibold text-[#4E5968] mb-1.5">클라이언트 키</label>
              <input id="toss-key-client" type="text" value={tossKey.client} onChange={e => setTossKey(p => ({ ...p, client: e.target.value }))} placeholder={`${tossMode}_ck_...`} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
              <p className="text-[10px] text-[#B0B8C1] mt-1">기본값은 토스 공식 테스트 키 — 실제 결제 발생 X</p>
            </div>
            <div>
              <label htmlFor="toss-key-secret" className="block text-xs font-semibold text-[#4E5968] mb-1.5">시크릿 키 (서버 전용)</label>
              <input id="toss-key-secret" type="password" value={tossKey.secret} onChange={e => setTossKey(p => ({ ...p, secret: e.target.value }))} placeholder={`${tossMode}_sk_... (Vercel 환경변수에 저장 권장)`} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
              <p className="text-[10px] text-[#B0B8C1] mt-1">⚠️ 시크릿 키는 브라우저에 저장하지 말고 Vercel 환경변수 <span className="font-mono">TOSS_SECRET_KEY</span>에 등록</p>
            </div>
          </div>
          <div className="mb-4 p-3 bg-blue-50 rounded-xl text-xs text-[#3182F6] space-y-1">
            <p className="font-semibold">연동 체크리스트</p>
            <p>1. 토스페이먼츠 개발자센터 가입 · 정기결제(빌링) 서비스 신청</p>
            <p>2. Vercel 환경변수 추가: <span className="font-mono">NEXT_PUBLIC_TOSS_CLIENT_KEY</span> / <span className="font-mono">TOSS_SECRET_KEY</span></p>
            <p>3. 성공 콜백: <span className="font-mono">/api/payments/billing/success</span></p>
            <p>4. 실패 콜백: <span className="font-mono">/api/payments/billing/fail</span></p>
            <p>5. 웹훅: <span className="font-mono">/api/payments/webhook</span></p>
          </div>
          <button
            onClick={saveTossKey}
            disabled={!tossKey.client}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${tossSaved ? 'bg-green-500 text-white' : !tossKey.client ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}
          >
            {tossSaved ? '✓ 저장됨' : '키 저장하기'}
          </button>
        </div>
      </div>
      <div className="w-[360px] flex-shrink-0 hidden lg:block space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#191F28] mb-4 flex items-center gap-2">
            선택 기능
            {cart.length > 0 && (
              <span className="text-[10px] bg-[#3182F6] text-white rounded-full w-5 h-5 flex items-center justify-center">{cart.length}</span>
            )}
          </h3>
          {cart.length === 0 ? (
            <p className="text-sm text-[#8B95A1] text-center py-4">기능을 선택하면 여기 표시됩니다</p>
          ) : (
            <>
              <div className="space-y-2.5 mb-4 max-h-60 overflow-y-auto">
                {cartFeatures.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: f.bg, color: f.color }}>{f.short}</span>
                      <span className="text-xs font-medium text-[#191F28] truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-[#00C471] font-semibold">무료</span>
                      <button onClick={() => removeFromCart(f.id)} className="text-[#B0B8C1] hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#F2F4F6] pt-3 mb-3 space-y-1.5">
                <div className="flex justify-between text-xs text-[#8B95A1]">
                  <span>정식 요금 예상(임시)</span>
                  <span className="line-through">—</span>
                </div>
                <div className="flex justify-between font-bold text-[#191F28] pt-1 border-t border-[#F2F4F6]">
                  <span>월 합계</span>
                  <span className="text-[#00C471]">0원 (무료)</span>
                </div>
                <p className="text-[10px] text-[#B0B8C1] text-right">베타 기간 · 정식 요금제 준비 중</p>
              </div>
              {nextTier ? (
                <p className="text-xs text-[#3182F6] bg-blue-50 rounded-lg px-3 py-2 mb-3 text-center font-semibold">
                  정식 요금 시 <b>{nextTier.need}개</b> 더 담으면 <b>{nextTier.rate}%</b> 할인 예정
                </p>
              ) : (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3 text-center font-semibold">최대 할인 티어(20%) 달성!</p>
              )}
              <button className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">선택 기능 저장</button>
              <p className="text-[11px] text-[#B0B8C1] text-center mt-2">베타 기간 내 언제든 추가/해제 가능</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#8B95A1] mb-3 uppercase tracking-wider">로컬루션 성과</p>
          <ShowcaseCarousel items={SHOWCASE} />
        </div>
      </div>
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-[#191F28] text-lg mb-4">정말 해지하시겠어요?</h3>
            <div className="bg-red-50 rounded-xl p-4 mb-5 space-y-2 text-sm text-[#4E5968]">
              <p><strong>베타 기간 종료일</strong>까지 서비스 이용 가능</p>
              <p>해지 후 <strong>7일간</strong> 재가입 불가</p>
              <p>정식 요금제 전환 시 결제 없이 종료</p>
              <p>데이터 30일간 보관 후 삭제</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-sm font-semibold text-[#4E5968]">취소</button>
              <button onClick={() => { setCancelled(true); setShowCancelModal(false) }} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">해지 확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsInner() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') || ''
  const [activeTab, setActiveTab] = useState<Tab>(resolveTab(tabParam))

  // 탭별 브랜딩 배지 (app/lib/settings-tabs.ts 에서 중앙 관리)
  const HERO = TAB_HERO
  const hero = HERO[activeTab]

  return (
    <>
      {/* 토스페이먼츠 SDK — 플랜 관리 탭에서 결제 수단 등록 시 사용 */}
      <Script src="https://js.tosspayments.com/v1/payment" strategy="afterInteractive" />
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col overflow-x-hidden">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 min-w-0 max-w-full md:ml-[220px] pt-14 md:pt-0">
            {/* LOCALUTION_HERO_BANNER */}
            <section className={`bg-gradient-to-br ${hero.grad} text-white`}>
              <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl md:text-4xl flex-shrink-0">
                  {hero.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-black tracking-tight truncate">설정 · {activeTab === '플랜 관리 (결제내역)' ? '플랜·결제' : activeTab}</h1>
                  <p className="text-white/85 text-xs md:text-sm mt-1 leading-relaxed">{hero.sub}</p>
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 flex-shrink-0">
                  로컬루션
                </div>
              </div>
            </section>

            <div className="max-w-5xl mx-auto p-4 md:p-8">
              <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto scrollbar-hide -mx-1 px-1">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 md:flex-1 min-w-fit py-2 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-[#3182F6] text-white' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}
                  >
                    {tab === '플랜 관리 (결제내역)' ? '플랜·결제' : tab}
                  </button>
                ))}
              </div>
              {activeTab === '매장 정보' && <StoreTab />}
              {activeTab === '알림 설정' && <NotifyTab />}
              {activeTab === 'AI 설정' && <AITab />}
              {activeTab === '연동 관리' && <ConnectTab />}
              {activeTab === '플랜 관리 (결제내역)' && <PlanTab />}
            </div>
          </main>
        </div>
        {/* 공통 Footer */}
        <Footer />
      </div>
    </>
  )
}


export default function Settings() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center"><p className="text-[#8B95A1]">\uB85C\uB529 \uC911...</p></div>}>
      <SettingsInner />
    </Suspense>
  )
}



