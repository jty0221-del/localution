'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Sidebar from './components/Sidebar'
import PartnerSpotlight from './components/PartnerSpotlight'
import Footer from './components/Footer'
import UserHeader from './components/UserHeader'

const LS_LINKS = 'localution.platform_links'
const LS_SEEN  = 'localution.seen_review_ids'

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
  { key: 'baemin',  label: '배민',   color: '#2AC1BC', bg: '#E6F9F8', active: false },
  { key: 'yogiyo',  label: '요기요', color: '#FA3C00', bg: '#FEF0EB', active: false },
  { key: 'coupang', label: '쿠팡이츠', color: '#C00000', bg: '#FEECEC', active: false },
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
  google: { title: '구글 매장 연동', placeholder: '매장명 검색 또는 Google Maps URL 붙여넣기', accent: '#4285F4', icon: 'G' },
  naver:  { title: '네이버 플레이스 연동', placeholder: '예) map.naver.com/p/entry/place/1234567890', accent: '#03C75A', icon: 'N' },
}

function ConnectModal({ platformKey, onClose, onSave }: {
  platformKey: string
  onClose: () => void
  onSave: (data: LinkedPlatform) => void
}) {
  const cfg = MODAL_CONFIG[platformKey] || MODAL_CONFIG['google']
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success' | 'list'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<LinkedPlatform | null>(null)
  const [searchList, setSearchList] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // URL 여부 판별
  function isUrl(s: string) {
    return /^https?://|maps.google|goo.gl/maps|ChIJ[A-Za-z0-9_\-]{10}/.test(s.trim())
  }

  async function handleVerify() {
    if (!input.trim()) return
    setStatus('loading')
    setErrorMsg('')
    setSearchList([])
    setResult(null)

    try {
      if (platformKey === 'google' && !isUrl(input)) {
        // ── 매장명 검색 → 리스트 표시 ──
        const res = await fetch('/api/platforms/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'search', query: input.trim() }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setStatus('error')
          setErrorMsg(data.error || '검색 실패. 다시 시도해 주세요.')
          return
        }
        if (!data.items || data.items.length === 0) {
          setStatus('error')
          setErrorMsg('검색 결과가 없습니다. 다른 검색어를 입력해 보세요.')
          return
        }
        setSearchList(data.items)
        setStatus('list')
      } else {
        // ── URL 입력 → verify ──
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
      }
    } catch (e) {
      setStatus('error')
      setErrorMsg('네트워크 오류. 다시 시도해 주세요.')
    }
  }

  // 검색 리스트에서 업체 선택
  async function selectFromList(item: any) {
    setStatus('loading')
    setSearchList([])
    try {
      const res = await fetch('/api/platforms/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', input: item.placeId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        // verify 실패해도 검색 결과 데이터로 결과 표시
        setResult({
          platform: 'google',
          placeId: item.placeId,
          name: item.name,
          address: item.address || '',
          rating: item.rating || null,
          reviewCount: item.reviewCount || 0,
          url: item.url || `https://www.google.com/maps/place/?q=place_id:${item.placeId}`,
        })
        setStatus('success')
        return
      }
      setResult({ ...data, platform: 'google' })
      setStatus('success')
    } catch {
      setResult({
        platform: 'google',
        placeId: item.placeId,
        name: item.name,
        address: item.address || '',
        rating: item.rating || null,
        reviewCount: item.reviewCount || 0,
        url: item.url || `https://www.google.com/maps/place/?q=place_id:${item.placeId}`,
      })
      setStatus('success')
    }
  }

  function handleSave() {
    if (result) onSave(result)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
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

          {platformKey === 'google' && status === 'idle' && (
            <div className="mb-4 p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl text-xs text-[#3367D6]">
              💡 <strong>매장명으로 검색</strong>하면 유사 업체 목록에서 직접 선택할 수 있어요.<br/>
              Google Maps URL을 붙여넣으면 바로 검증됩니다.
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); if (status !== 'idle') { setStatus('idle'); setSearchList([]); setResult(null); } }}
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
              {status === 'loading' ? '검색중...' : platformKey === 'google' && !isUrl(input) ? '검색' : '검증'}
            </button>
          </div>

          {status === 'error' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{errorMsg}</div>
          )}

          {/* 검색 결과 리스트 */}
          {status === 'list' && searchList.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-[#4E5968] mb-2">
                🔍 검색 결과 {searchList.length}개 — 연동할 업체를 선택하세요
              </p>
              <div className="border border-[#E5E8EB] rounded-xl overflow-hidden divide-y divide-[#F2F4F6]">
                {searchList.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => selectFromList(item)}
                    className="w-full text-left px-4 py-3 hover:bg-[#EFF6FF] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0 mt-0.5"
                        style={{ background: cfg.accent }}
                      >G</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#191F28] leading-snug">{item.name}</p>
                        {item.address && (
                          <p className="text-[11px] text-[#8B95A1] mt-0.5 leading-relaxed">{item.address}</p>
                        )}
                        {item.rating && (
                          <p className="text-[11px] text-[#F5A623] mt-0.5">
                            ★ {item.rating} <span className="text-[#B0B8C1]">({(item.reviewCount || 0).toLocaleString()}개 리뷰)</span>
                          </p>
                        )}
                      </div>
                      <span className="text-[#3182F6] text-xs font-semibold flex-shrink-0 mt-1">선택 →</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#B0B8C1] mt-2 text-center">원하는 업체가 없으면 더 자세한 이름으로 다시 검색해 보세요</p>
            </div>
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
              <button
                onClick={() => { setStatus('idle'); setResult(null); setInput(''); }}
                className="mt-3 w-full text-[11px] text-[#8B95A1] hover:text-[#4E5968] text-center"
              >
                다른 업체 선택하기
              </button>
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
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────
// ── 로그인된 경우에만 유저 헤더 표시 ────────────────────────────
function UserHeaderIfLoggedIn() {
  const [user, setUser] = useState<{name: string; profile_image?: string} | null>(null)
  useEffect(() => {
    const cached = sessionStorage.getItem('localution_user')
    if (cached) { try { setUser(JSON.parse(cached)) } catch {} return }
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) { setUser(d.user); sessionStorage.setItem('localution_user', JSON.stringify(d.user)) }
    }).catch(() => {})
  }, [])
  if (!user) return null
  const initials = user.name?.[0] || '?'
  return (
    <a href="/my" className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-[#E5E8EB] hover:border-[#3182F6] transition-colors group">
      {user.profile_image
        ? <img src={user.profile_image} alt={user.name} className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm" />
        : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center text-white text-xs font-black shadow-sm">{initials}</div>
      }
      <span className="text-sm font-bold text-[#191F28] group-hover:text-[#3182F6] transition-colors">{user.name}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
    </a>
  )
}

export default function Dashboard() {
  const [showPartner, setShowPartner] = useState(false)
  const [showQuickPanel, setShowQuickPanel] = useState(false)
  const [chartMode, setChartMode] = useState<'visitors' | 'reviews'>('visitors')
  const [links, setLinks] = useState<LinkedPlatform[]>([])
  const [modalPlatform, setModalPlatform] = useState<string | null>(null)
  const [newReviews, setNewReviews] = useState<{platform: string; author: string; text: string}[]>([])
  const [notifDismissed, setNotifDismissed] = useState(false)
  const [inquiryForm, setInquiryForm] = useState({ name: '', message: '', category: '서비스문의' })
  const [inquiryStatus, setInquiryStatus] = useState<'idle' | 'sending' | 'done'>('idle')

  // localStorage 로드 + 새 리뷰 알림 체크
  useEffect(() => {
    let loaded: LinkedPlatform[] = []
    try {
      const raw = localStorage.getItem(LS_LINKS)
      if (raw) { loaded = JSON.parse(raw); setLinks(loaded) }
    } catch (_) {}

    if (!loaded.length) return

    // 알림 권한 요청
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // 새 리뷰 체크 (연동된 플랫폼 순회)
    ;(async () => {
      let seenIds: string[] = []
      try { seenIds = JSON.parse(localStorage.getItem(LS_SEEN) || '[]') } catch (_) {}

      const found: {platform: string; author: string; text: string}[] = []
      const allIds: string[] = [...seenIds]

      for (const link of loaded) {
        try {
          const res = await fetch(`/api/platforms/${link.platform}?placeId=${encodeURIComponent(link.placeId)}`)
          if (!res.ok) continue
          const data = await res.json()
          // mock/unavailable 소스는 알림 대상에서 제외
          if (data.source === 'mock' || data.source === 'unavailable') continue
          const reviews: any[] = data.reviews || []
          for (const r of reviews) {
            const rid = r.id || `${link.platform}-${r.author}-${r.date}`
            if (!seenIds.includes(rid)) {
              found.push({ platform: link.platform, author: r.author, text: (r.text || '').slice(0, 60) })
              if (!allIds.includes(rid)) allIds.push(rid)
            }
          }
        } catch (_) {}
      }

      if (found.length) {
        // 브라우저 푸시 알림
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`⭐ 새 리뷰 ${found.length}개`, {
            body: found[0].author + ': ' + found[0].text,
            icon: '/favicon.ico',
          })
        }
        setNewReviews(found)
        // seen IDs 업데이트 (최대 200개 유지)
        localStorage.setItem(LS_SEEN, JSON.stringify(allIds.slice(-200)))
      } else if (!seenIds.length && allIds.length) {
        // 첫 연동 → 현재 리뷰 모두 seen으로 저장 (알림 발생 안 함)
        localStorage.setItem(LS_SEEN, JSON.stringify(allIds.slice(-200)))
      }
    })()
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

  // 연동된 플랫폼 중 대표 매장 선택 (우선순위: 구글 > 네이버 > 배민 > 요기요 > 쿠팡)
  const PLATFORM_PRIORITY = ['google', 'naver', 'baemin', 'yogiyo', 'coupang']
  const PLATFORM_COLORS: Record<string, { from: string; to: string; label: string }> = {
    google:  { from: '#4285F4', to: '#1A73E8', label: '구글' },
    naver:   { from: '#03C75A', to: '#019A44', label: '네이버' },
    baemin:  { from: '#2AC1BC', to: '#1A9994', label: '배민' },
    yogiyo:  { from: '#FA3C00', to: '#C83000', label: '요기요' },
    coupang: { from: '#C00000', to: '#900000', label: '쿠팡이츠' },
  }
  const primaryLink = PLATFORM_PRIORITY.map(p => links.find(l => l.platform === p)).find(Boolean) || null
  const googleLink  = links.find(l => l.platform === 'google')
  const naverLink   = links.find(l => l.platform === 'naver')
  const pc = primaryLink ? PLATFORM_COLORS[primaryLink.platform] : null

  const STORE = primaryLink ? {
    name: primaryLink.name,
    initial: primaryLink.name?.[0] || '매',
    category: (primaryLink as any).category || (pc?.label + ' 연동 매장'),
    address: (primaryLink as any).address || '',
    rating: primaryLink.rating ?? 0,
    reviewCount: primaryLink.reviewCount,
    keywords: [pc?.label || '', '연동완료'].filter(Boolean),
    gradientFrom: pc?.from || '#8B95A1',
    gradientTo:   pc?.to   || '#4E5968',
    platformLabel: pc?.label || '',
  } : {
    name: '내 매장',
    initial: '매',
    category: '플랫폼을 연동해 주세요',
    address: '아래에서 매장을 연동하면 실데이터가 표시됩니다',
    rating: 0,
    reviewCount: 0,
    keywords: ['연동대기'],
    gradientFrom: '#8B95A1',
    gradientTo: '#4E5968',
    platformLabel: '',
  }

  // 통합 리뷰 수 집계
  const totalReviews  = links.reduce((sum, l) => sum + (l.reviewCount || 0), 0)
  const avgRating     = links.filter(l => l.rating).length
    ? (links.filter(l => l.rating).reduce((s, l) => s + (l.rating ?? 0), 0) / links.filter(l => l.rating).length).toFixed(1)
    : '0'

  const STATS = primaryLink ? [
    {
      label: `${STORE.platformLabel} 평점`,
      value: String(primaryLink.rating ?? 0), unit: '점', delta: '실시간', up: true,
      color: pc?.from || '#3182F6',
    },
    {
      label: '통합 리뷰수',
      value: totalReviews.toLocaleString(), unit: '개', delta: '전플랫폼', up: true,
      color: '#F59E0B',
    },
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

        {/* ──────────── 새 리뷰 알림 배너 ──────────── */}
        {newReviews.length > 0 && !notifDismissed && (
          <div className="bg-[#3182F6] text-white rounded-2xl p-4 mb-4 flex items-start gap-3 shadow-md">
            <span className="text-2xl flex-shrink-0">🔔</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm mb-1">새 리뷰 {newReviews.length}개가 달렸어요!</p>
              <p className="text-xs text-blue-100 truncate">
                {newReviews[0].author}: {newReviews[0].text}{newReviews[0].text.length >= 60 ? '...' : ''}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href="/review-admin"
                className="px-3 py-1.5 bg-white text-[#3182F6] text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors">
                리뷰 보기
              </Link>
              <button onClick={() => setNotifDismissed(true)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-500 text-blue-200 font-bold text-lg">
                ✕
              </button>
            </div>
          </div>
        )}

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
                {links.length > 0
                  ? links.map(l => {
                      const lpc = PLATFORM_COLORS[l.platform]
                      return (
                        <span key={l.platform}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: lpc?.from + '20', color: lpc?.from }}>
                          {lpc?.label} 연동됨
                        </span>
                      )
                    })
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
            {primaryLink && (
              <button
                onClick={() => removeLink(primaryLink.platform)}
                className="flex-shrink-0 text-xs text-[#8B95A1] hover:text-red-500 transition-colors hidden sm:block"
              >
                {PLATFORM_COLORS[primaryLink.platform]?.label} 해제
              </button>
            )}
          </div>
        </div>

        {/* ──────────── 플랫폼 연동 현황 ──────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 border border-[#E5E8EB]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#191F28] text-sm">플랫폼 연동 현황</h3>
              <p className="text-xs text-[#8B95A1] mt-0.5">
                {links.length > 0
                  ? links.map(l => PLATFORM_DEFS.find(p => p.key === l.platform)?.label || l.platform).join(' · ') + ' 연동됨'
                  : '연동된 플랫폼이 없습니다'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {links.length > 0 && (
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-green-700">{links.length}개 연결됨</span>
                </div>
              )}
              <span className="text-xs text-[#B0B8C1]">{links.length}/5</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {PLATFORM_DEFS.map(p => {
              const linked = links.find(l => l.platform === p.key)
              const nCount = newReviews.filter(r => r.platform === p.key).length
              return (
                <button
                  key={p.key}
                  onClick={() => p.active && setModalPlatform(p.key)}
                  disabled={!p.active}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    linked
                      ? 'border-green-400 bg-green-50 shadow-sm'
                      : p.active
                        ? 'border-[#E5E8EB] hover:border-[#3182F6] hover:bg-[#EFF6FF] cursor-pointer'
                        : 'border-[#E5E8EB] bg-[#F8F9FA] cursor-not-allowed opacity-60'
                  }`}
                >
                  {nCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center z-10">
                      {nCount}
                    </span>
                  )}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm"
                    style={{ background: linked ? p.color : p.active ? p.color : '#B0B8C1', opacity: linked ? 1 : p.active ? 0.85 : 1 }}
                  >
                    {linked ? '✓' : p.label[0]}
                  </div>
                  <span className="text-[11px] font-bold text-[#191F28]">{p.label}</span>
                  {linked ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-green-600">연동됨</span>
                      <button
                        onClick={e => { e.stopPropagation(); removeLink(p.key) }}
                        className="text-[9px] text-[#B0B8C1] hover:text-red-500 transition-colors"
                      >
                        해제
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[10px] font-medium ${p.active ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>
                      {p.active ? '연결하기' : '준비중'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {/* 연동된 매장 정보 요약 */}
          {links.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#F2F4F6] flex flex-wrap gap-3">
              {links.map(l => {
                const pm = PLATFORM_DEFS.find(p => p.key === l.platform)
                return (
                  <div key={l.platform} className="flex items-center gap-2 bg-[#F8F9FA] rounded-xl px-3 py-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-black"
                      style={{ background: pm?.color }}>
                      {pm?.label?.[0]}
                    </div>
                    <span className="text-xs font-semibold text-[#191F28]">{l.name}</span>
                    {l.rating != null && l.rating > 0 && (
                      <span className="text-xs text-[#8B95A1]">★{l.rating}</span>
                    )}
                    {l.reviewCount > 0 && (
                      <span className="text-[10px] text-[#B0B8C1]">리뷰 {l.reviewCount.toLocaleString()}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ──────────── 헤더 ──────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">대시보드</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPartner(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-semibold text-[#3182F6] hover:bg-[#EFF6FF] transition-colors border border-[#E5E8EB]"
            >
              <span>🌟</span> 파트너 스포트라이트
            </button>
            {/* 로그인된 경우에만 표시 */}
            <UserHeaderIfLoggedIn />
          </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
          {/* ──────────── 주간 차트 ──────────── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
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
        </div>

        {/* PLACEHOLDER_REMOVE_ME */}
        {false && (
          <div>
              {[{ label: '빠른실행', href: '/', bg: '#fff', color: '#000' }].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex flex-col items-center justify-center p-3 rounded-xl"
                  style={{ background: item.bg }}>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.label}</span>
                </Link>
              ))}
          </div>
        )}

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

      {/* ──────────── 우측 플로팅 퀵패널 ──────────── */}
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setShowQuickPanel(v => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: showQuickPanel ? '#191F28' : 'linear-gradient(135deg, #3182F6, #1B64DA)' }}
        title="빠른 실행"
      >
        {showQuickPanel
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        }
      </button>

      {/* 오버레이 */}
      {showQuickPanel && (
        <div className="fixed inset-0 z-30" onClick={() => setShowQuickPanel(false)} />
      )}

      {/* 슬라이드 패널 */}
      <div className={`fixed bottom-24 right-6 z-40 w-72 bg-white rounded-2xl shadow-2xl border border-[#E5E8EB] overflow-hidden transition-all duration-200 origin-bottom-right ${
        showQuickPanel ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
      }`}>
        {/* 패널 헤더 */}
        <div className="bg-gradient-to-r from-[#3182F6] to-[#1B64DA] px-4 py-3">
          <p className="text-white font-black text-sm">⚡ 빠른 실행</p>
          <p className="text-blue-200 text-xs mt-0.5">자주 사용하는 기능</p>
        </div>

        {/* 퀵 메뉴 */}
        <div className="p-3 grid grid-cols-3 gap-2 border-b border-[#F2F4F6]">
          {[
            { label: '리뷰 답변', href: '/review-admin', icon: '⭐', color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'QR 생성',  href: '/qr',           icon: '📱', color: '#8B5CF6', bg: '#F5F3FF' },
            { label: '고객 관리',href: '/customers',     icon: '👥', color: '#059669', bg: '#ECFDF5' },
            { label: '커뮤니티', href: '/community',     icon: '💬', color: '#EC4899', bg: '#FDF2F8' },
            { label: '내 정보',  href: '/my',            icon: '👤', color: '#3182F6', bg: '#EFF6FF' },
            { label: '설정',     href: '/settings',      icon: '⚙️', color: '#4E5968', bg: '#F2F4F6' },
          ].map(item => (
            <Link key={item.label} href={item.href} onClick={() => setShowQuickPanel(false)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: item.bg }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-bold text-center leading-tight" style={{ color: item.color }}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* 관리자 문의 */}
        <div className="p-3">
          <p className="text-xs font-bold text-[#191F28] mb-2.5">💬 관리자 문의</p>
          {inquiryStatus === 'done' ? (
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-green-700">✅ 문의가 접수됐습니다!</p>
              <p className="text-xs text-green-600 mt-1">1~2 영업일 내 답변드립니다</p>
              <button onClick={() => setInquiryStatus('idle')}
                className="mt-2 text-xs text-[#8B95A1] hover:text-[#4E5968]">다시 문의하기</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {['서비스문의', '기능요청', '오류신고'].map(c => (
                  <button key={c} onClick={() => setInquiryForm(f => ({ ...f, category: c }))}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      inquiryForm.category === c ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                value={inquiryForm.name}
                onChange={e => setInquiryForm(f => ({ ...f, name: e.target.value }))}
                placeholder="이름"
                className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#3182F6] transition-colors"
              />
              <textarea
                value={inquiryForm.message}
                onChange={e => setInquiryForm(f => ({ ...f, message: e.target.value }))}
                placeholder="문의 내용을 간단히 입력하세요..."
                rows={3}
                className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#3182F6] transition-colors resize-none"
              />
              <button
                disabled={inquiryStatus === 'sending' || !inquiryForm.name.trim() || !inquiryForm.message.trim()}
                onClick={async () => {
                  setInquiryStatus('sending')
                  try {
                    await fetch('/api/inquiry', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(inquiryForm),
                    })
                    setInquiryStatus('done')
                    setInquiryForm({ name: '', message: '', category: '서비스문의' })
                  } catch {
                    setInquiryStatus('idle')
                  }
                }}
                className="w-full py-2 bg-[#3182F6] text-white text-xs font-bold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors"
              >
                {inquiryStatus === 'sending' ? '접수 중...' : '문의 접수하기'}
              </button>
              <Link href="/inquiry" onClick={() => setShowQuickPanel(false)}
                className="block text-center text-[10px] text-[#8B95A1] hover:text-[#3182F6] transition-colors mt-1">
                상세 문의 페이지 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
