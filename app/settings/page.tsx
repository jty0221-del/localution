'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'

const TABS = [
  { id: 'store',   label: '매장 정보', icon: '🏪' },
  { id: 'notify',  label: '알림 설정', icon: '🔔' },
  { id: 'ai',      label: 'AI 설정',   icon: '🤖' },
  { id: 'connect', label: '연동 관리', icon: '🔗' },
  { id: 'plan',    label: '플랜 관리', icon: '💳' },
]

function Toggle({ value, onChange }: { value: boolean, onChange: () => void }) {
  return (
    <button onClick={onChange} className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

function StoreTab() {
  const [form, setForm] = useState({ name: '우리 가게', category: '음식점', address: '서울시 마포구 합정동 123-45', phone: '02-1234-5678', hours: '09:00 - 21:00', holiday: '매주 월요일', desc: '신선한 재료로 만드는 건강한 한식 전문점입니다.', naverUrl: '', kakaoUrl: '', instagram: '' })
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const F = ({ label, k, placeholder, area }: any) => (
    <div className={area ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-semibold text-[#191F28] mb-1.5">{label}</label>
      {area ? <textarea value={(form as any)[k]} onChange={e => setForm({...form, [k]: e.target.value})} placeholder={placeholder} rows={3} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] resize-none" /> : <input value={(form as any)[k]} onChange={e => setForm({...form, [k]: e.target.value})} placeholder={placeholder} className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6]" />}
    </div>
  )
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">기본 정보</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <F label="매장명" k="name" placeholder="매장 이름" />
          <F label="업종" k="category" placeholder="업종" />
          <F label="주소" k="address" placeholder="도로명 주소" area />
          <F label="전화번호" k="phone" placeholder="02-0000-0000" />
          <F label="영업시간" k="hours" placeholder="09:00 - 21:00" />
          <F label="휴무일" k="holiday" placeholder="매주 월요일" />
          <F label="매장 소개" k="desc" placeholder="매장을 소개해주세요" area />
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">SNS 연결</h3>
        <div className="space-y-4">
          <F label="네이버 플레이스 URL" k="naverUrl" placeholder="https://map.naver.com/..." />
          <F label="카카오맵 URL" k="kakaoUrl" placeholder="https://place.map.kakao.com/..." />
          <F label="인스타그램 ID" k="instagram" placeholder="@username" />
        </div>
      </div>
      <button onClick={save} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-[#00C471] text-white' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
        {saved ? '✅ 저장완료!' : '변경사항 저장'}
      </button>
    </div>
  )
}

function NotifyTab() {
  const [s, setS] = useState({ newReview: true, badReview: true, noReply: true, newCustomer: false, weekly: true, monthly: true, kakao: true, email: false, sms: false })
  const T = ({ k, label, desc }: any) => (
    <div className="flex items-center justify-between py-4 border-b border-[#F2F4F6] last:border-0">
      <div><div className="font-semibold text-[#191F28] text-sm">{label}</div>{desc && <div className="text-xs text-[#8B95A1] mt-0.5">{desc}</div>}</div>
      <Toggle value={(s as any)[k]} onChange={() => setS(prev => ({...prev, [k]: !(prev as any)[k]}))} />
    </div>
  )
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-[#191F28] mb-2">리뷰 알림</h3><T k="newReview" label="새 리뷰" desc="새 리뷰 등록 시 즉시 알림" /><T k="badReview" label="부정 리뷰 긴급" desc="별점 3점 이하 즉시 알림" /><T k="noReply" label="미답변 리마인더" desc="24시간 미답변 시 알림" /></div>
      <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-[#191F28] mb-2">고객/리포트</h3><T k="newCustomer" label="신규 고객" desc="첫 방문 고객 등록 시" /><T k="weekly" label="주간 리포트" desc="매주 월요일 오전 9시" /><T k="monthly" label="월간 리포트" desc="매월 1일 오전 9시" /></div>
      <div className="bg-white rounded-2xl p-6 shadow-sm"><h3 className="font-bold text-[#191F28] mb-2">알림 수단</h3><T k="kakao" label="카카오톡" desc="카카오 비즈메시지" /><T k="email" label="이메일" /><T k="sms" label="SMS" desc="건당 요금 발생" /></div>
    </div>
  )
}

function AITab() {
  const [tone, setTone] = useState('friendly')
  const [autoReply, setAutoReply] = useState(false)
  const [threshold, setThreshold] = useState(4)
  const [lang, setLang] = useState('ko')
  const [prompt, setPrompt] = useState('')
  const TONES = [
    { id: 'friendly', label: '친근한 😊',    example: '감사합니다! 다음에 또 와주세요 😊' },
    { id: 'formal',   label: '공손한 🎩',    example: '소중한 리뷰 감사드립니다.' },
    { id: 'warm',     label: '따뜻한 🙏',    example: '진심으로 감사드려요 🙏' },
    { id: 'pro',      label: '전문적 💼',    example: '고객님의 의견에 깊이 감사드립니다.' },
  ]
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">AI 답변 톤앤매너</h3>
        <div className="grid grid-cols-2 gap-3">
          {TONES.map(t => (
            <button key={t.id} onClick={() => setTone(t.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${tone === t.id ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB]'}`}>
              <div className="font-bold text-[#191F28] text-sm mb-2">{t.label}</div>
              <div className="text-xs text-[#4E5968] bg-[#F2F4F6] rounded-lg p-2 italic">"{t.example}"</div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div><h3 className="font-bold text-[#191F28]">자동 답변</h3><p className="text-xs text-[#8B95A1]">조건에 맞는 리뷰에 AI가 자동 답변</p></div>
          <Toggle value={autoReply} onChange={() => setAutoReply(v => !v)} />
        </div>
        {autoReply && (
          <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-4">
            <div className="text-sm font-semibold mb-2">별점 <span className="text-[#3182F6]">{threshold}점</span> 이상 자동 답변</div>
            <input type="range" min={3} max={5} value={threshold} onChange={e => setThreshold(+e.target.value)} className="w-full accent-[#3182F6]" />
            <div className="flex justify-between text-xs text-[#8B95A1] mt-1"><span>3점 이상</span><span>4점 이상</span><span>5점만</span></div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-3">답변 언어</h3>
        <div className="flex gap-3">
          {[{id:'ko',label:'🇰🇷 한국어'},{id:'en',label:'🌐 영어 포함'},{id:'auto',label:'🤖 자동 감지'}].map(l => (
            <button key={l.id} onClick={() => setLang(l.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 ${lang===l.id?'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]':'border-[#E5E8EB] text-[#4E5968]'}`}>{l.label}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-2">커스텀 지침</h3>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="예: 항상 재방문 혜택을 언급해주세요." className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] resize-none" />
      </div>
      <button className="w-full py-3.5 bg-[#3182F6] text-white rounded-xl font-bold text-sm hover:bg-[#1B64DA]">AI 설정 저장</button>
    </div>
  )
}

function ConnectTab() {
  const [conn, setConn] = useState({ instagram: false })
  const SERVICES = [
    { id: 'naver',    label: '네이버 플레이스',  emoji: '🟢', desc: 'AI 리뷰 답변 자동화',   status: '곧 출시' },
    { id: 'google',   label: '구글 마이비즈니스', emoji: '🔵', desc: '구글 리뷰 통합 관리',   status: '곧 출시' },
    { id: 'kakao',    label: '카카오맵',          emoji: '🟡', desc: '카카오 리뷰 관리',      status: '곧 출시' },
    { id: 'baemin',   label: '배달의민족',        emoji: '🟢', desc: '배달 리뷰 모니터링',    status: '베타' },
    { id: 'coupang',  label: '쿠팡이츠',          emoji: '🔴', desc: '쿠팡 리뷰 연동',        status: '베타' },
    { id: 'instagram',label: '인스타그램',        emoji: '🟣', desc: 'DM + 게시물 예약',      status: '연동 가능' },
  ]
  return (
    <div className="space-y-3">
      {SERVICES.map(s => (
        <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F2F4F6] flex items-center justify-center text-2xl">{s.emoji}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#191F28]">{s.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.status==='연동 가능'?'bg-green-100 text-green-700':s.status==='베타'?'bg-orange-100 text-orange-700':'bg-gray-100 text-gray-500'}`}>{s.status}</span>
              </div>
              <div className="text-xs text-[#8B95A1] mt-0.5">{s.desc}</div>
            </div>
          </div>
          <button onClick={() => s.status==='연동 가능' && setConn(c=>({...c,[s.id]:!(c as any)[s.id]}))}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${(conn as any)[s.id]?'bg-[#F2F4F6] text-[#8B95A1]':s.status==='연동 가능'?'bg-[#3182F6] text-white':'bg-[#F2F4F6] text-[#C9CDD2] cursor-not-allowed'}`}>
            {(conn as any)[s.id]?'연결됨 ✓':s.status==='연동 가능'?'연동하기':'준비 중'}
          </button>
        </div>
      ))}
    </div>
  )
}

function PlanTab() {
  const FEATURES = [
    { name: 'AI 리뷰 답변', price: 990,  active: true,  icon: '✍️' },
    { name: 'QR 관리',      price: 990,  active: true,  icon: '📱' },
    { name: '고객 CRM',     price: 1490, active: false, icon: '👥' },
    { name: 'AI 마케팅',    price: 1990, active: false, icon: '📣' },
    { name: '매장 분석',    price: 1490, active: false, icon: '📊' },
    { name: '커뮤니티 광고',price: 4900, active: false, icon: '📢' },
  ]
  const total = FEATURES.filter(f => f.active).reduce((s, f) => s + f.price, 0)
  return (
    <div className="space-y-4">
      <div className="bg-[#EFF6FF] rounded-2xl p-6 border border-[#BFDBFE]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-bold text-[#3182F6] mb-1">현재 구독</div>
            <div className="text-3xl font-bold text-[#191F28]">월 {total.toLocaleString()}원</div>
            <div className="text-sm text-[#4E5968] mt-1">2개 기능 이용 중</div>
          </div>
          <span className="text-4xl">💼</span>
        </div>
        <div className="text-xs text-[#8B95A1]">다음 결제일: 2026년 5월 13일</div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">기능별 구독 관리</h3>
        <div className="space-y-3">
          {FEATURES.map(f => (
            <div key={f.name} className="flex items-center justify-between py-2 border-b border-[#F2F4F6] last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <div><div className="font-semibold text-[#191F28] text-sm">{f.name}</div><div className="text-xs text-[#8B95A1]">월 {f.price.toLocaleString()}원</div></div>
              </div>
              <div className="flex items-center gap-2">
                {f.active && <span className="text-xs bg-[#EFF6FF] text-[#3182F6] px-2 py-0.5 rounded-full font-bold">이용 중</span>}
                <button className={`text-xs px-3 py-1.5 rounded-xl font-bold ${f.active?'bg-[#FFF0F0] text-[#FF3B30]':'bg-[#3182F6] text-white'}`}>{f.active?'해지':'추가'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-3">결제 수단</h3>
        <div className="flex items-center gap-3 p-4 bg-[#F2F4F6] rounded-xl">
          <span className="text-2xl">💳</span>
          <div><div className="font-semibold text-sm text-[#191F28]">신한카드 ****-1234</div><div className="text-xs text-[#8B95A1]">기본 결제 수단</div></div>
          <button className="ml-auto text-xs text-[#3182F6] font-bold">변경</button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('store')
  const CONTENT: Record<string, JSX.Element> = { store: <StoreTab />, notify: <NotifyTab />, ai: <AITab />, connect: <ConnectTab />, plan: <PlanTab /> }
  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] px-4 md:px-8 pb-8">
        <TopBar />
        <p className="text-[#8B95A1] mb-6">매장 정보와 서비스를 관리해요</p>
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab===tab.id?'bg-[#3182F6] text-white':'text-[#4E5968] hover:bg-[#F2F4F6]'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="max-w-2xl">{CONTENT[activeTab]}</div>
      </main>
    </div>
  )
}
