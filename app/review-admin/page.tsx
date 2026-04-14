'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'

const LS_LINKS     = 'localution.platform_links'
const LS_SETTINGS  = 'localution.review_settings'
const LS_SCHEDULED = 'localution.scheduled_replies'

// 모든 플랫폼 정의 (연동 여부와 무관하게 탭에 표시)
const ALL_PLATFORMS = ['google', 'naver', 'baemin', 'yogiyo', 'coupang'] as const

const PLATFORM_META: Record<string, {
  label: string; color: string; bg: string; textColor: string; icon: string;
  gradient: string; cardBg: string; borderColor: string; starColor: string; badgeBg: string
}> = {
  google: {
    label: '구글', color: '#4285F4', bg: '#EBF3FE', textColor: '#1A56B0', icon: 'G',
    gradient: 'linear-gradient(135deg, #4285F4, #1A73E8)',
    cardBg: '#F8FBFF', borderColor: '#BFDBFE', starColor: '#F59E0B', badgeBg: '#EBF3FE',
  },
  naver: {
    label: '네이버', color: '#03C75A', bg: '#E8FBF0', textColor: '#015C2C', icon: 'N',
    gradient: 'linear-gradient(135deg, #03C75A, #019A44)',
    cardBg: '#F6FFF9', borderColor: '#A7F3D0', starColor: '#03C75A', badgeBg: '#E8FBF0',
  },
  baemin: {
    label: '배민', color: '#2AC1BC', bg: '#E6F9F8', textColor: '#0B7B78', icon: 'B',
    gradient: 'linear-gradient(135deg, #2AC1BC, #1A9994)',
    cardBg: '#F0FDFC', borderColor: '#99F6E4', starColor: '#2AC1BC', badgeBg: '#E6F9F8',
  },
  yogiyo: {
    label: '요기요', color: '#FA3C00', bg: '#FEF0EB', textColor: '#B32B00', icon: 'Y',
    gradient: 'linear-gradient(135deg, #FA3C00, #C83000)',
    cardBg: '#FFF7F5', borderColor: '#FED7AA', starColor: '#FA3C00', badgeBg: '#FEF0EB',
  },
  coupang: {
    label: '쿠팡이츠', color: '#C00000', bg: '#FEECEC', textColor: '#900000', icon: 'C',
    gradient: 'linear-gradient(135deg, #C00000, #900000)',
    cardBg: '#FFF5F5', borderColor: '#FECACA', starColor: '#EF4444', badgeBg: '#FEECEC',
  },
}

const INCLUDES_LIST = [
  { key: 'thanks',      label: '감사 인사',       desc: '방문·리뷰에 진심 어린 감사' },
  { key: 'revisit',     label: '재방문 유도',      desc: '자연스러운 재방문 유도 문구' },
  { key: 'mention',     label: '리뷰 내용 호응',   desc: '고객 언급 메뉴·경험에 공감' },
  { key: 'personalize', label: '닉네임 호칭',       desc: '"OO님"으로 개인화 시작' },
  { key: 'improve',     label: '개선 의지',        desc: '부정 리뷰 시 사과 + 개선 의지' },
  { key: 'keyword',     label: 'SEO 키워드 삽입',  desc: '핵심 키워드 자연스럽게 삽입' },
  { key: 'strengths',   label: '매장 강점 어필',   desc: '설정한 강점을 자연스럽게 노출' },
  { key: 'mindset',     label: '사장 마인드 반영',  desc: '사장의 철학·가치관이 배어있게' },
]

interface LinkedPlatform {
  platform: string; placeId: string; name: string; rating: number | null; reviewCount: number
}

interface Review {
  id: string; platform: string; rating: number; author: string; date: string; text: string; replied: boolean
}

interface ReviewState extends Review {
  aiReply: string; editReply: string; aiLoading: boolean; aiDone: boolean; showEdit: boolean
}

interface ScheduledReply {
  reviewId: string; reply: string; scheduledAt: number; platform: string; author: string
}

interface StoreSettings {
  storeName: string; region: string; bizType: string; mainKeyword: string;
  subKeywords: string; storeDesc: string; storeStrengths: string; ownerMindset: string;
  tone: string; length: string; closing: string; excludes: string;
  includes: Record<string, boolean>;
  autoReply: boolean; autoDelayHours: number;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: '', region: '', bizType: '', mainKeyword: '', subKeywords: '',
  storeDesc: '', storeStrengths: '', ownerMindset: '',
  tone: 'friendly', length: 'medium', closing: '', excludes: '',
  includes: { thanks: true, revisit: true, mention: true, personalize: false, improve: true, keyword: true, strengths: true, mindset: false },
  autoReply: false, autoDelayHours: 24,
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

function PlatformBadge({ platform }: { platform: string }) {
  const m = PLATFORM_META[platform]
  if (!m) return null
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: m.bg, color: m.textColor }}>
      {m.label}
    </span>
  )
}

function ReviewTypeTag({ text, rating }: { text: string; rating: number }) {
  if (!text?.trim() || text.trim().length < 5) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">무텍스트</span>
  }
  if (rating <= 2) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">부정리뷰</span>
  }
  return null
}

// 남은 시간 포맷
function formatTimeLeft(scheduledAt: number): string {
  const diff = scheduledAt - Date.now()
  if (diff <= 0) return '발행 가능'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}시간 ${m}분 후` : `${m}분 후`
}

export default function ReviewAdmin() {
  const [links, setLinks] = useState<LinkedPlatform[]>([])
  const [reviews, setReviews] = useState<ReviewState[]>([])
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterRating, setFilterRating] = useState<number>(0)
  const [filterReplied, setFilterReplied] = useState<'all' | 'pending' | 'done'>('all')
  const [scheduled, setScheduled] = useState<ScheduledReply[]>([])
  const [, forceUpdate] = useState(0)

  // localStorage 초기 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LINKS)
      if (raw) {
        const parsed = JSON.parse(raw) as LinkedPlatform[]
        setLinks(parsed)
      }
    } catch (_) {}

    try {
      const rawS = localStorage.getItem(LS_SETTINGS)
      if (rawS) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawS) })
    } catch (_) {}

    try {
      const rawSch = localStorage.getItem(LS_SCHEDULED)
      if (rawSch) setScheduled(JSON.parse(rawSch))
    } catch (_) {}
  }, [])

  // 예약 답변 타이머 (1분마다 체크)
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  // 설정 저장
  function saveSetting<K extends keyof StoreSettings>(key: K, val: StoreSettings[K]) {
    setSettings(prev => {
      const next = { ...prev, [key]: val }
      localStorage.setItem(LS_SETTINGS, JSON.stringify(next))
      return next
    })
  }

  function toggleInclude(key: string) {
    setSettings(prev => {
      const next = { ...prev, includes: { ...prev.includes, [key]: !prev.includes[key] } }
      localStorage.setItem(LS_SETTINGS, JSON.stringify(next))
      return next
    })
  }

  // 리뷰 불러오기
  const loadReviews = useCallback(async () => {
    if (!links.length) return
    setLoading(true)
    const all: ReviewState[] = []
    for (const link of links) {
      try {
        const res = await fetch(`/api/platforms/${link.platform}?placeId=${encodeURIComponent(link.placeId)}`)
        if (!res.ok) continue
        const data = await res.json()
        const items: Review[] = data.reviews || []
        items.forEach(r => all.push({
          ...r,
          platform: link.platform,
          aiReply: '', editReply: '', aiLoading: false, aiDone: false, showEdit: false,
        }))
      } catch (_) {}
    }
    all.sort((a, b) => (b.date > a.date ? 1 : -1))
    setReviews(all)
    setLoading(false)
  }, [links])

  useEffect(() => { if (links.length) loadReviews() }, [links, loadReviews])

  // AI 답글 생성
  async function generateAI(idx: number) {
    const r = reviews[idx]
    setReviews(prev => prev.map((x, i) => i === idx ? { ...x, aiLoading: true, aiDone: false, aiReply: '' } : x))
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: r.text || '',
          rating: r.rating,
          platform: PLATFORM_META[r.platform]?.label || r.platform,
          storeName: settings.storeName || '저희 매장',
          region: settings.region,
          bizType: settings.bizType,
          mainKeyword: settings.mainKeyword,
          subKeywords: settings.subKeywords,
          storeDesc: settings.storeDesc,
          storeStrengths: settings.storeStrengths,
          ownerMindset: settings.ownerMindset,
          aiSettings: {
            tone: settings.tone,
            length: settings.length,
            includes: settings.includes,
            closing: settings.closing,
            excludes: settings.excludes,
          },
        }),
      })
      const data = await res.json()
      const reply = data.reply || '답글 생성 실패'

      // 자동 예약 모드
      if (settings.autoReply) {
        const scheduledAt = Date.now() + settings.autoDelayHours * 3600000
        const newSch: ScheduledReply = {
          reviewId: r.id, reply, scheduledAt,
          platform: r.platform, author: r.author,
        }
        setScheduled(prev => {
          const next = [...prev.filter(s => s.reviewId !== r.id), newSch]
          localStorage.setItem(LS_SCHEDULED, JSON.stringify(next))
          return next
        })
        setReviews(prev => prev.map((x, i) => i === idx
          ? { ...x, aiLoading: false, aiDone: true, aiReply: reply, editReply: reply, showEdit: false }
          : x
        ))
      } else {
        setReviews(prev => prev.map((x, i) => i === idx
          ? { ...x, aiLoading: false, aiDone: true, aiReply: reply, editReply: reply, showEdit: true }
          : x
        ))
      }
    } catch {
      setReviews(prev => prev.map((x, i) => i === idx
        ? { ...x, aiLoading: false, aiDone: false }
        : x
      ))
    }
  }

  function updateEditReply(idx: number, val: string) {
    setReviews(prev => prev.map((x, i) => i === idx ? { ...x, editReply: val } : x))
  }

  function markReplied(idx: number) {
    const r = reviews[idx]
    setScheduled(prev => {
      const next = prev.filter(s => s.reviewId !== r.id)
      localStorage.setItem(LS_SCHEDULED, JSON.stringify(next))
      return next
    })
    setReviews(prev => prev.map((x, i) => i === idx ? { ...x, replied: true, showEdit: false } : x))
  }

  function removeScheduled(reviewId: string) {
    setScheduled(prev => {
      const next = prev.filter(s => s.reviewId !== reviewId)
      localStorage.setItem(LS_SCHEDULED, JSON.stringify(next))
      return next
    })
  }

  // 필터링
  const filtered = reviews.filter(r => {
    if (filterPlatform !== 'all' && r.platform !== filterPlatform) return false
    if (filterRating > 0 && r.rating !== filterRating) return false
    if (filterReplied === 'pending' && r.replied) return false
    if (filterReplied === 'done' && !r.replied) return false
    return true
  })

  // 플랫폼별 카운트
  const platformCounts = links.reduce((acc, l) => {
    acc[l.platform] = reviews.filter(r => r.platform === l.platform).length
    return acc
  }, {} as Record<string, number>)

  const pendingCount  = reviews.filter(r => !r.replied).length
  const readyCount    = scheduled.filter(s => s.scheduledAt <= Date.now()).length

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8 pr-16 md:pr-20">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">리뷰 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">
              {reviews.length}개 리뷰 ·{' '}
              <span className="text-red-500 font-semibold">{pendingCount}개 미답변</span>
              {scheduled.length > 0 && (
                <> · <span className="text-orange-500 font-semibold">예약 {scheduled.length}개</span>
                {readyCount > 0 && <span className="text-green-600 font-bold"> ({readyCount}개 발행 가능)</span>}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(v => !v)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${showSettings ? 'bg-[#191F28] text-white border-[#191F28]' : 'bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#3182F6]'}`}
            >
              ⚙️ AI 설정
            </button>
            <button
              onClick={loadReviews}
              disabled={loading || !links.length}
              className="px-4 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors"
            >
              {loading ? '불러오는 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {/* ── 미연동 안내 ── */}
        {!links.length && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center mb-6">
            <div className="text-4xl mb-3">📡</div>
            <p className="font-bold text-[#191F28] mb-1">연동된 플랫폼이 없습니다</p>
            <p className="text-sm text-[#8B95A1] mb-4">대시보드에서 구글·네이버 매장을 먼저 연동해 주세요.</p>
            <Link href="/" className="inline-block px-5 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] transition-colors">
              대시보드로 이동
            </Link>
          </div>
        )}

        {/* ── AI 설정 패널 (토글) ── */}
        {showSettings && links.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] mb-5 overflow-hidden">
            <div className="p-5 border-b border-[#F2F4F6]">
              <h2 className="font-bold text-[#191F28] text-sm">⚙️ AI 답글 설정</h2>
              <p className="text-xs text-[#8B95A1] mt-0.5">여기서 설정한 내용을 기반으로 모든 리뷰 답글이 생성됩니다</p>
            </div>

            <div className="p-5 space-y-5">
              {/* 기본 매장 정보 */}
              <div>
                <p className="text-xs font-bold text-[#4E5968] mb-3 uppercase tracking-wide">기본 정보</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'storeName', placeholder: '매장명', label: '매장명' },
                    { key: 'region',    placeholder: '강남, 홍대, 해운대...', label: '지역' },
                    { key: 'bizType',   placeholder: '카페, 식당, 미용실...', label: '업종' },
                    { key: 'mainKeyword', placeholder: '대표 SEO 키워드', label: '대표 키워드' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[11px] text-[#8B95A1] font-semibold block mb-1">{f.label}</label>
                      <input
                        value={(settings as any)[f.key]}
                        onChange={e => saveSetting(f.key as keyof StoreSettings, e.target.value as any)}
                        placeholder={f.placeholder}
                        className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#3182F6] transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="text-[11px] text-[#8B95A1] font-semibold block mb-1">서브 키워드 (쉼표 구분)</label>
                  <input
                    value={settings.subKeywords}
                    onChange={e => saveSetting('subKeywords', e.target.value)}
                    placeholder="분위기 좋은 카페, 테라스 카페, 감성 카페..."
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#3182F6] transition-colors"
                  />
                </div>
              </div>

              {/* 매장 소개 & 강점 & 마인드 */}
              <div>
                <p className="text-xs font-bold text-[#4E5968] mb-3 uppercase tracking-wide">매장 특성 (핵심!)</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#8B95A1] font-semibold block mb-1">매장 소개</label>
                    <input
                      value={settings.storeDesc}
                      onChange={e => saveSetting('storeDesc', e.target.value)}
                      placeholder="예: 10년 전통의 직화 삼겹살 전문점, 국내산 재료만 사용"
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#3182F6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] font-semibold block mb-1">
                      매장 강점 <span className="text-[#3182F6]">(빈 리뷰·악플 시 이 내용으로 답글 생성)</span>
                    </label>
                    <input
                      value={settings.storeStrengths}
                      onChange={e => saveSetting('storeStrengths', e.target.value)}
                      placeholder="예: 신선한 재료 매일 새벽 직접 수령, 20년 셰프 경력, 루프탑 뷰"
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#3182F6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] font-semibold block mb-1">
                      사장 마인드·철학 <span className="text-[#3182F6]">(답글 전체에 사장님의 가치관이 배어나오게)</span>
                    </label>
                    <input
                      value={settings.ownerMindset}
                      onChange={e => saveSetting('ownerMindset', e.target.value)}
                      placeholder="예: 손님 한 분 한 분께 집밥처럼 정성을 다합니다"
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#3182F6] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* 답변 스타일 */}
              <div>
                <p className="text-xs font-bold text-[#4E5968] mb-3 uppercase tracking-wide">답변 스타일</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-[#8B95A1] font-semibold block mb-2">톤</label>
                    <div className="flex gap-1.5">
                      {[{ v: 'friendly', l: '친근한' }, { v: 'formal', l: '정중한' }, { v: 'expert', l: '전문적' }].map(t => (
                        <button key={t.v} onClick={() => saveSetting('tone', t.v)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.tone === t.v ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'}`}>
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#8B95A1] font-semibold block mb-2">길이</label>
                    <div className="flex gap-1.5">
                      {[{ v: 'short', l: '짧게' }, { v: 'medium', l: '중간' }, { v: 'long', l: '길게' }].map(t => (
                        <button key={t.v} onClick={() => saveSetting('length', t.v)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.length === t.v ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'}`}>
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 포함 요소 체크박스 */}
              <div>
                <p className="text-xs font-bold text-[#4E5968] mb-3 uppercase tracking-wide">포함할 요소</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {INCLUDES_LIST.map(item => (
                    <button
                      key={item.key}
                      onClick={() => toggleInclude(item.key)}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                        settings.includes[item.key]
                          ? 'border-[#3182F6] bg-[#EFF6FF]'
                          : 'border-[#E5E8EB] bg-white hover:border-[#B0B8C1]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-colors ${settings.includes[item.key] ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#E5E8EB]'}`}>
                        {settings.includes[item.key] && <svg width="10" height="10" viewBox="0 0 12 12" fill="white"><polyline points="2,6 5,9 10,3" strokeWidth="2" stroke="white" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[#191F28]">{item.label}</div>
                        <div className="text-[10px] text-[#8B95A1] leading-snug">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 마무리 문구 + 금지 표현 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#8B95A1] font-semibold block mb-1">고정 마무리 문구</label>
                  <input
                    value={settings.closing}
                    onChange={e => saveSetting('closing', e.target.value)}
                    placeholder="예: 항상 감사드립니다 🙏"
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#3182F6] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8B95A1] font-semibold block mb-1">사용 금지 표현</label>
                  <input
                    value={settings.excludes}
                    onChange={e => saveSetting('excludes', e.target.value)}
                    placeholder="예: 죄송합니다, 저렴한"
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#3182F6] transition-colors"
                  />
                </div>
              </div>

              {/* 자동 답변 예약 설정 */}
              <div className="bg-[#FFF8EC] border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-[#191F28]">⏰ 자동 답변 예약</p>
                    <p className="text-xs text-[#8B95A1] mt-0.5">AI 생성 후 즉시 발행하지 않고, 설정한 시간 후에 발행 준비 상태로 변경</p>
                  </div>
                  <button
                    onClick={() => saveSetting('autoReply', !settings.autoReply)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoReply ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.autoReply ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                {settings.autoReply && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-[#4E5968] font-semibold">발행 대기 시간:</label>
                    <div className="flex gap-1.5">
                      {[12, 24, 48].map(h => (
                        <button key={h} onClick={() => saveSetting('autoDelayHours', h)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${settings.autoDelayHours === h ? 'bg-orange-500 text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-orange-300'}`}>
                          {h}시간
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#8B95A1]">※ 발행 가능 상태가 되면 직접 확인 후 등록</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 예약된 답변 섹션 ── */}
        {scheduled.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-200 mb-5 overflow-hidden">
            <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⏰</span>
                <span className="text-sm font-bold text-[#191F28]">예약된 답변 ({scheduled.length}개)</span>
              </div>
              {readyCount > 0 && (
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">
                  {readyCount}개 발행 가능
                </span>
              )}
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {scheduled.map(s => {
                const isReady = s.scheduledAt <= Date.now()
                const timeLeft = formatTimeLeft(s.scheduledAt)
                const pm = PLATFORM_META[s.platform]
                return (
                  <div key={s.reviewId} className="p-4 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0`}
                      style={{ background: pm?.color || '#8B95A1' }}>
                      {pm?.icon || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#191F28]">{s.author}</span>
                        <PlatformBadge platform={s.platform} />
                        {isReady
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">✅ 발행 가능</span>
                          : <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">⏰ {timeLeft}</span>
                        }
                      </div>
                      <p className="text-xs text-[#4E5968] line-clamp-2 bg-[#F8F9FA] rounded-lg px-3 py-2">{s.reply}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {isReady && (
                        <button
                          onClick={() => removeScheduled(s.reviewId)}
                          className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                        >
                          발행 완료
                        </button>
                      )}
                      <button
                        onClick={() => removeScheduled(s.reviewId)}
                        className="px-3 py-1.5 text-xs text-[#8B95A1] border border-[#E5E8EB] rounded-lg hover:bg-[#F2F4F6] transition-colors font-semibold"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 플랫폼 탭 (항상 5개 표시) ── */}
        <div className="mb-4">
          {/* 플랫폼 탭 */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {/* 전체 탭 */}
            <button onClick={() => setFilterPlatform('all')}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                filterPlatform === 'all'
                  ? 'bg-[#191F28] text-white shadow-md'
                  : 'bg-white text-[#4E5968] shadow-sm hover:shadow-md border border-[#E5E8EB]'
              }`}>
              <span>전체</span>
              {reviews.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${filterPlatform === 'all' ? 'bg-white/20' : 'bg-[#F2F4F6]'}`}>
                  {reviews.length}
                </span>
              )}
            </button>

            {/* 플랫폼별 탭 (5개 항상 표시) */}
            {ALL_PLATFORMS.map(pKey => {
              const pm = PLATFORM_META[pKey]
              const isConnected = links.some(l => l.platform === pKey)
              const cnt = platformCounts[pKey] || 0
              const isActive = filterPlatform === pKey
              return (
                <button
                  key={pKey}
                  onClick={() => isConnected && setFilterPlatform(pKey)}
                  disabled={!isConnected}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'text-white shadow-md scale-105'
                      : isConnected
                      ? 'bg-white shadow-sm hover:shadow-md border-2 hover:scale-105'
                      : 'bg-white shadow-sm border border-dashed border-[#E5E8EB] opacity-50 cursor-not-allowed'
                  }`}
                  style={isActive
                    ? { background: pm.gradient }
                    : isConnected
                    ? { borderColor: pm.color, color: pm.color }
                    : {}
                  }
                >
                  {/* 플랫폼 아이콘 */}
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 ${isActive ? 'bg-white/20' : ''}`}
                    style={!isActive ? { background: pm.bg, color: pm.color } : { color: 'white' }}>
                    {pm.icon}
                  </div>
                  <span>{pm.label}</span>
                  {isConnected && cnt > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/25 text-white' : ''}`}
                      style={!isActive ? { background: pm.bg, color: pm.color } : {}}>
                      {cnt}
                    </span>
                  )}
                  {!isConnected && (
                    <span className="text-[9px] text-[#B0B8C1] font-normal">준비중</span>
                  )}
                  {isConnected && cnt === 0 && (
                    <span className="text-[9px] opacity-60 font-normal">0</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 미답변/완료 + 별점 필터 */}
          {reviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
                {(['all', 'pending', 'done'] as const).map(f => (
                  <button key={f} onClick={() => setFilterReplied(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterReplied === f ? 'bg-[#3182F6] text-white' : 'text-[#8B95A1] hover:bg-[#F2F4F6]'}`}>
                    {f === 'all' ? '전체' : f === 'pending' ? `미답변 ${pendingCount}` : '완료'}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
                {[0,1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFilterRating(n)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterRating === n ? 'bg-[#3182F6] text-white' : 'text-[#8B95A1] hover:bg-[#F2F4F6]'}`}>
                    {n === 0 ? '전체' : '★'.repeat(n)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 플랫폼별 섹션 헤더 (탭이 '전체'일 때) ── */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-3xl mb-2 animate-pulse">⏳</div>
            <p className="text-sm text-[#8B95A1]">리뷰 불러오는 중...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && reviews.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-sm text-[#8B95A1]">필터에 맞는 리뷰가 없습니다.</p>
          </div>
        )}

        {/* ── 리뷰 목록 (플랫폼별 그룹) ── */}
        {!loading && (
          filterPlatform === 'all'
            ? links.map(link => {
                const pm = PLATFORM_META[link.platform]
                const platformReviews = filtered.filter(r => r.platform === link.platform)
                if (!platformReviews.length) return null
                return (
                  <div key={link.platform} className="mb-6">
                    {/* 플랫폼 섹션 헤더 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
                        style={{ background: pm?.color || '#8B95A1' }}>
                        {pm?.icon || link.platform[0]}
                      </div>
                      <h2 className="font-bold text-[#191F28]">{pm?.label || link.platform} 리뷰</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: pm?.bg, color: pm?.textColor }}>
                        {platformReviews.length}개
                      </span>
                      <div className="flex-1 h-px bg-[#E5E8EB]" />
                    </div>
                    <div className="space-y-3">
                      {platformReviews.map(r => {
                        const realIdx = reviews.indexOf(r)
                        return <ReviewCard key={r.id} r={r} idx={realIdx} reviews={reviews} scheduled={scheduled}
                          generateAI={generateAI} updateEditReply={updateEditReply} markReplied={markReplied} settings={settings} />
                      })}
                    </div>
                  </div>
                )
              })
            : (
              <div className="space-y-3">
                {filtered.map(r => {
                  const realIdx = reviews.indexOf(r)
                  return <ReviewCard key={r.id} r={r} idx={realIdx} reviews={reviews} scheduled={scheduled}
                    generateAI={generateAI} updateEditReply={updateEditReply} markReplied={markReplied} settings={settings} />
                })}
              </div>
            )
        )}

        <div className="h-8" />
      </main>
    </div>
  )
}

// ── 리뷰 카드 컴포넌트 (플랫폼별 완전히 다른 디자인) ───────────
function ReviewCard({ r, idx, reviews, scheduled, generateAI, updateEditReply, markReplied, settings }: {
  r: ReviewState; idx: number; reviews: ReviewState[]; scheduled: ScheduledReply[];
  generateAI: (i: number) => void; updateEditReply: (i: number, v: string) => void;
  markReplied: (i: number) => void; settings: StoreSettings
}) {
  const pm = PLATFORM_META[r.platform]
  const isScheduled = scheduled.some(s => s.reviewId === r.id)
  const scheduledItem = scheduled.find(s => s.reviewId === r.id)
  const isReady = scheduledItem && scheduledItem.scheduledAt <= Date.now()
  const hasText = r.text?.trim() && r.text.trim().length >= 5
  const isNegative = r.rating <= 2

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden"
      style={{ border: `1.5px solid ${r.replied ? '#86EFAC' : pm?.borderColor || '#E5E8EB'}` }}>

      {/* ── 플랫폼 헤더 바 ── */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: pm?.gradient || '#8B95A1' }}>
        <div className="flex items-center gap-2">
          {/* 플랫폼 아이콘 */}
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white text-[11px] font-black">
            {pm?.icon}
          </div>
          <span className="text-white font-bold text-xs">{pm?.label} 리뷰</span>
          {/* 별점 */}
          <div className="flex gap-0.5 ml-1">
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= r.rating ? 'white' : 'rgba(255,255,255,0.3)'}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <span className="text-white/80 text-[11px] font-semibold">{r.rating}.0</span>
        </div>
        <div className="flex items-center gap-1.5">
          {r.replied && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">✓ 답변완료</span>
          )}
          {isScheduled && !r.replied && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isReady ? 'bg-green-400 text-white' : 'bg-white/20 text-white'}`}>
              {isReady ? '✅ 발행가능' : `⏰ ${formatTimeLeft(scheduledItem!.scheduledAt)}`}
            </span>
          )}
          {!hasText && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white/80 font-semibold">무텍스트</span>
          )}
          {isNegative && hasText && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/80 text-white font-bold">부정리뷰</span>
          )}
        </div>
      </div>

      {/* ── 카드 본문 ── */}
      <div className="p-4" style={{ background: pm?.cardBg || 'white' }}>
        {/* 작성자 + 날짜 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm"
              style={{ background: pm?.gradient }}>
              {r.author?.[0] || '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-[#191F28]">{r.author}</p>
              <p className="text-[11px]" style={{ color: pm?.color }}>{r.date}</p>
            </div>
          </div>
          {/* 플랫폼 배지 */}
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold border"
            style={{ background: pm?.badgeBg, color: pm?.color, borderColor: pm?.borderColor }}>
            {pm?.label}
          </span>
        </div>

        {/* 리뷰 본문 */}
        <div className={`text-sm rounded-xl px-4 py-3 mb-3 leading-relaxed ${
          !hasText
            ? 'italic'
            : isNegative
            ? 'bg-red-50 border border-red-100'
            : ''
        }`}
          style={hasText && !isNegative
            ? { background: pm?.color + '10', border: `1px solid ${pm?.color}25` }
            : !hasText
            ? { background: '#F8F9FA', color: '#8B95A1', border: '1px solid #E5E8EB' }
            : {}
          }>
          {hasText ? r.text : '(텍스트 없음 — 별점/사진만 남긴 리뷰)'}
        </div>

        {/* 예약 답변 미리보기 */}
        {isScheduled && scheduledItem && (
          <div className="mb-3 p-3 rounded-xl border"
            style={{ background: pm?.bg, borderColor: pm?.borderColor }}>
            <p className="text-xs font-bold mb-1" style={{ color: pm?.color }}>
              {isReady ? '✅ 발행 가능한 AI 답글' : `⏰ ${formatTimeLeft(scheduledItem.scheduledAt)} 후 발행 예정`}
            </p>
            <p className="text-xs text-[#4E5968] line-clamp-3">{scheduledItem.reply}</p>
          </div>
        )}

        {/* AI 답글 편집 */}
        {r.aiDone && r.showEdit && (
          <div className="mb-3">
            <p className="text-xs font-bold mb-2" style={{ color: pm?.color }}>✨ AI 생성 답글 (편집 가능)</p>
            <textarea
              value={r.editReply}
              onChange={e => updateEditReply(idx, e.target.value)}
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors"
              style={{ border: `1.5px solid ${pm?.color}`, background: 'white' }}
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button onClick={() => generateAI(idx)}
                className="px-3 py-1.5 text-xs rounded-lg font-semibold border transition-colors hover:opacity-80"
                style={{ borderColor: pm?.color, color: pm?.color }}>
                재생성
              </button>
              <button onClick={() => markReplied(idx)}
                className="px-4 py-1.5 text-xs text-white rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ background: pm?.gradient }}>
                답변 완료 표시
              </button>
            </div>
          </div>
        )}

        {r.aiLoading && (
          <div className="mb-3 p-3 rounded-xl text-xs font-semibold animate-pulse"
            style={{ background: pm?.bg, color: pm?.color }}>
            ✨ AI가 {pm?.label} 리뷰에 맞는 답글을 작성하고 있습니다...
          </div>
        )}

        {/* 액션 버튼 */}
        {!r.replied && !r.showEdit && !isScheduled && (
          <div className="flex gap-2">
            <button onClick={() => generateAI(idx)} disabled={r.aiLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: pm?.gradient }}>
              ✨ AI 답글 생성
              {settings.autoReply && (
                <span className="text-[10px] opacity-75">({settings.autoDelayHours}h 예약)</span>
              )}
            </button>
            <button onClick={() => markReplied(idx)}
              className="px-4 py-2 text-xs text-[#8B95A1] border border-[#E5E8EB] rounded-xl hover:bg-[#F2F4F6] transition-colors font-semibold">
              수동 완료
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
