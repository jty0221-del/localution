'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import AffiliateAdSlots from '../components/AffiliateAdSlots'
import QRReportPanel from '../components/QRReportPanel'
import StampCardEditor from '../components/StampCardEditor'
import MenuBoardEditor from '../components/MenuBoardEditor'
import WifiQRBox from '../components/WifiQRBox'
import QRImage from '../components/QRImage'
import PageHeader from '../components/PageHeader'
import {
  QrCode, CheckCircle2, Sparkles,
  Eye, ReceiptText, Camera, Send,
  Smartphone, Tablet, Monitor,
  BarChart3, TrendingUp, Clock,
  Store, Printer, Link2, Gift, Wifi,
  type LucideIcon,
} from 'lucide-react'

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
  // ⭐ 2-A: stores 테이블의 unique slug — QR URL 식별자
  // 사장님이 정보 변경해도 slug 는 유지 → QR 인쇄물 그대로 사용 가능
  slug?: string
  storeId?: string  // stores.id (uuid) — 백엔드 조회용
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

// ─── 리뷰 URL 생성 (2-A: stores.slug 기반) ────────────────────────
// 우선순위:
//   1) store.slug (DB unique slug — 사장님 정보 변경해도 URL 유지) — 권장
//   2) fallback: 매장명 slug + 쿼리 파라미터 (DB 미등록 사용자 호환)
function generateReviewUrl(store: StoreInfo): string {
  const name = store.name.trim()
  if (!name) return ''

  // ⭐ stores.slug 가 있으면 깔끔한 URL: /review/{slug}
  // 손님 페이지가 진입 시 /api/qr/store/{slug} 로 매장 정보 조회
  // → 사장님이 정보 변경해도 자동 반영 (QR 인쇄물 그대로 사용 가능)
  if (store.slug) {
    return `${BASE_URL}/review/${encodeURIComponent(store.slug)}`
  }

  // Fallback: stores 등록 안 된 사용자 — 쿼리 파라미터로 정보 전달 (legacy)
  const slug = name.replace(/\s+/g, '-')
  const params = new URLSearchParams()
  params.set('n', name)
  if (store.category) params.set('t', store.category)
  if (store.location) params.set('a', store.location)
  if (store.naverUrl) params.set('naver', store.naverUrl.trim())
  return `${BASE_URL}/review/${encodeURIComponent(slug)}?${params.toString()}`
}

// ─── 로컬 QR 생성 (qrcode lib) — 카메라 인식률 최적화 ───────────
// 변경 이유: api.qrserver.com 외부 의존성 제거 + 인식률 개선
//   · errorCorrectionLevel 'H' (30% 복원 — 흔들림/지문/오염에 강함)
//   · margin 4 modules (quiet zone 충분 — 카메라 자동초점 대상)
//   · SVG 렌더링 (확대해도 깨끗, 인쇄·고해상도 모두 OK)
//   · 고대비 색상 (#191F28 검정 + 순백 #FFFFFF)
// ─── QR 다운로드 — 고해상도 PNG (로컬 생성, 외부 의존 0) ─────────
async function downloadQR(reviewUrl: string, qrName: string) {
  if (!reviewUrl) return
  try {
    const mod = await import('qrcode')
    const QRCode = (mod as any).default || mod
    // 고해상도 PNG (1000x1000) — 인쇄·전단지 인식률 최고
    const dataUrl = await QRCode.toDataURL(reviewUrl, {
      errorCorrectionLevel: 'H',
      margin: 4,
      width: 1000,
      color: { dark: '#191F28', light: '#FFFFFF' },
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = (qrName || 'localution').replace(/\s+/g, '_') + '_QR.png'
    a.click()
  } catch (e) {
    // qrcode 라이브러리 로드 실패 시 fallback (외부 API)
    const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(reviewUrl)}&margin=20&ecc=H&color=191F28`
    try {
      const res = await fetch(fallback)
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = qrName.replace(/\s+/g, '_') + '_QR.png'
      a.click()
      URL.revokeObjectURL(href)
    } catch {
      window.open(fallback, '_blank')
    }
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
// ⭐ 2-C: QR 활동 통계 패널 — DB 기반 실시간 데이터
function QRStatsPanel() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<7 | 30>(7)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/qr/stats?days=${days}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (!cancelled && j?.ok) setStats(j) })
      .catch(() => null)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days])

  if (loading) {
    return <div className="bg-white rounded-2xl p-12 text-center text-sm text-[#8B95A1] shadow-sm">통계 불러오는 중…</div>
  }

  const counts = stats?.counts || {}
  const funnel = stats?.funnel || { scan: 0, ai_generated: 0, submitted: 0, scan_to_ai_rate: 0, ai_to_submit_rate: 0, overall_rate: 0 }
  const daily = stats?.daily || []
  const recent = stats?.recent || []
  const devices = stats?.devices || { mobile: 0, tablet: 0, desktop: 0 }
  const uniqueVisitors = stats?.unique_visitors || 0
  const totalDevice = (devices.mobile || 0) + (devices.tablet || 0) + (devices.desktop || 0)

  const eventLabel = (e: string): { Icon: LucideIcon; txt: string; color: string } => {
    if (e === 'scan') return { Icon: Eye, txt: 'QR 스캔', color: '#3182F6' }
    if (e === 'receipt_uploaded') return { Icon: ReceiptText, txt: '영수증 업로드', color: '#F59E0B' }
    if (e === 'receipt_verified') return { Icon: CheckCircle2, txt: '영수증 매장 일치', color: '#059669' }
    if (e === 'photo_uploaded') return { Icon: Camera, txt: '사진 업로드', color: '#7C3AED' }
    if (e === 'ai_generated') return { Icon: Sparkles, txt: 'AI 리뷰 생성', color: '#7C3AED' }
    if (e === 'submitted_naver') return { Icon: Send, txt: '네이버 등록', color: '#03C75A' }
    if (e === 'submitted_google') return { Icon: Send, txt: '구글 등록', color: '#4285F4' }
    if (e === 'submitted_kakao') return { Icon: Send, txt: '카카오 등록', color: '#A16207' }
    return { Icon: Eye, txt: e, color: '#8B95A1' }
  }
  const timeAgo = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime()
    if (ms < 60_000) return '방금'
    if (ms < 3_600_000) return Math.floor(ms / 60_000) + '분 전'
    if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + '시간 전'
    return Math.floor(ms / 86_400_000) + '일 전'
  }

  return (
    <div className="space-y-5">
      {/* 기간 선택 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-[#191F28]">실시간 QR 활동 통계</h2>
          <p className="text-xs text-[#8B95A1]">최근 {days}일 — 손님이 QR 스캔 ~ 리뷰 등록까지의 활동</p>
        </div>
        <div className="flex gap-1 bg-[#F2F4F6] rounded-xl p-1">
          {[7, 30].map(d => (
            <button key={d} onClick={() => setDays(d as 7 | 30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                days === d ? 'bg-white text-[#3182F6] shadow-sm' : 'text-[#8B95A1]'
              }`}>{d}일</button>
          ))}
        </div>
      </div>

      {/* 핵심 KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#8B95A1] mb-1">총 스캔</p>
          <p className="text-2xl font-black text-[#3182F6]">{funnel.scan}</p>
          <p className="text-[10px] text-[#8B95A1] mt-1">고유 방문자 {uniqueVisitors}명</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#8B95A1] mb-1">AI 리뷰 생성</p>
          <p className="text-2xl font-black text-[#7C3AED]">{funnel.ai_generated}</p>
          <p className="text-[10px] text-[#8B95A1] mt-1">전환율 {funnel.scan_to_ai_rate}%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#8B95A1] mb-1">실제 등록</p>
          <p className="text-2xl font-black text-[#059669]">{funnel.submitted}</p>
          <p className="text-[10px] text-[#8B95A1] mt-1">전환율 {funnel.ai_to_submit_rate}%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#8B95A1] mb-1">전체 전환율</p>
          <p className="text-2xl font-black text-[#191F28]">{funnel.overall_rate}%</p>
          <p className="text-[10px] text-[#8B95A1] mt-1">스캔 → 등록</p>
        </div>
      </div>

      {/* 퍼널 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-[#3182F6]" strokeWidth={2.5} />
          <h3 className="font-bold text-[#191F28]">손님 활동 흐름 (퍼널)</h3>
        </div>
        <div className="space-y-2.5">
          {[
            { Icon: Eye,           label: 'QR 스캔',      value: funnel.scan,         max: funnel.scan, color: '#3182F6' },
            { Icon: Sparkles,      label: 'AI 리뷰 생성', value: funnel.ai_generated, max: funnel.scan, color: '#7C3AED' },
            { Icon: CheckCircle2,  label: '실제 등록',    value: funnel.submitted,    max: funnel.scan, color: '#059669' },
          ].map(s => {
            const pct = s.max > 0 ? Math.round((s.value / s.max) * 100) : 0
            const Icon = s.Icon
            return (
              <div key={s.label} className="flex items-center gap-2 md:gap-3">
                <div className="flex items-center gap-1.5 w-24 md:w-32 flex-shrink-0">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: s.color + '15' }}>
                    <Icon size={12} style={{ color: s.color }} strokeWidth={2.5} />
                  </div>
                  <span className="text-[11px] md:text-xs text-[#4E5968] font-medium truncate">{s.label}</span>
                </div>
                <div className="flex-1 bg-[#F2F4F6] rounded-full h-6 relative overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: pct + '%', background: s.color, minWidth: s.value > 0 ? '36px' : 0 }}>
                    {s.value > 0 && <span className="text-[10px] font-bold text-white">{s.value}</span>}
                  </div>
                </div>
                <div className="w-10 md:w-12 text-right text-xs text-[#8B95A1] flex-shrink-0">{pct}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 일별 추이 + 디바이스 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#3182F6]" strokeWidth={2.5} />
            <h3 className="font-bold text-[#191F28]">일별 활동</h3>
          </div>
          <div className="flex items-end gap-1 h-32">
            {daily.map((d: any, i: number) => {
              const max = Math.max(1, ...daily.map((x: any) => Math.max(x.scan, x.submit, x.ai)))
              const scanH = (d.scan / max) * 100
              const aiH = (d.ai / max) * 100
              const submitH = (d.submit / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 h-full items-end">
                    <div className="flex-1 bg-[#3182F6] rounded-t transition-all" style={{ height: scanH + '%', minHeight: d.scan > 0 ? '2px' : 0 }} title={`스캔 ${d.scan}`} />
                    <div className="flex-1 bg-[#7C3AED] rounded-t transition-all" style={{ height: aiH + '%', minHeight: d.ai > 0 ? '2px' : 0 }} title={`AI ${d.ai}`} />
                    <div className="flex-1 bg-[#059669] rounded-t transition-all" style={{ height: submitH + '%', minHeight: d.submit > 0 ? '2px' : 0 }} title={`등록 ${d.submit}`} />
                  </div>
                  <span className="text-[9px] text-[#8B95A1]">{d.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#3182F6] rounded-sm"/>스캔</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#7C3AED] rounded-sm"/>AI</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#059669] rounded-sm"/>등록</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={16} className="text-[#7C3AED]" strokeWidth={2.5} />
            <h3 className="font-bold text-[#191F28]">디바이스</h3>
          </div>
          {totalDevice === 0 ? (
            <p className="text-xs text-[#8B95A1] text-center py-6">아직 데이터 없음</p>
          ) : (
            <div className="space-y-3">
              {[
                { k: 'mobile',  l: '모바일', Icon: Smartphone, color: '#3182F6' },
                { k: 'tablet',  l: '태블릿', Icon: Tablet,     color: '#7C3AED' },
                { k: 'desktop', l: 'PC',     Icon: Monitor,    color: '#059669' },
              ].map(d => {
                const v = devices[d.k] || 0
                const pct = totalDevice > 0 ? Math.round((v / totalDevice) * 100) : 0
                const Icon = d.Icon
                return (
                  <div key={d.k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-[#4E5968] font-medium">
                        <Icon size={13} style={{ color: d.color }} strokeWidth={2.25} />
                        {d.l}
                      </span>
                      <span className="text-[#8B95A1]">{v} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: pct + '%', background: d.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 최근 활동 타임라인 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[#F59E0B]" strokeWidth={2.5} />
          <h3 className="font-bold text-[#191F28]">최근 활동</h3>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-[#8B95A1] text-center py-6">최근 {days}일 동안 활동이 없어요. QR 코드를 매장에 비치해 보세요.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {recent.map((r: any, i: number) => {
              const lbl = eventLabel(r.event_type)
              const Icon = lbl.Icon
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#F2F4F6] last:border-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: lbl.color + '15' }}>
                    <Icon size={14} style={{ color: lbl.color }} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#191F28]">{lbl.txt}</p>
                    {r.meta && Object.keys(r.meta).length > 0 && (
                      <p className="text-[11px] text-[#8B95A1] truncate">
                        {r.meta.items_count !== undefined && `메뉴 ${r.meta.items_count}개 · `}
                        {r.meta.tone && `${r.meta.tone} 말투 · `}
                        {r.meta.char_count && `${r.meta.char_count}자 · `}
                        {r.meta.has_receipt && '영수증 ✓ '}
                        {r.meta.has_photo && '사진 ✓'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-[#8B95A1]">{timeAgo(r.created_at)}</span>
                    {r.device_kind && <span className="text-[10px] text-[#C9CDD2]">{r.device_kind}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function QRAdmin() {
  const [activeTab, setActiveTab]   = useState<'settings' | 'stats' | 'report' | 'stamps' | 'menu'>('settings')
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
          // ⭐ 2-A: stores.slug + id — QR URL 식별자
          slug:    store.slug || '',
          storeId: store.id   || '',
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

  const [storeSaving, setStoreSaving] = useState(false)
  const [storeSaveErr, setStoreSaveErr] = useState<string | null>(null)
  const saveStoreInfo = async () => {
    setStoreSaveErr(null)
    setStoreSaving(true)
    const next: StoreInfo = {
      ...storeDraft,
      connected: !!(storeDraft.name && storeDraft.location),
      // 사용자 수동 편집은 'manual' source 로 표시 (다음 자동 로드 시에도 보존)
      source: storeDraft.source === 'naver_synced' ? 'naver_synced' : 'manual',
    }

    // ⭐ stores 테이블에도 저장 — settings, profile, connect 등 모든 페이지에서 자동 반영되게
    try {
      const res = await fetch('/api/stores/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: next.name,
          category: next.category,
          address: next.location,
          naver_url: next.naverUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setStoreSaveErr(data?.error || `저장 실패 (status ${res.status})`)
        setStoreSaving(false)
        return
      }
      // 2-A: 응답의 slug + id 를 next 에 반영 → QR URL 즉시 정상 생성
      if (data.store?.slug) next.slug = data.store.slug
      if (data.store?.id)   next.storeId = data.store.id
    } catch (e: any) {
      setStoreSaveErr(e?.message || '저장 실패')
      setStoreSaving(false)
      return
    }

    setStoreInfo(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}
    setStoreSaving(false)
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
      setActiveTab('settings')
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
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col overflow-x-hidden">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 max-w-full md:ml-[220px] pt-14 md:pt-0">

          {/* 통일 hero banner — 전체 페이지와 동일한 PageHeader 사용 */}
          <PageHeader
            icon=""
            logoNode={<QrCode size={32} strokeWidth={2.25} className="text-white" />}
            title="QR 관리"
            subtitle="QR 스캔 → 리뷰 페이지로 바로 이동해 리뷰를 늘려보세요"
            variant="primary"
          />

          <div className="max-w-5xl mx-auto p-4 md:p-8">

            {/* 현황 카드 — lucide 아이콘으로 세련되게 */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 mb-6">
              <div className="bg-white rounded-2xl px-4 md:px-5 py-3.5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#3182F6] flex-shrink-0">
                  <QrCode size={20} strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#8B95A1]">전체 QR</p>
                  <p className="text-lg font-black text-[#3182F6]">{qrList.length}<span className="text-xs font-medium text-[#8B95A1] ml-0.5">개</span></p>
                </div>
              </div>
              <div className="bg-white rounded-2xl px-4 md:px-5 py-3.5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#059669] flex-shrink-0">
                  <CheckCircle2 size={20} strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#8B95A1]">활성 QR</p>
                  <p className="text-lg font-black text-[#059669]">{activeCount}<span className="text-xs font-medium text-[#8B95A1] ml-0.5">개</span></p>
                </div>
              </div>
              {storeInfo.connected && (
                <div className="bg-[#F0FDF4] rounded-2xl px-4 md:px-5 py-3.5 shadow-sm flex items-center gap-3 border border-[#BBF7D0] col-span-2 md:col-span-1">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#059669] flex-shrink-0 border border-[#BBF7D0]">
                    <Sparkles size={20} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#059669] font-bold">
                      {storeInfo.source === 'naver_synced' ? '네이버 자동 연동' : '업체 연동됨'}
                    </p>
                    <p className="text-xs text-[#4E5968] truncate max-w-[180px]">{storeInfo.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 탭 — settings 와 동일한 형식 */}
            <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto scrollbar-hide -mx-1 px-1">
              {[
                { key: 'settings', label: '업체 설정' },
                { key: 'stamps',   label: '스탬프 카드' },
                { key: 'menu',     label: '메뉴판' },
                { key: 'stats',    label: '성과 리포트' },
                { key: 'report',   label: '분석 리포트' },
              ].map(tab => (
                <button key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'settings' | 'stats' | 'report' | 'stamps' | 'menu')}
                  className={`flex-shrink-0 md:flex-1 min-w-fit py-2 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
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
          <div className="space-y-6">

            {/* Row 1: 네이버 업체 연동 + 고객 보상 설정 (PC 2-col) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 좌측: 네이버 업체 연동 */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#03C75A] to-[#059669] flex items-center justify-center shadow-sm">
                      <Link2 size={16} className="text-white" strokeWidth={2.5} />
                    </div>
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
                    {storeSaveErr && (
                      <p className="text-[11px] text-[#DC2626] bg-[#FEF2F2] rounded-lg px-2 py-1.5 leading-relaxed">
                        ❌ {storeSaveErr}
                      </p>
                    )}
                    <p className="text-[11px] text-[#3182F6] leading-relaxed">
                      💡 여기서 저장하면 <strong>설정 / 프로필 / 매장 연결</strong> 페이지에도 자동 반영돼요
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setStoreEdit(false)}
                        disabled={storeSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors disabled:opacity-50">
                        취소
                      </button>
                      <button
                        onClick={saveStoreInfo}
                        disabled={!storeDraft.name || !storeDraft.location || storeSaving}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          storeSaving
                            ? 'bg-[#94A3B8] text-white cursor-wait'
                            : storeDraft.name && storeDraft.location
                            ? 'bg-[#059669] text-white hover:bg-[#047857]'
                            : 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed'
                        }`}>
                        {storeSaving ? '저장 중…' : '연동하기'}
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

            {/* 우측 (Top row): 고객 보상 설정 */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#DC2626] flex items-center justify-center shadow-sm">
                    <Gift size={16} className="text-white" strokeWidth={2.5} />
                  </div>
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
            </div>

            </div> {/* /Row 1 */}

            {/* Row 2: 매장 QR + Wi-Fi QR (PC 2-col, 모바일 stack) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 매장 QR 코드 */}
              {storeInfo.connected && previewReviewUrl ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
                        <QrCode size={16} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#191F28]">매장 QR 코드</h3>
                        <p className="text-xs text-[#8B95A1]">{storeInfo.name} 리뷰 유도 QR</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] whitespace-nowrap">
                      ECC-H 고복원
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="p-5 bg-white border-2 border-[#191F28] rounded-2xl shadow-md">
                      <QRImage url={previewReviewUrl} size={240} />
                    </div>
                    <p className="text-[11px] text-[#4E5968] text-center leading-relaxed max-w-[280px]">
                      스캔하면 <span className="font-bold text-[#191F28]">{storeInfo.name}</span>의<br />
                      리뷰 작성 페이지로 바로 이동해요
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() => handleCopy('preview', previewReviewUrl)}
                      className="py-2.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#3182F6] text-xs font-bold hover:bg-[#DBEAFE] transition-colors">
                      {copiedId === 'preview' ? '✅ 복사됨' : '🔗 링크 복사'}
                    </button>
                    <button
                      onClick={async () => {
                        setDownloading('preview')
                        await downloadQR(previewReviewUrl, storeInfo.name)
                        setDownloading(null)
                      }}
                      disabled={downloading === 'preview'}
                      className="py-2.5 rounded-xl bg-[#191F28] text-white text-xs font-bold hover:bg-[#333D4B] transition-colors disabled:opacity-50">
                      {downloading === 'preview' ? '⏳ 다운로드 중…' : '⬇️ PNG 다운로드'}
                    </button>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                    <p className="text-[11px] text-[#92400E] font-bold mb-1.5">📸 카메라 인식 잘 안 될 때</p>
                    <ul className="text-[10px] text-[#9A3412] space-y-0.5 leading-relaxed pl-3 list-disc">
                      <li>밝은 조명 + 손떨림 없이 (10~30cm 거리)</li>
                      <li>이 QR 은 <strong>ECC-H 30% 복원</strong> — 일부 가려져도 인식됩니다</li>
                      <li>인쇄 시 최소 <strong>2cm × 2cm</strong> 권장</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] rounded-2xl p-6 border border-[#E5E8EB] flex flex-col items-center justify-center text-center min-h-[400px]">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                    <QrCode size={28} className="text-[#C9CDD2]" strokeWidth={2} />
                  </div>
                  <p className="text-sm font-bold text-[#191F28] mb-1">매장 QR 코드</p>
                  <p className="text-xs text-[#8B95A1] leading-relaxed">왼쪽 "네이버 업체 연동" 에서<br/>매장 정보를 등록하면<br/>QR 이 여기에 자동 생성돼요</p>
                </div>
              )}

              {/* Wi-Fi QR */}
              <WifiQRBox />
            </div>

            {/* 저장 */}
            <button onClick={handleSaveSettings}
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-colors ${
                saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'
              }`}>
              {saved ? '✅ 저장됨' : '설정 저장하기'}
            </button>

          </div>
        )}
        {/* 광고: QR 인쇄물 추천 (네이버 쇼핑 커넥트) — settings 탭 하단 */}
        {activeTab === 'settings' && <AffiliateAdSlots />}

        {/* ── 성과 리포트 탭 (2-C: 실제 DB 통계) ── */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <QRStatsPanel />
            <div className="hidden">{/* placeholder — 이전 안내 카드 자리 */}</div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <QrCode size={16} className="text-[#3182F6]" strokeWidth={2.5} />
                <h3 className="font-bold text-[#191F28]">QR 코드 현황</h3>
              </div>
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
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
                  <Sparkles size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="font-bold text-[#191F28]">다음 액션 가이드</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { Icon: Store,   color: '#3182F6', title: '업체 연동', desc: storeInfo.connected ? `'${storeInfo.name}' 연동 완료! QR을 만들어 매장에 비치해보세요.` : '업체 설정 탭에서 업체 정보를 먼저 입력해주세요.' },
                  { Icon: QrCode,  color: '#7C3AED', title: 'QR 생성',   desc: qrList.length > 0 ? `현재 ${qrList.length}개의 QR이 있어요. 활성 QR: ${activeCount}개` : '새 QR 만들기 버튼으로 첫 QR을 생성해보세요!' },
                  { Icon: Printer, color: '#059669', title: '인쇄·비치', desc: 'QR을 PNG로 다운로드해 매장 테이블·입구·계산대에 비치하면 리뷰가 늘어나요.' },
                ].map((item, i) => {
                  const Icon = item.Icon
                  return (
                    <div key={i} className="bg-white rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: item.color + '15' }}>
                          <Icon size={14} style={{ color: item.color }} strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-bold text-[#191F28]">{item.title}</span>
                      </div>
                      <p className="text-xs text-[#4E5968] leading-relaxed">{item.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        {/* 광고: QR 인쇄물 추천 (네이버 쇼핑 커넥트) — stats 탭 하단 */}
        {activeTab === 'stats' && <AffiliateAdSlots />}

        {/* ── 스탬프 카드 탭 (Phase 1: 디지털 스탬프) ── */}
        {activeTab === 'stamps' && (
          <div className="space-y-6">
            <StampCardEditor />
          </div>
        )}
        {activeTab === 'stamps' && <AffiliateAdSlots />}

        {/* ── 메뉴판 탭 (Phase 2: 디지털 메뉴판) ── */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <MenuBoardEditor />
          </div>
        )}
        {activeTab === 'menu' && <AffiliateAdSlots />}

        {/* ── 분석 리포트 탭 (2-F: recharts 인포그래픽 + PDF 저장) ── */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <QRReportPanel storeName={storeInfo.name} />
          </div>
        )}
        {/* 광고: QR 인쇄물 추천 (네이버 쇼핑 커넥트) — report 탭 하단 */}
        {activeTab === 'report' && <AffiliateAdSlots />}

          </div>
        </main>
      </div>
      {/* 통일 Footer */}
      <Footer />

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
