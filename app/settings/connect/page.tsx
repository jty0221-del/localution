'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'

// ── 대시보드 업체 목록 타입 ────────────────────────────────
type Store = {
  id: string
  name: string
  branch?: string
  address?: string
  category?: string
}

// ── 플랫폼별 연동 매핑 타입 ────────────────────────────────
type PlatformLink = {
  platform: 'naver' | 'google' | 'kakao' | 'baemin' | 'yogiyo' | 'coupangeats'
  storeId: string           // 대시보드 업체 ID
  externalId: string        // 플랫폼 내부 ID (네이버 Place ID 등)
  externalName: string
  externalUrl: string
  linkedAt: string
}

const LS_STORES = 'localution.stores'
const LS_LINKS  = 'localution.platform_links'

// 데모 기본 업체
const DEFAULT_STORES: Store[] = [
  { id: 'store-1', name: '하랑마케팅 카페', branch: '강남점', address: '서울 강남구', category: '카페·베이커리' },
  { id: 'store-2', name: '하랑마케팅 카페', branch: '일산점', address: '경기 고양시 일산동구', category: '카페·베이커리' },
]

// ── SVG 로고 (간략) ────────────────────────────────────────
function NaverLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#03C75A"/>
      <path d="M27 24.6L20.4 13.5H13.5v21H20V19.4l6.8 11.1H33.5v-21H27v15.1z" fill="white"/>
    </svg>
  )
}
function GoogleLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect width="48" height="48" rx="12" fill="white" stroke="#E5E8EB" strokeWidth="1.5"/>
      <path d="M43.6 24.5c0-1.5-.14-3-.38-4.5H24v8.5h10.94c-.5 2.5-1.96 4.6-4.16 6v5h6.74c3.94-3.62 6.08-9 6.08-15z" fill="#4285F4"/>
      <path d="M24 44c5.4 0 9.92-1.8 13.24-4.86l-6.46-5c-1.8 1.2-4.1 1.92-6.78 1.92-5.22 0-9.64-3.52-11.22-8.26H6.12v5.14C9.42 40.02 16.28 44 24 44z" fill="#34A853"/>
      <path d="M12.78 27.8A11.94 11.94 0 0112.2 24c0-1.32.22-2.6.58-3.8v-5.14H6.12A20 20 0 004 24c0 3.22.78 6.28 2.12 9.14l6.66-5.34z" fill="#FBBC05"/>
      <path d="M24 12.08c2.94 0 5.58 1.02 7.66 3l5.74-5.74C33.9 6.06 29.38 4 24 4 16.28 4 9.42 7.98 6.12 14.86l6.66 5.14C14.36 15.6 18.78 12.08 24 12.08z" fill="#EA4335"/>
    </svg>
  )
}
function KakaoLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FEE500"/>
      <path d="M24 10C16.27 10 10 14.69 10 20.5c0 3.89 2.46 7.3 6.2 9.38L14.6 36l6.8-4.5c.84.11 1.71.17 2.6.17 7.73 0 14-4.69 14-10.5S31.73 10 24 10z" fill="#3B1E1E"/>
    </svg>
  )
}
function BaeminLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#2AC1BC"/>
      <path d="M13 15h9.8c4.14 0 6.76 2.01 6.76 5.26 0 2.1-1.2 3.76-3 4.64 2.26.76 3.76 2.56 3.76 5.1 0 3.6-2.7 6-7.5 6H13V15z" fill="white"/>
    </svg>
  )
}
function YogiyoLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FA0050"/>
      <text x="24" y="30" fontSize="13" fontWeight="900" fill="white" textAnchor="middle">요기요</text>
    </svg>
  )
}
function CoupangEatsLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FF4B30"/>
      <path d="M12 17h24M12 24h18M12 31h12" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  )
}

const PLATFORMS = [
  { id: 'naver',       name: '네이버 플레이스', logo: NaverLogo,       brandColor: '#03C75A', category: '리뷰·검색', enabled: true,  desc: '네이버 플레이스 URL로 연동' },
  { id: 'google',      name: '구글 비즈니스',   logo: GoogleLogo,      brandColor: '#4285F4', category: '리뷰·검색', enabled: false, desc: 'Google Business Profile (준비중)' },
  { id: 'kakao',       name: '카카오맵',        logo: KakaoLogo,       brandColor: '#FEE500', category: '리뷰·검색', enabled: false, desc: '카카오맵 장소 연동 (준비중)' },
  { id: 'baemin',      name: '배달의민족',      logo: BaeminLogo,      brandColor: '#2AC1BC', category: '배달',     enabled: false, desc: '배민 셀프서비스 연동 (준비중)' },
  { id: 'yogiyo',      name: '요기요',          logo: YogiyoLogo,      brandColor: '#FA0050', category: '배달',     enabled: false, desc: '요기요 사장님 연동 (준비중)' },
  { id: 'coupangeats', name: '쿠팡이츠',        logo: CoupangEatsLogo, brandColor: '#FF4B30', category: '배달',     enabled: false, desc: '쿠팡이츠 스토어 연동 (준비중)' },
] as const

export default function SettingsConnect() {
  const [stores, setStores]   = useState<Store[]>([])
  const [links, setLinks]     = useState<PlatformLink[]>([])
  const [modal, setModal]     = useState<string | null>(null)   // platform id
  const [selectedStore, setSelectedStore] = useState<string>('')

  // 초기 로드
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_STORES)
      setStores(s ? JSON.parse(s) : DEFAULT_STORES)
      const l = localStorage.getItem(LS_LINKS)
      setLinks(l ? JSON.parse(l) : [])
    } catch {
      setStores(DEFAULT_STORES)
      setLinks([])
    }
  }, [])

  // 링크 저장 헬퍼
  function saveLinks(next: PlatformLink[]) {
    setLinks(next)
    try { localStorage.setItem(LS_LINKS, JSON.stringify(next)) } catch {}
  }

  function openModal(platformId: string) {
    const plat = PLATFORMS.find(p => p.id === platformId)
    if (!plat?.enabled) return
    setSelectedStore(stores[0]?.id || '')
    setModal(platformId)
  }

  function getLinksForPlatform(platformId: string) {
    return links.filter(l => l.platform === platformId)
  }

  function unlink(platform: string, storeId: string) {
    if (!confirm('이 업체의 연동을 해제하시겠습니까?')) return
    saveLinks(links.filter(l => !(l.platform === platform && l.storeId === storeId)))
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-5xl mx-auto">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#191F28]">플랫폼 연동 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-1">
              대시보드의 업체를 각 플랫폼과 연결하여 리뷰·평점·통계를 자동으로 가져오세요
            </p>
          </div>

          {/* 업체 요약 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-[#191F28]">등록된 업체 ({stores.length}개)</h2>
              <button className="text-xs text-[#3182F6] font-semibold">+ 업체 추가</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {stores.map(s => (
                <div key={s.id} className="px-3 py-2 bg-[#F8F9FA] rounded-xl text-xs">
                  <span className="font-bold text-[#191F28]">{s.name}</span>
                  {s.branch && <span className="text-[#8B95A1] ml-1">· {s.branch}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 플랫폼 카드 */}
          <div className="space-y-4">
            {PLATFORMS.map(p => {
              const Logo = p.logo
              const platLinks = getLinksForPlatform(p.id)
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-4 p-5">
                    <Logo size={52} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#191F28]">{p.name}</h3>
                        <span className="text-[10px] text-[#8B95A1] bg-[#F2F4F6] px-2 py-0.5 rounded-full">{p.category}</span>
                        {!p.enabled && (
                          <span className="text-[10px] text-[#FF8C00] bg-[#FFF4E5] px-2 py-0.5 rounded-full font-bold">준비중</span>
                        )}
                      </div>
                      <p className="text-xs text-[#8B95A1] mt-1">{p.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#8B95A1]">연동된 업체</p>
                      <p className="text-xl font-bold" style={{ color: p.brandColor }}>
                        {platLinks.length}<span className="text-sm text-[#8B95A1]">/{stores.length}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => openModal(p.id)}
                      disabled={!p.enabled}
                      className={[
                        'px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                        p.enabled
                          ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'
                          : 'bg-[#F2F4F6] text-[#B0B8C1] cursor-not-allowed',
                      ].join(' ')}
                    >
                      + 업체 연결
                    </button>
                  </div>

                  {/* 연동된 업체 목록 */}
                  {platLinks.length > 0 && (
                    <div className="border-t border-[#F2F4F6] bg-[#FAFBFC] divide-y divide-[#F2F4F6]">
                      {platLinks.map(l => {
                        const store = stores.find(s => s.id === l.storeId)
                        return (
                          <div key={l.storeId} className="flex items-center gap-3 px-5 py-3">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.brandColor }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#191F28]">
                                {store?.name}{store?.branch ? ` · ${store.branch}` : ''}
                                <span className="text-[#8B95A1] font-normal ml-2">→ {l.externalName}</span>
                              </p>
                              <p className="text-[10px] text-[#8B95A1]">ID: {l.externalId} · {l.linkedAt.slice(0, 10)}</p>
                            </div>
                            <a
                              href={l.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#3182F6] font-semibold hover:underline"
                            >
                              열기 ↗
                            </a>
                            <button
                              onClick={() => unlink(p.id, l.storeId)}
                              className="text-xs text-[#8B95A1] border border-[#E5E8EB] px-2.5 py-1 rounded-lg hover:bg-white transition-colors"
                            >
                              해제
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 네이버 연결 모달 */}
          {modal === 'naver' && (
            <NaverConnectModal
              stores={stores}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              onClose={() => setModal(null)}
              onSave={(link) => {
                const next = [...links.filter(l => !(l.platform === link.platform && l.storeId === link.storeId)), link]
                saveLinks(next)
                setModal(null)
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 네이버 플레이스 연결 모달
// ═══════════════════════════════════════════════════════════
function NaverConnectModal(props: {
  stores: Store[]
  selectedStore: string
  setSelectedStore: (id: string) => void
  onClose: () => void
  onSave: (link: PlatformLink) => void
}) {
  const { stores, selectedStore, setSelectedStore, onClose, onSave } = props
  const [urlInput, setUrlInput]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [preview, setPreview]     = useState<{ placeId: string; name: string; desc: string; url: string } | null>(null)

  async function handleVerify() {
    setError('')
    setPreview(null)
    if (!urlInput.trim()) { setError('네이버 플레이스 URL을 입력하세요'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/platforms/naver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', input: urlInput }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '검증 실패'); return }
      setPreview({
        placeId: data.placeId,
        name: data.name || '(이름 조회 실패)',
        desc: data.desc || '',
        url: data.url,
      })
    } catch (err) {
      setError('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!preview) return
    if (!selectedStore) { setError('연결할 업체를 선택하세요'); return }
    const store = stores.find(s => s.id === selectedStore)
    if (!store) return

    onSave({
      platform: 'naver',
      storeId: selectedStore,
      externalId: preview.placeId,
      externalName: preview.name || store.name,
      externalUrl: preview.url,
      linkedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 p-5 border-b border-[#F2F4F6]">
          <NaverLogo size={40} />
          <div className="flex-1">
            <h2 className="font-bold text-[#191F28]">네이버 플레이스 연결</h2>
            <p className="text-xs text-[#8B95A1]">업체와 네이버 플레이스를 연결합니다</p>
          </div>
          <button onClick={onClose} className="text-[#8B95A1] text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: 업체 선택 */}
          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">1. 연결할 업체 선택</label>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6]"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.branch ? ` · ${s.branch}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: URL 입력 */}
          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">2. 네이버 플레이스 URL 또는 ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://map.naver.com/p/entry/place/1234567890"
                className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#03C75A]"
              />
              <button
                onClick={handleVerify}
                disabled={loading}
                className="px-4 py-3 bg-[#03C75A] text-white text-sm font-bold rounded-xl hover:bg-[#02B350] disabled:bg-[#B0B8C1] whitespace-nowrap"
              >
                {loading ? '확인 중...' : '검증'}
              </button>
            </div>
            <p className="text-[11px] text-[#8B95A1] mt-1.5">
              네이버 지도에서 매장 검색 후 URL을 복사해서 붙여넣으세요
            </p>
          </div>

          {/* 에러 */}
          {error && (
            <div className="bg-[#FFF0F0] border border-[#FFD4D4] rounded-xl p-3 text-xs text-[#F04452]">
              ⚠ {error}
            </div>
          )}

          {/* 미리보기 */}
          {preview && (
            <div className="bg-[#F0FFF4] border border-[#C8F0D4] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#03C75A]" />
                <span className="text-xs font-bold text-[#02B350]">검증 완료</span>
              </div>
              <p className="text-sm font-bold text-[#191F28]">{preview.name}</p>
              {preview.desc && <p className="text-[11px] text-[#4E5968] mt-1 line-clamp-2">{preview.desc}</p>}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#C8F0D4]">
                <span className="text-[10px] text-[#8B95A1]">Place ID: {preview.placeId}</span>
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#03C75A] font-semibold hover:underline">
                  페이지 열기 ↗
                </a>
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-[#E5E8EB] text-[#4E5968] text-sm font-bold rounded-xl hover:bg-[#F8F9FA]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!preview}
              className="flex-1 py-3 bg-[#3182F6] text-white text-sm font-bold rounded-xl hover:bg-[#1B64DA] disabled:bg-[#B0B8C1]"
            >
              연결 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
