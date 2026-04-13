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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

interface NaverPlace {
  title: string; link: string; category: string
  telephone: string; address: string; roadAddress: string
  mapx: string; mapy: string
}

// ─── 매장 정보 탭 ────────────────────────────────────────────────
function StoreTab() {
  const [form, setForm] = useState({
    name: '', category: '', phone: '', address: '',
    naverUrl: '', mainKeyword: '', subKeywords: '', desc: '',
  })
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [searchResults, setSearchResults] = useState<NaverPlace[]>([])
  const [showResults, setShowResults] = useState(false)

  const applyPlace = (place: NaverPlace) => {
    setForm(p => ({
      ...p,
      name: place.title,
      category: place.category,
      address: place.roadAddress || place.address,
      phone: place.telephone || p.phone,
      mainKeyword: place.category.split('>').pop()?.trim() || p.mainKeyword,
    }))
    setShowResults(false)
    setSynced(true)
    setTimeout(() => setSynced(false), 4000)
  }

  const handleNaverSync = async () => {
    const query = form.naverUrl.trim() || form.name.trim()
    if (!query) { setSyncError('네이버 플레이스 URL 또는 매장명을 입력해주세요'); return }
    setSyncing(true); setSyncError(''); setShowResults(false)
    try {
      const res = await fetch(`/api/naver-place/search?query=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) { setSyncError(data.error || '연동 실패'); return }
      if (!data.items?.length) { setSyncError('검색 결과 없음. 다른 키워드로 시도해보세요'); return }
      if (data._mock) setSyncError('API 키 미설정 — 테스트 목업 데이터입니다 (Vercel 환경변수 설정 필요)')
      if (data.items.length === 1) { applyPlace(data.items[0]) }
      else { setSearchResults(data.items); setShowResults(true) }
    } catch { setSyncError('네트워크 오류. 잠시 후 다시 시도해주세요') }
    finally { setSyncing(false) }
  }

  const mapAddress = form.address || '서울특별시 마포구 합정동'

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-4">
        {/* 네이버 플레이스 연동 */}
        <div className="bg-[#EFF6FF] rounded-2xl p-4 border border-[#BFDBFE]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#03C75A] flex items-center justify-center text-white text-[10px] font-black">N</div>
            <span className="text-sm font-bold text-[#191F28]">네이버 플레이스 연동</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3182F6] text-white font-semibold">자동 입력</span>
          </div>
          <div className="flex gap-2">
            <input value={form.naverUrl}
              onChange={e => { setForm(p => ({ ...p, naverUrl: e.target.value })); setSyncError(''); setShowResults(false) }}
              placeholder="https://naver.me/... 또는 매장명으로 검색"
              onKeyDown={e => e.key === 'Enter' && handleNaverSync()}
              className="flex-1 border border-[#BFDBFE] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] bg-white transition-colors" />
            <button onClick={handleNaverSync} disabled={syncing}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${synced ? 'bg-green-500 text-white' : syncing ? 'bg-[#93C5FD] text-white cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
              {syncing ? '검색 중...' : synced ? '연동 완료' : '연동하기'}
            </button>
          </div>
          {syncError && <p className="text-xs mt-2 font-medium text-orange-600">{syncError}</p>}
          {synced && !syncError && <p className="text-xs text-green-600 font-semibold mt-2">네이버 플레이스 정보를 가져왔습니다!</p>}
          {showResults && searchResults.length > 0 && (
            <div className="mt-3 bg-white rounded-xl border border-[#BFDBFE] overflow-hidden shadow-md">
              <p className="text-xs font-bold text-[#8B95A1] px-4 py-2 border-b border-[#F2F4F6]">검색 결과 {searchResults.length}개 — 해당 매장 선택</p>
              {searchResults.map((place, i) => (
                <button key={i} onClick={() => applyPlace(place)}
                  className="w-full text-left px-4 py-3 hover:bg-[#EFF6FF] transition-colors border-b border-[#F2F4F6] last:border-0">
                  <p className="text-sm font-semibold text-[#191F28]">{place.title}</p>
                  <p className="text-xs text-[#8B95A1] mt-0.5">{place.category} · {place.roadAddress || place.address}</p>
                  {place.telephone && <p className="text-xs text-[#3182F6] mt-0.5">{place.telephone}</p>}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-[#3182F6] mt-2 opacity-70">URL 붙여넣기 또는 매장명 검색 → 정보 자동 입력</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장명</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="우리 카페"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" /></div>
          <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">업종</label>
            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="카페·베이커리"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" /></div>
        </div>
        <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">전화번호</label>
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="02-1234-5678"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" /></div>
        <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">주소</label>
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="서울시 마포구 합정동 123-4"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" /></div>

        <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">키워드</label>
          <div className="flex gap-2">
            <div className="w-[38%]">
              <input value={form.mainKeyword} onChange={e => setForm(p => ({ ...p, mainKeyword: e.target.value }))} placeholder="메인 키워드"
                className="w-full border-2 border-[#3182F6] rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-[#F8FAFF] font-semibold" />
              <p className="text-[10px] text-[#3182F6] mt-1 font-semibold">메인 키워드 1개</p>
            </div>
            <div className="flex-1">
              <input value={form.subKeywords} onChange={e => setForm(p => ({ ...p, subKeywords: e.target.value }))} placeholder="서브 키워드 (쉼표로 구분)"
                className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
              <p className="text-[10px] text-[#8B95A1] mt-1">여러 개 입력 가능</p>
            </div>
          </div>
          {(form.mainKeyword || form.subKeywords) && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {form.mainKeyword && <span className="text-[11px] px-2.5 py-1 bg-[#3182F6] text-white rounded-full font-bold">#{form.mainKeyword}</span>}
              {form.subKeywords.split(',').filter(k => k.trim()).map(kw => (
                <span key={kw.trim()} className="text-[11px] px-2.5 py-1 bg-[#EFF6FF] text-[#3182F6] rounded-full font-medium">#{kw.trim()}</span>
              ))}
            </div>
          )}
        </div>

        <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">매장 소개</label>
          <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} rows={3}
            placeholder="AI 리뷰 답변 시 참고되는 매장 특징을 입력하세요"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-none" /></div>

        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'}`}>
          {saved ? '저장됨' : '저장하기'}
        </button>
      </div>

      {/* 우측: 카카오맵 */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-8">
          <div className="px-4 pt-4 pb-3 border-b border-[#F2F4F6]">
            <p className="font-bold text-[#191F28] text-sm">우리 매장 위치</p>
            <p className="text-xs text-[#8B95A1] mt-0.5 truncate">{form.address || '주소를 입력하면 지도가 표시됩니다'}</p>
          </div>
          <iframe src={`https://map.kakao.com/link/search/${encodeURIComponent(mapAddress)}`}
            width="100%" height="260" style={{ border: 'none', display: 'block' }} title="매장 위치" loading="lazy" />
          <div className="px-4 py-3 space-y-2">
            <a href={`https://map.kakao.com/link/search/${encodeURIComponent(form.address || mapAddress)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center w-full py-2 rounded-xl bg-[#FEE500] text-[#191F28] text-sm font-bold hover:bg-[#F0D800] transition-colors">
              카카오맵에서 보기
            </a>
            {form.address && (
              <a href={`https://map.naver.com/v5/search/${encodeURIComponent(form.address)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-2 rounded-xl bg-[#03C75A] text-white text-sm font-bold hover:bg-[#02A84A] transition-colors">
                네이버지도에서 보기
              </a>
            )}
          </div>
        </div>
        <div className="bg-[#FFFBEB] rounded-2xl p-4 mt-4 border border-[#FDE68A]">
          <p className="text-xs font-bold text-[#92400E] mb-2">네이버 API 키 설정</p>
          <div className="bg-white rounded-lg p-2 font-mono text-[10px] text-[#4E5968] space-y-1">
            <p>NAVER_CLIENT_ID=발급받은_ID</p>
            <p>NAVER_CLIENT_SECRET=시크릿</p>
          </div>
          <a href="https://developers.naver.com/apps" target="_blank" rel="noopener noreferrer"
            className="block mt-2 text-[11px] text-[#3182F6] hover:underline font-semibold">
            네이버 개발자센터 키 발급 →
          </a>
        </div>
      </div>
    </div>
  )
}

function NotifyTab() {
  const [alerts, setAlerts] = useState({ review: true, customer: true, report: false, payment7: true, payment3: true })
  const [channels, setChannels] = useState({ kakao: true, email: false, sms: false })
  const [payChannels, setPayChannels] = useState({ kakao: true, email: true, sms: false })
  const CH = [{ key: 'kakao' as const, label: '카카오톡' }, { key: 'email' as const, label: '이메일' }, { key: 'sms' as const, label: 'SMS' }]
  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">알림 받을 항목</h3>
        <div className="space-y-4">
          {[{ key: 'review' as const, label: '새 리뷰 알림', desc: '새로운 리뷰가 등록되면 알려드려요' },
            { key: 'customer' as const, label: '신규 고객 알림', desc: '새 고객이 등록되면 알려드려요' },
            { key: 'report' as const, label: '주간 리포트 알림', desc: '매주 월요일 성과 리포트를 발송해요' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-[#191F28]">{item.label}</p><p className="text-xs text-[#8B95A1] mt-0.5">{item.desc}</p></div>
              <Toggle checked={alerts[item.key]} onChange={v => setAlerts(p => ({ ...p, [item.key]: v }))} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-[#3182F6]">
        <h3 className="font-bold text-[#191F28] mb-1">결제 알림</h3>
        <p className="text-xs text-[#8B95A1] mb-5">결제일 전 미리 알림을 받아 놓치지 마세요</p>
        <div className="space-y-4 mb-5">
          {[{ key: 'payment7' as const, label: '결제 7일 전 알림' }, { key: 'payment3' as const, label: '결제 3일 전 알림' }].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#191F28]">{item.label}</p>
              <Toggle checked={alerts[item.key]} onChange={v => setAlerts(p => ({ ...p, [item.key]: v }))} />
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-[#F2F4F6]">
          <p className="text-sm font-medium text-[#191F28] mb-3">결제 알림 채널</p>
          <div className="flex gap-2">
            {CH.map(ch => <button key={ch.key} onClick={() => setPayChannels(p => ({ ...p, [ch.key]: !p[ch.key] }))}
              className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${payChannels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}>{ch.label}</button>)}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">기본 알림 채널</h3>
        <div className="flex gap-2">
          {CH.map(ch => <button key={ch.key} onClick={() => setChannels(p => ({ ...p, [ch.key]: !p[ch.key] }))}
            className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${channels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}>{ch.label}</button>)}
        </div>
      </div>
    </div>
  )
}

function AITab() {
  const [tone, setTone] = useState('friendly')
  const [length, setLength] = useState('medium')
  const [autoReply, setAutoReply] = useState(false)
  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">AI 답변 톤</h3>
        <div className="grid grid-cols-3 gap-3">
          {[{ value: 'friendly', label: '친근하게' }, { value: 'formal', label: '정중하게' }, { value: 'casual', label: '캐주얼하게' }].map(opt => (
            <button key={opt.value} onClick={() => setTone(opt.value)}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${tone === opt.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#3182F6]'}`}>
              <div className="text-sm font-semibold text-[#191F28]">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">답변 길이</h3>
        <div className="grid grid-cols-3 gap-3">
          {[{ value: 'short', label: '짧게', desc: '1~2줄' }, { value: 'medium', label: '보통', desc: '3~4줄' }, { value: 'long', label: '길게', desc: '5줄 이상' }].map(opt => (
            <button key={opt.value} onClick={() => setLength(opt.value)}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${length === opt.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#3182F6]'}`}>
              <div className="text-sm font-semibold text-[#191F28]">{opt.label}</div>
              <div className="text-xs text-[#8B95A1] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div><p className="font-bold text-[#191F28]">자동 답변</p><p className="text-xs text-[#8B95A1] mt-0.5">새 리뷰에 AI가 자동으로 답변을 달아요</p></div>
          <Toggle checked={autoReply} onChange={setAutoReply} />
        </div>
      </div>
    </div>
  )
}

function ConnectTab() {
  const [connected, setConnected] = useState({ naver: true, google: false, kakao: true })
  const [tossKey, setTossKey] = useState({ client: '', secret: '' })
  const [tossSaved, setTossSaved] = useState(false)
  const PLATFORMS = [
    { key: 'naver' as const, label: '네이버 플레이스', short: 'N', bg: '#E8F5E9', color: '#03C75A', desc: '네이버 리뷰 연동' },
    { key: 'google' as const, label: '구글 비즈니스', short: 'G', bg: '#E3F2FD', color: '#4285F4', desc: '구글 리뷰 연동' },
    { key: 'kakao' as const, label: '카카오 채널', short: 'K', bg: '#FFFDE7', color: '#F9A825', desc: '카카오 알림톡 발송' },
  ]
  return (
    <div className="max-w-xl space-y-5">
      {PLATFORMS.map(s => (
        <div key={s.key} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black" style={{ background: s.bg, color: s.color }}>{s.short}</div>
            <div><p className="font-semibold text-[#191F28] text-sm">{s.label}</p><p className="text-xs text-[#8B95A1]">{s.desc}</p></div>
          </div>
          <button onClick={() => setConnected(p => ({ ...p, [s.key]: !p[s.key] }))}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${connected[s.key] ? 'bg-green-100 text-green-700' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
            {connected[s.key] ? '연동됨' : '연동하기'}
          </button>
        </div>
      ))}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-xs font-black text-[#3182F6]">Pay</div>
          <div><p className="font-bold text-[#191F28]">토스페이먼츠 연동</p><p className="text-xs text-[#8B95A1]">정기결제 API 키</p></div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">준비 중</span>
        </div>
        <div className="space-y-3 mb-4">
          <input type="text" value={tossKey.client} onChange={e => setTossKey(p => ({ ...p, client: e.target.value }))}
            placeholder="클라이언트 키 (test_ck_...)"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
          <input type="password" value={tossKey.secret} onChange={e => setTossKey(p => ({ ...p, secret: e.target.value }))}
            placeholder="시크릿 키 (test_sk_...)"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" />
        </div>
        <button onClick={() => { setTossSaved(true); setTimeout(() => setTossSaved(false), 2000) }}
          disabled={!tossKey.client || !tossKey.secret}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${tossSaved ? 'bg-green-500 text-white' : !tossKey.client || !tossKey.secret ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
          {tossSaved ? '저장됨' : '키 저장하기'}
        </button>
      </div>
    </div>
  )
}

// ─── 성과 캐러셀 (useEffect 정상화) ─────────────────────────────
function ShowcaseCarousel({ items }: { items: Array<{ metric: string; label: string; feature: string; who: string; story: string; grad: string }> }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % items.length)
        setVisible(true)
      }, 380)
    }, 3800)
    return () => clearInterval(t)
  }, [items.length])

  const s = items[idx]
  return (
    <div>
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.38s ease, transform 0.38s ease' }}>
        <div className={`bg-gradient-to-br ${s.grad} rounded-xl p-4 text-white mb-3`}>
          <p className="text-3xl font-black mb-0.5">{s.metric}</p>
          <p className="text-sm opacity-80">{s.label}</p>
        </div>
        <p className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold inline-block mb-1">{s.feature}</p>
        <p className="text-xs font-semibold text-[#191F28] mb-0.5">{s.who}</p>
        <p className="text-xs text-[#8B95A1]">{s.story}</p>
      </div>
      <div className="flex justify-center gap-1.5 mt-4">
        {items.map((_, i) => (
          <button key={i} onClick={() => { setIdx(i); setVisible(true) }}
            className="rounded-full transition-all duration-300"
            style={{ width: i === idx ? '16px' : '6px', height: '6px', background: i === idx ? '#3182F6' : '#E5E8EB' }} />
        ))}
      </div>
    </div>
  )
}

function PlanTab() {
  const SHOWCASE = [
    { metric: '98%', label: '리뷰 답변률', feature: 'AI 리뷰 자동 답변', who: '강남구 네일샵', story: 'AI가 쏟아지는 리뷰를 진심 답변으로 처리', grad: 'from-[#3182F6] to-[#1B64DA]' },
    { metric: '+47명', label: '월 신규 고객', feature: 'CRM 고객 관리', who: '홍대 카페', story: '재방문 유도 메시지로 충성 고객 확보', grad: 'from-[#7C3AED] to-[#5B21B6]' },
    { metric: '+34%', label: '재방문율 상승', feature: '주간 리포트', who: '이태원 헤어샵', story: '데이터 기반 전략으로 확실한 성과 확인', grad: 'from-[#059669] to-[#047857]' },
    { metric: '1,200회', label: 'QR 월 스캔', feature: 'QR 코드 관리', who: '신촌 레스토랑', story: 'QR 쿠폰 하나로 재방문율 2배', grad: 'from-[#DC2626] to-[#B91C1C]' },
    { metric: '28%', label: 'SMS 전환율', feature: 'SMS 마케팅', who: '합정 베이커리', story: '타겟 문자 한 통에 당일 매출 상승', grad: 'from-[#D97706] to-[#B45309]' },
  ]
  const [cart, setCart] = useState<string[]>([])
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<{ last4: string } | null>(null)
  const [cardForm, setCardForm] = useState({ number: '', expiry: '' })
  const nextBillingDate = '2025년 2월 14일'
  const cartFeatures = FEATURES.filter(f => cart.includes(f.id))
  const cartTotal = cartFeatures.reduce((sum, f) => sum + f.price, 0)
  const discount = cart.length >= 3 ? Math.floor(cartTotal * 0.1) : 0

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#191F28]">스타터 플랜</span>
                {cancelled ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">해지 예약됨</span>
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
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-xs text-red-600">
              <p className="font-semibold mb-1">해지가 예약되었습니다</p>
              <p>{nextBillingDate}까지 이용 · 해지 후 7일 재가입 제한</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#F2F4F6] pt-4">
            <p className="text-xs text-[#8B95A1]">기본: 리뷰 모니터링, 대시보드, 고객 관리</p>
            {!cancelled && <button onClick={() => setShowCancelModal(true)} className="text-xs text-red-400 hover:text-red-600 underline">해지하기</button>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#191F28]">결제 수단</h3>
            <span className="text-xs text-[#8B95A1]">토스페이먼츠 보안 결제</span>
          </div>
          {paymentMethod
            ? <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center"><span className="text-white text-xs font-bold">CARD</span></div>
                  <p className="text-xs text-[#8B95A1]">**** **** **** {paymentMethod.last4}</p>
                </div>
                <button onClick={() => setShowPaymentModal(true)} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F2F4F6] text-[#4E5968]">변경</button>
              </div>
            : <button onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 rounded-xl border-2 border-dashed border-[#E5E8EB] text-sm font-medium text-[#3182F6] hover:border-[#3182F6] hover:bg-[#EFF6FF] transition-colors">
                + 카드 등록하기
              </button>}
        </div>

        <div>
          <h3 className="font-bold text-[#191F28] mb-3">추가 기능</h3>
          <div className="space-y-3">
            {FEATURES.map(f => {
              const inCart = cart.includes(f.id)
              return (
                <div key={f.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black" style={{ background: f.bg, color: f.color }}>{f.short}</div>
                    <div><p className="font-semibold text-[#191F28] text-sm">{f.name}</p><p className="text-xs text-[#8B95A1]">{f.desc}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#3182F6]">+{f.price.toLocaleString()}원/월</span>
                    <button onClick={() => inCart ? setCart(p => p.filter(i => i !== f.id)) : setCart(p => [...p, f.id])}
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

      <div className="w-72 flex-shrink-0 hidden lg:block space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#191F28] mb-4 flex items-center gap-2">선택 기능
            {cart.length > 0 && <span className="text-[10px] bg-[#3182F6] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">{cart.length}</span>}
          </h3>
          {cart.length === 0
            ? <p className="text-sm text-[#8B95A1] text-center py-4">기능을 선택하면 여기 표시됩니다</p>
            : <>
                <div className="space-y-2.5 mb-4">
                  {cartFeatures.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black" style={{ background: f.bg, color: f.color }}>{f.short}</span>
                        <span className="text-xs font-medium text-[#191F28]">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#4E5968]">{f.price.toLocaleString()}원</span>
                        <button onClick={() => setCart(p => p.filter(i => i !== f.id))} className="text-[#B0B8C1] hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#F2F4F6] pt-3 mb-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-[#8B95A1]"><span>기본 플랜</span><span>1,980원</span></div>
                  {discount > 0 && <div className="flex justify-between text-xs text-green-600 font-medium"><span>10% 할인</span><span>-{discount.toLocaleString()}원</span></div>}
                  <div className="flex justify-between font-bold text-[#191F28] pt-1 border-t border-[#F2F4F6]">
                    <span>월 합계</span><span className="text-[#3182F6]">{(1980 + cartTotal - discount).toLocaleString()}원</span>
                  </div>
                </div>
                {cart.length >= 3 && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3 text-center font-semibold">3개 이상 추가 시 10% 할인!</p>}
                <button className="w-full bg-[#3182F6] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">추가 신청하기</button>
              </>}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-[#8B95A1] mb-3 uppercase tracking-wider">로컬루션 성과</p>
          <ShowcaseCarousel items={SHOWCASE} />
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-[#191F28] text-lg mb-4">정말 해지하시겠어요?</h3>
            <div className="bg-red-50 rounded-xl p-4 mb-5 space-y-2 text-sm text-[#4E5968]">
              <p><strong>{nextBillingDate}</strong>까지 서비스 이용 가능</p>
              <p>해지 후 <strong>7일간</strong> 재가입 불가</p>
              <p>다음 달부터 자동 결제 중단</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-sm font-semibold text-[#4E5968]">취소</button>
              <button onClick={() => { setCancelled(true); setShowCancelModal(false) }} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">해지 확인</button>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-[#191F28] text-lg">카드 등록</h3><button onClick={() => setShowPaymentModal(false)} className="text-[#8B95A1] text-xl">✕</button></div>
            <div className="space-y-4 mb-5">
              <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">카드 번호</label>
                <input type="text" value={cardForm.number} onChange={e => setCardForm(p => ({ ...p, number: e.target.value }))} placeholder="0000 0000 0000 0000"
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" /></div>
              <div><label className="block text-xs font-semibold text-[#4E5968] mb-1.5">유효기간</label>
                <input type="text" placeholder="MM/YY" value={cardForm.expiry} onChange={e => setCardForm(p => ({ ...p, expiry: e.target.value }))}
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors" /></div>
            </div>
            <button onClick={() => { setPaymentMethod({ last4: cardForm.number.replace(/\s/g, '').slice(-4) || '1234' }); setShowPaymentModal(false) }}
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
