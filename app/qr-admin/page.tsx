'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

const LS_QR_SETTINGS = 'localution.qr_settings'
const LS_QR_LIST     = 'localution.qr_list'
const LS_STORE_INFO  = 'localution.store_info'
const BASE_URL       = 'https://www.localution.co.kr'

interface QRSettings {
  rewardType: string
  rewardValue: string
}

interface StoreInfo {
  name: string
  category: string
  location: string
  naverUrl: string
  connected: boolean
  // ⭐ 네이버 연동 자동 로드 추적용 (사용자 수동입력과 구분)
  source?: 'manual' | 'naver_synced'
  // 네이버 연동 시 추가 정보
  naverPlaceId?: string       // internal SmartPlace placeId (10441797 같은)
  naverExternalPlaceId?: string  // external m.place.naver.com placeId (1137287126 같은)
}

interface QRCode {
  id: string
  name: string
  purpose: string
  scans: number
  reviews: number
  createdAt: string
  active: boolean
  reviewUrl: string
}

const DEFAULT_SETTINGS: QRSettings = {
  rewardType: 'none',
  rewardValue: '',
}

const DEFAULT_STORE: StoreInfo = {
  name: '',
  category: '',
  location: '',
  naverUrl: '',
  connected: false,
}

const PURPOSE_OPTIONS = [
  { value: 'review', label: '리뷰 유도',   icon: '⭐', desc: '네이버·구글 리뷰 작성' },
  { value: 'menu',   label: '디지털 메뉴', icon: '📋', desc: 'QR로 메뉴판 연결' },
  { value: 'event',  label: '쿠폰·이벤트', icon: '🎁', desc: '할인 쿠폰 / 이벤트 페이지' },
  { value: 'sns',    label: 'SNS 팔로우',  icon: '📸', desc: '인스타·카카오 연결' },
]

// ─── 리뷰 URL 생성 ────────────────────────────────────────────────
// /review/[storeId] 쿼리 파라미터 규격: n=상호명 / t=업종 / a=지역 / naver=URL
function generateReviewUrl(store: StoreInfo): string {
  const name = store.name.trim()
  if (!name) return ''
  const slug = name.replace(/\s+/g, '-')
  const params = new URLSearchParams()
  params.set('n', name)
  if (store.category) params.set('t', store.category)
  if (store.location)  params.set('a', store.location)
  if (store.naverUrl)  params.set('naver', store.naverUrl.trim())
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
        <span className="text-[10px] font-medium text-center leading-tight px-1">업체 연동 후<br />QR 생성됩니다</span>
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
  const [activeTab, setActiveTab]   = useState<'settings' | 'list' | 'stats'>('settings')
  const [settings, setSettings]     = useState<QRSettings>(DEFAULT_SETTINGS)
  const [storeInfo, setStoreInfo]   = useState<StoreInfo>(DEFAULT_STORE)
  const [storeEdit, setStoreEdit]   = useState(false)
  const [storeDraft, setStoreDraft] = useState<StoreInfo>(DEFAULT_STORE)
  const [qrList, setQrList]         = useState<QRCode[]>([])
  const [saved, setSaved]           = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newQR, setNewQR]           = useState({ name: '', purpose: 'review' })
  const [creating, setCreating]     = useState(false)
  const [created, setCreated]       = useState(false)
  const [previewQR, setPreviewQR]   = useState<QRCode | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_QR_SETTINGS)
      if (raw) {
        const parsed = JSON.parse(raw)
        setSettings({
          rewardType:  parsed.rewardType  || 'none',
          rewardValue: parsed.rewardValue || '',
        })
      }
      const rawList = localStorage.getItem(LS_QR_LIST)
      if (rawList) setQrList(JSON.parse(rawList))
      // localStorage 의 매장 정보 — DB 로드 실패 시 fallback 으로 사용
      const rawStore = localStorage.getItem(LS_STORE_INFO)
      if (rawStore) setStoreInfo(JSON.parse(rawStore))
    } catch (_) {}

    // ⭐ /api/stores/me 에서 네이버 연동 매장 정보 자동 로드
    // 사장님이 /my/platforms/naver_place/connect 에서 등록한 정보 → qr-admin 자동 채움
    // localStorage 우선순위 < DB (네이버 연동된 정보가 source of truth)
    let cancelled = false
    fetch('/api/stores/me', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        const store = j?.store
        if (!store?.name) return  // 네이버 연동 안 된 사용자 — localStorage 그대로 유지

        // m.place.naver.com URL 에서 외부 placeId 추출 (1137287126 같은)
        const naverUrl = store.naver_url || store.naver_place_url || ''
        let externalId = ''
        if (naverUrl) {
          const m = naverUrl.match(/place\/(\d{5,})/)
          if (m) externalId = m[1]
        }

        const synced: StoreInfo = {
          name:     store.name || '',
          category: store.category || '',
          location: store.address || store.location || '',
          naverUrl: naverUrl,
          connected: true,
          source: 'naver_synced',
          naverPlaceId: store.naver_place_id || '',
          naverExternalPlaceId: externalId,
        }
        setStoreInfo(synced)
        // localStorage 도 sync (오프라인 캐시)
        try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(synced)) } catch (_) {}
      })
      .catch(() => null)
    return () => { cancelled = true }
  }, [])

  function saveSettings(next: QRSettings) {
    setSettings(next)
    try { localStorage.setItem(LS_QR_SETTINGS, JSON.stringify(next)) } catch (_) {}
  }

  const saveStoreInfo = () => {
    const next = { ...storeDraft, connected: !!(storeDraft.name && storeDraft.location) }
    setStoreInfo(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}
    setStoreEdit(false)
  }

  const handleSaveSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCreateQR = async () => {
    if (!newQR.name) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 900))

    let reviewUrl = ''
    if (newQR.purpose === 'review' && storeInfo.connected) {
      reviewUrl = generateReviewUrl(storeInfo)
    }

    const newItem: QRCode = {
      id: Date.now().toString(),
      name: newQR.name,
      purpose: newQR.purpose,
      scans: 0,
      reviews: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
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
      setNewQR({ name: '', purpose: 'review' })
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
  const previewReviewUrl = storeInfo.connected ? generateReviewUrl(storeInfo) : ''

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
                <p className="text-xs text-[#059669] font-semibold">
                  {storeInfo.source === 'naver_synced' ? '네이버 자동 연동' : '업체 연동됨'}
                </p>
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
            { key: 'settings', label: '업체 설정' },
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

        {/* ── 업체 설정 탭 ── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 좌측: 네이버 업체 연동 */}
            <div>
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
                    <p className="text-sm text-[#4E5968] mb-3 leading-relaxed">
                      네이버 플레이스를 연결하면 매장 정보가 <strong>자동으로 채워져요</strong>.
                      QR 스캔 시 바로 리뷰 페이지로 연결돼요.
                    </p>
                    <a
                      href="/my/platforms/naver_place/connect"
                      className="block w-full py-3 mb-2 rounded-xl bg-[#03C75A] text-white font-bold text-sm text-center hover:bg-[#02A04A] transition-colors">
                      🟢 네이버 플레이스 연결하기 →
                    </a>
                    <button
                      onClick={() => { setStoreDraft(DEFAULT_STORE); setStoreEdit(true) }}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#BFDBFE] text-[#3182F6] font-semibold text-xs hover:bg-[#EFF6FF] transition-colors">
                      또는 직접 입력하기
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
                        네이버 플레이스 URL <span className="font-normal text-[#C9CDD2]">(선택)</span>
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
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0" />
                          <span className="font-bold text-[#191F28] text-sm truncate">{storeInfo.name}</span>
                        </div>
                        {storeInfo.source === 'naver_synced' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#03C75A] text-white whitespace-nowrap">
                            네이버 자동 연동
                          </span>
                        )}
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
                      {storeInfo.source === 'naver_synced' && (
                        <p className="text-[10px] text-[#059669] pl-4 mt-1.5 leading-relaxed">
                          ✓ 매장 정보는 <a href="/my/platforms/naver_place/connect" className="underline font-bold">매장 연결 페이지</a>에서 관리돼요
                        </p>
                      )}
                    </div>
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
            </div>

            {/* 우측: QR 미리보기 + 보상 설정 + 저장 */}
            <div className="space-y-5">

              {/* QR 미리보기 */}
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

              {/* 고객 보상 설정 */}
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
                    { value: 'none',   label: '없음',        desc: '순수 리뷰 유도' },
                    { value: 'coupon', label: '쿠폰 제공',   desc: '할인 쿠폰 증정' },
                    { value: 'stamp',  label: '스탬프',      desc: '스탬프 적립' },
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
                        onChange={() => saveSettings({ ...settings, rewardType: opt.value })}
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
                      onChange={e => saveSettings({ ...settings, rewardValue: e.target.value })}
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-medium">
                          {purposeOpt?.icon} {purposeOpt?.label}
                        </span>
                      </div>

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
                {qrList.length === 0 ? (
                  <p className="text-sm text-[#8B95A1] text-center py-6">생성된 QR이 없어요</p>
                ) : qrList.map((qr, i) => {
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
                <h3 className="font-bold text-[#191F28]">다음 액션 가이드</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '🏪', title: '업체 연동', desc: storeInfo.connected ? `'${storeInfo.name}' 연동 완료! QR을 만들어 매장에 비치해보세요.` : '업체 설정 탭에서 업체 정보를 먼저 입력해주세요.' },
                  { icon: '📱', title: 'QR 생성',   desc: qrList.length > 0 ? `현재 ${qrList.length}개의 QR이 있어요. 활성 QR: ${activeCount}개` : '새 QR 만들기 버튼으로 첫 QR을 생성해보세요!' },
                  { icon: '🖨️', title: '인쇄·비치', desc: 'QR을 PNG로 다운로드해 매장 테이블·입구·계산대에 비치하면 리뷰가 늘어나요.' },
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

              {/* 연결될 URL 미리보기 */}
              {newQR.purpose === 'review' && storeInfo.connected && (
                <div className="p-3 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                  <p className="text-[11px] text-[#059669] font-semibold mb-1">✅ 자동 연결될 리뷰 링크</p>
                  <p className="text-[10px] text-[#4E5968] break-all font-mono leading-relaxed">
                    {generateReviewUrl(storeInfo)}
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

      {/* ── QR 미리보기·다운로드 모달 ── */}
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
