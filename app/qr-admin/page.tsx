'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'

const LS_QR_SETTINGS = 'localution.qr_settings'
const LS_QR_LIST     = 'localution.qr_list'

interface QRSettings {
  storeName: string
  mainKeyword: string
  subKeywords: string[]
  subKwInput: string
  tone: string
  rewardType: string
  rewardValue: string
  autoGenerate: boolean
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
  storeName: '',
  mainKeyword: '',
  subKeywords: [],
  subKwInput: '',
  tone: 'friendly',
  rewardType: 'none',
  rewardValue: '',
  autoGenerate: true,
}

const INITIAL_QR_LIST: QRCode[] = [
  { id: '1', name: '입구 리뷰 QR', purpose: 'review', scans: 247, reviews: 89, createdAt: '2025-12-01', active: true, keyword: '부천맛집' },
  { id: '2', name: '테이블 QR #1', purpose: 'review', scans: 183, reviews: 61, createdAt: '2025-12-10', active: true, keyword: '부천카페' },
  { id: '3', name: '카운터 QR', purpose: 'review', scans: 94, reviews: 28, createdAt: '2026-01-05', active: false, keyword: '부천맛집' },
]

const TONE_OPTIONS = [
  { value: 'friendly', label: '친근하게', desc: '따뜻하고 친근한 톤' },
  { value: 'formal',   label: '정중하게', desc: '격식 있고 신뢰감 있는 톤' },
  { value: 'casual',   label: '캐주얼하게', desc: '자연스럽고 편한 톤' },
  { value: 'bright',   label: '밝고 유쾌하게', desc: '에너지 넘치는 긍정적 톤' },
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
      // 고정 패턴: 모서리 파인더
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

// ─── 메인 ─────────────────────────────────────────────────────────
export default function QRAdmin() {
  const [activeTab, setActiveTab] = useState<'settings' | 'list' | 'stats'>('settings')
  const [settings, setSettings] = useState<QRSettings>(DEFAULT_SETTINGS)
  const [qrList, setQrList] = useState<QRCode[]>(INITIAL_QR_LIST)
  const [saved, setSaved] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newQR, setNewQR] = useState({ name: '', purpose: 'review', keyword: '' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [previewQR, setPreviewQR] = useState<QRCode | null>(null)
  const kwInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_QR_SETTINGS)
      if (raw) setSettings(JSON.parse(raw))
      const rawList = localStorage.getItem(LS_QR_LIST)
      if (rawList) setQrList(JSON.parse(rawList))
    } catch (_) {}
  }, [])

  function saveSetting<K extends keyof QRSettings>(key: K, value: QRSettings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    try { localStorage.setItem(LS_QR_SETTINGS, JSON.stringify(next)) } catch (_) {}
  }

  // 서브키워드 태그 추가 (최대 5개)
  const addSubKw = (raw: string) => {
    const trimmed = raw.replace(/,/g, '').trim()
    if (!trimmed || settings.subKeywords.includes(trimmed) || settings.subKeywords.length >= 5) return
    const next = [...settings.subKeywords, trimmed]
    saveSetting('subKeywords', next)
    saveSetting('subKwInput', '')
  }

  const removeSubKw = (kw: string) => {
    saveSetting('subKeywords', settings.subKeywords.filter(k => k !== kw))
  }

  const handleSubKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSubKw(settings.subKwInput)
    }
    if (e.key === 'Backspace' && !settings.subKwInput && settings.subKeywords.length > 0) {
      saveSetting('subKeywords', settings.subKeywords.slice(0, -1))
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

  const totalScans   = qrList.reduce((s, q) => s + q.scans, 0)
  const totalReviews = qrList.reduce((s, q) => s + q.reviews, 0)
  const convRate     = totalScans > 0 ? Math.round((totalReviews / totalScans) * 100) : 0
  const activeCount  = qrList.filter(q => q.active).length

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
            className="flex items-center gap-2 bg-[#3182F6] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1B64DA] transition-colors text-sm"
          >
            + 새 QR 만들기
          </button>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: '전체 QR',   value: qrList.length + '개',     icon: '📱', color: '#3182F6' },
            { label: '활성 QR',   value: activeCount + '개',        icon: '✅', color: '#059669' },
            { label: '총 스캔',   value: totalScans.toLocaleString() + '회',  icon: '🔍', color: '#7C3AED' },
            { label: '리뷰 전환율', value: convRate + '%',           icon: '⭐', color: '#D97706' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{s.icon}</span>
                <span className="text-xs text-[#8B95A1] font-medium">{s.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
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
            {/* 좌측: SEO 키워드 + 톤 설정 */}
            <div className="space-y-5">

              {/* SEO 키워드 세팅 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-base">🔑</div>
                  <div>
                    <h3 className="font-bold text-[#191F28]">SEO 키워드 세팅</h3>
                    <p className="text-xs text-[#8B95A1]">AI가 리뷰 생성 시 자동으로 활용합니다</p>
                  </div>
                </div>

                {/* 메인 키워드 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#191F28] mb-2">
                    메인 키워드
                    <span className="text-xs font-normal text-[#8B95A1] ml-2">가장 중요한 키워드 1개</span>
                  </label>
                  <input
                    value={settings.mainKeyword}
                    onChange={e => saveSetting('mainKeyword', e.target.value)}
                    placeholder="예: 부천맛집"
                    className="w-full border-2 border-[#3182F6] rounded-xl px-4 py-3 text-sm focus:outline-none bg-[#F8FAFF] font-medium placeholder-[#C9CDD2]"
                  />
                </div>

                {/* 서브 키워드 (태그 입력, 최대 5개) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-[#191F28]">서브 키워드</label>
                    <span className="text-xs text-[#8B95A1]">(최대 5개까지 입력 가능)</span>
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
                        onBlur={() => settings.subKwInput.trim() && addSubKw(settings.subKwInput)}
                        placeholder={settings.subKeywords.length === 0 ? "예: 부천카페, 오므라이스, 데이트코스" : "추가 입력..."}
                        className="flex-1 min-w-[120px] outline-none text-sm py-1 bg-transparent placeholder-[#C9CDD2]"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8B95A1] mt-1.5 pl-1">
                    Enter 또는 쉼표로 추가 · {settings.subKeywords.length}/5개 등록됨
                  </p>
                </div>

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

              {/* AI 톤 설정 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-base">🤖</div>
                  <h3 className="font-bold text-[#191F28]">AI 리뷰 생성 톤</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {TONE_OPTIONS.map(opt => (
                    <button key={opt.value}
                      onClick={() => saveSetting('tone', opt.value)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-colors ${
                        settings.tone === opt.value
                          ? 'border-[#3182F6] bg-[#EFF6FF]'
                          : 'border-[#E5E8EB] hover:border-[#3182F6]'
                      }`}>
                      <p className="font-semibold text-[#191F28] text-sm">{opt.label}</p>
                      <p className="text-xs text-[#8B95A1] mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 우측: 보상 설정 + 미리보기 */}
            <div className="space-y-5">

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
                    { value: 'none',    label: '없음',      desc: '순수 리뷰 유도' },
                    { value: 'coupon',  label: '쿠폰 제공', desc: '할인 쿠폰 증정' },
                    { value: 'stamp',   label: '스탬프',    desc: '스탬프 적립' },
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
                    ? `정말 맛있는 ${settings.mainKeyword}이에요! ${settings.subKeywords[0] ? settings.subKeywords[0] + '도 ' : ''}${
                        settings.rewardType !== 'none' && settings.rewardValue ? settings.rewardValue + '도 받아서 ' : ''
                      }기분 좋게 방문했습니다. 분위기도 좋고 직원분들도 친절해서 또 오고 싶어요 😊`
                    : '키워드를 입력하면 AI 리뷰 미리보기가 표시됩니다...'
                  }
                </div>
                <p className="text-[11px] text-[#8B95A1] mt-2 text-center">실제 AI가 생성하는 리뷰 예시입니다</p>
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
              const conv = qr.scans > 0 ? Math.round((qr.reviews / qr.scans) * 100) : 0
              return (
                <div key={qr.id}
                  className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${qr.active ? 'border-transparent' : 'border-[#E5E8EB] opacity-70'}`}>
                  <div className="flex items-center gap-4">
                    {/* QR 미리보기 */}
                    <div
                      onClick={() => setPreviewQR(qr)}
                      className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center cursor-pointer flex-shrink-0 border border-[#E5E8EB] hover:border-[#3182F6] transition-colors p-1">
                      <QRPreview text={qr.name + qr.keyword} size={56} />
                    </div>

                    {/* 정보 */}
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
                      <div className="flex items-center gap-4 text-sm text-[#8B95A1]">
                        <span>🔍 스캔 <span className="font-semibold text-[#191F28]">{qr.scans.toLocaleString()}</span>회</span>
                        <span>⭐ 리뷰 <span className="font-semibold text-[#191F28]">{qr.reviews}</span>개</span>
                        <span>📈 전환 <span className="font-semibold text-[#3182F6]">{conv}%</span></span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 전체 성과 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-5">📊 전체 성과 요약</h3>
              <div className="space-y-4">
                {[
                  { label: '총 스캔 수',   value: totalScans.toLocaleString() + '회',  bar: 100, color: '#3182F6' },
                  { label: '총 리뷰 생성', value: totalReviews + '개',                 bar: convRate, color: '#059669' },
                  { label: '평균 전환율',  value: convRate + '%',                       bar: convRate, color: '#D97706' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[#4E5968]">{item.label}</span>
                      <span className="text-sm font-bold text-[#191F28]">{item.value}</span>
                    </div>
                    <div className="w-full h-2 bg-[#F2F4F6] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: item.bar + '%', background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR별 성과 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-5">📱 QR별 성과</h3>
              <div className="space-y-3">
                {[...qrList].sort((a, b) => b.scans - a.scans).map((qr, i) => {
                  const conv = qr.scans > 0 ? Math.round((qr.reviews / qr.scans) * 100) : 0
                  const pct  = totalScans > 0 ? Math.round((qr.scans / totalScans) * 100) : 0
                  return (
                    <div key={qr.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${i === 0 ? 'text-[#D97706]' : 'text-[#8B95A1]'}`}>{i + 1}</span>
                          <span className="text-sm font-medium text-[#191F28] truncate max-w-[150px]">{qr.name}</span>
                        </div>
                        <span className="text-xs text-[#4E5968]">{qr.scans}회 · {conv}% 전환</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F2F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#3182F6] rounded-full"
                          style={{ width: pct + '%' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI 인사이트 */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-6 border border-[#BFDBFE]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">✨</span>
                <h3 className="font-bold text-[#191F28]">AI 인사이트</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#3182F6] text-white font-semibold">자동 분석</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '📈', title: '최고 성과 QR', desc: qrList.sort((a,b) => b.scans - a.scans)[0]?.name + '가 가장 많은 스캔을 기록했어요. 이 QR 배치 위치가 효과적입니다.' },
                  { icon: '💡', title: '개선 포인트',   desc: '전환율을 높이려면 QR 스캔 즉시 AI 리뷰 초안이 뜨는 경험이 중요합니다. 키워드를 구체적으로 설정해보세요.' },
                  { icon: '🎯', title: '다음 액션',     desc: settings.subKeywords.length < 3 ? '서브 키워드를 3개 이상 설정하면 AI 리뷰 품질이 올라가요!' : '키워드 세팅이 잘 되어 있어요! 보상 설정으로 전환율을 높여보세요.' },
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
                <QRPreview text={previewQR.name + previewQR.keyword} size={180} />
              </div>
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
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#3182F6] text-white hover:bg-[#1B64DA] transition-colors">
                  이미지 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
