'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'

const LS_QR_SETTINGS = 'localution.qr_settings'
const LS_QR_LIST     = 'localution.qr_list'
const LS_STORE_INFO  = 'localution.store_info'
const BASE_URL       = 'https://www.localution.co.kr'

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
  reviewUrl: string
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

const PURPOSE_OPTIONS = [
  { value: 'review',   label: '리뷰 유도',   icon: '⭐', desc: '네이버·구글 리뷰 작성' },
  { value: 'menu',     label: '디지털 메뉴', icon: '📋', desc: 'QR로 메뉴판 연결' },
  { value: 'event',    label: '쿠폰·이벤트', icon: '🎁', desc: '할인 쿠폰 / 이벤트 페이지' },
  { value: 'sns',      label: 'SNS 팔로우',  icon: '📸', desc: '인스타·카카오 연결' },
]

// ─── 리뷰 URL 생성 ────────────────────────────────────────────────
// 기존 /review/[storeId] 페이지의 쿼리 파라미터 규격:
//   n=상호명 / t=업종 / a=주소·지역 / naver=네이버URL / kw=키워드
function generateReviewUrl(store: StoreInfo, keyword?: string): string {
  const name = store.name.trim()
  if (!name) return ''
  const slug = name.replace(/\s+/g, '-')
  const params = new URLSearchParams()
  params.set('n', name)
  if (store.category) params.set('t', store.category)
  if (store.location) params.set('a', store.location)
  if (store.naverUrl) params.set('naver', store.naverUrl.trim())
  if (keyword) params.set('kw', keyword)
  return `${BASE_URL}/review/${encodeURIComponent(slug)}?${params.toString()}`
}

// ─── 실제 QR 이미지 (api.qrserver.com) ───────────────────────────
function QRImage({ url, size = 120 }: { url: string; size?: number }) {
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#F2F4F6] rounded-xl flex flex-col items-center justify-center gap-1 text-[#8B95A1]">
        <span className="text-2xl">📵</span>
        <span className="text-[10px] font-medium text-center leading-tight px-1">업체 연동 후<br/>QR 생성됩니다</span>
      </div>
    )
  }
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=8&color=191F28`
  return (
    <img
      src={qrApiUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="block rounded"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

// ─── QR 다운로드 ─────────────────────────────────────────────────
async function downloadQR(reviewUrl: string, qrName: string) {
  if (!reviewUrl) return
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(reviewUrl)}&margin=20&color=191F28`
  try {
    const res = await fetch(apiUrl)
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = qrName.replace(/\s+/g, '_') + '_QR.png'
    a.click()
    URL.revokeObjectURL(href)
  } catch {
    window.open(apiUrl, '_blank')
  }
}

// ─── 클립보드 복사 ────────────────────────────────────────────────
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function QRAdmin() {
  const [activeTab, setActiveTab] = useState<'settings' | 'list' | 'stats'>('settings')
  const [settings, setSettings] = useState<QRSettings>(DEFAULT_SETTINGS)
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE)
  const [storeEdit, setStoreEdit] = useState(false)
  const [storeDraft, setStoreDraft] = useState<StoreInfo>(DEFAULT_STORE)
  const [qrList, setQrList] = useState<QRCode[]>([])
  const [saved, setSaved] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newQR, setNewQR] = useState({ name: '', purpose: 'review', keyword: '' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [previewQR, setPreviewQR] = useState<QRCode | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

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
    saveSettings({ ...settings, [key]: value })
  }

  const addSubKw = (raw: string) => {
    const trimmed = raw.replace(/,/g, '').trim()
    if (!trimmed || settings.subKeywords.includes(trimmed) || settings.subKeywords.length >= 5) return
    saveSettings({ ...settings, subKeywords: [...settings.subKeywords, trimmed], subKwInput: '' })
  }

  const removeSubKw = (kw: string) => {
    saveSettings({ ...settings, subKeywords: settings.subKeywords.filter(k => k !== kw) })
  }

  const handleSubKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSubKw(settings.subKwInput)
    }
    if (e.key === 'Backspace' && !settings.subKwInput && settings.subKeywords.length > 0) {
      saveSettings({ ...settings, subKeywords: settings.subKeywords.slice(0, -1) })
    }
  }

  const saveStoreInfo = () => {
    const next = { ...storeDraft, connected: !!(storeDraft.name && storeDraft.location) }
    setStoreInfo(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}
    setStoreEdit(false)
    if (storeDraft.name && !settings.mainKeyword) {
      const suggested = storeDraft.location ? storeDraft.location + ' ' + storeDraft.category : storeDraft.category
      if (suggested.trim()) saveSettings({ ...settings, mainKeyword: suggested.trim() })
    }
  }

  const handleSaveSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCreateQR = async () => {
    if (!newQR.name) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 900))

    // 리뷰 용도면 업체 연동 URL 자동 생성
    let reviewUrl = ''
    if (newQR.purpose === 'review' && storeInfo.connected) {
      reviewUrl = generateReviewUrl(storeInfo, newQR.keyword || settings.mainKeyword || '')
    }

    const newItem: QRCode = {
      id: Date.now().toString(),
      name: newQR.name,
      purpose: newQR.purpose,
      scans: 0,
      reviews: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
      keyword: newQR.keyword || settings.mainKeyword || '',
      reviewUrl,
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
    }, 1200)
  }

  const toggleQRActive = (id: string) => {
    const updated = qrList.map(q => q.id === id ? { ...q, active: !q.active } : q)
    setQrList(updated)
    try { localStorage.setItem(LS_QR_LIST, JSON.stringify(updated)) } catch (_) {}
  }

  const handleCopy = async (id: string, url: string) => {
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleDownload = async (qr: QRCode) => {
    setDownloading(qr.id)
    await downloadQR(qr.reviewUrl, qr.name)
    setDownloading(null)
  }

  const activeCount = qrList.filter(q => q.active).length
  const globalTone = typeof window !== 'undefined'
    ? (localStorage.getItem('ai.tone') || 'friendly')
    : 'friendly'

  const toneLabel: Record<string, string> = {
    friendly: '친근하게', formal: '정중하게', casual: '캐주얼하게',
    bright: '밝고 유쾌하게', warm: '따뜻하게', pro: '전문적으로',
    empathy: '공감하며', simple: '간결하게',
  }

  // 현재 연동된 업체 기준 미리보기 URL
  const previewReviewUrl = storeInfo.connected
    ? generateReviewUrl(storeInfo, settings.mainKeyword)
    : ''

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">QR 관리</h1>
            <p className="text-[#8B95A1] mt-1">QR 스캔 → 리뷰 페이지로 바로 이동해 리뷰를 늘려보세요</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#3182F6] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1B64DA] transition-colors text-sm">
            + 새 QR 만들기
          </button>
        </div>

        {/* 현황 카드 */}
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
          {previewReviewUrl && (
            <div className="bg-[#EFF6FF] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#BFDBFE]">
              <span className="text-lg">🔗</span>
              <div>
                <p className="text-xs text-[#3182F6] font-semibold">리뷰 페이지 연결됨</p>
                <p className="text-xs text-[#4E5968] truncate max-w-[180px]">/review/{storeInfo.name.replace(/\s+/g, '-')}</p>
              </div>
            </div>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm mb-6 w-fit">
          {[
            { key: 'settings', label: 'AI 설정' },
            { key: 'list',     label: 'QR 목록' },
            { key: 'stats',    label: '성과 리포트' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as 'settings' | 'list' | 'stats')}
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
                      <p className="text-xs text-[#8B95A1]">연동 시 QR 리뷰 링크 자동 생성</p>
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
                      업체 정보를 입력하면 QR 스캔 시 바로 리뷰 페이지로 연결돼요.
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
                        placeholder="예: 소금정원 강화점"
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
                          placeholder="예: 강화"
                          className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#4E5968] mb-1">
                        네이버 플레이스 URL <span className="font-normal">(선택 — 입력 시 QR에 직접 연결)</span>
                      </label>
                      <input
                        value={storeDraft.naverUrl}
                        onChange={e => setStoreDraft(p => ({ ...p, naverUrl: e.target.value }))}
                        placeholder="https://naver.me/xxxxxx"
                        className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                      />
                    </div>
                    {/* 미리보기 URL */}
                    {storeDraft.name && storeDraft.location && (
                      <div className="p-3 bg-[#F8FAFF] rounded-xl border border-[#BFDBFE]">
                        <p className="text-[11px] text-[#3182F6] font-semibold mb-1">생성될 리뷰 링크 미리보기</p>
                        <p className="text-[10px] text-[#4E5968] break-all leading-relaxed font-mono">
                          {generateReviewUrl(storeDraft)}
                        </p>
                      </div>
                    )}
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
                  <div className="space-y-3">
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
                    </div>
                    {/* 현재 리뷰 링크 */}
                    <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE]">
                      <p className="text-[11px] text-[#3182F6] font-semibold mb-1.5">📎 QR이 연결되는 리뷰 링크</p>
                      <p className="text-[10px] text-[#4E5968] break-all font-mono leading-relaxed mb-2">
                        {previewReviewUrl}
                      </p>
                      <button
                        onClick={() => handleCopy('store', previewReviewUrl)}
                        className="text-[11px] px-3 py-1 bg-white rounded-lg border border-[#BFDBFE] text-[#3182F6] font-semibold hover:bg-[#EFF6FF] transition-colors">
                        {copiedId === 'store' ? '✅ 복사됨' : '링크 복사'}
                      </button>
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

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#191F28] mb-2">
                    상위노출 키워드
                    <span className="text-xs font-normal text-[#8B95A1] ml-2">가장 중요한 키워드 1개</span>
                  </label>
                  <input
                    value={settings.mainKeyword}
                    onChange={e => saveSetting('mainKeyword', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    placeholder="예: 강화맛집"
                    className="w-full border-2 border-[#3182F6] rounded-xl px-4 py-3 text-sm focus:outline-none bg-[#F8FAFF] font-medium placeholder-[#C9CDD2]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-[#191F28]">대표 키워드</label>
                    <span className="text-xs text-[#8B95A1]">(최대 5개 · Enter 또는 쉼표로 추가)</span>
                  </div>
                  <div
                    className={`flex flex-wrap gap-2 p-3 border-2 rounded-xl bg-white min-h-[52px] transition-colors cursor-text ${
                      settings.subKeywords.length >= 5 ? 'border-[#E5E8EB] bg-[#F8F9FA]' : 'border-[#E5E8EB] focus-within:border-[#3182F6]'
                    }`}>
                    {settings.subKeywords.map(kw => (
                      <span key={kw}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#3182F6] text-sm rounded-full font-medium flex-shrink-0 border border-[#BFDBFE]">
                        #{kw}
                        <button onClick={() => removeSubKw(kw)}
                          className="text-[#3182F6]/60 hover:text-[#3182F6] font-black text-base leading-none">×</button>
                      </span>
                    ))}
                    {settings.subKeywords.length < 5 && (
                      <input
                        value={settings.subKwInput}
                        onChange={e => saveSetting('subKwInput', e.target.value)}
                        onKeyDown={handleSubKwKeyDown}
                        onBlur={() => { if (settings.subKwInput.trim()) addSubKw(settings.subKwInput) }}
                        placeholder={settings.subKeywords.length === 0 ? "예: 강화카페, 디저트, 데이트코스" : "추가 입력..."}
                        className="flex-1 min-w-[120px] outline-none text-sm py-1 bg-transparent placeholder-[#C9CDD2]"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8B95A1] mt-1.5 pl-1">{settings.subKeywords.length}/5개 등록됨</p>
                </div>

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

              {/* QR 미리보기 (연동된 경우) */}
              {storeInfo.connected && previewReviewUrl && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-base">📱</div>
                    <div>
                      <h3 className="font-bold text-[#191F28]">QR 코드 미리보기</h3>
                      <p className="text-xs text-[#8B95A1]">{storeInfo.name} 리뷰 유도 QR</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-white border-2 border-[#E5E8EB] rounded-2xl flex-shrink-0">
                      <QRImage url={previewReviewUrl} size={120} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-[#8B95A1] leading-relaxed">
                        스캔하면 <span className="font-semibold text-[#191F28]">{storeInfo.name}</span>의 리뷰 페이지로 바로 이동해요
                      </p>
                      <button
                        onClick={() => handleCopy('preview', previewReviewUrl)}
                        className="text-xs px-3 py-1.5 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE] text-[#3182F6] font-semibold hover:bg-[#DBEAFE] transition-colors">
                        {copiedId === 'preview' ? '✅ 복사됨' : '🔗 링크 복사'}
                      </button>
                      <button
                        onClick={async () => {
                          setDownloading('preview')
                          await downloadQR(previewReviewUrl, storeInfo.name)
                          setDownloading(null)
                        }}
                        className="block text-xs px-3 py-1.5 bg-[#191F28] rounded-lg text-white font-semibold hover:bg-[#333D4B] transition-colors">
                        {downloading === 'preview' ? '⏳ 다운로드 중...' : '⬇️ PNG 다운로드'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI 톤 안내 */}
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
                    { value: 'none',   label: '없음',       desc: '순수 리뷰 유도' },
                    { value: 'coupon', label: '쿠폰 제공',  desc: '할인 쿠폰 증정' },
                    { value: 'stamp',  label: '스탬프',     desc: '스탬프 적립' },
                    { value: 'free',   label: '서비스 제공', desc: '음료/디저트 서비스' },
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
                <p className="text-sm text-[#8B95A1] mb-4">업체를 연동하고 첫 QR을 만들어 리뷰를 수집해보세요</p>
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
                  <div className="flex items-start gap-4">
                    {/* QR 이미지 */}
                    <div
                      onClick={() => setPreviewQR(qr)}
                      className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center cursor-pointer flex-shrink-0 border border-[#E5E8EB] hover:border-[#3182F6] transition-colors p-1">
                      <QRImage url={qr.reviewUrl} size={56} />
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

                      {/* 리뷰 URL 표시 */}
                      {qr.reviewUrl ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-[#4E5968] font-mono truncate max-w-[280px]">
                            {qr.reviewUrl.replace('https://www.localution.co.kr', '')}
                          </span>
                          <button
                            onClick={() => handleCopy(qr.id, qr.reviewUrl)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3182F6] font-semibold flex-shrink-0 hover:bg-[#DBEAFE] transition-colors">
                            {copiedId === qr.id ? '✅' : '복사'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#C9CDD2] mt-1">리뷰 URL 없음 — 업체 연동 필요</p>
                      )}

                      <p className="text-xs text-[#8B95A1] mt-1">생성일: {qr.createdAt}</p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 flex-col sm:flex-row">
                      <button
                        onClick={() => setPreviewQR(qr)}
                        className="px-3 py-2 text-xs font-semibold bg-[#EFF6FF] text-[#3182F6] rounded-xl hover:bg-[#DBEAFE] transition-colors whitespace-nowrap">
                        QR 보기
                      </button>
                      {qr.reviewUrl && (
                        <button
                          onClick={() => handleDownload(qr)}
                          disabled={downloading === qr.id}
                          className="px-3 py-2 text-xs font-semibold bg-[#191F28] text-white rounded-xl hover:bg-[#333D4B] transition-colors disabled:opacity-60 whitespace-nowrap">
                          {downloading === qr.id ? '⏳' : '⬇️ 저장'}
                        </button>
                      )}
                      <button
                        onClick={() => toggleQRActive(qr.id)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
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
            <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] rounded-2xl p-6 border border-[#FDE68A]">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">📊</span>
                <div>
                  <h3 className="font-bold text-[#191F28] mb-1">실시간 스캔 트래킹 준비 중</h3>
                  <p className="text-sm text-[#78350F] leading-relaxed">
                    실제 QR 스캔 수 트래킹 기능은 곧 업데이트 예정입니다.
                    현재는 QR 코드 생성 및 링크 설정에 집중해주세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-5">📱 QR 코드 현황</h3>
              <div className="space-y-3">
                {qrList.map((qr, i) => {
                  const purposeOpt = PURPOSE_OPTIONS.find(p => p.value === qr.purpose)
                  return (
                    <div key={qr.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F9FA]">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-[#D97706]' : 'text-[#8B95A1]'}`}>{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-[#191F28]">{qr.name}</p>
                          <p className="text-xs text-[#8B95A1]">{purposeOpt?.icon} {purposeOpt?.label} · {qr.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {qr.reviewUrl && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold">링크 ✓</span>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          qr.active ? 'bg-green-100 text-green-700' : 'bg-[#F2F4F6] text-[#8B95A1]'
                        }`}>
                          {qr.active ? '활성' : '비활성'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-6 border border-[#BFDBFE]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">✨</span>
                <h3 className="font-bold text-[#191F28]">AI 인사이트</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '🔗', title: '리뷰 링크', desc: storeInfo.connected ? `'${storeInfo.name}'의 리뷰 링크가 생성됐어요. QR을 인쇄해 매장에 비치해보세요!` : '업체를 연동하면 자동으로 리뷰 링크가 만들어져요!' },
                  { icon: '🏪', title: '업체 연동', desc: storeInfo.connected ? `'${storeInfo.name}' 업체가 연동됐어요. QR 만들기로 리뷰 유도를 시작하세요.` : '업체 정보를 연동하면 맞춤 리뷰 링크가 생성돼요!' },
                  { icon: '🎯', title: '다음 액션', desc: !storeInfo.connected ? '먼저 AI 설정 탭에서 업체 정보를 입력해보세요.' : qrList.length === 0 ? '새 QR 만들기를 눌러 첫 QR을 생성해보세요!' : 'QR을 인쇄해서 매장 테이블·입구에 비치해보세요.' },
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
                  키워드 <span className="text-xs font-normal text-[#8B95A1]">(SEO용)</span>
                </label>
                <input
                  value={newQR.keyword}
                  onChange={e => setNewQR(p => ({ ...p, keyword: e.target.value }))}
                  placeholder={settings.mainKeyword ? `기본: ${settings.mainKeyword}` : '예: 강화맛집'}
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors placeholder-[#C9CDD2]"
                />
              </div>

              {/* 연결될 URL 미리보기 */}
              {newQR.purpose === 'review' && storeInfo.connected && (
                <div className="p-3 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                  <p className="text-[11px] text-[#059669] font-semibold mb-1">✅ 자동 연결될 리뷰 링크</p>
                  <p className="text-[10px] text-[#4E5968] break-all font-mono leading-relaxed">
                    {generateReviewUrl(storeInfo, newQR.keyword || settings.mainKeyword)}
                  </p>
                </div>
              )}
              {newQR.purpose === 'review' && !storeInfo.connected && (
                <div className="p-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A]">
                  <p className="text-[11px] text-[#D97706] font-semibold">⚠️ 업체를 먼저 연동해야 리뷰 링크가 생성돼요</p>
                </div>
              )}

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
                <QRImage url={previewQR.reviewUrl} size={200} />
              </div>

              {previewQR.keyword && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold">#{previewQR.keyword}</span>
              )}

              {previewQR.reviewUrl ? (
                <div className="w-full p-3 bg-[#F8FAFF] rounded-xl border border-[#BFDBFE]">
                  <p className="text-[11px] text-[#3182F6] font-semibold mb-1">연결 링크</p>
                  <p className="text-[10px] text-[#4E5968] break-all font-mono leading-relaxed">
                    {previewQR.reviewUrl}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#8B95A1] text-center">업체를 연동하면 리뷰 링크가 QR에 연결돼요</p>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPreviewQR(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors">
                  닫기
                </button>
                {previewQR.reviewUrl && (
                  <button
                    onClick={() => handleCopy(previewQR.id + '_modal', previewQR.reviewUrl)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE] transition-colors">
                    {copiedId === previewQR.id + '_modal' ? '✅ 복사됨' : '🔗 링크 복사'}
                  </button>
                )}
                <button
                  onClick={() => handleDownload(previewQR)}
                  disabled={!previewQR.reviewUrl || downloading === previewQR.id}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    !previewQR.reviewUrl ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed'
                    : 'bg-[#191F28] text-white hover:bg-[#333D4B]'
                  }`}>
                  {downloading === previewQR.id ? '⏳...' : '⬇️ PNG 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
