'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import { toast, confirmDialog } from '../../lib/toast'
import PlatformLogo from '../../components/PlatformLogo'
import { Link2, Search } from 'lucide-react'

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

const LS_STORES  = 'localution.stores'
const LS_LINKS   = 'localution.platform_links'
const LS_PROFILE = 'localution_store'   // /settings/profile 에서 저장하는 키

// 로그인 사용자의 프로필 매장 정보 → stores[] 변환
function storesFromProfile(): Store[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_PROFILE)
    if (!raw) return []
    const p = JSON.parse(raw)
    if (!p?.storeName) return []
    return [{
      id: 'store-me',
      name: p.storeName,
      branch: p.branch || undefined,
      address: p.address || undefined,
    }]
  } catch { return [] }
}

// ── SVG 로고 (PlatformLogo 미지원 플랫폼만 인라인 유지) ────
function NaverLogo({ size = 48 }: { size?: number }) {
  return <PlatformLogo platform="naver_place" size={size} />
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
  return <PlatformLogo platform="kakao_map" size={size} />
}
function BaeminLogo({ size = 48 }: { size?: number }) {
  return <PlatformLogo platform="baemin" size={size} />
}
function YogiyoLogo({ size = 48 }: { size?: number }) {
  return <PlatformLogo platform="yogiyo" size={size} />
}
function CoupangEatsLogo({ size = 48 }: { size?: number }) {
  return <PlatformLogo platform="coupangeats" size={size} />
}

const PLATFORMS = [
  { id: 'naver',       name: '네이버 플레이스', logo: NaverLogo,       brandColor: '#03C75A', category: '리뷰·검색', enabled: true,  desc: '네이버 플레이스 URL로 연동' },
  { id: 'google',      name: '구글 비즈니스',   logo: GoogleLogo,      brandColor: '#4285F4', category: '리뷰·검색', enabled: true,  desc: 'Google Maps Place ID로 연동' },
  { id: 'kakao',       name: '카카오맵',        logo: KakaoLogo,       brandColor: '#F9C706', category: '리뷰·검색', enabled: true,  desc: '카카오맵 장소 ID로 연동' },
  { id: 'baemin',      name: '배달의민족',      logo: BaeminLogo,      brandColor: '#2AC1BC', category: '배달',     enabled: true,  desc: '배민 매장 ID 또는 URL로 연동' },
  { id: 'yogiyo',      name: '요기요',          logo: YogiyoLogo,      brandColor: '#FA0050', category: '배달',     enabled: true,  desc: '요기요 매장 ID 또는 URL로 연동' },
  { id: 'coupangeats', name: '쿠팡이츠',        logo: CoupangEatsLogo, brandColor: '#FF4B30', category: '배달',     enabled: true,  desc: '쿠팡이츠 매장 ID 또는 URL로 연동' },
] as const

export default function SettingsConnect() {
  const [stores, setStores]   = useState<Store[]>([])
  const [links, setLinks]     = useState<PlatformLink[]>([])
  const [modal, setModal]     = useState<string | null>(null)   // platform id
  const [selectedStore, setSelectedStore] = useState<string>('')

  // 초기 로드 + 프로필 변경 실시간 반영
  useEffect(() => {
    function loadStores() {
      try {
        const s = localStorage.getItem(LS_STORES)
        const parsed = s ? JSON.parse(s) : null
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStores(parsed)
        } else {
          setStores(storesFromProfile())
        }
      } catch { setStores(storesFromProfile()) }
    }
    function loadLinks() {
      try {
        const l = localStorage.getItem(LS_LINKS)
        setLinks(l ? JSON.parse(l) : [])
      } catch { setLinks([]) }
    }
    loadStores()
    loadLinks()

    const onUserChange = () => loadStores()
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_PROFILE || e.key === LS_STORES) loadStores()
      if (e.key === LS_LINKS) loadLinks()
    }
    window.addEventListener('localution:user-change', onUserChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('localution:user-change', onUserChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // 업체 저장 헬퍼 (검증된 이름으로 업데이트)
  function saveStores(next: Store[]) {
    setStores(next)
    try { localStorage.setItem(LS_STORES, JSON.stringify(next)) } catch {}
  }

  // 링크 저장 헬퍼
  function saveLinks(next: PlatformLink[]) {
    setLinks(next)
    try { localStorage.setItem(LS_LINKS, JSON.stringify(next)) } catch {}
  }

  async function openModal(platformId: string) {
    const plat = PLATFORMS.find(p => p.id === platformId)
    if (!plat?.enabled) return
    if (stores.length === 0) {
      const ok = await confirmDialog(
        '먼저 프로필 설정에서 매장 정보를 등록해야 합니다.\n프로필 설정으로 이동할까요?',
        { title: '매장 정보 필요', okText: '프로필로 이동' },
      )
      if (ok) window.location.href = '/settings/profile'
      return
    }
    setSelectedStore(stores[0]?.id || '')
    setModal(platformId)
  }

  // 플랫폼 연결 저장 시 stores도 갱신 (검증된 매장명 반영)
  function handleLinkSave(link: PlatformLink) {
    const next = [...links.filter(l => !(l.platform === link.platform && l.storeId === link.storeId)), link]
    saveLinks(next)
    // 해당 store의 name이 비어있거나 하드코딩 기본값이면 검증된 이름으로 업데이트
    const store = stores.find(s => s.id === link.storeId)
    if (store && link.externalName && !store.name) {
      const updated = stores.map(s => s.id === link.storeId ? { ...s, name: link.externalName } : s)
      saveStores(updated)
    }
    setModal(null)
  }

  function getLinksForPlatform(platformId: string) {
    return links.filter(l => l.platform === platformId)
  }

  async function unlink(platform: string, storeId: string) {
    const ok = await confirmDialog('이 업체의 연동을 해제하시겠습니까?', {
      title: '연동 해제',
      okText: '해제',
      danger: true,
    })
    if (!ok) return
    saveLinks(links.filter(l => !(l.platform === platform && l.storeId === storeId)))
    toast.success('연동을 해제했어요')
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-4 md:pt-0">
        {/* LOCALUTION_HERO_BANNER */}
        <section className="bg-gradient-to-r from-[#059669] to-[#047857] text-white px-4 sm:px-8 py-10 sm:py-14">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <Link2 size={26} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">연동 관리</h1>
              <p className="text-white/85 text-xs sm:text-sm mt-1 leading-relaxed">네이버·카카오·배민·요기요·쿠팡이츠를 한 계정에</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
              로컬루션
            </div>
          </div>
        </section>
        <div className="max-w-5xl mx-auto p-4 md:p-8">

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
              <a href="/settings/profile" className="text-xs text-[#3182F6] font-semibold hover:underline">매장 정보 편집 →</a>
            </div>
            {stores.length === 0 ? (
              <div className="text-center py-6 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
                <p className="text-sm font-bold text-[#92400E] mb-1">아직 등록된 업체가 없어요</p>
                <p className="text-xs text-[#B45309] mb-3">먼저 프로필 설정에서 매장명·지점을 등록해주세요</p>
                <a href="/settings/profile" className="inline-block px-4 py-2 bg-[#3182F6] text-white text-xs font-bold rounded-xl hover:bg-[#1B64DA]">
                  프로필 설정으로 이동 →
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stores.map(s => (
                  <div key={s.id} className="px-3 py-2 bg-[#F8F9FA] rounded-xl text-xs">
                    <span className="font-bold text-[#191F28]">{s.name}</span>
                    {s.branch && <span className="text-[#8B95A1] ml-1">· {s.branch}</span>}
                  </div>
                ))}
              </div>
            )}
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
                      <div className="flex flex-col sm:flex-row items-center gap-2">
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
                        // 검증된 매장명(externalName)을 우선 표시. 없으면 대시보드 업체명 fallback.
                        const primaryName = l.externalName || store?.name || '(매장 정보 없음)'
                        return (
                          <div key={l.storeId} className="flex items-center gap-3 px-5 py-3">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.brandColor }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#191F28] truncate">
                                {primaryName}
                                {store && store.name !== l.externalName && (
                                  <span className="text-[#8B95A1] font-normal ml-2 text-xs">
                                    · {store.name}{store.branch ? ` ${store.branch}` : ''}
                                  </span>
                                )}
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
              onSave={handleLinkSave}
            />
          )}

          {/* 카카오 연결 모달 */}
          {modal === 'kakao' && (
            <KakaoConnectModal
              stores={stores}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              onClose={() => setModal(null)}
              onSave={handleLinkSave}
            />
          )}

          {/* 배달 플랫폼 모달 (배민/요기요/쿠팡이츠 공용) */}
          {(modal === 'baemin' || modal === 'yogiyo' || modal === 'coupangeats') && (
            <DeliveryConnectModal
              platform={modal as 'baemin' | 'yogiyo' | 'coupangeats'}
              stores={stores}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              onClose={() => setModal(null)}
              onSave={handleLinkSave}
            />
          )}

          {/* 구글 연결 모달 */}
          {modal === 'google' && (
            <GoogleConnectModal
              stores={stores}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              onClose={() => setModal(null)}
              onSave={handleLinkSave}
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
            <div className="flex flex-col sm:flex-row gap-2">
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
              {error}
            </div>
          )}

          {/* 미리보기 */}
          {preview && (
            <div className="bg-[#F0FFF4] border border-[#C8F0D4] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#03C75A]" />
                <span className="text-xs font-bold text-[#02B350]">검증 완료</span>
                <span className="ml-auto text-[10px] text-[#02B350] bg-white px-2 py-0.5 rounded-full border border-[#C8F0D4]">이 매장명으로 저장됩니다</span>
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

// ═══════════════════════════════════════════════════════════
// 구글 비즈니스 연결 모달
// ═══════════════════════════════════════════════════════════
function GoogleConnectModal(props: {
  stores: Store[]
  selectedStore: string
  setSelectedStore: (id: string) => void
  onClose: () => void
  onSave: (link: PlatformLink) => void
}) {
  const { stores, selectedStore, setSelectedStore, onClose, onSave } = props
  const [mode, setMode]         = useState<'url' | 'search'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [searchQ, setSearchQ]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [preview, setPreview]   = useState<{
    placeId: string; name: string; address: string
    rating: number; reviewCount: number; url: string
  } | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])

  async function handleVerifyUrl() {
    setError(''); setPreview(null); setSearchResults([])
    if (!urlInput.trim()) { setError('Google Maps URL 또는 Place ID를 입력하세요'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/platforms/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', input: urlInput }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '검증 실패'); return }
      setPreview({ placeId: data.placeId, name: data.name, address: data.address || '', rating: data.rating || 0, reviewCount: data.reviewCount || 0, url: data.url })
    } catch { setError('네트워크 오류') }
    finally { setLoading(false) }
  }

  async function handleSearch() {
    setError(''); setPreview(null); setSearchResults([])
    if (!searchQ.trim()) { setError('검색어를 입력하세요'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/platforms/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQ }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '검색 실패'); return }
      setSearchResults(data.items || [])
    } catch { setError('네트워크 오류') }
    finally { setLoading(false) }
  }

  function selectResult(item: any) {
    setPreview({ placeId: item.placeId, name: item.name, address: item.address, rating: item.rating || 0, reviewCount: item.userRatingsTotal || 0, url: `https://www.google.com/maps/place/?q=place_id:${item.placeId}` })
    setSearchResults([])
  }

  function handleSave() {
    if (!preview) return
    if (!selectedStore) { setError('연결할 업체를 선택하세요'); return }
    const store = stores.find(s => s.id === selectedStore)
    if (!store) return
    onSave({ platform: 'google', storeId: selectedStore, externalId: preview.placeId, externalName: preview.name, externalUrl: preview.url, linkedAt: new Date().toISOString() })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 p-5 border-b border-[#F2F4F6]">
          <GoogleLogo size={40} />
          <div className="flex-1">
            <h2 className="font-bold text-[#191F28]">구글 비즈니스 연결</h2>
            <p className="text-xs text-[#8B95A1]">Google Maps로 매장을 검색하거나 URL을 붙여넣으세요</p>
          </div>
          <button onClick={onClose} className="text-[#8B95A1] text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: 업체 선택 */}
          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">1. 연결할 업체 선택</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4285F4]">
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.branch ? ` · ${s.branch}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Step 2: URL or 검색 탭 */}
          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">2. Google Maps 연결 방식</label>
            <div className="flex bg-[#F2F4F6] rounded-xl p-1 gap-1 mb-3">
              {(['url', 'search'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setPreview(null); setSearchResults([]) }}
                  className={['flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5', mode === m ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'].join(' ')}>
                  {m === 'url' ? <><Link2 size={12} strokeWidth={2.5} /> URL 입력</> : <><Search size={12} strokeWidth={2.5} /> 매장명 검색</>}
                </button>
              ))}
            </div>

            {mode === 'url' ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://www.google.com/maps/place/..."
                  className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4285F4]" />
                <button onClick={handleVerifyUrl} disabled={loading}
                  className="px-4 py-3 bg-[#4285F4] text-white text-sm font-bold rounded-xl hover:bg-[#3367D6] disabled:bg-[#B0B8C1] whitespace-nowrap">
                  {loading ? '확인 중...' : '검증'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="예: 매장 이름, 지역 + 업종 (예: 서울 강남구 카페)"
                  className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4285F4]" />
                <button onClick={handleSearch} disabled={loading}
                  className="px-4 py-3 bg-[#4285F4] text-white text-sm font-bold rounded-xl hover:bg-[#3367D6] disabled:bg-[#B0B8C1] whitespace-nowrap">
                  {loading ? '검색 중...' : '검색'}
                </button>
              </div>
            )}
          </div>

          {/* 에러 */}
          {error && <div className="bg-[#FFF0F0] border border-[#FFD4D4] rounded-xl p-3 text-xs text-[#F04452]">{error}</div>}

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="border border-[#E5E8EB] rounded-xl overflow-hidden">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => selectResult(r)}
                  className="w-full text-left px-4 py-3 hover:bg-[#EFF6FF] border-b last:border-b-0 border-[#F2F4F6] transition-colors">
                  <p className="text-sm font-semibold text-[#191F28]">{r.name}</p>
                  <p className="text-[11px] text-[#8B95A1] truncate">{r.address}</p>
                  {r.rating && <p className="text-[11px] text-[#F5A623]">★ {r.rating} ({r.userRatingsTotal?.toLocaleString()}건)</p>}
                </button>
              ))}
            </div>
          )}

          {/* 미리보기 */}
          {preview && (
            <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                <span className="text-xs font-bold text-[#3367D6]">검증 완료</span>
                {preview.rating > 0 && <span className="ml-auto text-xs text-[#F5A623]">★ {preview.rating} ({preview.reviewCount?.toLocaleString()}건)</span>}
              </div>
              <p className="text-sm font-bold text-[#191F28]">{preview.name}</p>
              {preview.address && <p className="text-[11px] text-[#4E5968] mt-0.5">{preview.address}</p>}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#DBEAFE]">
                <span className="text-[10px] text-[#8B95A1] truncate max-w-[200px]">ID: {preview.placeId}</span>
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#4285F4] font-semibold hover:underline">지도 열기 ↗</a>
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-3 border border-[#E5E8EB] text-[#4E5968] text-sm font-bold rounded-xl hover:bg-[#F8F9FA]">취소</button>
            <button onClick={handleSave} disabled={!preview}
              className="flex-1 py-3 bg-[#3182F6] text-white text-sm font-bold rounded-xl hover:bg-[#1B64DA] disabled:bg-[#B0B8C1]">
              연결 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 카카오맵 연결 모달
// ═══════════════════════════════════════════════════════════
function KakaoConnectModal(props: {
  stores: Store[]
  selectedStore: string
  setSelectedStore: (id: string) => void
  onClose: () => void
  onSave: (link: PlatformLink) => void
}) {
  const { stores, selectedStore, setSelectedStore, onClose, onSave } = props
  const [mode, setMode]         = useState<'url' | 'search'>('search')
  const [urlInput, setUrlInput] = useState('')
  const [searchQ, setSearchQ]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [preview, setPreview]   = useState<{ kakaoId: string; name: string; url: string } | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])

  async function handleVerifyUrl() {
    setError(''); setPreview(null); setSearchResults([])
    if (!urlInput.trim()) { setError('카카오맵 URL을 입력하세요'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/platforms/kakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', input: urlInput }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '검증 실패'); return }
      setPreview({ kakaoId: data.kakaoId, name: data.name, url: data.url })
    } catch { setError('네트워크 오류') }
    finally { setLoading(false) }
  }

  async function handleSearch() {
    setError(''); setPreview(null); setSearchResults([])
    if (!searchQ.trim()) { setError('검색어를 입력하세요'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/platforms/kakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQ }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '검색 실패'); return }
      setSearchResults(data.items || [])
    } catch { setError('네트워크 오류') }
    finally { setLoading(false) }
  }

  function handleSave() {
    if (!preview) return
    if (!selectedStore) { setError('연결할 업체를 선택하세요'); return }
    onSave({ platform: 'kakao', storeId: selectedStore, externalId: preview.kakaoId, externalName: preview.name, externalUrl: preview.url, linkedAt: new Date().toISOString() })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-5 border-b border-[#F2F4F6]">
          <KakaoLogo size={40} />
          <div className="flex-1">
            <h2 className="font-bold text-[#191F28]">카카오맵 연결</h2>
            <p className="text-xs text-[#8B95A1]">카카오맵에서 매장을 검색하거나 URL을 입력하세요</p>
          </div>
          <button onClick={onClose} className="text-[#8B95A1] text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">1. 연결할 업체 선택</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F9C706]">
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.branch ? ` · ${s.branch}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">2. 카카오맵 연결 방식</label>
            <div className="flex bg-[#F2F4F6] rounded-xl p-1 gap-1 mb-3">
              {(['search', 'url'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setPreview(null); setSearchResults([]) }}
                  className={['flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5', mode === m ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'].join(' ')}>
                  {m === 'search' ? <><Search size={12} strokeWidth={2.5} /> 매장명 검색</> : <><Link2 size={12} strokeWidth={2.5} /> URL 입력</>}
                </button>
              ))}
            </div>

            {mode === 'search' ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="예: 내 매장 이름"
                  className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F9C706]" />
                <button onClick={handleSearch} disabled={loading}
                  className="px-4 py-3 bg-[#F9C706] text-[#3B1E1E] text-sm font-bold rounded-xl hover:bg-[#F0BC00] disabled:bg-[#B0B8C1] disabled:text-white whitespace-nowrap">
                  {loading ? '검색 중...' : '검색'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://place.map.kakao.com/1234567890"
                  className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F9C706]" />
                <button onClick={handleVerifyUrl} disabled={loading}
                  className="px-4 py-3 bg-[#F9C706] text-[#3B1E1E] text-sm font-bold rounded-xl hover:bg-[#F0BC00] disabled:bg-[#B0B8C1] disabled:text-white whitespace-nowrap">
                  {loading ? '확인 중...' : '검증'}
                </button>
              </div>
            )}
          </div>

          {error && <div className="bg-[#FFF0F0] border border-[#FFD4D4] rounded-xl p-3 text-xs text-[#F04452]">{error}</div>}

          {searchResults.length > 0 && (
            <div className="border border-[#E5E8EB] rounded-xl overflow-hidden">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { setPreview({ kakaoId: r.kakaoId, name: r.name, url: r.url }); setSearchResults([]) }}
                  className="w-full text-left px-4 py-3 hover:bg-[#FFFDE7] border-b last:border-b-0 border-[#F2F4F6] transition-colors">
                  <p className="text-sm font-semibold text-[#191F28]">{r.name}</p>
                  <p className="text-[11px] text-[#8B95A1]">{r.address}</p>
                  {r.category && <p className="text-[10px] text-[#8B95A1]">{r.category}</p>}
                </button>
              ))}
            </div>
          )}

          {preview && (
            <div className="bg-[#FFFDE7] border border-[#FDD835] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#F9C706]" />
                <span className="text-xs font-bold text-[#795548]">검증 완료</span>
              </div>
              <p className="text-sm font-bold text-[#191F28]">{preview.name}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#FDD835]">
                <span className="text-[10px] text-[#8B95A1]">ID: {preview.kakaoId}</span>
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#795548] font-semibold hover:underline">지도 열기 ↗</a>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-3 border border-[#E5E8EB] text-[#4E5968] text-sm font-bold rounded-xl hover:bg-[#F8F9FA]">취소</button>
            <button onClick={handleSave} disabled={!preview}
              className="flex-1 py-3 bg-[#3182F6] text-white text-sm font-bold rounded-xl hover:bg-[#1B64DA] disabled:bg-[#B0B8C1]">
              연결 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 배달 플랫폼 공용 연결 모달 (배달의민족 / 요기요 / 쿠팡이츠)
// ═══════════════════════════════════════════════════════════
const DELIVERY_META = {
  baemin:      { name: '배달의민족', color: '#2AC1BC', logo: BaeminLogo,      placeholder: 'https://baemin.me/매장ID 또는 매장ID 직접 입력', helpUrl: 'https://self.baemin.com' },
  yogiyo:      { name: '요기요',     color: '#FA0050', logo: YogiyoLogo,      placeholder: 'https://www.yogiyo.co.kr/restaurant/12345 또는 숫자 ID', helpUrl: 'https://ceo.yogiyo.co.kr' },
  coupangeats: { name: '쿠팡이츠',   color: '#FF4B30', logo: CoupangEatsLogo, placeholder: '쿠팡이츠 스토어 URL 또는 스토어 ID', helpUrl: 'https://store.coupangeats.com' },
} as const

function DeliveryConnectModal(props: {
  platform: 'baemin' | 'yogiyo' | 'coupangeats'
  stores: Store[]
  selectedStore: string
  setSelectedStore: (id: string) => void
  onClose: () => void
  onSave: (link: PlatformLink) => void
}) {
  const { platform, stores, selectedStore, setSelectedStore, onClose, onSave } = props
  const meta = DELIVERY_META[platform]
  const Logo = meta.logo

  const [urlInput, setUrlInput] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [preview, setPreview]   = useState<{ externalId: string; name: string; url: string } | null>(null)

  async function handleVerify() {
    setError(''); setPreview(null)
    if (!urlInput.trim()) { setError(`${meta.name} 매장 URL 또는 ID를 입력하세요`); return }
    setLoading(true)
    try {
      const res = await fetch('/api/platforms/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, action: 'verify', input: urlInput }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '검증 실패'); return }
      setPreview({ externalId: data.externalId, name: data.name, url: data.url })
    } catch { setError('네트워크 오류') }
    finally { setLoading(false) }
  }

  function handleSave() {
    if (!preview) return
    if (!selectedStore) { setError('연결할 업체를 선택하세요'); return }
    onSave({ platform, storeId: selectedStore, externalId: preview.externalId, externalName: preview.name, externalUrl: preview.url, linkedAt: new Date().toISOString() })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-5 border-b border-[#F2F4F6]">
          <Logo size={40} />
          <div className="flex-1">
            <h2 className="font-bold text-[#191F28]">{meta.name} 연결</h2>
            <p className="text-xs text-[#8B95A1]">매장 URL 또는 ID를 입력해 연결합니다</p>
          </div>
          <button onClick={onClose} className="text-[#8B95A1] text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">1. 연결할 업체 선택</label>
            <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ outlineColor: meta.color }}>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.branch ? ` · ${s.branch}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4E5968] mb-2">2. {meta.name} 매장 URL 또는 ID</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder={meta.placeholder}
                className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none" />
              <button onClick={handleVerify} disabled={loading}
                className="px-4 py-3 text-white text-sm font-bold rounded-xl disabled:bg-[#B0B8C1] whitespace-nowrap transition-colors"
                style={{ backgroundColor: loading ? undefined : meta.color }}>
                {loading ? '확인 중...' : '확인'}
              </button>
            </div>
            <p className="text-[11px] text-[#8B95A1] mt-1.5">
              <a href={meta.helpUrl} target="_blank" rel="noreferrer" className="text-[#3182F6] hover:underline">
                {meta.name} 사장님 센터 ↗
              </a>에서 매장 URL을 복사하세요
            </p>
          </div>

          {error && <div className="bg-[#FFF0F0] border border-[#FFD4D4] rounded-xl p-3 text-xs text-[#F04452]">{error}</div>}

          {preview && (
            <div className="bg-[#F8FFFE] border rounded-xl p-4" style={{ borderColor: meta.color + '66' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                <span className="text-xs font-bold" style={{ color: meta.color }}>연결 준비 완료</span>
              </div>
              <p className="text-sm font-bold text-[#191F28]">{preview.name}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: meta.color + '33' }}>
                <span className="text-[10px] text-[#8B95A1]">ID: {preview.externalId}</span>
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-[10px] font-semibold hover:underline" style={{ color: meta.color }}>매장 열기 ↗</a>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-3 border border-[#E5E8EB] text-[#4E5968] text-sm font-bold rounded-xl hover:bg-[#F8F9FA]">취소</button>
            <button onClick={handleSave} disabled={!preview}
              className="flex-1 py-3 bg-[#3182F6] text-white text-sm font-bold rounded-xl hover:bg-[#1B64DA] disabled:bg-[#B0B8C1]">
              연결 저장
            </button>
          </div>
        </div>
      </div>
    <Footer />
    </div>
  )
}

