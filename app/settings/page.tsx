'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'

const TABS = ['매장 정보', '알림 설정', 'AI 설정', '연동 관리', '플랜 관리'] as const
type Tab = typeof TABS[number]

const FEATURES = [
  { id: 'ai-review', name: 'AI 리뷰 자동 답변', price: 9900, short: 'AI', bg: '#EFF6FF', color: '#3182F6', desc: '리뷰에 AI가 자동으로 답변' },
  { id: 'report', name: '주간 리포트', price: 4900, short: '리포', bg: '#F5F3FF', color: '#8B5CF6', desc: '매주 성과 분석 리포트 발송' },
  { id: 'crm', name: 'CRM 고객 관리', price: 14900, short: 'CRM', bg: '#ECFDF5', color: '#059669', desc: '고객 DB 관리 및 재방문 유도' },
  { id: 'qr', name: 'QR 코드 관리', price: 4900, short: 'QR', bg: '#FFF7ED', color: '#EA580C', desc: 'QR 코드 생성 및 스캔 분석' },
  { id: 'sms', name: 'SMS 마케팅', price: 19900, short: 'SMS', bg: '#FFF1F2', color: '#E11D48', desc: '타겟 고객 문자 발송' },
  { id: 'spotlight', name: '커뮤니티 우선 노출', price: 9900, short: '노출', bg: '#FEFCE8', color: '#CA8A04', desc: '로컬루션 커뮤니티 상단 노출' },
]

// ─── Toggle ──────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

// ─── 매장 정보 탭 ─── (전면 개편 v2)
function StoreTab() {
  const [form, setForm] = useState({
    name: '우리 카페',
    category: '카페·베이커리',
    phone: '02-1234-5678',
    address: '서울시 마포구 합정동 123-4',
    naverUrl: '',
    desc: '',
  })
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [descSynced, setDescSynced] = useState(false)

  // 키워드 추가 (최대 5개)
  const addKeyword = (raw: string) => {
    const trimmed = raw.replace(/,/g, '').trim()
    if (!trimmed || keywords.includes(trimmed) || keywords.length >= 5) return
    setKeywords(p => [...p, trimmed])
    setKwInput('')
  }

  const removeKeyword = (kw: string) => setKeywords(p => p.filter(k => k !== kw))

  const handleKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(kwInput)
    }
    if (e.key === 'Backspace' && !kwInput && keywords.length > 0) {
      setKeywords(p => p.slice(0, -1))
    }
  }

  // 네이버 플레이스 연동 시뮬레이션
  const handleNaverSync = async () => {
    if (!form.naverUrl && !form.name) return
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1800))
    setForm(p => ({
      ...p,
      name: '우리 카페 합정점',
      category: '카페·디저트',
      address: '서울시 마포구 합정동 123-4',
      phone: '02-1234-5678',
      desc: '합정동 골목 안에 위치한 아늑한 브런치 카페. 루프탑 테라스와 펫 프렌들리 공간이 있어 편안하게 머물 수 있습니다.',
    }))
    setKeywords(['합정카페', '브런치카페', '루프탑카페', '펫카페'])
    setDescSynced(true)
    setSyncing(false)
    setSynced(true)
    setTimeout(() => setSynced(false), 3000)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 네이버 지도 검색 URL
  const naverMapSearchUrl = `https://map.naver.com/v5/search/${encodeURIComponent((form.name + ' ' + form.address).trim())}`

  return (
    <div className="flex gap-8 items-start">
      {/* 좌측: 폼 */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* 네이버 플레이스 연동 */}
        <div className="bg-[#EFF6FF] rounded-2xl p-5 border border-[#BFDBFE]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-[#03C75A] flex items-center justify-center text-white text-[10px] font-black">N</div>
            <span className="text-sm font-bold text-[#191F28]">네이버 플레이스 연동</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3182F6] text-white font-semibold">자동 입력</span>
          </div>
          <div className="flex gap-2">
            <input
              value={form.naverUrl}
              onChange={e => setForm(p => ({ ...p, naverUrl: e.target.value }))}
              placeholder="https://naver.me/... 또는 플레이스 URL 붙여넣기"
              className="flex-1 border border-[#BFDBFE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] bg-white transition-colors"
            />
            <button
              onClick={handleNaverSync}
              disabled={syncing}
              className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                synced ? 'bg-green-500 text-white'
                : syncing ? 'bg-[#93C5FD] text-white cursor-not-allowed'
                : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'
              }`}
            >
              {synced ? '✅ 완료' : syncing ? '⏳ 불러오는 중...' : '연동하기'}
            </button>
          </div>
          {synced && (
            <p className="text-xs text-green-600 font-semibold mt-2">
              ✅ 네이버 플레이스에서 매장 정보·키워드·소개글을 모두 불러왔어요!
            </p>
          )}
          {!synced && (
            <p className="text-xs text-[#3182F6] mt-2 opacity-70">
              연동하면 매장명·주소·전화번호·키워드·소개글이 자동으로 입력됩니다
            </p>
          )}
        </div>

        {/* 매장명 + 업종 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">매장명</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">업종</label>
            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
        </div>

        {/* 전화번호 + 주소 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">전화번호</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#191F28] mb-2">주소</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>
        </div>

        {/* 대표 키워드 (최대 5개 태그 입력) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-[#191F28]">대표 키워드</label>
            <span className="text-xs text-[#8B95A1] font-medium">(최대 5개까지 입력 가능)</span>
          </div>
          <div className={`flex flex-wrap gap-2 p-3 border-2 rounded-xl bg-white min-h-[52px] transition-colors ${
            keywords.length >= 5 ? 'border-[#E5E8EB] bg-[#F8F9FA]' : 'border-[#3182F6]'
          }`}>
            {keywords.map(kw => (
              <span key={kw}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3182F6] text-white text-sm rounded-full font-medium flex-shrink-0">
                #{kw}
                <button onClick={() => removeKeyword(kw)}
                  className="text-white/70 hover:text-white font-black text-base leading-none">×</button>
              </span>
            ))}
            {keywords.length < 5 && (
              <input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={handleKwKeyDown}
                onBlur={() => kwInput.trim() && addKeyword(kwInput)}
                placeholder={keywords.length === 0 ? "키워드 입력 후 Enter (예: 합정카페)" : "추가 입력..."}
                className="flex-1 min-w-[140px] outline-none text-sm py-1 bg-transparent placeholder-[#C9CDD2]"
              />
            )}
          </div>
          <p className="text-[11px] text-[#8B95A1] mt-1.5 pl-1">
            Enter 또는 쉼표로 추가 · {keywords.length}/5개 등록됨 · AI 리뷰 답변 키워드로 자동 활용됩니다
          </p>
        </div>

        {/* 매장 소개 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-[#191F28]">매장 소개</label>
            {descSynced
              ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✅ 네이버 자동 불러옴</span>
              : <span className="text-[11px] text-[#03C75A] font-medium">연동 시 자동 불러오기</span>
            }
          </div>
          <textarea
            value={form.desc}
            onChange={e => { setForm(p => ({ ...p, desc: e.target.value })); setDescSynced(false) }}
            rows={4}
            placeholder="매장을 소개하는 문구를 입력하세요&#13;&#10;네이버 플레이스 연동 시 자동으로 불러옵니다 (AI 리뷰 답변 시 참고됩니다)"
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${
              descSynced ? 'border-green-300 bg-green-50' : 'border-[#E5E8EB] focus:border-[#3182F6]'
            }`}
          />
        </div>

        {/* 저장 버튼 */}
        <button onClick={handleSave}
          className={`w-full py-3.5 rounded-xl font-bold text-base transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'}`}>
          {saved ? '✅ 저장됨' : '저장하기'}
        </button>
      </div>

      {/* 우측: 네이버 지도 패널 (크게) */}
      <div className="w-[400px] flex-shrink-0 hidden lg:block">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-8">
          {/* 헤더 */}
          <div className="px-5 pt-5 pb-4 border-b border-[#F2F4F6]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-[#03C75A] flex items-center justify-center text-white text-[10px] font-black">N</div>
              <p className="font-bold text-[#191F28]">우리 매장 위치</p>
            </div>
            <p className="text-sm text-[#4E5968] truncate">{form.address || '주소를 입력하세요'}</p>
          </div>

          {/* 지도 미리보기 영역 */}
          <div className="relative bg-[#E8F5E9] overflow-hidden" style={{ height: '320px' }}>
            {/* 그리드 패턴 (지도 느낌) */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(#03C75A 1px, transparent 1px), linear-gradient(90deg, #03C75A 1px, transparent 1px)',
                backgroundSize: '32px 32px'
              }} />
            {/* 도로 느낌 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute bg-white/70 h-[48px] w-full" style={{ top: '50%', transform: 'translateY(-50%)' }} />
              <div className="absolute bg-white/70 w-[48px] h-full" style={{ left: '45%' }} />
              <div className="absolute bg-white/50 h-[28px] w-full" style={{ top: '28%' }} />
            </div>
            {/* 위치 핀 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[#03C75A] flex items-center justify-center shadow-xl border-4 border-white z-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                {/* 핀 그림자 */}
                <div className="w-4 h-2 bg-black/20 rounded-full -mt-1 blur-sm" />
                {/* 말풍선 */}
                {form.name && (
                  <div className="absolute -top-14 bg-white rounded-xl px-3 py-2 shadow-lg border border-[#E5E8EB] whitespace-nowrap z-20">
                    <p className="text-xs font-bold text-[#191F28]">{form.name}</p>
                    <p className="text-[10px] text-[#8B95A1] mt-0.5">⭐ 리뷰 연동 중</p>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
                      <div className="w-3 h-3 bg-white border-r border-b border-[#E5E8EB] rotate-45 mx-auto -mt-1.5" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* 네이버 지도 워터마크 */}
            <div className="absolute bottom-3 right-3 bg-white/90 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <div className="w-4 h-4 rounded bg-[#03C75A] flex items-center justify-center text-white text-[8px] font-black">N</div>
              <span className="text-[10px] font-bold text-[#03C75A]">NAVER MAP</span>
            </div>
          </div>

          {/* 네이버 지도 열기 버튼 */}
          <div className="p-4 space-y-3">
            <a
              href={naverMapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #03C75A, #019A44)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              네이버 지도에서 보기
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://search.naver.com/search.naver?query=${encodeURIComponent(form.name + ' ' + form.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE] transition-colors"
              >
                🔍 플레이스 검색
              </a>
              <a
                href={`https://map.naver.com/v5/directions/-/-/-/${encodeURIComponent(form.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-[#F0FDF4] text-[#059669] hover:bg-[#DCFCE7] transition-colors"
              >
                🗺️ 길 찾기
              </a>
            </div>
            <p className="text-[11px] text-[#8B95A1] text-center">
              저장 후 네이버 지도로 실제 위치를 확인해보세요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 알림 설정 탭 ────────────────────────
function NotifyTab() {
  const [alerts, setAlerts] = useState({ review: true, customer: true, report: false, payment7: true, payment3: true })
  const [channels, setChannels] = useState({ kakao: true, email: false, sms: false })
  const [payChannels, setPayChannels] = useState({ kakao: true, email: true, sms: false })

  const toggleAlert = (key: keyof typeof alerts) => setAlerts(p => ({ ...p, [key]: !p[key] }))

  const CH_LABELS = [
    { key: 'kakao' as const, label: '카카오톡' },
    { key: 'email' as const, label: '이메일' },
    { key: 'sms' as const, label: 'SMS' },
  ]

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">알림 받을 항목</h3>
        <div className="space-y-4">
          {[
            { key: 'review' as const, label: '새 리뷰 알림', desc: '새로운 리뷰가 등록되면 알려드려요' },
            { key: 'customer' as const, label: '신규 고객 알림', desc: '새 고객이 등록되면 알려드려요' },
            { key: 'report' as const, label: '주간 리포트 알림', desc: '매주 월요일 성과 리포트를 발송해요' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#191F28]">{item.label}</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">{item.desc}</p>
              </div>
              <Toggle checked={alerts[item.key]} onChange={() => toggleAlert(item.key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-[#3182F6]">
        <h3 className="font-bold text-[#191F28] mb-1">결제 알림</h3>
        <p className="text-xs text-[#8B95A1] mb-5">결제일 전 미리 알림을 받아 놓치지 마세요</p>
        <div className="space-y-4 mb-5">
          {[
            { key: 'payment7' as const, label: '결제 7일 전 알림', desc: '결제 예정 7일 전 안내' },
            { key: 'payment3' as const, label: '결제 3일 전 알림', desc: '결제 예정 3일 전 최종 안내' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#191F28]">{item.label}</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">{item.desc}</p>
              </div>
              <Toggle checked={alerts[item.key]} onChange={() => toggleAlert(item.key)} />
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-[#F2F4F6]">
          <p className="text-sm font-medium text-[#191F28] mb-3">결제 알림 채널</p>
          <div className="flex gap-2 flex-wrap">
            {CH_LABELS.map(ch => (
              <button key={ch.key}
                onClick={() => setPayChannels(p => ({ ...p, [ch.key]: !p[ch.key] }))}
                className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${payChannels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}>
                {ch.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">기본 알림 채널</h3>
        <div className="flex gap-2 flex-wrap">
          {CH_LABELS.map(ch => (
            <button key={ch.key}
              onClick={() => setChannels(p => ({ ...p, [ch.key]: !p[ch.key] }))}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${channels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}>
              {ch.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── AI 설정 탭 ─────────────────────────
function AITab() {
  const [tone, setTone] = useState(() => {
    try { return localStorage.getItem('ai.tone') || 'friendly' } catch { return 'friendly' }
  })
  const [length, setLength] = useState(() => {
    try { return localStorage.getItem('ai.length') || 'medium' } catch { return 'medium' }
  })
  const [autoReply, setAutoReply] = useState(() => {
    try { return localStorage.getItem('ai.autoReply') === 'true' } catch { return false }
  })
  const [keyword, setKeyword] = useState(() => {
    try { return localStorage.getItem('ai.keyword') || '' } catch { return '' }
  })
  const [gender, setGender] = useState(() => {
    try { return localStorage.getItem('ai.gender') || 'all' } catch { return 'all' }
  })
  const [ageGroup, setAgeGroup] = useState(() => {
    try { return localStorage.getItem('ai.ageGroup') || 'all' } catch { return 'all' }
  })
  const [speechStyle, setSpeechStyle] = useState(() => {
    try { return localStorage.getItem('ai.speechStyle') || 'formal-yo' } catch { return 'formal-yo' }
  })
  const [emoji, setEmoji] = useState(() => {
    try { return localStorage.getItem('ai.emoji') === 'true' } catch { return false }
  })
  const [saved, setSaved] = useState(false)

  const save = (key: string, val: string | boolean) => {
    try { localStorage.setItem(`ai.${key}`, String(val)) } catch {}
  }
  const set = (setter: any, key: string, val: any) => { setter(val); save(key, val) }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TONES = [
    { value: 'friendly',    label: '친근하게',   emoji: '😊', desc: '따뜻하고 친근한 이웃 같은 톤' },
    { value: 'formal',      label: '정중하게',   emoji: '🤝', desc: '격식 있고 신뢰감 주는 톤' },
    { value: 'casual',      label: '캐주얼하게', emoji: '😎', desc: '편안하고 자연스러운 톤' },
    { value: 'warm',        label: '따뜻하게',   emoji: '🌸', desc: '감성적이고 진심 어린 톤' },
    { value: 'professional',label: '전문적으로', emoji: '💼', desc: '전문성·신뢰성 강조 톤' },
    { value: 'cheerful',    label: '유쾌하게',   emoji: '🎉', desc: '밝고 에너지 넘치는 톤' },
    { value: 'empathy',     label: '공감하며',   emoji: '💝', desc: '고객 감정에 깊이 공감' },
    { value: 'concise',     label: '간결하게',   emoji: '✂️', desc: '핵심만 짧고 명확하게' },
  ]

  const GENDERS = [
    { value: 'all',    label: '전체',  emoji: '👥' },
    { value: 'male',   label: '남성',  emoji: '👨' },
    { value: 'female', label: '여성',  emoji: '👩' },
  ]

  const AGE_GROUPS = [
    { value: 'all',  label: '전체' },
    { value: '10s',  label: '10대' },
    { value: '20s',  label: '20대' },
    { value: '30s',  label: '30대' },
    { value: '40s',  label: '40대' },
    { value: '50s',  label: '50대' },
    { value: '60s+', label: '60대+' },
  ]

  const SPEECH_STYLES = [
    { value: 'formal-hap', label: '합쇼체',  desc: '~합니다 / ~입니다', emoji: '📋' },
    { value: 'formal-yo',  label: '해요체',  desc: '~해요 / ~예요',    emoji: '🗣️' },
    { value: 'informal',   label: '친근체',  desc: '~해 / ~야',        emoji: '💬' },
    { value: 'busan',      label: '부산 사투리', desc: '~예 / ~예요',  emoji: '🌊' },
    { value: 'jeju',       label: '제주 방언',   desc: '~마씀 / ~우다', emoji: '🍊' },
  ]

  return (
    <div className="flex gap-6 flex-col xl:flex-row">

      {/* ── 좌측: AI 답변 설정 ── */}
      <div className="flex-1 space-y-5 min-w-0">

        {/* 답변 톤 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#191F28] mb-1">AI 답변 톤</h3>
          <p className="text-xs text-[#8B95A1] mb-4">리뷰 답변 시 사용할 전체적인 말투를 선택하세요</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {TONES.map(opt => (
              <button key={opt.value} onClick={() => set(setTone, 'tone', opt.value)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${tone === opt.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#93C5FD]'}`}>
                <div className="text-xl mb-1.5">{opt.emoji}</div>
                <div className={`text-sm font-bold mb-0.5 ${tone === opt.value ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>{opt.label}</div>
                <div className="text-[10px] text-[#8B95A1] leading-relaxed">{opt.desc}</div>
                {tone === opt.value && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
                    <span className="text-[10px] text-[#3182F6] font-semibold">선택됨</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 답변 길이 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#191F28] mb-4">답변 길이</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'short',  label: '짧게',  desc: '1~2줄', icon: '📝' },
              { value: 'medium', label: '보통',  desc: '3~4줄', icon: '📄' },
              { value: 'long',   label: '길게',  desc: '5줄+',  icon: '📃' },
            ].map(opt => (
              <button key={opt.value} onClick={() => set(setLength, 'length', opt.value)}
                className={`p-4 rounded-xl border-2 text-center transition-colors ${length === opt.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#93C5FD]'}`}>
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className={`text-sm font-bold ${length === opt.value ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>{opt.label}</div>
                <div className="text-xs text-[#8B95A1] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 자동 답변 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-[#191F28]">자동 답변</p>
              <p className="text-xs text-[#8B95A1] mt-0.5">새 리뷰에 AI가 자동으로 답변을 달아요</p>
            </div>
            <Toggle checked={autoReply} onChange={(v: boolean) => set(setAutoReply, 'autoReply', v)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">필수 포함 키워드</label>
            <input value={keyword} onChange={e => { setKeyword(e.target.value); save('keyword', e.target.value) }}
              placeholder="예: 감사합니다, 방문 감사"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
            <p className="text-xs text-[#8B95A1] mt-1.5">쉼표로 구분하면 여러 개 입력 가능해요</p>
          </div>
        </div>

      </div>

      {/* ── 우측: 타겟 고객 설정 ── */}
      <div className="xl:w-[340px] space-y-5 flex-shrink-0">

        {/* 섹션 타이틀 */}
        <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] rounded-2xl p-4 border border-[#BFDBFE]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎯</span>
            <h3 className="font-bold text-[#191F28]">타겟 고객 설정</h3>
          </div>
          <p className="text-xs text-[#4E5968] leading-relaxed">
            고객 성별·나이대·말투를 설정하면<br/>AI가 맞춤 답변을 생성합니다
          </p>
        </div>

        {/* 성별 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-[#191F28] mb-3">👥 주요 고객 성별</h4>
          <div className="flex gap-2">
            {GENDERS.map(g => (
              <button key={g.value} onClick={() => set(setGender, 'gender', g.value)}
                className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${gender === g.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#93C5FD]'}`}>
                <div className="text-xl mb-0.5">{g.emoji}</div>
                <div className={`text-xs font-semibold ${gender === g.value ? 'text-[#3182F6]' : 'text-[#4E5968]'}`}>{g.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 나이대 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-[#191F28] mb-3">📅 주요 고객 나이대</h4>
          <div className="grid grid-cols-4 gap-1.5">
            {AGE_GROUPS.map(a => (
              <button key={a.value} onClick={() => set(setAgeGroup, 'ageGroup', a.value)}
                className={`py-2.5 rounded-xl border-2 text-center transition-all ${ageGroup === a.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#93C5FD]'}`}>
                <span className={`text-xs font-semibold ${ageGroup === a.value ? 'text-[#3182F6]' : 'text-[#4E5968]'}`}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 말투 스타일 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-[#191F28] mb-1">🗣️ 말투 스타일</h4>
          <p className="text-xs text-[#8B95A1] mb-3">답변에 사용할 어미·표현 방식</p>
          <div className="space-y-2">
            {SPEECH_STYLES.map(s => (
              <button key={s.value} onClick={() => set(setSpeechStyle, 'speechStyle', s.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${speechStyle === s.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#93C5FD]'}`}>
                <span className="text-lg flex-shrink-0">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${speechStyle === s.value ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>{s.label}</div>
                  <div className="text-[11px] text-[#8B95A1]">{s.desc}</div>
                </div>
                {speechStyle === s.value && (
                  <span className="w-2 h-2 rounded-full bg-[#3182F6] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 이모티콘 포함 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#191F28]">😄 이모티콘 포함</p>
              <p className="text-xs text-[#8B95A1] mt-0.5">답변에 이모지를 자연스럽게 추가</p>
            </div>
            <Toggle checked={emoji} onChange={(v: boolean) => set(setEmoji, 'emoji', v)} />
          </div>
        </div>

        {/* 저장 버튼 */}
        <button onClick={handleSave}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${saved ? 'bg-green-500 text-white' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
          {saved ? '✓ 설정이 저장되었습니다!' : '설정 저장하기'}
        </button>

      </div>
    </div>
  )
}

// ─── 연동 관리 탭 ────────────────────────
function ConnectTab() {
  const [platformLinks, setPlatformLinks] = useState<any[]>([])
  const [tossKey, setTossKey] = useState({ client: '', secret: '' })
  const [tossSaved, setTossSaved] = useState(false)
  const [tossMode, setTossMode] = useState<'test' | 'live'>('test')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('localution.platform_links')
      if (raw) setPlatformLinks(JSON.parse(raw))
    } catch (_) {}
  }, [])

  const PLATFORMS = [
    { key: 'naver',   label: '네이버 플레이스', short: 'N', gradient: 'linear-gradient(135deg,#03C75A,#019A44)', desc: '네이버 리뷰·검색 연동' },
    { key: 'google',  label: '구글 비즈니스',   short: 'G', gradient: 'linear-gradient(135deg,#4285F4,#1A73E8)', desc: '구글 리뷰·검색 연동' },
    { key: 'baemin',  label: '배달의민족',       short: 'B', gradient: 'linear-gradient(135deg,#2AC1BC,#1A9994)', desc: '배민 주문·리뷰 연동' },
    { key: 'yogiyo',  label: '요기요',           short: 'Y', gradient: 'linear-gradient(135deg,#FA3C00,#C83000)', desc: '요기요 주문·리뷰 연동' },
    { key: 'coupang', label: '쿠팡이츠',         short: 'C', gradient: 'linear-gradient(135deg,#C00000,#900000)', desc: '쿠팡이츠 주문·리뷰 연동' },
  ]

  const isConnected = (key: string) => platformLinks.some(l => l.platform === key)
  const getLinkData = (key: string) => platformLinks.find(l => l.platform === key)

  return (
    <div className="max-w-xl space-y-5">
      {/* 연동 안내 배너 */}
      <div className="bg-[#EFF6FF] rounded-2xl p-4 border border-[#BFDBFE]">
        <p className="text-sm font-bold text-[#3182F6] mb-1">플랫폼 연동 관리</p>
        <p className="text-xs text-[#4E5968] leading-relaxed">
          플랫폼 연동은{' '}
          <Link href="/platform-connect" className="text-[#3182F6] underline font-semibold">연동 설정 페이지</Link>
          에서 할 수 있어요. 연동된 플랫폼의 리뷰가 자동으로 수집됩니다.
        </p>
      </div>

      {PLATFORMS.map(s => {
        const connected = isConnected(s.key)
        const linkData = getLinkData(s.key)
        return (
          <div key={s.key}
            className={`bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between border-2 transition-colors ${connected ? 'border-green-200' : 'border-transparent'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{ background: s.gradient }}>
                {s.short}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#191F28] text-sm">{s.label}</p>
                  {connected && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">연동됨</span>
                  )}
                </div>
                <p className="text-xs text-[#8B95A1]">
                  {connected && linkData?.storeName ? linkData.storeName : s.desc}
                </p>
                {connected && linkData?.reviewCount != null && (
                  <p className="text-xs text-[#3182F6] font-medium mt-0.5">리뷰 {linkData.reviewCount}개 연동</p>
                )}
              </div>
            </div>
            <Link href="/platform-connect"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 ${connected ? 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
              {connected ? '관리' : '연동하기'}
            </Link>
          </div>
        )
      })}

      <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#E5E8EB]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-xs font-black text-[#3182F6]">Pay</div>
          <div>
            <p className="font-bold text-[#191F28]">토스페이먼츠 연동</p>
            <p className="text-xs text-[#8B95A1]">정기결제(빌링) API 키 설정</p>
          </div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">준비 중</span>
        </div>
        <div className="flex gap-2 mb-4">
          {(['test', 'live'] as const).map(m => (
            <button key={m} onClick={() => setTossMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tossMode === m ? (m === 'live' ? 'bg-red-500 text-white' : 'bg-[#3182F6] text-white') : 'bg-[#F2F4F6] text-[#4E5968]'}`}>
              {m === 'test' ? '테스트 모드' : '라이브 모드'}
            </button>
          ))}
        </div>
        <div className="space-y-3 mb-4">
          <input type="text" value={tossKey.client} onChange={e => setTossKey(p => ({ ...p, client: e.target.value }))}
            placeholder={`클라이언트 키 (${tossMode}_ck_...)`}
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
          <input type="password" value={tossKey.secret} onChange={e => setTossKey(p => ({ ...p, secret: e.target.value }))}
            placeholder={`시크릿 키 (${tossMode}_sk_...)`}
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
        </div>
        <div className="mb-4 p-3 bg-blue-50 rounded-xl text-xs text-[#3182F6] space-y-1">
          <p className="font-semibold">연동 준비사항</p>
          <p>1. 토스페이먼츠 개발자센터 가입 및 정기결제 서비스 신청</p>
          <p>2. 웹훅 URL: <span className="font-mono">https://localution.co.kr/api/payments/webhook</span></p>
        </div>
        <button onClick={() => { setTossSaved(true); setTimeout(() => setTossSaved(false), 2500) }}
          disabled={!tossKey.client || !tossKey.secret}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${tossSaved ? 'bg-green-500 text-white' : !tossKey.client || !tossKey.secret ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
          {tossSaved ? '저장됨' : '키 저장하기'}
        </button>
      </div>
    </div>
  )
}

// ─── 플랜 관리 탭 ────────────────────────
function PlanTab() {
  const [cart, setCart] = useState<string[]>([])
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [cancelledAt, setCancelledAt] = useState<Date | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<{ cardName: string; last4: string } | null>(null)
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', birth: '', pwd: '' })

  const nextBillingDate = '2025년 2월 14일'
  const addToCart = (id: string) => { if (!cart.includes(id)) setCart(p => [...p, id]) }
  const removeFromCart = (id: string) => setCart(p => p.filter(i => i !== id))
  const cartFeatures = FEATURES.filter(f => cart.includes(f.id))
  const cartTotal = cartFeatures.reduce((sum, f) => sum + f.price, 0)
  const discount = cart.length >= 3 ? Math.floor(cartTotal * 0.1) : 0

  // 성과 쇼케이스 (카트 비어있을 때 표시)
  const SHOWCASE = [
    { metric: '98%', label: '리뷰 답변률', feature: 'AI 리뷰 자동 답변', who: '강남구 네일샵', story: '리뷰 하나하나 AI가 진심으로 답변', grad: 'from-[#3182F6] to-[#1B64DA]' },
    { metric: '+47명', label: '월 신규 고객', feature: 'CRM 고객 관리', who: '홍대 카페', story: '재방문 유도 메시지로 충성 고객 확보', grad: 'from-[#7C3AED] to-[#5B21B6]' },
    { metric: '+34%', label: '재방문율 상승', feature: '주간 리포트', who: '이태원 헤어샵', story: '데이터 분석으로 마케팅 전략 최적화', grad: 'from-[#059669] to-[#047857]' },
    { metric: '1,200회', label: 'QR 월 스캔', feature: 'QR 코드 관리', who: '신촌 레스토랑', story: 'QR 쿠폰 하나로 재방문율 2배', grad: 'from-[#DC2626] to-[#B91C1C]' },
    { metric: '28%', label: 'SMS 전환율', feature: 'SMS 마케팅', who: '합정 베이커리', story: '타겟 문자 한 통에 당일 매출 상승', grad: 'from-[#D97706] to-[#B45309]' },
  ]
  const [slideIdx, setSlideIdx] = useState(0)
  const [showSlide, setShowSlide] = useState(true)

  // 자동 슬라이드
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [, forceRender] = useState(0)
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">
        {/* 현재 플랜 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-[#191F28]">스타터 플랜</span>
                {cancelled
                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">해지 예약됨</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">이용 중</span>}
              </div>
              <p className="text-[#8B95A1] text-sm mt-1">월 1,980원</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8B95A1]">다음 결제일</p>
              <p className="text-sm font-semibold text-[#191F28] mt-0.5">{nextBillingDate}</p>
            </div>
          </div>
          {cancelled && (
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-sm">
              <p className="font-semibold text-red-700 mb-1">해지가 예약되었습니다</p>
              <p className="text-red-600 text-xs">{nextBillingDate}까지 이용 · 이후 서비스 종료 · 해지 후 7일 재가입 제한</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#F2F4F6] pt-4">
            <p className="text-xs text-[#8B95A1]">기본 기능: 리뷰 모니터링, 대시보드, 고객 관리</p>
            {!cancelled && (
              <button onClick={() => setShowCancelModal(true)}
                className="text-xs text-red-400 hover:text-red-600 underline transition-colors">해지하기</button>
            )}
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#191F28]">결제 수단</h3>
            <span className="text-xs text-[#8B95A1]">토스페이먼츠 보안 결제</span>
          </div>
          {paymentMethod ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CARD</span>
                </div>
                <div>
                  <p className="font-semibold text-[#191F28] text-sm">{paymentMethod.cardName}</p>
                  <p className="text-xs text-[#8B95A1]">**** **** **** {paymentMethod.last4}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors">
                변경
              </button>
            </div>
          ) : (
            <button onClick={() => setShowPaymentModal(true)}
              className="w-full py-4 rounded-xl border-2 border-dashed border-[#E5E8EB] text-sm font-medium text-[#3182F6] hover:border-[#3182F6] hover:bg-[#EFF6FF] transition-colors">
              + 카드 등록하기
            </button>
          )}
        </div>

        {/* 추가 기능 목록 */}
        <div>
          <h3 className="font-bold text-[#191F28] mb-3">추가 기능</h3>
          <div className="space-y-3">
            {FEATURES.map(feature => {
              const inCart = cart.includes(feature.id)
              return (
                <div key={feature.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0"
                      style={{ background: feature.bg, color: feature.color }}>
                      {feature.short}
                    </div>
                    <div>
                      <p className="font-semibold text-[#191F28] text-sm">{feature.name}</p>
                      <p className="text-xs text-[#8B95A1] mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-[#3182F6]">+{feature.price.toLocaleString()}원/월</span>
                    <button onClick={() => inCart ? removeFromCart(feature.id) : addToCart(feature.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${inCart ? 'bg-[#F2F4F6] text-[#4E5968]' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
                      {inCart ? '취소' : '추가'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 우측: 장바구니 + 성과 쇼케이스 */}
      <div className="w-72 flex-shrink-0 hidden lg:block space-y-4">
        {/* 장바구니 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#191F28] mb-4 flex items-center gap-2">
            선택 기능
            {cart.length > 0 && (
              <span className="text-[10px] bg-[#3182F6] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cart.length}
              </span>
            )}
          </h3>
          {cart.length === 0 ? (
            <p className="text-sm text-[#8B95A1] text-center py-4">기능을 선택하면 여기 표시됩니다</p>
          ) : (
            <>
              <div className="space-y-2.5 mb-4">
                {cartFeatures.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black" style={{ background: f.bg, color: f.color }}>{f.short}</span>
                      <span className="text-[#191F28] font-medium text-xs">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#4E5968] text-xs">{f.price.toLocaleString()}원</span>
                      <button onClick={() => removeFromCart(f.id)} className="text-[#B0B8C1] hover:text-red-400 transition-colors text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#F2F4F6] pt-3 mb-3 space-y-1.5">
                <div className="flex justify-between text-xs text-[#8B95A1]">
                  <span>기본 플랜</span><span>1,980원</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>3개 이상 할인 10%</span><span>-{discount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#191F28] pt-1 border-t border-[#F2F4F6]">
                  <span>월 합계</span>
                  <span className="text-[#3182F6]">{(1980 + cartTotal - discount).toLocaleString()}원</span>
                </div>
              </div>
              {cart.length >= 3 && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3 text-center font-semibold">3개 이상 추가 시 10% 할인!</p>
              )}
              <button className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">
                추가 신청하기
              </button>
            </>
          )}
        </div>

        {/* 성과 쇼케이스 — 파노라마 슬라이드 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-[#8B95A1] mb-3 uppercase tracking-wider">로컬루션 성과</p>
          <ShowcaseCarousel items={SHOWCASE} />
        </div>
      </div>

      {/* 해지 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-[#191F28] text-lg mb-2">정말 해지하시겠어요?</h3>
            <div className="bg-red-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <p className="text-[#4E5968]"><strong>{nextBillingDate}</strong>까지 서비스 이용 가능</p>
              <p className="text-[#4E5968]">해지 후 <strong>7일간</strong> 재가입 불가</p>
              <p className="text-[#4E5968]">다음 달부터 자동 결제 중단</p>
              <p className="text-[#4E5968]">데이터는 30일간 보관 후 삭제</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-sm font-semibold text-[#4E5968]">취소</button>
              <button onClick={() => { setCancelled(true); setCancelledAt(new Date()); setShowCancelModal(false) }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">해지 확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 카드 등록 모달 */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#191F28] text-lg">카드 등록</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[#8B95A1] text-xl">✕</button>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">카드 번호</label>
                <input type="text" value={cardForm.number}
                  onChange={e => setCardForm(p => ({ ...p, number: e.target.value }))}
                  placeholder="0000 0000 0000 0000"
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">유효기간</label>
                  <input type="text" placeholder="MM/YY" value={cardForm.expiry}
                    onChange={e => setCardForm(p => ({ ...p, expiry: e.target.value }))}
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">생년월일</label>
                  <input type="password" placeholder="6자리" value={cardForm.birth}
                    onChange={e => setCardForm(p => ({ ...p, birth: e.target.value }))}
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
                </div>
              </div>
            </div>
            <button
              onClick={() => { setPaymentMethod({ cardName: '신한카드', last4: cardForm.number.replace(/\s/g, '').slice(-4) || '1234' }); setShowPaymentModal(false) }}
              disabled={!cardForm.number || !cardForm.expiry}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${!cardForm.number || !cardForm.expiry ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
              카드 등록하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 성과 쇼케이스 캐러셀 ──────────────────────
function ShowcaseCarousel({ items }: { items: Array<{ metric: string; label: string; feature: string; who: string; story: string; grad: string }> }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  // 자동 슬라이드 3.8초마다
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      const t = setInterval(() => {
        setVisible(false)
        setTimeout(() => { setIdx(i => (i + 1) % items.length); setVisible(true) }, 380)
      }, 3800)
      return () => clearInterval(t)
    })
  }

  const s = items[idx]

  return (
    <div>
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.38s ease, transform 0.38s ease',
      }}>
        <div className={`bg-gradient-to-br ${s.grad} rounded-xl p-4 text-white mb-3`}>
          <p className="text-3xl font-black mb-0.5">{s.metric}</p>
          <p className="text-sm opacity-80">{s.label}</p>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold">{s.feature}</span>
        </div>
        <p className="text-xs font-semibold text-[#191F28] mb-1">{s.who}</p>
        <p className="text-xs text-[#8B95A1] leading-relaxed">{s.story}</p>
      </div>
      {/* 도트 네비게이션 */}
      <div className="flex justify-center gap-1.5 mt-4">
        {items.map((_, i) => (
          <button key={i} onClick={() => { setIdx(i); setVisible(true) }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? '16px' : '6px',
              height: '6px',
              background: i === idx ? '#3182F6' : '#E5E8EB',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── 메인 ────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('매장 정보')

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8 pr-16 md:pr-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">설정</h1>
          <p className="text-[#8B95A1] mt-1">서비스 환경을 설정하세요</p>
        </div>

        <div className="flex gap-1 mb-8 bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-[#3182F6] text-white' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === '매장 정보' && <StoreTab />}
        {activeTab === '알림 설정' && <NotifyTab />}
        {activeTab === 'AI 설정' && <AITab />}
        {activeTab === '연동 관리' && <ConnectTab />}
        {activeTab === '플랜 관리' && <PlanTab />}

        <Footer />
      </main>
    </div>
  )
}
