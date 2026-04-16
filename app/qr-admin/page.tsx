'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'

const LS_QR_SETTINGS = 'localution.qr_settings'
const LS_QR_LIST     = 'localution.qr_list'
const LS_STORE_INFO  = 'localution.store_info'

interface QRSettings {
  mainKeyword: string
  subKeywords: string[]
  subKwInput: string
  rewardType: string
  rewardValue: string
  autoGenerate: boolean
}

interface StoreInfo {
  name: string
  category: string
  location: string
  naverUrl: string
  connected: boolean
}

interface QRCode {
  id: string
  name: string
  purpose: string
  scans: number
  reviews: number
  createdAt: string
  active: boolean
  keyword: string
}

const DEFAULT_SETTINGS: QRSettings = {
  mainKeyword: '',
  subKeywords: [],
  subKwInput: '',
  rewardType: 'none',
  rewardValue: '',
  autoGenerate: true,
}

const DEFAULT_STORE: StoreInfo = {
  name: '',
  category: '',
  location: '',
  naverUrl: '',
  connected: false,
}

const INITIAL_QR_LIST: QRCode[] = [
  { id: '1', name: '입구 리뷰 QR', purpose: 'review', scans: 0, reviews: 0, createdAt: '2025-12-01', active: true, keyword: '' },
  { id: '2', name: '테이블 QR #1', purpose: 'review', scans: 0, reviews: 0, createdAt: '2025-12-10', active: true, keyword: '' },
]

const PURPOSE_OPTIONS = [
  { value: 'review',   label: '리뷰 유도',   icon: '⭐', desc: '네이버·구글 리뷰 작성' },
  { value: 'menu',     label: '디지털 메뉴', icon: '📋', desc: 'QR로 메뉴판 연결' },
  { value: 'event',    label: '쿠폰·이벤트', icon: '🎁', desc: '할인 쿠폰 / 이벤트 페이지' },
  { value: 'sns',      label: 'SNS 팔로우',  icon: '📸', desc: '인스타·카카오 연결' },
]

// ─── QR 코드 SVG 생성 (더미 패턴) ────────────────────────────────
function QRPreview({ text, size = 120 }: { text: string; size?: number }) {
  const seed = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cells = 21
  const cellSize = size / cells
  const pattern: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7)
      if (inFinder) {
        const lr = r % 7, lc = c % 7
        return (lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4))
      }
      return ((seed * (r * cells + c + 1)) % 3) !== 0
    })
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect width={size} height={size} fill="white" rx="4" />
      {pattern.map((row, r) => row.map((filled, c) => filled ? (
        <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize}
          width={cellSize} height={cellSize} fill="#191F28" />
      ) : null))}
    </svg>
  )
}


// ── SEO 키워드 자동 추천 엔진 ──
const CATEGORY_KW_MAP: Record<string, string[]> = {
  '카페': ['카페', '커피', '디저트', '브런치카페', '분위기좋은카페'],
  '음식점': ['맛집', '한식', '술집', '데이트코스', '회식장소'],
  '한식': ['맛집', '한식당', '한정식', '백반', '가정식'],
  '중식': ['중국집', '짜장면', '중화요리', '짬뽕맛집'],
  '일식': ['초밥', '라멘', '일식당', '오마카세', '회'],
  '양식': ['파스타', '스테이크', '브런치', '이탈리안'],
  '치킨': ['치킨', '치맥', '배달맛집', '야식'],
  '고기': ['고깃집', '삼겹살', '소고기', '회식장소'],
  '술집': ['술집', '호프', '이자카야', '와인바', '칵테일바'],
  '미용실': ['미용실', '헤어샵', '펌', '염색', '커트'],
  '네일': ['네일샵', '젤네일', '네일아트', '손톱관리'],
  '피부관리': ['피부관리', '에스테틱', '피부과', '관리샵'],
  '헬스': ['헬스장', 'PT', '운동', '다이어트', '피트니스'],
  '학원': ['학원', '과외', '교육', '입시', '공부'],
  '병원': ['병원', '의원', '진료', '건강검진'],
  '약국': ['약국', '건강', '비타민'],
  '꽃집': ['꽃집', '플라워샵', '꽃배달', '꽃다발'],
  '세탁': ['세탁소', '드라이클리닝', '빨래'],
  '인테리어': ['인테리어', '리모델링', '시공'],
}

function generateSeoKeywords(location: string, category: string, storeName: string): string[] {
  const results: string[] = []
  const loc = location.trim()
  const cat = category.trim()

  // 1. 기본: 지역+업종 조합
  if (loc && cat) {
    results.push(loc + cat)
    results.push(loc + ' ' + cat)
  }

  // 2. 카테고리 매핑 키워드
  const matchedCat = Object.keys(CATEGORY_KW_MAP).find(k => cat.includes(k))
  if (matchedCat && loc) {
    const mapped = CATEGORY_KW_MAP[matchedCat]
    mapped.forEach(kw => {
      const combined = loc + kw
      if (!results.includes(combined)) results.push(combined)
    })
  }

  // 3. 매장명 기반
  if (storeName && loc) {
    results.push(loc + ' ' + storeName)
  }

  // 최대 8개까지
  return results.slice(0, 8)
}


// ── QR 코드 생성기 (Google Charts API 활용) ──
function QRCodeImage({ url, size = 180 }: { url: string; size?: number }) {
  const [imgSrc, setImgSrc] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    // Google Chart API로 QR 생성
    const encoded = encodeURIComponent(url)
    const src = 'https://chart.googleapis.com/chart?cht=qr&chs=' + size + 'x' + size + '&chl=' + encoded + '&choe=UTF-8&chld=M|2'
    setImgSrc(src)
    setError(false)
  }, [url, size])

  if (error || !imgSrc) {
    // 폴백: 더미 QR
    return <QRPreview text={url} size={size} />
  }

  return (
    <img
      src={imgSrc}
      alt="QR Code"
      width={size}
      height={size}
      className="block rounded"
      onError={() => setError(true)}
    />
  )
}

// QR 다운로드 함수
function downloadQR(url: string, fileName: string) {
  const size = 400
  const encoded = encodeURIComponent(url)
  const src = 'https://chart.googleapis.com/chart?cht=qr&chs=' + size + 'x' + size + '&chl=' + encoded + '&choe=UTF-8&chld=M|2'

  const link = document.createElement('a')
  link.href = src
  link.download = fileName + '.png'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// storeId 생성 (상호명 기반 slug)
function makeStoreId(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-zA-Z0-9\uAC00-\uD7A3]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'store-' + Date.now()
}

// 리뷰 URL 생성
function buildReviewUrl(storeInfo: StoreInfo, settings: QRSettings): string {
  const storeId = makeStoreId(storeInfo.name)
  const base = (typeof window !== 'undefined' ? window.location.origin : 'https://localution.co.kr')
  const params = new URLSearchParams()
  if (storeInfo.name) params.set('n', storeInfo.name)
  if (storeInfo.category) params.set('t', storeInfo.category)
  if (settings.mainKeyword) params.set('kw', settings.mainKeyword)
  if (storeInfo.naverUrl) params.set('naver', storeInfo.naverUrl)
  if (settings.rewardType !== 'none' && settings.rewardValue) params.set('reward', settings.rewardValue)
  const qs = params.toString()
  return base + '/review/' + storeId + (qs ? '?' + qs : '')
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function QRAdmin() {
  const [activeTab, setActiveTab] = useState<'settings' | 'list' | 'stats'>('settings')
  const [settings, setSettings] = useState<QRSettings>(DEFAULT_SETTINGS)
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE)
  const [storeEdit, setStoreEdit] = useState(false)
  const [storeDraft, setStoreDraft] = useState<StoreInfo>(DEFAULT_STORE)
  const [qrList, setQrList] = useState<QRCode[]>(INITIAL_QR_LIST)
  const [saved, setSaved] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newQR, setNewQR] = useState({ name: '', purpose: 'review', keyword: '' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [previewQR, setPreviewQR] = useState<QRCode | null>(null)
  const [suggestedKws, setSuggestedKws] = useState<string[]>([])
  const kwInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_QR_SETTINGS)
      if (raw) setSettings(JSON.parse(raw))
      const rawList = localStorage.getItem(LS_QR_LIST)
      if (rawList) setQrList(JSON.parse(rawList))
      const rawStore = localStorage.getItem(LS_STORE_INFO)
      if (rawStore) setStoreInfo(JSON.parse(rawStore))
    } catch (_) {}
  }, [])

  function saveSettings(next: QRSettings) {
    setSettings(next)
    try { localStorage.setItem(LS_QR_SETTINGS, JSON.stringify(next)) } catch (_) {}
  }

  function saveSetting<K extends keyof QRSettings>(key: K, value: QRSettings[K]) {
    const next = { ...settings, [key]: value }
    saveSettings(next)
  }

  // ── 서브키워드: 원자적 업데이트 (버그 수정)
  const addSubKw = (raw: string) => {
    const trimmed = raw.replace(/,/g, '').trim()
    if (!trimmed || settings.subKeywords.includes(trimmed) || settings.subKeywords.length >= 5) return
    const next = { ...settings, subKeywords: [...settings.subKeywords, trimmed], subKwInput: '' }
    saveSettings(next)
  }

  const removeSubKw = (kw: string) => {
    const next = { ...settings, subKeywords: settings.subKeywords.filter(k => k !== kw) }
    saveSettings(next)
  }

  const handleSubKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSubKw(settings.subKwInput)
    }
    if (e.key === 'Backspace' && !settings.subKwInput && settings.subKeywords.length > 0) {
      const next = { ...settings, subKeywords: settings.subKeywords.slice(0, -1) }
      saveSettings(next)
    }
  }

  // ── 네이버 업체 연동
  const saveStoreInfo = () => {
    const next = { ...storeDraft, connected: !!(storeDraft.name && storeDraft.location) }
    setStoreInfo(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}
    setStoreEdit(false)
    // SEO 키워드 자동 추천
    if (storeDraft.name && storeDraft.location) {
      const suggestions = generateSeoKeywords(storeDraft.location, storeDraft.category, storeDraft.name)
      if (suggestions.length > 0) {
        const mainKw = suggestions[0]
        const subKws = suggestions.slice(1, 6)
        const next2 = {
          ...settings,
          mainKeyword: settings.mainKeyword || mainKw,
          subKeywords: settings.subKeywords.length === 0 ? subKws : settings.subKeywords,
        }
        saveSettings(next2)
        setSuggestedKws(suggestions)
      }
    }
  }

  const handleSaveSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCreateQR = async () => {
    if (!newQR.name) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 1200))
    const newItem: QRCode = {
      id: Date.now().toString(),
      name: newQR.name,
      purpose: newQR.purpose,
      scans: 0, reviews: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
      keyword: newQR.keyword || settings.mainKeyword || '',
    }
    const updated = [newItem, ...qrList]
    setQrList(updated)
    try { localStorage.setItem(LS_QR_LIST, JSON.stringify(updated)) } catch (_) {}
    setCreating(false)
    setCreated(true)
    setTimeout(() => {
      setCreated(false)
      setShowCreate(false)
      setNewQR({ name: '', purpose: 'review', keyword: '' })
      setActiveTab('list')
    }, 1500)
  }

  const toggleQRActive = (id: string) => {
    const updated = qrList.map(q => q.id === id ? { ...q, active: !q.active } : q)
    setQrList(updated)
    try { localStorage.setItem(LS_QR_LIST, JSON.stringify(updated)) } catch (_) {}
  }

  const activeCount = qrList.filter(q => q.active).length
  // 전역 tone은 settings 페이지에서 관리
  const globalTone = typeof window !== 'undefined'
    ? (localStorage.getItem('ai.tone') || 'friendly')
    : 'friendly'

  const toneLabel: Record<string, string> = {
    friendly: '친근하게', formal: '정중하게', casual: '캐주얼하게',
    bright: '밝고 유쾌하게', warm: '따뜻하게', pro: '전문적으로',
    empathy: '공감하며', simple: '간결하게',
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">QR 관리</h1>
            <p className="text-[#8B95A1] mt-1">QR 스캔 → AI 리뷰 자동 생성으로 리뷰를 늘려보세요</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#3182F6] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1B64DA] transition-colors text-sm">
            + 새 QR 만들기
          </button>
        </div>

        {/* QR 현황 (간단 요약, 스캔 트래킹 X) */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-xs text-[#8B95A1]">전체 QR</p>
              <p className="text-lg font-bold text-[#3182F6]">{qrList.length}개</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-xs text-[#8B95A1]">활성 QR</p>
              <p className="text-lg font-bold text-[#059669]">{activeCount}개</p>
            </div>
          </div>
          {storeInfo.connected && (
            <div className="bg-[#F0FDF4] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#BBF7D0]">
              <span className="text-lg">🟢</span>
              <div>
                <p className="text-xs text-[#059669] font-semibold">업체 연동됨</p>
                <p className="text-xs text-[#4E5968] truncate max-w-[140px]">{storeInfo.name}</p>
              </div>
            </div>
          )}
          <div className="bg-[#FFFBEB] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#FDE68A]">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-xs text-[#D97706]">AI 톤 (전역 설정)</p>
              <p className="text-xs font-semibold text-[#4E5968]">{toneLabel[globalTone] || '친근하게'}</p>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm mb-6 w-fit">
          {[
            { key: 'settings', label: 'AI 설정' },
            { key: 'list',     label: 'QR 목록' },
            { key: 'stats',    label: '성과 리포트' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#3182F6] text-white shadow-sm'
                  : 'text-[#4E5968] hover:bg-[#F2F4F6]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── AI 설정 탭 ── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측 */}
            <div className="space-y-5">

              {/* 네이버 업체 연동 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-base">🟢</div>
                    <div>
                      <h3 className="font-bold text-[#191F28]">네이버 업체 연동</h3>
                      <p className="text-xs text-[#8B95A1]">연동 시 키워드 자동 설정</p>
                    </div>
                  </div>
                  {storeInfo.connected && !storeEdit && (
                    <button
                      onClick={() => { setStoreDraft(storeInfo); setStoreEdit(true) }}
                      className="text-xs text-[#3182F6] font-semibold hover:underline">
                      수정
                    </button>
                  )}
                </div>

                {!storeEdit && !storeInfo.connected ? (
                  <div>
                    <p className="text-sm text-[#4E5968] mb-4 leading-relaxed">
                      업체 정보를 입력하면 AI가 더 정확한 리뷰를 생성하고,<br/>
                      <span className="text-[#3182F6] font-semibold">QR 코드에 리뷰 URL이 자동 연결</span>돼요.
                    </p>
                    <button
                      onClick={() => { setStoreDraft(DEFAULT_STORE); setStoreEdit(true) }}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-[#BFDBFE] text-[#3182F6] font-semibold text-sm hover:bg-[#EFF6FF] transition-colors">
                      + 업체 정보 입력하기
                    </button>
                  </div>
                ) : storeEdit ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#4E5968] mb-1">상호명 *</label>
                      <input
                        value={storeDraft.name}
                        onChange={e => setStoreDraft(p => ({ ...p, name: e.target.value }))}
                        placeholder="예: 하랑커피"
                        className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-[#4E5968] mb-1">업종</label>
                        <input
                          value={storeDraft.category}
                          onChange={e => setStoreDraft(p => ({ ...p, category: e.target.value }))}
                          placeholder="예: 카페"
                          className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#4E5968] mb-1">지역 *</label>
                        <input
                          value={storeDraft.location}
                          onChange={e => setStoreDraft(p => ({ ...p, location: e.target.value }))}
                          placeholder="예: 부천"
                          className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#4E5968] mb-1">네이버 플레이스 URL <span className="font-normal">(선택)</span></label>
                      <input
                        value={storeDraft.naverUrl}
                        onChange={e => setStoreDraft(p => ({ ...p, naverUrl: e.target.value }))}
                        placeholder="https://naver.me/..."
                        className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setStoreEdit(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors">
                        취소
                      </button>
                      <button
                        onClick={saveStoreInfo}
                        disabled={!storeDraft.name || !storeDraft.location}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          storeDraft.name && storeDraft.location
                            ? 'bg-[#059669] text-white hover:bg-[#047857]'
                            : 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed'
                        }`}>
                        연동하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0" />
                      <span className="font-bold text-[#191F28] text-sm">{storeInfo.name}</span>
                    </div>
                    <p className="text-xs text-[#4E5968] pl-4">
                      {[storeInfo.category, storeInfo.location].filter(Boolean).join(' · ')}
                    </p>
                    {storeInfo.naverUrl && (
                      <a href={storeInfo.naverUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#3182F6] pl-4 hover:underline block mt-0.5">
                        네이버 플레이스 보기 →
                      </a>
                    )}
                    <div className="mt-2 pl-4">
                      <p className="text-[10px] text-[#8B95A1]">리뷰 URL: <span className="text-[#3182F6] font-mono">/review/{makeStoreId(storeInfo.name)}</span></p>
                    </div>
                    <div className="mt-2 pl-4">
                      <p className="text-[10px] text-[#8B95A1]">리뷰 URL: <span className="text-[#3182F6] font-mono">/review/{makeStoreId(storeInfo.name)}</span></p>
                    </div>
                    <div className="mt-2 pl-4">
                      <p className="text-[10px] text-[#8B95A1]">리뷰 URL: <span className="text-[#3182F6] font-mono">/review/{makeStoreId(storeInfo.name)}</span></p>
                    </div>
                    <div className="mt-2 pl-4">
                      <p className="text-[10px] text-[#8B95A1]">리뷰 URL: <span className="text-[#3182F6] font-mono">/review/{makeStoreId(storeInfo.name)}</span></p>
                    </div>
                    <div className="mt-2 pl-4">
                      <p className="text-[10px] text-[#8B95A1]">리뷰 URL: <span className="text-[#3182F6] font-mono">/review/{makeStoreId(storeInfo.name)}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* SEO 키워드 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-base">🔑</div>
                  <div>
                    <h3 className="font-bold text-[#191F28]">SEO 키워드 세팅</h3>
                    <p className="text-xs text-[#8B95A1]">AI가 리뷰 생성 시 자동으로 활용합니다</p>
                  </div>
                </div>

                {/* 상위노출 키워드 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#191F28] mb-2">
                    상위노출 키워드
                    <span className="text-xs font-normal text-[#8B95A1] ml-2">가장 중요한 키워드 1개</span>
                  </label>
                  <input
                    value={settings.mainKeyword}
                    onChange={e => saveSetting('mainKeyword', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    placeholder="예: 부천맛집"
                    className="w-full border-2 border-[#3182F6] rounded-xl px-4 py-3 text-sm focus:outline-none bg-[#F8FAFF] font-medium placeholder-[#C9CDD2]"
                  />
                </div>

                {/* 대표 키워드 (서브) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-[#191F28]">대표 키워드</label>
                    <span className="text-xs text-[#8B95A1]">(최대 5개 · Enter 또는 쉼표로 추가)</span>
                  </div>
                  <div
                    onClick={() => kwInputRef.current?.focus()}
                    className={`flex flex-wrap gap-2 p-3 border-2 rounded-xl bg-white min-h-[52px] transition-colors cursor-text ${
                      settings.subKeywords.length >= 5 ? 'border-[#E5E8EB] bg-[#F8F9FA]' : 'border-[#E5E8EB] focus-within:border-[#3182F6]'
                    }`}>
                    {settings.subKeywords.map(kw => (
                      <span key={kw}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#3182F6] text-sm rounded-full font-medium flex-shrink-0 border border-[#BFDBFE]">
                        #{kw}
                        <button onClick={e => { e.stopPropagation(); removeSubKw(kw) }}
                          className="text-[#3182F6]/60 hover:text-[#3182F6] font-black text-base leading-none">×</button>
                      </span>
                    ))}
                    {settings.subKeywords.length < 5 && (
                      <input
                        ref={kwInputRef}
                        value={settings.subKwInput}
                        onChange={e => saveSetting('subKwInput', e.target.value)}
                        onKeyDown={handleSubKwKeyDown}
                        onBlur={() => { if (settings.subKwInput.trim()) addSubKw(settings.subKwInput) }}
                        placeholder={settings.subKeywords.length === 0 ? "예: 부천카페, 오므라이스, 데이트코스" : "추가 입력..."}
                        className="flex-1 min-w-[120px] outline-none text-sm py-1 bg-transparent placeholder-[#C9CDD2]"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8B95A1] mt-1.5 pl-1">
                    {settings.subKeywords.length}/5개 등록됨
                  </p>
                </div>

                {/* AI 추천 키워드 */}
                {suggestedKws.length > 0 && (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] rounded-xl border border-[#BBF7D0]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🤖</span>
                      <p className="text-xs font-bold text-[#059669]">AI 추천 키워드</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#059669] text-white rounded font-bold">자동</span>
                    </div>
                    <p className="text-[11px] text-[#4E5968] mb-2">
                      네이버 연동 정보 기반으로 추천된 키워드에요. 클릭하면 추가돼요.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedKws.filter(kw => kw !== settings.mainKeyword && !settings.subKeywords.includes(kw)).map(kw => (
                        <button
                          key={kw}
                          onClick={() => {
                            if (settings.subKeywords.length < 5) {
                              const next = { ...settings, subKeywords: [...settings.subKeywords, kw] }
                              saveSettings(next)
                            }
                          }}
                          disabled={settings.subKeywords.length >= 5}
                          className="text-xs px-2.5 py-1.5 bg-white text-[#059669] rounded-full font-medium border border-[#BBF7D0] hover:bg-[#DCFCE7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 키워드 미리보기 */}
                {(settings.mainKeyword || settings.subKeywords.length > 0) && (
                  <div className="mt-4 p-3 bg-[#F8FAFF] rounded-xl border border-[#BFDBFE]">
                    <p className="text-xs font-semibold text-[#3182F6] mb-2">리뷰 생성 시 활용될 키워드 미리보기</p>
                    <div className="flex flex-wrap gap-1.5">
                      {settings.mainKeyword && (
                        <span className="text-xs px-2.5 py-1 bg-[#3182F6] text-white rounded-full font-semibold">#{settings.mainKeyword}</span>
                      )}
                      {settings.subKeywords.map(kw => (
                        <span key={kw} className="text-xs px-2.5 py-1 bg-white text-[#3182F6] rounded-full font-medium border border-[#BFDBFE]">#{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 우측 */}
            <div className="space-y-5">

              {/* AI 톤 안내 (전역 설정) */}
              <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-5 border border-[#BFDBFE]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <h3 className="font-bold text-[#191F28]">AI 리뷰 생성 톤</h3>
                </div>
                <p className="text-sm text-[#4E5968] mb-3 leading-relaxed">
                  현재 전역 설정: <span className="font-bold text-[#3182F6]">{toneLabel[globalTone] || '친근하게'}</span>
                </p>
                <p className="text-xs text-[#8B95A1] mb-3">
                  AI 톤은 설정 페이지에서 통합 관리됩니다. 변경하면 모든 AI 기능에 동일하게 적용돼요.
                </p>
                <a href="/settings?tab=ai"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3182F6] bg-white px-4 py-2 rounded-xl border border-[#BFDBFE] hover:bg-[#EFF6FF] transition-colors">
                  ⚙️ AI 설정 변경하기
                </a>
              </div>

              {/* 보상 설정 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-base">🎁</div>
                  <div>
                    <h3 className="font-bold text-[#191F28]">고객 보상 설정</h3>
                    <p className="text-xs text-[#8B95A1]">리뷰 작성 시 제공할 혜택</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { value: 'none',    label: '없음',       desc: '순수 리뷰 유도' },
                    { value: 'coupon',  label: '쿠폰 제공',  desc: '할인 쿠폰 증정' },
                    { value: 'stamp',   label: '스탬프',     desc: '스탬프 적립' },
                    { value: 'free',    label: '서비스 제공', desc: '음료/디저트 서비스' },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        settings.rewardType === opt.value
                          ? 'border-[#3182F6] bg-[#EFF6FF]'
                          : 'border-[#E5E8EB] hover:border-[#BFDBFE]'
                      }`}>
                      <input type="radio" name="reward"
                        checked={settings.rewardType === opt.value}
                        onChange={() => saveSetting('rewardType', opt.value)}
                        className="accent-[#3182F6]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#191F28]">{opt.label}</p>
                        <p className="text-xs text-[#8B95A1]">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {settings.rewardType !== 'none' && (
                  <div className="mt-3">
                    <input
                      value={settings.rewardValue}
                      onChange={e => saveSetting('rewardValue', e.target.value)}
                      placeholder={
                        settings.rewardType === 'coupon' ? '예: 아메리카노 10% 할인'
                        : settings.rewardType === 'stamp' ? '예: 도장 1개 추가'
                        : '예: 아이스크림 서비스'
                      }
                      className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors placeholder-[#C9CDD2]"
                    />
                  </div>
                )}
              </div>

              {/* AI 리뷰 미리보기 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-base">✨</div>
                  <h3 className="font-bold text-[#191F28]">AI 리뷰 미리보기</h3>
                </div>
                <div className="bg-[#F8FAFF] rounded-xl p-4 border border-[#BFDBFE] text-sm text-[#191F28] leading-relaxed italic">
                  {settings.mainKeyword
                    ? (() => {
                        const kws = [settings.mainKeyword, ...settings.subKeywords].filter(Boolean)
                        const kwStr = kws.slice(0, 3).map(k => '#' + k).join(' ')
                        const reward = settings.rewardType !== 'none' && settings.rewardValue
                          ? settings.rewardValue + '도 받아서 ' : ''
                        const storeName = storeInfo.connected ? storeInfo.name + ' ' : ''
                        return `${storeName}정말 좋은 경험이었어요! ${reward}기분 좋게 방문했습니다. 분위기도 좋고 직원분들도 친절해서 또 오고 싶어요 😊 ${kwStr}`
                      })()
                    : '키워드를 입력하면 AI 리뷰 미리보기가 표시됩니다...'
                  }
                </div>
                <p className="text-[11px] text-[#8B95A1] mt-2 text-center">
                  실제 생성 시 톤({toneLabel[globalTone] || '친근하게'})이 적용됩니다
                </p>
              </div>

              {/* 저장 */}
              <button onClick={handleSaveSettings}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-colors ${
                  saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'
                }`}>
                {saved ? '✅ 저장됨' : '설정 저장하기'}
              </button>
            </div>
          </div>
        )}

        {/* ── QR 목록 탭 ── */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {qrList.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">📱</div>
                <p className="font-semibold text-[#191F28] mb-1">아직 QR 코드가 없어요</p>
                <p className="text-sm text-[#8B95A1] mb-4">첫 QR을 만들어 리뷰를 수집해보세요</p>
                <button onClick={() => setShowCreate(true)}
                  className="px-6 py-2.5 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] transition-colors">
                  + 새 QR 만들기
                </button>
              </div>
            ) : qrList.map(qr => {
              const purposeOpt = PURPOSE_OPTIONS.find(p => p.value === qr.purpose)
              return (
                <div key={qr.id}
                  className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${qr.active ? 'border-transparent' : 'border-[#E5E8EB] opacity-70'}`}>
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => setPreviewQR(qr)}
                      className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center cursor-pointer flex-shrink-0 border border-[#E5E8EB] hover:border-[#3182F6] transition-colors p-1">
                      {storeInfo.connected
                        ? <QRCodeImage url={buildReviewUrl(storeInfo, { ...settings, mainKeyword: qr.keyword || settings.mainKeyword })} size={56} />
                        : {storeInfo.connected
                        ? <QRCodeImage url={buildReviewUrl(storeInfo, { ...settings, mainKeyword: qr.keyword || settings.mainKeyword })} size={56} />
                        : <QRPreview text={qr.name + qr.keyword} size={56} />
                      }
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-[#191F28]">{qr.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          qr.active ? 'bg-green-100 text-green-700' : 'bg-[#F2F4F6] text-[#8B95A1]'
                        }`}>
                          {qr.active ? '활성' : '비활성'}
                        </span>
                        {qr.keyword && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-medium">
                            #{qr.keyword}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-medium">
                          {purposeOpt?.icon} {purposeOpt?.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#8B95A1]">생성일: {qr.createdAt}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setPreviewQR(qr)}
                        className="px-3 py-2 text-sm font-semibold bg-[#EFF6FF] text-[#3182F6] rounded-xl hover:bg-[#DBEAFE] transition-colors">
                        다운로드
                      </button>
                      <button
                        onClick={() => toggleQRActive(qr.id)}
                        className={`px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
                          qr.active
                            ? 'bg-[#F2F4F6] text-[#8B95A1] hover:bg-[#E5E8EB]'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}>
                        {qr.active ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── 성과 리포트 탭 ── */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* 실시간 트래킹 안내 */}
            <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] rounded-2xl p-6 border border-[#FDE68A]">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">📊</span>
                <div>
                  <h3 className="font-bold text-[#191F28] mb-1">실시간 스캔 트래킹 준비 중</h3>
                  <p className="text-sm text-[#78350F] leading-relaxed">
                    실제 QR 스캔 수 트래킹 기능은 곧 업데이트 예정입니다.
                    현재는 QR 코드 생성 및 키워드 설정에 집중해주세요.
                  </p>
                </div>
              </div>
            </div>

            {/* QR 현황 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-5">📱 QR 코드 현황</h3>
              <div className="space-y-3">
                {[...qrList].map((qr, i) => {
                  const purposeOpt = PURPOSE_OPTIONS.find(p => p.value === qr.purpose)
                  return (
                    <div key={qr.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F9FA]">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${i === 0 ? 'text-[#D97706]' : 'text-[#8B95A1]'}`}>{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-[#191F28]">{qr.name}</p>
                          <p className="text-xs text-[#8B95A1]">{purposeOpt?.icon} {purposeOpt?.label} · {qr.createdAt}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        qr.active ? 'bg-green-100 text-green-700' : 'bg-[#F2F4F6] text-[#8B95A1]'
                      }`}>
                        {qr.active ? '활성' : '비활성'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI 인사이트 */}
            <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-6 border border-[#BFDBFE]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">✨</span>
                <h3 className="font-bold text-[#191F28]">AI 인사이트</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#3182F6] text-white font-semibold">자동 분석</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '🔑', title: '키워드 현황', desc: settings.mainKeyword ? `상위노출 키워드 '${settings.mainKeyword}'로 설정됐어요. 대표 키워드를 ${5 - settings.subKeywords.length}개 더 추가하면 좋아요.` : '키워드를 설정하면 AI 리뷰 품질이 올라가요!' },
                  { icon: '🏪', title: '업체 연동', desc: storeInfo.connected ? `'${storeInfo.name}' 업체가 연동됐어요. AI가 업체 맞춤 리뷰를 생성합니다.` : '업체 정보를 연동하면 더 정확한 맞춤 리뷰가 생성돼요!' },
                  { icon: '🎯', title: '다음 액션', desc: !settings.mainKeyword ? 'AI 설정 탭에서 상위노출 키워드를 먼저 입력해보세요.' : settings.subKeywords.length < 3 ? '대표 키워드를 3개 이상 추가하면 AI 리뷰 품질이 올라가요!' : '설정이 잘 되어 있어요! QR을 인쇄해서 매장에 비치해보세요.' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm font-bold text-[#191F28]">{item.title}</span>
                    </div>
                    <p className="text-xs text-[#4E5968] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── 새 QR 만들기 모달 ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6]">
              <h2 className="text-lg font-bold text-[#191F28]">새 QR 코드 만들기</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#8B95A1] hover:text-[#191F28] text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#191F28] mb-2">QR 이름</label>
                <input
                  value={newQR.name}
                  onChange={e => setNewQR(p => ({ ...p, name: e.target.value }))}
                  placeholder="예: 입구 리뷰 QR, 테이블 QR #1"
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#191F28] mb-2">QR 용도</label>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSE_OPTIONS.map(opt => (
                    <button key={opt.value}
                      onClick={() => setNewQR(p => ({ ...p, purpose: opt.value }))}
                      className={`p-3.5 rounded-xl border-2 text-left transition-colors ${
                        newQR.purpose === opt.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#3182F6]'
                      }`}>
                      <div className="text-xl mb-1">{opt.icon}</div>
                      <div className="text-sm font-semibold text-[#191F28]">{opt.label}</div>
                      <div className="text-xs text-[#8B95A1] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#191F28] mb-2">
                  키워드 <span className="text-xs font-normal text-[#8B95A1]">(이 QR용 SEO 키워드)</span>
                </label>
                <input
                  value={newQR.keyword}
                  onChange={e => setNewQR(p => ({ ...p, keyword: e.target.value }))}
                  placeholder={settings.mainKeyword ? `기본: ${settings.mainKeyword}` : '예: 부천맛집'}
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors placeholder-[#C9CDD2]"
                />
              </div>
              <button
                onClick={handleCreateQR}
                disabled={!newQR.name || creating || created}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${
                  created ? 'bg-green-500 text-white'
                  : creating ? 'bg-[#93C5FD] text-white cursor-not-allowed'
                  : !newQR.name ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed'
                  : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'
                }`}>
                {created ? '✅ 생성 완료!' : creating ? '⏳ 생성 중...' : 'QR 코드 생성하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR 다운로드 미리보기 모달 ── */}
      {previewQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6]">
              <h2 className="font-bold text-[#191F28]">{previewQR.name}</h2>
              <button onClick={() => setPreviewQR(null)} className="text-[#8B95A1] hover:text-[#191F28] text-2xl leading-none">×</button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-2xl border-2 border-[#E5E8EB] shadow-sm">
                {storeInfo.connected
                  ? <QRCodeImage url={buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword })} size={180} />
                  : {storeInfo.connected
                  ? <QRCodeImage url={buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword })} size={180} />
                  : <QRPreview text={previewQR.name + previewQR.keyword} size={180} />
                }
                }
              </div>
              {storeInfo.connected && (
                <p className="text-[10px] text-[#8B95A1] text-center break-all max-w-[260px] leading-relaxed">
                  {buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword }).slice(0, 80)}...
                </p>
              )}
              {previewQR.keyword && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold">#{previewQR.keyword}</span>
              )}
              <p className="text-xs text-[#8B95A1] text-center">
                스캔 시 AI가 자동으로 리뷰 초안을 생성해드려요
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPreviewQR(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors">
                  닫기
                </button>
                <button
                  onClick={() => {
                    if (storeInfo.connected) {
                      downloadQR(buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword }), previewQR.name)
                    }
                  }}
                  disabled={!storeInfo.connected}
                  className={'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ' + (storeInfo.connected ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA]' : 'bg-[#E5E8EB] text-[#8B95A1] cursor-not-allowed')}>
                  {storeInfo.connected ? 'QR 이미지 저장' : '업체 연동 필요'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
