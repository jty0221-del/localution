'use client'
import { useSearchParams } from 'next/navigation'
export const dynamic = 'force-dynamic'
import { useState, Suspense, useEffect, useRef } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
// Footer import removed — component may not exist in repo

const TABS = ['매장 정보', '알림 설정', 'AI 설정', '리뷰 관리', '연동 관리', '플랜 관리 (결제내역)'] as const
type Tab = typeof TABS[number]

const FEATURES = [
  { id: 'ai-review', name: 'AI 리뷰 자동 답변', price: 9900, short: 'AI', bg: '#EFF6FF', color: '#3182F6', desc: '리뷰에 AI가 자동으로 답변' },
  { id: 'report', name: '주간 리포트', price: 4900, short: '리포', bg: '#F5F3FF', color: '#8B5CF6', desc: '매주 성과 분석 리포트 발송' },
  { id: 'crm', name: 'CRM 고객 관리', price: 14900, short: 'CRM', bg: '#ECFDF5', color: '#059669', desc: '고객 DB 관리 및 재방문 유도' },
  { id: 'qr', name: 'QR 코드 관리', price: 4900, short: 'QR', bg: '#FFF7ED', color: '#EA580C', desc: 'QR 코드 생성 및 스캔 분석' },
  { id: 'sms', name: 'SMS 마케팅', price: 19900, short: 'SMS', bg: '#FFF1F2', color: '#E11D48', desc: '타겟 고객 문자 발송' },
  { id: 'spotlight', name: '커뮤니티 우선 노출', price: 9900, short: '노출', bg: '#FEFCE8', color: '#CA8A04', desc: '로컬루션 커뮤니티 상단 노출' },
]

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
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [searchResults, setSearchResults] = useState<NaverPlace[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isMock, setIsMock] = useState(false)

  const handleNaverSync = async () => {
    const query = form.naverUrl.trim() || form.name.trim()
    if (!query) { setSyncError('네이버 플레이스 URL 또는 매장명을 입력해주세요'); return }
    setSyncing(true); setSyncError(''); setShowResults(false)
    try {
      const res = await fetch(`/api/naver-place/search?query=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) { setSyncError(data.error || '연동에 실패했습니다'); return }
      if (!data.items || data.items.length === 0) {
        setSyncError('검색 결과가 없습니다. 다른 키워드로 시도해보세요.')
        return
      }
      if (data._mock) {
        setIsMock(true)
        setSyncError('API 키 미설정 — 테스트 목업 데이터입니다. Vercel 환경변수를 설정하세요.')
      } else {
        setIsMock(false)
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

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
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
              placeholder="https://naver.me/... 또는 매장명 검색"
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
          <p className="text-xs text-[#3182F6] mt-2 opacity-70">URL 붙여넣기 또는 매장명으로 검색 → 매장명·주소·전화번호·카테고리 자동 입력</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장명</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="우리 카페" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">업종</label>
            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="카페·베이커리" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">전화번호</label>
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="02-1234-5678" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">주소</label>
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="서울시 마포구 합정동 123-4" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">키워드</label>
          <div className="flex gap-2">
            <div className="w-[38%]">
              <input value={form.mainKeyword} onChange={e => setForm(p => ({ ...p, mainKeyword: e.target.value }))} placeholder="메인 키워드" className="w-full border-2 border-[#3182F6] rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-[#F8FAFF] font-semibold" />
              <p className="text-[10px] text-[#3182F6] mt-1 font-semibold pl-0.5">메인 키워드 1개</p>
            </div>
            <div className="flex-1">
              <input value={form.subKeywords} onChange={e => setForm(p => ({ ...p, subKeywords: e.target.value }))} placeholder="서브 키워드 (쉼표로 구분)" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
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
          <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장 소개</label>
          <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} rows={3} placeholder="AI 리뷰 답변 작성 시 참고하는 문구입니다. 매장 특징을 입력하세요." className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-none" />
        </div>
        <button onClick={handleSave} className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'}`}>
          {saved ? '저장됨' : '저장하기'}
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
          <NaverMapBox address={mapAddress} />
        </div>
        <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FDE68A]">
          <p className="text-xs font-bold text-[#92400E] mb-2">네이버 지도 API 키 설정</p>
          <p className="text-[11px] text-[#78350F] leading-relaxed mb-2">실제 지도 렌더링을 위해 Vercel 환경변수에 추가해주세요:</p>
          <div className="bg-white rounded-lg p-2 font-mono text-[10px] text-[#4E5968] space-y-1">
            <p>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=발급받은_ID</p>
            <p className="text-[#9CA3AF]"># 플레이스 검색용</p>
            <p>NAVER_CLIENT_ID=발급받은_ID</p>
            <p>NAVER_CLIENT_SECRET=발급받은_시크릿</p>
          </div>
          <a href="https://console.ncloud.com/naver-service/application" target="_blank" rel="noopener noreferrer" className="block mt-2 text-[11px] text-[#3182F6] hover:underline font-semibold">
            네이버 클라우드 플랫폼에서 Maps API 발급 →
          </a>
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
          <label className="block text-xs font-semibold text-[#4E5968] mb-2">업종 선택</label>
          <div className="flex flex-wrap gap-2">
            {['카페·베이커리','음식점','헤어샵','네일샵','피부관리','마사지·스파','의원·한의원','기타'].map(b => (
              <button key={b} onClick={() => setBizType(b)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors ${bizType === b ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]'}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장 소개 (AI 참고용)</label>
          <textarea value={storeDesc} onChange={e => setStoreDesc(e.target.value)} rows={2}
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
          <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">고정 마무리 문구</label>
          <input value={closing} onChange={e => setClosing(e.target.value)}
            placeholder="예: 오늘도 행복한 하루 되세요 🌿"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          <p className="text-[10px] text-[#8B95A1] mt-1">모든 답변 마지막에 고정으로 들어갈 문구</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">사용 금지 표현</label>
          <input value={excludes} onChange={e => setExcludes(e.target.value)}
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

function NaverLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#03C75A"/><path d="M9 39V9h8L31 27V9h8v30h-8L17 21v18H9Z" fill="white"/></svg>)
}

function GoogleLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="white" stroke="#E5E8EB" strokeWidth="1.5"/><path d="M43.6 24.5c0-1.5-.14-3-.38-4.5H24v8.5h10.94c-.5 2.5-1.96 4.6-4.16 6v5h6.74c3.94-3.62 6.08-9 6.08-15z" fill="#4285F4"/><path d="M24 44c5.4 0 9.92-1.8 13.24-4.86l-6.46-5c-1.8 1.2-4.1 1.92-6.78 1.92-5.22 0-9.64-3.52-11.22-8.26H6.12v5.14C9.42 40.02 16.28 44 24 44z" fill="#34A853"/><path d="M12.78 27.8A11.94 11.94 0 0112.2 24c0-1.32.22-2.6.58-3.8v-5.14H6.12A20 20 0 004 24c0 3.22.78 6.28 2.12 9.14l6.66-5.34z" fill="#FBBC05"/><path d="M24 12.08c2.94 0 5.58 1.02 7.66 3l5.74-5.74C33.9 6.06 29.38 4 24 4 16.28 4 9.42 7.98 6.12 14.86l6.66 5.14C14.36 15.6 18.78 12.08 24 12.08z" fill="#EA4335"/></svg>)
}

function KakaoLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#FEE500"/><path d="M24 10C16.27 10 10 14.69 10 20.5c0 3.89 2.46 7.3 6.2 9.38L14.6 36l6.8-4.5c.84.11 1.71.17 2.6.17 7.73 0 14-4.69 14-10.5S31.73 10 24 10z" fill="#3B1E1E"/></svg>)
}

function BaeminLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#2AC1BC"/><text x="24" y="30" fontSize="17" fontWeight="900" fill="#1A1A1A" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" textAnchor="middle" letterSpacing="-0.5">배민</text></svg>)
}

function YogiyoLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#E5007F"/><text x="24" y="23" fontSize="11" fontWeight="900" fill="white" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" textAnchor="middle">요기요</text><circle cx="24" cy="33" r="4" fill="white"/><path d="M16 43 Q24 39 32 43" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/></svg>)
}

function CoupangLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/><text x="5" y="25" fontSize="9.5" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="0.2"><tspan fill="#E31837">c</tspan><tspan fill="#F4A900">o</tspan><tspan fill="#E31837">u</tspan><tspan fill="#5BAD48">p</tspan><tspan fill="#3B79BE">a</tspan><tspan fill="#E31837">n</tspan><tspan fill="#F4A900">g</tspan></text><text x="5" y="39" fontSize="13" fontWeight="900" fill="#4A2C0A" fontFamily="Arial,sans-serif">eats</text></svg>)
}

function YeoshinLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#003087"/><rect x="10" y="16" width="28" height="18" rx="3" stroke="white" strokeWidth="2.2" fill="none"/><rect x="10" y="22" width="28" height="4" fill="white"/><rect x="13" y="28" width="8" height="2.5" rx="1" fill="white" opacity="0.6"/><text x="24" y="12" fontSize="7" fontWeight="800" fill="white" fontFamily="Arial" textAnchor="middle">여신금융</text></svg>)
}

function HometaxLogoS() {
  return (<svg width="32" height="32" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="10" fill="#006AB4"/><path d="M24 11L9 22h4v14h10V28h2v8h10V22h4L24 11z" fill="white"/><text x="24" y="44" fontSize="6.5" fontWeight="800" fill="white" fontFamily="Arial" textAnchor="middle">홈택스</text></svg>)
}

const REVIEW_PLATFORMS = [
  { key: 'naver',  label: '네이버',     color: '#03C75A', bg: '#E8FBF0', icon: 'N', desc: '네이버 플레이스 리뷰' },
  { key: 'google', label: '구글',       color: '#4285F4', bg: '#EFF6FF', icon: 'G', desc: '구글 비즈니스 리뷰' },
  { key: 'kakao',  label: '카카오',     color: '#F59E0B', bg: '#FFFBEB', icon: 'K', desc: '카카오맵 리뷰' },
  { key: 'baemin', label: '배달의민족', color: '#2AC1BC', bg: '#EFFEFE', icon: 'B', desc: '배달의민족 리뷰' },
  { key: 'yogiyo', label: '요기요',     color: '#FA0050', bg: '#FFF1F5', icon: 'Y', desc: '요기요 리뷰' },
  { key: 'coupang',label: '쿠팡이츠',  color: '#FF4B30', bg: '#FFF3F1', icon: 'C', desc: '쿠팡이츠 리뷰' },
] as const
type ReviewPlatformKey = typeof REVIEW_PLATFORMS[number]['key']

const MOCK_REVIEWS: Record<ReviewPlatformKey, Array<{ id:number; name:string; rating:number; text:string; date:string; replied:boolean }>> = {
  naver: [
    { id:1, name:'맛집탐방러', rating:5, text:'진짜 너무 맛있었어요! 분위기도 좋고 직원도 친절해서 완전 만족이에요 다음에 또 올게요', date:'2시간 전', replied:true },
    { id:2, name:'서울카페어', rating:4, text:'커피는 맛있는데 좀 비싼 편이에요. 그래도 인테리어가 예뻐서 사진 찍기 좋아요', date:'1일 전', replied:false },
    { id:3, name:'동네주민', rating:3, text:'대기가 좀 길었어요. 음식은 평균 이상이고 청결은 좋았습니다', date:'3일 전', replied:false },
  ],
  google: [
    { id:1, name:'John K.', rating:5, text:'Excellent service and amazing food! Will definitely come back', date:'1일 전', replied:false },
    { id:2, name:'이현주', rating:4, text:'분위기 좋고 음식 맛있어요. 주차가 좀 불편한 게 아쉬워요', date:'2일 전', replied:true },
    { id:3, name:'박성민', rating:2, text:'대기시간이 너무 길었고 직원이 불친절했어요', date:'5일 전', replied:false },
  ],
  kakao: [
    { id:1, name:'여행자A', rating:5, text:'지도로 보고 왔는데 기대 이상이었어요! 추천합니다', date:'3시간 전', replied:false },
    { id:2, name:'단골손님', rating:5, text:'항상 오는 곳인데 오늘도 역시 좋았어요', date:'2일 전', replied:true },
  ],
  baemin: [
    { id:1, name:'배달왕', rating:5, text:'배달 빠르고 음식 맛있어요! 포장도 꼼꼼하게 해주셨어요', date:'1시간 전', replied:false },
    { id:2, name:'자취생', rating:4, text:'맛은 있는데 양이 조금 적어요. 그래도 맛있어서 또 시킬 것 같아요', date:'5시간 전', replied:false },
    { id:3, name:'주부9단', rating:3, text:'배달이 좀 늦게 왔어요. 음식은 맛있었는데 식어있었어요', date:'1일 전', replied:true },
  ],
  yogiyo: [
    { id:1, name:'야식러버', rating:5, text:'야식으로 시켰는데 완전 맛있었어요!! 사장님 리뷰 꼭 봐주세요', date:'4시간 전', replied:false },
    { id:2, name:'자취중', rating:4, text:'맛 좋고 서비스도 좋아요. 자주 이용하겠습니다', date:'2일 전', replied:true },
  ],
  coupang: [
    { id:1, name:'로켓배달팬', rating:5, text:'쿠팡이츠로 처음 시켰는데 빠르고 맛있어요!', date:'6시간 전', replied:false },
    { id:2, name:'음식평론가', rating:4, text:'가성비 좋고 맛있어요. 포장이 조금 아쉽지만 전반적으로 만족', date:'3일 전', replied:false },
  ],
}

function ReviewTab() {
  const [activePlat, setActivePlat] = useState<ReviewPlatformKey>('naver')
  const [connected, setConnected] = useState<Record<ReviewPlatformKey, boolean>>({
    naver: true, google: true, baemin: false, yogiyo: false, coupang: false,
  })
  const [autoReply, setAutoReply] = useState<Record<ReviewPlatformKey, boolean>>({
    naver: true, google: false, kakao: false, baemin: false, yogiyo: false, coupang: false,
  })
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [generatedReplies, setGeneratedReplies] = useState<Record<number, string>>({})
  const [langTag, setLangTag] = useState<Record<number, string>>({})

  // 매장 정보 — 매장 정보 탭 localStorage 동기화
  const [storeCtx, setStoreCtx] = useState({
    bizType: '', storeName: '', region: '', mainKeyword: '', subKeywords: '', storeDesc: '',
    aiTone: 'warm', aiLength: 'medium',
    aiIncludes: { thanks: true, revisit: true, mention: true, personalize: false, improve: true, keyword: true },
    aiClosing: '', aiExcludes: '',
  })
  const [showCtx, setShowCtx] = useState(false)

  // localStorage에서 저장된 설정 로드
  const loadCtx = () => {
    try {
      const s = localStorage.getItem('localution_store') || '{}'
      const ai = localStorage.getItem('localution_ai') || '{}'
      const sd = JSON.parse(s); const ad = JSON.parse(ai)
      setStoreCtx(p => ({
        ...p,
        bizType: sd.category || p.bizType,
        storeName: sd.name || p.storeName,
        region: sd.region || sd.address?.split(' ').slice(0, 2).join(' ') || p.region,
        mainKeyword: sd.mainKeyword || p.mainKeyword,
        subKeywords: sd.subKeywords || p.subKeywords,
        storeDesc: sd.desc || p.storeDesc,
        aiTone: ad.tone || p.aiTone,
        aiLength: ad.length || p.aiLength,
        aiIncludes: ad.includes || p.aiIncludes,
        aiClosing: ad.closing || p.aiClosing,
        aiExcludes: ad.excludes || p.aiExcludes,
      }))
    } catch {}
  }
  // 첫 렌더 시 로드
  useEffect(() => { loadCtx() }, [])

  const plat = REVIEW_PLATFORMS.find(p => p.key === activePlat)!
  const reviews = MOCK_REVIEWS[activePlat]
  const total = reviews.length
  const unanswered = reviews.filter(r => !r.replied).length
  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
  const replyRate = Math.round(((total - unanswered) / total) * 100)

  const handleGenerate = async (reviewId: number, reviewText: string) => {
    setGeneratingId(reviewId)
    setGeneratedReplies(p => { const n = { ...p }; delete n[reviewId]; return n })
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: reviewText,
          platform: plat.label,
          bizType: storeCtx.bizType,
          storeName: storeCtx.storeName,
          region: storeCtx.region,
          mainKeyword: storeCtx.mainKeyword,
          subKeywords: storeCtx.subKeywords,
          storeDesc: storeCtx.storeDesc,
          aiSettings: {
            tone: storeCtx.aiTone,
            length: storeCtx.aiLength,
            includes: storeCtx.aiIncludes,
            closing: storeCtx.aiClosing,
            excludes: storeCtx.aiExcludes,
          },
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setGeneratedReplies(p => ({ ...p, [reviewId]: data.reply }))
        setLangTag(p => ({ ...p, [reviewId]: data.lang || 'ko' }))
      } else {
        setGeneratedReplies(p => ({ ...p, [reviewId]: '답변 생성에 실패했습니다. 다시 시도해주세요.' }))
      }
    } catch {
      setGeneratedReplies(p => ({ ...p, [reviewId]: 'API 연결 오류 — AI 설정에서 API 키를 확인하세요.' }))
    } finally {
      setGeneratingId(null)
    }
  }

  const LANG_LABEL: Record<string, string> = { ko:'🇰🇷 한국어', en:'🇺🇸 영어', ja:'🇯🇵 일본어', zh:'🇨🇳 중국어', ar:'🇸🇦 아랍어' }

  return (
    <div className="space-y-5">
      {/* AI 참고 매장 정보 배너 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-[#3182F6]">
        <button onClick={() => setShowCtx(v => !v)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3182F6]">🤖 AI 답변 참고 정보</span>
            {storeCtx.storeName && <span className="text-xs bg-[#EFF6FF] text-[#3182F6] px-2 py-0.5 rounded-full font-semibold">{storeCtx.storeName}</span>}
            {storeCtx.mainKeyword && <span className="text-xs bg-[#F0FDF4] text-[#059669] px-2 py-0.5 rounded-full font-semibold">#{storeCtx.mainKeyword}</span>}
            {!storeCtx.storeName && !storeCtx.mainKeyword && <span className="text-xs text-[#8B95A1]">매장 정보 탭에서 설정하면 AI 답변 품질이 올라갑니다</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); loadCtx() }} className="text-[10px] px-2 py-0.5 rounded bg-[#F2F4F6] text-[#4E5968] font-medium">새로고침</button>
            <span className="text-[#8B95A1] text-xs">{showCtx ? '▲' : '▼'}</span>
          </div>
        </button>
        {showCtx && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 pt-3 border-t border-[#F2F4F6]">
            {[
              { label:'업종', val: storeCtx.bizType },
              { label:'매장명', val: storeCtx.storeName },
              { label:'메인키워드', val: storeCtx.mainKeyword },
              { label:'서브키워드', val: storeCtx.subKeywords },
              { label:'AI 톤', val: ({ warm:'따뜻하게', polite:'정중하게', pro:'전문적으로', witty:'재치있게', calm:'담백하게', energetic:'활발하게' })[storeCtx.aiTone] || storeCtx.aiTone },
              { label:'답변 길이', val: ({ short:'짧게 150자\u00B1', medium:'보통 250자\u00B1', long:'길게 400자\u00B1' })[storeCtx.aiLength] || storeCtx.aiLength },
            ].map(row => (
              <div key={row.label} className="flex gap-2 items-start">
                <span className="text-[10px] text-[#8B95A1] font-semibold w-20 flex-shrink-0">{row.label}</span>
                <span className="text-[10px] text-[#4E5968]">{row.val || '—'}</span>
              </div>
            ))}
            {storeCtx.storeDesc && (
              <div className="col-span-2 flex gap-2 items-start">
                <span className="text-[10px] text-[#8B95A1] font-semibold w-20 flex-shrink-0">매장 소개</span>
                <span className="text-[10px] text-[#4E5968] leading-relaxed">{storeCtx.storeDesc}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 플랫폼 탭 */}
      <div className="flex gap-2 flex-wrap">
        {REVIEW_PLATFORMS.map(p => (
          <button key={p.key} onClick={() => setActivePlat(p.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${activePlat === p.key ? 'text-white border-transparent' : 'border-[#E5E8EB] text-[#4E5968] hover:border-gray-300 bg-white'}`}
            style={activePlat === p.key ? { background: p.color } : {}}>
            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black"
              style={{ background: activePlat === p.key ? 'rgba(255,255,255,0.25)' : p.bg, color: activePlat === p.key ? '#fff' : p.color }}>
              {p.icon}
            </span>
            {p.label}
            {!connected[p.key] && (
              <span className="text-[9px] px-1.5 rounded-full font-bold" style={{ background: activePlat === p.key ? 'rgba(255,255,255,0.3)' : '#E5E8EB', color: activePlat === p.key ? '#fff' : '#8B95A1' }}>미연동</span>
            )}
          </button>
        ))}
      </div>

      {/* 연결 상태 + 통계 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base"
              style={{ background: plat.color }}>{plat.icon}</div>
            <div>
              <p className="font-bold text-[#191F28]">{plat.label} 리뷰</p>
              <p className="text-xs text-[#8B95A1]">{plat.desc}</p>
            </div>
          </div>
          <button onClick={() => setConnected(prev => ({ ...prev, [activePlat]: !prev[activePlat] }))}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${connected[activePlat] ? 'bg-[#ECFDF5] text-[#059669]' : 'text-white hover:opacity-90'}`}
            style={!connected[activePlat] ? { background: plat.color } : {}}>
            {connected[activePlat] ? '✓ 연동됨' : '연동하기'}
          </button>
        </div>

        {connected[activePlat] ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              {[
                { label:'전체 리뷰', value:String(total), color:'#191F28' },
                { label:'미답변', value:String(unanswered), color: unanswered > 0 ? '#EF4444' : '#059669' },
                { label:'평균 평점', value:`⭐ ${avgRating}`, color:'#F59E0B' },
                { label:'답변률', value:`${replyRate}%`, color: replyRate >= 80 ? '#059669' : '#3182F6' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: '#F8F9FA' }}>
                  <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[10px] text-[#8B95A1] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[#F2F4F6]">
              <div>
                <p className="text-sm font-semibold text-[#191F28]">AI 자동답변</p>
                <p className="text-xs text-[#8B95A1]">새 리뷰에 자동으로 답변</p>
              </div>
              <Toggle checked={autoReply[activePlat]} onChange={v => setAutoReply(p => ({ ...p, [activePlat]: v }))} />
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-[#8B95A1] mb-1">연동 후 리뷰 관리 및 AI 자동답변이 가능합니다</p>
            <p className="text-xs text-[#8B95A1]">설정 → 연동 관리에서 API를 연결하세요</p>
          </div>
        )}
      </div>

      {/* 최근 리뷰 목록 */}
      {connected[activePlat] && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#191F28]">최근 리뷰</h3>
            {unanswered > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-bold">미답변 {unanswered}건</span>
            )}
          </div>
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: plat.color }}>
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#191F28]">{review.name}</p>
                    <div className="flex items-center gap-1">
                      {'⭐'.repeat(review.rating)}
                      <span className="text-[10px] text-[#8B95A1] ml-1">{review.date}</span>
                    </div>
                  </div>
                </div>
                {review.replied
                  ? <span className="text-[10px] px-2 py-1 rounded-full bg-[#ECFDF5] text-[#059669] font-semibold">답변완료</span>
                  : <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-500 font-semibold">미답변</span>
                }
              </div>
              <p className="text-sm text-[#4E5968] leading-relaxed mb-3">{review.text}</p>
              {!review.replied && (
                <>
                  {generatedReplies[review.id] ? (
                    <div className="bg-[#EFF6FF] rounded-xl p-4 border border-[#BFDBFE]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-[#3182F6]">✨ AI 생성 답변</p>
                        {langTag[review.id] && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white border border-[#BFDBFE] text-[#3182F6] font-semibold">
                            {LANG_LABEL[langTag[review.id]] || langTag[review.id]}로 작성됨
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#191F28] leading-relaxed whitespace-pre-wrap">{generatedReplies[review.id]}</p>
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 py-2 rounded-xl text-white text-xs font-bold" style={{ background: plat.color }}>
                          답변 등록
                        </button>
                        <button onClick={() => handleGenerate(review.id, review.text)}
                          disabled={generatingId === review.id}
                          className="px-3 py-2 rounded-xl bg-white border border-[#BFDBFE] text-xs text-[#3182F6] font-semibold">
                          다시 생성
                        </button>
                        <button onClick={() => { setGeneratedReplies(p => { const n={...p}; delete n[review.id]; return n }); setLangTag(p => { const n={...p}; delete n[review.id]; return n }) }}
                          className="px-3 py-2 rounded-xl bg-white border border-[#E5E8EB] text-xs text-[#8B95A1]">
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => handleGenerate(review.id, review.text)}
                      disabled={generatingId === review.id}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${generatingId === review.id ? 'bg-[#F2F4F6] text-[#8B95A1]' : 'text-white hover:opacity-90'}`}
                      style={generatingId !== review.id ? { background: plat.color } : {}}>
                      {generatingId === review.id
                        ? <span className="flex items-center justify-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-[#8B95A1] border-t-transparent rounded-full animate-spin inline-block" />
                            AI 맞춤 답변 생성 중...
                          </span>
                        : '✨ AI 맞춤 답변 생성'}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConnectTab() {
  const PLATFORMS_8 = [
    { key: 'naver', label: '네이버 플레이스', logo: <NaverLogoS />, desc: '네이버 리뷰·검색 연동', cat: '리뷰·검색' },
    { key: 'google', label: '구글 비즈니스', logo: <GoogleLogoS />, desc: '구글 마이비즈니스 연동', cat: '리뷰·검색' },
    { key: 'baemin', label: '배달의민족', logo: <BaeminLogoS />, desc: '배민 주문·리뷰 관리', cat: '배달' },
    { key: 'yogiyo', label: '요기요', logo: <YogiyoLogoS />, desc: '요기요 주문·평점 연동', cat: '배달' },
    { key: 'coupang', label: '쿠팡이츠', logo: <CoupangLogoS />, desc: '쿠팡이츠 주문·리뷰 연동', cat: '배달' },
    { key: 'yeoshin', label: '여신금융', logo: <YeoshinLogoS />, desc: '카드 매출·결제 데이터 연동', cat: '금융·세무' },
    { key: 'hometax', label: '홈택스', logo: <HometaxLogoS />, desc: '부가세·세금 데이터 연동', cat: '금융·세무' },
  ]
  const [connected8, setConnected8] = useState<Record<string, boolean>>({
    naver: true, google: true, kakao: false, baemin: false,
    yogiyo: false, coupang: false, yeoshin: false, hometax: false,
  })
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-[#191F28] mb-1">플랫폼 연동 관리</h2>
        <p className="text-xs text-[#8B95A1] mb-4">리뷰, 주문, 매출 데이터를 한 곳에서 관리해요</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLATFORMS_8.map(p => (
            <div key={p.key} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="flex-shrink-0">{p.logo}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#191F28] text-sm">{p.label}</p>
                <p className="text-xs text-[#8B95A1] truncate">{p.desc}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1] font-medium">{p.cat}</span>
              </div>
              <button
                onClick={() => setConnected8(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${connected8[p.key] ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}
              >
                {connected8[p.key] ? '✓ 연동됨' : '연동하기'}
              </button>
            </div>
          ))}
        </div>
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
    { metric: '98%', label: '리뷰 답변률', feature: 'AI 리뷰 자동 답변', who: '강남구 네일샵', story: 'AI가 매일 쏟아지는 리뷰를 진심 답변으로 처리', grad: 'from-[#3182F6] to-[#1B64DA]' },
    { metric: '+47명', label: '월 신규 고객', feature: 'CRM 고객 관리', who: '홍대 카페', story: '재방문 유도 메시지로 충성 고객 3배 확보', grad: 'from-[#7C3AED] to-[#5B21B6]' },
    { metric: '+34%', label: '재방문율 상승', feature: '주간 리포트', who: '이태원 헤어샵', story: '데이터 분석으로 마케팅 전략 최적화', grad: 'from-[#059669] to-[#047857]' },
    { metric: '1,200회', label: 'QR 월 스캔', feature: 'QR 코드 관리', who: '신촌 레스토랑', story: 'QR 쿠폰 하나로 재방문율 2배 달성', grad: 'from-[#DC2626] to-[#B91C1C]' },
    { metric: '28%', label: 'SMS 전환율', feature: 'SMS 마케팅', who: '합정 베이커리', story: '타겟 문자 한 통에 당일 매출 폭발', grad: 'from-[#D97706] to-[#B45309]' },
  ]
  const [cart, setCart] = useState<string[]>([])
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<{ cardName: string; last4: string } | null>(null)
  const [tossKey, setTossKey] = useState({ client: '', secret: '' })
  const [tossSaved, setTossSaved] = useState(false)
  const [tossMode, setTossMode] = useState<'test' | 'live'>('test')
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', birth: '' })
  const nextBillingDate = '2025년 2월 14일'
  const addToCart = (id: string) => { if (!cart.includes(id)) setCart(p => [...p, id]) }
  const removeFromCart = (id: string) => setCart(p => p.filter(i => i !== id))
  const cartFeatures = FEATURES.filter(f => cart.includes(f.id))
  const cartTotal = cartFeatures.reduce((sum, f) => sum + f.price, 0)
  const discount = cart.length >= 3 ? Math.floor(cartTotal * 0.1) : 0

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#191F28]">스타터 플랜</span>
                {cancelled
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">해지 예약됨</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">이용 중</span>
                }
              </div>
              <p className="text-[#8B95A1] text-sm mt-1">월 1,980원</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8B95A1]">다음 결제일</p>
              <p className="text-sm font-semibold text-[#191F28] mt-0.5">{nextBillingDate}</p>
            </div>
          </div>
          {cancelled && (
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold text-red-700 mb-1">해지가 예약되었습니다</p>
              <p className="text-red-600 text-xs">{nextBillingDate}까지 이용 · 해지 후 7일 재가입 제한</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#F2F4F6] pt-4">
            <p className="text-xs text-[#8B95A1]">기본: 리뷰 모니터링, 대시보드, 고객 관리</p>
            {!cancelled && <button onClick={() => setShowCancelModal(true)} className="text-xs text-red-400 hover:text-red-600 underline">해지하기</button>}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#191F28]">결제 수단</h3>
            <span className="text-xs text-[#8B95A1]">토스페이먼츠 보안 결제</span>
          </div>
          {paymentMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CARD</span>
                </div>
                <div>
                  <p className="font-semibold text-[#191F28] text-sm">{paymentMethod.cardName}</p>
                  <p className="text-xs text-[#8B95A1]">**** **** **** {paymentMethod.last4}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(true)} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F2F4F6] text-[#4E5968]">변경</button>
            </div>
          ) : (
            <button onClick={() => setShowPaymentModal(true)} className="w-full py-4 rounded-xl border-2 border-dashed border-[#E5E8EB] text-sm font-medium text-[#3182F6] hover:border-[#3182F6] hover:bg-[#EFF6FF] transition-colors">
              + 카드 등록하기
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#E5E8EB]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-xs font-black text-[#3182F6]">Pay</div>
            <div>
              <p className="font-bold text-[#191F28]">토스페이먼츠 연동</p>
              <p className="text-xs text-[#8B95A1]">정기결제 API 키 설정</p>
            </div>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">준비 중</span>
          </div>
          <div className="flex gap-2 mb-4">
            {(['test', 'live'] as const).map(m => (
              <button key={m} onClick={() => setTossMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tossMode === m ? (m === 'live' ? 'bg-red-500 text-white' : 'bg-[#3182F6] text-white') : 'bg-[#F2F4F6] text-[#4E5968]'}`}>
                {m === 'test' ? '테스트 모드' : '라이브 모드'}
              </button>
            ))}
          </div>
          <div className="space-y-3 mb-4">
            <input type="text" value={tossKey.client} onChange={e => setTossKey(p => ({ ...p, client: e.target.value }))} placeholder={`클라이언트 키 (${tossMode}_ck_...)`} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
            <input type="password" value={tossKey.secret} onChange={e => setTossKey(p => ({ ...p, secret: e.target.value }))} placeholder={`시크릿 키 (${tossMode}_sk_...)`} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
          <div className="mb-4 p-3 bg-blue-50 rounded-xl text-xs text-[#3182F6] space-y-1">
            <p className="font-semibold">연동 준비사항</p>
            <p>1. 토스페이먼츠 개발자센터 가입 및 정기결제 서비스 신청</p>
            <p>2. 웹훅: <span className="font-mono">https://localution.co.kr/api/payments/webhook</span></p>
          </div>
          <button
            onClick={() => { setTossSaved(true); setTimeout(() => setTossSaved(false), 2500) }}
            disabled={!tossKey.client || !tossKey.secret}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${tossSaved ? 'bg-green-500 text-white' : !tossKey.client || !tossKey.secret ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}
          >
            {tossSaved ? '저장됨' : '키 저장하기'}
          </button>
        </div>
        <div>
          <h3 className="font-bold text-[#191F28] mb-3">추가 기능</h3>
          <div className="space-y-3">
            {FEATURES.map(f => {
              const inCart = cart.includes(f.id)
              return (
                <div key={f.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black" style={{ background: f.bg, color: f.color }}>{f.short}</div>
                    <div>
                      <p className="font-semibold text-[#191F28] text-sm">{f.name}</p>
                      <p className="text-xs text-[#8B95A1]">{f.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#3182F6]">+{f.price.toLocaleString()}원/월</span>
                    <button onClick={() => inCart ? removeFromCart(f.id) : addToCart(f.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${inCart ? 'bg-[#F2F4F6] text-[#4E5968]' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
                      {inCart ? '취소' : '추가'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
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
              <div className="space-y-2.5 mb-4">
                {cartFeatures.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black" style={{ background: f.bg, color: f.color }}>{f.short}</span>
                      <span className="text-xs font-medium text-[#191F28]">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#4E5968]">{f.price.toLocaleString()}원</span>
                      <button onClick={() => removeFromCart(f.id)} className="text-[#B0B8C1] hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#F2F4F6] pt-3 mb-3 space-y-1.5">
                <div className="flex justify-between text-xs text-[#8B95A1]"><span>기본 플랜</span><span>1,980원</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>10% 할인</span><span>-{discount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#191F28] pt-1 border-t border-[#F2F4F6]">
                  <span>월 합계</span>
                  <span className="text-[#3182F6]">{(1980 + cartTotal - discount).toLocaleString()}원</span>
                </div>
              </div>
              {cart.length >= 3 && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3 text-center font-semibold">3개 이상 추가 시 10% 할인!</p>
              )}
              <button className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">추가 신청하기</button>
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
              <p><strong>{nextBillingDate}</strong>까지 서비스 이용 가능</p>
              <p>해지 후 <strong>7일간</strong> 재가입 불가</p>
              <p>다음 달부터 자동 결제 중단</p>
              <p>데이터 30일간 보관 후 삭제</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-sm font-semibold text-[#4E5968]">취소</button>
              <button onClick={() => { setCancelled(true); setShowCancelModal(false) }} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">해지 확인</button>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#191F28] text-lg">카드 등록</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[#8B95A1] text-xl">✕</button>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">카드 번호</label>
                <input type="text" value={cardForm.number} onChange={e => setCardForm(p => ({ ...p, number: e.target.value }))} placeholder="0000 0000 0000 0000" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">유효기간</label>
                  <input type="text" placeholder="MM/YY" value={cardForm.expiry} onChange={e => setCardForm(p => ({ ...p, expiry: e.target.value }))} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">생년월일</label>
                  <input type="password" placeholder="6자리" value={cardForm.birth} onChange={e => setCardForm(p => ({ ...p, birth: e.target.value }))} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setPaymentMethod({ cardName: '신한카드', last4: cardForm.number.replace(/\s/g, '').slice(-4) || '1234' })
                setShowPaymentModal(false)
              }}
              disabled={!cardForm.number || !cardForm.expiry}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${!cardForm.number || !cardForm.expiry ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}
            >
              카드 등록하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsInner() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') || ''
  const tabMap: Record<string, Tab> = { ai: 'AI 설정', store: '매장 정보', notify: '알림 설정', review: '리뷰 관리', connect: '연동 관리', plan: '플랜 관리' }
  const [activeTab, setActiveTab] = useState<Tab>(tabMap[tabParam] || '매장 정보')

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8 pr-16 md:pr-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">설정</h1>
          <p className="text-[#8B95A1] mt-1">서비스 환경을 설정하세요</p>
        </div>
        <div className="flex gap-1 mb-8 bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-[#3182F6] text-white' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === '매장 정보' && <StoreTab />}
        {activeTab === '알림 설정' && <NotifyTab />}
        {activeTab === 'AI 설정' && <AITab />}
        {activeTab === '리뷰 관리' && <ReviewTab />}
        {activeTab === '연동 관리' && <ConnectTab />}
        {activeTab === '플랜 관리 (결제내역)' && <PlanTab />}
      </main>
    </div>
  )
}


export default function Settings() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center"><p className="text-[#8B95A1]">\uB85C\uB529 \uC911...</p></div>}>
      <SettingsInner />
    </Suspense>
  )
}
