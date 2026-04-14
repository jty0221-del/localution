'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Sidebar from './components/Sidebar'
import PartnerSpotlight from './components/PartnerSpotlight'
import Footer from './components/Footer'

const LS_LINKS = 'localution.platform_links'

const WEEKLY = [
  { day: '월', v: 45, r: 3 },
  { day: '화', v: 62, r: 7 },
  { day: '수', v: 38, r: 4 },
  { day: '목', v: 71, r: 12 },
  { day: '금', v: 89, r: 8 },
  { day: '토', v: 124, r: 15 },
  { day: '일', v: 98, r: 9 },
]
const MAX_V = Math.max(...WEEKLY.map(d => d.v))

const REVIEWS = [
  { id: 1, platform: '네이버', name: '이정민', rating: 5, text: '커피가 너무 맛있어요! 분위기도 좋고 직원분들도 친절했습니다. 다음에 또 올게요 :)', time: '10분 전', replied: false },
  { id: 2, platform: '구글', name: 'J.Park', rating: 4, text: 'Great place for brunch. Cozy atmosphere and friendly staff.', time: '1시간 전', replied: true },
  { id: 3, platform: '카카오', name: '박소연', rating: 5, text: '친구랑 왔는데 둘다 너무 만족했어요. 루프탑 뷰가 최고입니다!', time: '3시간 전', replied: false },
]

const PLATFORM_DEFS = [
  { key: 'google',  label: '구글',  color: '#4285F4', bg: '#EBF3FE', active: true  },
  { key: 'naver',   label: '네이버', color: '#03C75A', bg: '#E8FBF0', active: true  },
  { key: 'kakao',   label: '카카오', color: '#F9D64F', bg: '#FFFDE7', active: false },
  { key: 'baemin',  label: '배민',   color: '#2AC1BC', bg: '#E6F9F8', active: false },
  { key: 'yogiyo',  label: '요기요', color: '#FA3C00', bg: '#FEF0EB', active: false },
]

interface LinkedPlatform {
  platform: string
  placeId: string
  name: string
  address: string
  phone?: string
  category?: string
  rating: number | null
  reviewCount: number
  url: string
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= rating ? 'text-yellow-400' : 'text-[#E5E8EB]'}`}>★</span>
      ))}
    </div>
  )
}

function PlatformBadge({ name }: { name: string }) {
  const map: Record<string, string> = {
    네이버: 'bg-green-100 text-green-700',
    구글: 'bg-blue-100 text-blue-700',
    카카오: 'bg-yellow-100 text-yellow-700',
  }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[name] || 'bg-gray-100 text-gray-600'}`}>{name}</span>
}

// ── ConnectModal ────────────────────────────────────────────────
const MODAL_CONFIG: Record<string, { title: string; placeholder: string; accent: string; icon: string }> = {
  google: { title: '구글 매장 연동', placeholder: '예) 스타벅스 강남점 또는 maps.google.com/...', accent: '#4285F4', icon: 'G' },
  naver:  { title: '네이버 플레이스 연동', placeholder: '예) map.naver.com/p/entry/place/1234567890', accent: '#03C75A', icon: 'N' },
}

function ConnectModal({ platformKey, onClose, onSave }: {
  platformKey: string
  onClose: () => void
  onSave: (data: LinkedPlatform) => void
}) {
  const cfg = MODAL_CONFIG[platformKey] || MODAL_CONFIG['google']
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<LinkedPlatform | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleVerify() {
    if (!input.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const endpoint = `/api/platforms/${platformKey}`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', input: input.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setStatus('error')
        setErrorMsg(data.error || '검증 실패. 다시 시도해 주세요.')
        return
      }
      // naver 응답 정규화
      const normalized: LinkedPlatform = platformKey === 'naver' ? {
        platform: 'naver',
        placeId: data.placeId || '',
        name: data.name || input.trim(),
        address: data.desc || '',
        rating: null,
        reviewCount: 0,
        url: data.url || `https://m.place.naver.com/place/${data.placeId}/home`,
      } : { ...data, platform: 'google' }
      setResult(normalized)
      setStatus('success')
    } catch (e) {
      setStatus('error')
      setErrorMsg('네트워크 오류. 다시 시도해 주세요.')
    }
  }

  function handleSave() {
    if (result) onSave(result)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#191F28]">{cfg.title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F4F6] text-[#8B95A1] text-lg font-bold">✕</button>
        </div>

        {platformKey === 'naver' && (
          <div className="mb-4 p-3 bg-[#F0FDF4] border border-green-200 rounded-xl text-xs text-green-700">
            네이버 플레이스 URL을 붙여넣으세요.<br/>
            예) <span className="font-mono">map.naver.com/p/entry/place/1234567890</span>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder={cfg.placeholder}
            className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#3182F6] transition-colors"
          />
          <button
            onClick={handleVerify}
            disabled={status === 'loading'}
            className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap"
            style={{ background: cfg.accent }}
          >
            {status === 'loading' ? '검색중...' : '검증'}
          </button>
        </div>

        {status === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{errorMsg}</div>
        )}

        {status === 'success' && result && (
          <div className="mb-4 p-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ background: cfg.accent }}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#191F28] text-sm">{result.name}</p>
                {result.address && <p className="text-xs text-[#4E5968] mt-0.5 truncate">{result.address}</p>}
                {result.rating != null && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Stars rating={Math.round(result.rating)} />
                    <span className="text-xs font-bold text-[#191F28]">{result.rating}</span>
                    <span className="text-xs text-[#8B95A1]">리뷰 {result.reviewCount.toLocaleString()}개</span>
                  </div>
                )}
              </div>
              <span className="text-green-600 text-lg flex-shrink-0">✓</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#8B95A1] hover:text-[#4E5968] font-medium">취소</button>
          {status === 'success' && (
            <button
              onClick={handleSave}
              className="px-5 py-2 text-white text-sm font-semibold rounded-xl transition-colors"
              style={{ background: cfg.accent }}
            >
              연동 저장
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────
export default function Dashboard() {
  const [showPartner, setShowPartner] = useState(false)
  const [chartMode, setChartMode] = useState<'visitors' | 'reviews'>('visitors')
  const [links, setLinks] = useState<LinkedPlatform[]>([])
  const [modalPlatform, setModalPlatform] = useState<string | null>(null)

  // localStorage 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LINKS)
      if (raw) setLinks(JSON.parse(raw))
    } catch (_) {}
  }, [])

  function saveLink(data: LinkedPlatform) {
    const next = [...links.filter(l => l.platform !== data.platform), data]
    setLinks(next)
    try { localStorage.setItem(LS_LINKS, JSON.stringify(next)) } catch (_) {}
    setModalPlatform(null)
  }

  function removeLink(platformKey: string) {
    const next = links.filter(l => l.platform !== platformKey)
    setLinks(next)
    try { localStorage.setItem(LS_LINKS, JSON.stringify(next)) } catch (_) {}
  }

  // 연동된 구글 매장 데이터 → STORE 카드 반영
  const googleLink = links.find(l => l.platform === 'google')
  const STORE = googleLink ? {
    name: googleLink.name,
    initial: googleLink.name?.[0] || 'G',
    category: googleLink.category || '구글 연동 매장',
    address: googleLink.address,
    rating: googleLink.rating ?? 0,
    reviewCount: googleLink.reviewCount,
    keywords: ['구글', '연동완료'],
    gradientFrom: '#4285F4',
    gradientTo: '#1A73E8',
  } : {
    name: '내 매장',
    initial: '매',
    category: '플랫폼을 연동해 주세요',
    address: '아래에서 구글 매장을 연동하면 실데이터가 표시됩니다',
    rating: 0,
    reviewCount: 0,
    keywords: ['연동대기'],
    gradientFrom: '#8B95A1',
    gradientTo: '#4E5968',
  }

  const STATS = googleLink ? [
    { label: '구글 평점', value: String(googleLink.rating ?? 0), unit: '점', delta: '실시간', up: true, color: '#4285F4' },
    { label: '구글 리뷰수', value: googleLink.reviewCount.toLocaleString(), unit: '개', delta: '실데이터', up: true, color: '#F59E0B' },
    { label: '이번 주 리뷰', value: '8', unit: '건', delta: '+2', up: true, color: '#10B981' },
    { label: '답변률', value: '84', unit: '%', delta: '-3', up: false, color: '#8B5CF6' },
  ] : [
    { label: '이번 주 리뷰', value: '58', unit: '건', delta: '+12', up: true, color: '#3182F6' },
    { label: '평균 별점', value: '4.7', unit: '점', delta: '+0.2', up: true, color: '#F59E0B' },
    { label: '신규 고객', value: '23', unit: '명', delta: '+5', up: true, color: '#10B981' },
    { label: '답변률', value: '84', unit: '%', delta: '-3', up: false, color: '#8B5CF6' },
  ]

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8 pr-16 md:pr-20">

        {/* ──────────── 매장 카드 ──────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-[#E5E8EB]">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0 shadow-md"
              style={{ background: `linear-gradient(135deg, ${STORE.gradientFrom}, ${STORE.gradientTo})` }}
            >
              {STORE.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#191F28]">{STORE.name}</h2>
                {googleLink
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">구글 연동됨</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">미연동</span>
                }
              </div>
              <p className="text-xs text-[#8B95A1] mt-0.5">{STORE.category} · {STORE.address}</p>
              {STORE.rating > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Stars rating={Math.round(STORE.rating)} />
                  <span className="text-sm font-bold text-[#191F28]">{STORE.rating}</span>
                  <span className="text-xs text-[#8B95A1]">리뷰 {STORE.reviewCount.toLocaleString()}개</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {STORE.keywords.map(kw => (
                  <span key={kw} className="text-[11px] px-2.5 py-1 bg-[#EFF6FF] text-[#3182F6] rounded-full font-semibold">#{kw}</span>
                ))}
              </div>
            </div>
            {googleLink && (
              <button
                onClick={() => removeLink('google')}
                className="flex-shrink-0 text-xs text-[#8B95A1] hover:text-red-500 transition-colors hidden sm:block"
              >
                연동해제
              </button>
            )}
          </div>
        </div>

        {/* ──────────── 플랫폼 연동 현황 ──────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 border border-[#E5E8EB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#191F28] text-sm">플랫폼 연동 현황</h3>
            <span className="text-xs text-[#8B95A1]">{links.length}/5 연동됨</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {PLATFORM_DEFS.map(p => {
              const linked = links.find(l => l.platform === p.key)
              return (
                <button
                  key={p.key}
                  onClick={() => p.active && setModalPlatform(p.key)}
                  disabled={!p.active}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    linked
                      ? 'border-green-400 bg-green-50'
                      : p.active
                        ? 'border-[#E5E8EB] hover:border-[#3182F6] hover:bg-[#EFF6FF] cursor-pointer'
                        : 'border-[#E5E8EB] bg-[#F8F9FA] cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                    style={{ background: linked ? '#22C55E' : p.active ? p.color : '#B0B8C1' }}
                  >
                    {linked ? '✓' : p.label[0]}
                  </div>
                  <span className="text-[11px] font-semibold text-[#191F28]">{p.label}</span>
                  <span className={`text-[10px] font-medium ${linked ? 'text-green-600' : p.active ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>
                    {linked ? '연결됨' : p.active ? '연결하기' : '준비중'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ──────────── 헤더 ──────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">대시보드</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <button
            onClick={() => setShowPartner(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-semibold text-[#3182F6] hover:bg-[#EFF6FF] transition-colors border border-[#E5E8EB]"
          >
            <span>🌟</span> 파트너 스포트라이트
          </button>
        </div>

        {/* ──────────── 통계 카드 4개 ──────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {STATS.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-[#8B95A1] font-medium mb-3">{s.label}</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-[#191F28]">{s.value}</span>
                <span className="text-sm text-[#8B95A1] mb-0.5">{s.unit}</span>
              </div>
              <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${s.up ? 'text-green-600' : 'text-red-500'}`}>
                <span>{s.up ? '▲' : '▼'}</span>
                <span>{s.delta} 지난주 대비</span>
              </div>
              <div className="mt-3 h-1 bg-[#F2F4F6] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: s.unit === '%' ? s.value + '%' : '60%', background: s.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* ──────────── 주간 차트 ──────────── */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[#191F28]">이번 주 현황</h3>
              <div className="flex gap-1 bg-[#F2F4F6] rounded-xl p-1">
                {(['visitors', 'reviews'] as const).map(m => (
                  <button key={m} onClick={() => setChartMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${chartMode === m ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'}`}>
                    {m === 'visitors' ? '방문자' : '리뷰'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-40">
              {WEEKLY.map((d, i) => {
                const val = chartMode === 'visitors' ? d.v : d.r
                const maxVal = chartMode === 'visitors' ? MAX_V : 15
                const pct = Math.round((val / maxVal) * 100)
                const isToday = i === 4
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#8B95A1]">{val}</span>
                    <div className="w-full flex items-end" style={{ height: '120px' }}>
                      <div className="w-full rounded-t-lg transition-all" style={{ height: pct + '%', background: isToday ? '#3182F6' : '#DBEAFE', minHeight: '4px' }} />
                    </div>
                    <span className={`text-[10px] font-medium ${isToday ? 'text-[#3182F6] font-bold' : 'text-[#8B95A1]'}`}>{d.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ──────────── 빠른 실행 ──────────── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-[#191F28] mb-4">빠른 실행</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '리뷰 답변', href: '/review-admin', bg: '#FFFBEB', color: '#F59E0B' },
                { label: 'QR 생성', href: '/qr', bg: '#F5F3FF', color: '#8B5CF6' },
                { label: '고객 추가', href: '/customers', bg: '#ECFDF5', color: '#059669' },
                { label: '커뮤니티', href: '/community', bg: '#FDF2F8', color: '#EC4899' },
                { label: '리포트', href: '/settings', bg: '#EFF6FF', color: '#3182F6' },
                { label: '설정', href: '/settings', bg: '#F2F4F6', color: '#4E5968' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex flex-col items-center justify-center p-3 rounded-xl transition-all hover:scale-105 active:scale-95"
                  style={{ background: item.bg }}>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ──────────── 파트너 배너 ──────────── */}
        <div className="mb-6">
          <PartnerSpotlight variant="banner" />
        </div>

        {/* ──────────── 최근 리뷰 ──────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[#191F28]">최근 리뷰</h3>
            <Link href="/review-admin" className="text-xs text-[#3182F6] hover:underline font-medium">전체보기 →</Link>
          </div>
          <div className="space-y-4">
            {REVIEWS.map(r => (
              <div key={r.id} className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F9FA] hover:bg-[#F2F4F6] transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {r.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#191F28]">{r.name}</span>
                    <PlatformBadge name={r.platform} />
                    <Stars rating={r.rating} />
                    <span className="text-xs text-[#B0B8C1] ml-auto">{r.time}</span>
                  </div>
                  <p className="text-sm text-[#4E5968] mt-1 line-clamp-2">{r.text}</p>
                </div>
                <Link href="/review-admin"
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-colors ${
                    r.replied ? 'bg-green-100 text-green-700' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'
                  }`}>
                  {r.replied ? '답변완료' : '답변하기'}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <Footer />
      </main>

      {/* 파트너 팝업 */}
      {showPartner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="relative">
            <PartnerSpotlight variant="popup" />
            <button onClick={() => setShowPartner(false)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-[#4E5968] hover:text-[#191F28] transition-colors font-bold text-lg">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 플랫폼 연동 모달 */}
      {modalPlatform && (
        <ConnectModal
          platformKey={modalPlatform}
          onClose={() => setModalPlatform(null)}
          onSave={saveLink}
        />
      )}
    </div>
  )
}
