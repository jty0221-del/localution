'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'

const TABS = ['매장 정보', '알림 설정', 'AI 설정', '연동 관리', '플랜 관리'] as const
type Tab = typeof TABS[number]

const FEATURES = [
  { id: 'ai-review', name: 'AI 리뷰 자동 답변', price: 9900, icon: '🤖', desc: '리뷰에 AI가 자동으로 답변' },
  { id: 'report', name: '주간 리포트', price: 4900, icon: '📊', desc: '매주 성과 분석 리포트 발송' },
  { id: 'crm', name: 'CRM 고객 관리', price: 14900, icon: '👥', desc: '고객 DB 관리 및 재방문 유도' },
  { id: 'qr', name: 'QR 코드 관리', price: 4900, icon: '📱', desc: 'QR 코드 생성 및 스캔 분석' },
  { id: 'sms', name: 'SMS 마케팅', price: 19900, icon: '💬', desc: '타겟 고객 문자 발송' },
  { id: 'spotlight', name: '커뮤니티 우선 노출', price: 9900, icon: '📢', desc: '로컬루션 커뮤니티 상단 노출' },
]

// ─── Toggle 컴포넌트 ─────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

// ─── 매장 정보 탭 ────────────────────────
function StoreTab() {
  const [form, setForm] = useState({
    name: '우리 카페', category: '카페·베이커리',
    phone: '02-1234-5678', address: '서울시 마포구 합정동 123-4',
    naverUrl: '', desc: ''
  })
  const [saved, setSaved] = useState(false)

  const fields = [
    { key: 'name', label: '매장명' },
    { key: 'category', label: '업종' },
    { key: 'phone', label: '전화번호' },
    { key: 'address', label: '주소' },
    { key: 'naverUrl', label: '네이버 플레이스 URL', placeholder: 'https://naver.me/...' },
  ] as const

  return (
    <div className="max-w-xl space-y-5">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-[#191F28] mb-2">{f.label}</label>
          <input
            value={form[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            placeholder={'placeholder' in f ? f.placeholder : ''}
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
          />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-[#191F28] mb-2">매장 소개</label>
        <textarea
          value={form.desc}
          onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
          rows={3}
          placeholder="매장을 소개하는 한 줄 문구를 입력하세요"
          className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-none"
        />
      </div>
      <button
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}
      >
        {saved ? '✅ 저장됨' : '저장하기'}
      </button>
    </div>
  )
}

// ─── 알림 설정 탭 ────────────────────────
function NotifyTab() {
  const [alerts, setAlerts] = useState({ review: true, customer: true, report: false, payment7: true, payment3: true })
  const [channels, setChannels] = useState({ kakao: true, email: false, sms: false })
  const [payChannels, setPayChannels] = useState({ kakao: true, email: true, sms: false })

  const toggleAlert = (key: keyof typeof alerts) => setAlerts(p => ({ ...p, [key]: !p[key] }))
  const toggleChannel = (key: keyof typeof channels) => setChannels(p => ({ ...p, [key]: !p[key] }))
  const togglePayCh = (key: keyof typeof payChannels) => setPayChannels(p => ({ ...p, [key]: !p[key] }))

  const CH_LABELS = [
    { key: 'kakao' as const, label: '카카오톡', icon: '💬' },
    { key: 'email' as const, label: '이메일', icon: '📧' },
    { key: 'sms' as const, label: 'SMS', icon: '📱' },
  ]

  return (
    <div className="max-w-xl space-y-6">
      {/* 알림 종류 */}
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

      {/* 결제 알림 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-[#3182F6]">
        <h3 className="font-bold text-[#191F28] mb-1">💳 결제 알림</h3>
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
              <button
                key={ch.key}
                onClick={() => togglePayCh(ch.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${payChannels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}
              >
                <span>{ch.icon}</span>{ch.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 알림 채널 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">기본 알림 채널</h3>
        <div className="flex gap-2 flex-wrap">
          {CH_LABELS.map(ch => (
            <button
              key={ch.key}
              onClick={() => toggleChannel(ch.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${channels[ch.key] ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#8B95A1]'}`}
            >
              <span>{ch.icon}</span>{ch.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── AI 설정 탭 ─────────────────────────
function AITab() {
  const [tone, setTone] = useState('friendly')
  const [length, setLength] = useState('medium')
  const [autoReply, setAutoReply] = useState(false)
  const [keyword, setKeyword] = useState('')

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">AI 답변 톤</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'friendly', label: '친근하게', icon: '😊' },
            { value: 'formal', label: '정중하게', icon: '🤝' },
            { value: 'casual', label: '캐주얼하게', icon: '✌️' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setTone(opt.value)}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${tone === opt.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#3182F6]'}`}>
              <div className="text-2xl mb-1">{opt.icon}</div>
              <div className="text-sm font-medium text-[#191F28]">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-[#191F28] mb-4">답변 길이</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'short', label: '짧게', desc: '1~2줄' },
            { value: 'medium', label: '보통', desc: '3~4줄' },
            { value: 'long', label: '길게', desc: '5줄 이상' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setLength(opt.value)}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${length === opt.value ? 'border-[#3182F6] bg-[#EFF6FF]' : 'border-[#E5E8EB] hover:border-[#3182F6]'}`}>
              <div className="text-sm font-semibold text-[#191F28]">{opt.label}</div>
              <div className="text-xs text-[#8B95A1] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-[#191F28]">자동 답변</p>
            <p className="text-xs text-[#8B95A1] mt-0.5">새 리뷰에 AI가 자동으로 답변을 달아요</p>
          </div>
          <Toggle checked={autoReply} onChange={setAutoReply} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#191F28] mb-2">필수 포함 키워드</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="예: 감사합니다, 방문 감사"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          <p className="text-xs text-[#8B95A1] mt-1.5">쉼표로 구분하면 여러 개 입력 가능해요</p>
        </div>
      </div>
    </div>
  )
}

// ─── 연동 관리 탭 ────────────────────────
function ConnectTab() {
  const [connected, setConnected] = useState({ naver: true, google: false, kakao: true })
  const [tossKey, setTossKey] = useState({ client: '', secret: '' })
  const [tossSaved, setTossSaved] = useState(false)
  const [tossMode, setTossMode] = useState<'test' | 'live'>('test')

  const toggleConnect = (key: keyof typeof connected) =>
    setConnected(p => ({ ...p, [key]: !p[key] }))

  const saveToss = () => {
    if (!tossKey.client || !tossKey.secret) return
    setTossSaved(true)
    setTimeout(() => setTossSaved(false), 2500)
  }

  return (
    <div className="max-w-xl space-y-5">
      {[
        { key: 'naver' as const, label: '네이버 플레이스', icon: '🟢', desc: '네이버 리뷰 연동' },
        { key: 'google' as const, label: '구글 비즈니스', icon: '🔵', desc: '구글 리뷰 연동' },
        { key: 'kakao' as const, label: '카카오 채널', icon: '🟡', desc: '카카오 알림톡 발송' },
      ].map(s => (
        <div key={s.key} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2F4F6] flex items-center justify-center text-xl">{s.icon}</div>
            <div>
              <p className="font-semibold text-[#191F28] text-sm">{s.label}</p>
              <p className="text-xs text-[#8B95A1]">{s.desc}</p>
            </div>
          </div>
          <button onClick={() => toggleConnect(s.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${connected[s.key] ? 'bg-green-100 text-green-700' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
            {connected[s.key] ? '✅ 연동됨' : '연동하기'}
          </button>
        </div>
      ))}

      {/* 토스페이먼츠 설정 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-[#E5E8EB]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">💳</div>
          <div>
            <p className="font-bold text-[#191F28]">토스페이먼츠 연동</p>
            <p className="text-xs text-[#8B95A1]">정기결제(빌링) API 키 설정</p>
          </div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">준비 중</span>
        </div>

        {/* 모드 선택 */}
        <div className="flex gap-2 mb-4">
          {(['test', 'live'] as const).map(m => (
            <button key={m} onClick={() => setTossMode(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tossMode === m ? (m === 'live' ? 'bg-red-500 text-white' : 'bg-[#3182F6] text-white') : 'bg-[#F2F4F6] text-[#4E5968]'}`}>
              {m === 'test' ? '🧪 테스트 모드' : '🔴 라이브 모드'}
            </button>
          ))}
        </div>

        {tossMode === 'live' && (
          <div className="mb-4 p-3 bg-red-50 rounded-xl text-xs text-red-700">
            ⚠️ 라이브 모드에서는 실제 결제가 발생합니다. 반드시 테스트를 완료한 후 전환하세요.
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-[#4E5968] mb-1.5">
              클라이언트 키 ({tossMode === 'test' ? 'test_ck_...' : 'live_ck_...'})
            </label>
            <input
              type="text"
              value={tossKey.client}
              onChange={e => setTossKey(p => ({ ...p, client: e.target.value }))}
              placeholder={tossMode === 'test' ? 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97E0oXjM7' : 'live_ck_...'}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4E5968] mb-1.5">
              시크릿 키 ({tossMode === 'test' ? 'test_sk_...' : 'live_sk_...'})
            </label>
            <input
              type="password"
              value={tossKey.secret}
              onChange={e => setTossKey(p => ({ ...p, secret: e.target.value }))}
              placeholder={tossMode === 'test' ? 'test_sk_...' : 'live_sk_...'}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors"
            />
          </div>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-xl text-xs text-[#3182F6] space-y-1">
          <p className="font-semibold">📋 연동 준비사항</p>
          <p>1. 토스페이먼츠 개발자센터 (developers.tosspayments.com) 가입</p>
          <p>2. 정기결제(빌링) 서비스 신청 및 심사 완료</p>
          <p>3. 웹훅 URL 등록: <span className="font-mono">https://localution.co.kr/api/payments/webhook</span></p>
          <p>4. 구현 필요: API 라우트 /api/payments/billing-key, /api/payments/subscribe</p>
        </div>

        <button onClick={saveToss}
          disabled={!tossKey.client || !tossKey.secret}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${tossSaved ? 'bg-green-500 text-white' : !tossKey.client || !tossKey.secret ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
          {tossSaved ? '✅ 저장됨' : '키 저장하기'}
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
  const basePrice = 1980

  const canResubscribe = !cancelledAt ||
    (Date.now() - cancelledAt.getTime() > 7 * 24 * 60 * 60 * 1000)

  const handleCancel = () => {
    setCancelled(true)
    setCancelledAt(new Date())
    setShowCancelModal(false)
  }

  const handleCardRegister = () => {
    setPaymentMethod({ cardName: '신한카드', last4: cardForm.number.slice(-4) || '1234' })
    setCardForm({ number: '', expiry: '', birth: '', pwd: '' })
    setShowPaymentModal(false)
  }

  return (
    <div className="flex gap-6 items-start">
      {/* 좌측 메인 */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* 현재 플랜 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-[#191F28]">스타터 플랜</span>
                {cancelled ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">해지 예약됨</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">이용 중</span>
                )}
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
              <p className="font-semibold text-red-700 mb-1">⚠️ 해지가 예약되었습니다</p>
              <p className="text-red-600 text-xs">{nextBillingDate}까지 이용 가능 · 이후 서비스 종료</p>
              <p className="text-red-400 text-xs mt-1">해지 후 7일간 재가입 제한됩니다</p>
              {!canResubscribe && (
                <p className="text-xs text-red-500 mt-1 font-medium">🔒 재가입 가능까지 D-7</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#F2F4F6] pt-4">
            <p className="text-xs text-[#8B95A1]">기본 기능: 리뷰 모니터링, 대시보드, 고객 관리</p>
            {!cancelled && (
              <button onClick={() => setShowCancelModal(true)}
                className="text-xs text-red-400 hover:text-red-600 underline transition-colors">
                해지하기
              </button>
            )}
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#191F28]">💳 결제 수단</h3>
            <span className="text-xs text-[#8B95A1] flex items-center gap-1">
              <span>🔒</span> 토스페이먼츠 보안 결제
            </span>
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

          <p className="text-xs text-[#8B95A1] mt-3">
            카드를 등록하면 매월 자동으로 결제됩니다. 토스페이먼츠의 보안 시스템으로 안전하게 처리돼요.
          </p>
        </div>

        {/* 추가 기능 목록 */}
        <div>
          <h3 className="font-bold text-[#191F28] mb-3">⚡ 추가 기능</h3>
          <div className="space-y-3">
            {FEATURES.map(feature => {
              const inCart = cart.includes(feature.id)
              return (
                <div key={feature.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F2F4F6] flex items-center justify-center text-xl flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-[#191F28] text-sm">{feature.name}</p>
                      <p className="text-xs text-[#8B95A1] mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-[#3182F6]">+{feature.price.toLocaleString()}원/월</span>
                    <button onClick={() => inCart ? removeFromCart(feature.id) : addToCart(feature.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${inCart ? 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
                      {inCart ? '취소' : '+ 추가'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 우측 장바구니 */}
      <div className="w-72 flex-shrink-0 hidden lg:block">
        <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-8">
          <h3 className="font-bold text-[#191F28] mb-4 flex items-center gap-2">
            🛒 선택 기능
            {cart.length > 0 && (
              <span className="text-xs bg-[#3182F6] text-white rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </h3>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🛍️</p>
              <p className="text-sm text-[#8B95A1]">추가할 기능을 선택해보세요</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {cartFeatures.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="flex-shrink-0">{f.icon}</span>
                      <span className="text-[#191F28] font-medium truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[#4E5968] text-xs">{f.price.toLocaleString()}원</span>
                      <button onClick={() => removeFromCart(f.id)}
                        className="text-[#8B95A1] hover:text-red-500 transition-colors">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#F2F4F6] pt-3 mb-4 space-y-1.5">
                <div className="flex justify-between text-xs text-[#8B95A1]">
                  <span>기본 플랜</span><span>{basePrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-xs text-[#8B95A1]">
                  <span>추가 기능</span><span>+{cartTotal.toLocaleString()}원</span>
                </div>
                {cart.length >= 3 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>🎉 3개 이상 할인</span><span>-{Math.floor(cartTotal * 0.1).toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#191F28] pt-1 border-t border-[#F2F4F6] mt-1">
                  <span>월 합계</span>
                  <span className="text-[#3182F6]">
                    {(cart.length >= 3
                      ? basePrice + cartTotal - Math.floor(cartTotal * 0.1)
                      : basePrice + cartTotal
                    ).toLocaleString()}원
                  </span>
                </div>
              </div>
              {cart.length >= 3 && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3 text-center">
                  🎉 3개 이상 추가 시 10% 할인!
                </p>
              )}
              <button className="w-full bg-[#3182F6] text-white font-semibold py-3 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">
                추가 신청하기
              </button>
            </>
          )}
        </div>
      </div>

      {/* 해지 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-[#191F28] text-lg mb-2">⚠️ 정말 해지하시겠어요?</h3>
            <p className="text-sm text-[#4E5968] mb-4">해지하기 전에 아래 내용을 꼭 확인해주세요.</p>
            <div className="bg-[#FFF5F5] rounded-xl p-4 mb-5 space-y-2.5 text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">📅</span>
                <p className="text-[#4E5968]"><strong>{nextBillingDate}</strong>까지 서비스 정상 이용 가능</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">🔒</span>
                <p className="text-[#4E5968]">해지 후 <strong>7일간</strong> 재가입 불가</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">📌</span>
                <p className="text-[#4E5968]">다음 달부터 자동 결제 중단</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">💾</span>
                <p className="text-[#4E5968]">데이터는 30일간 보관 후 삭제</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-sm font-semibold text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                취소
              </button>
              <button onClick={handleCancel}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                해지 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카드 등록 모달 (토스페이먼츠 빌링) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#191F28] text-lg">카드 등록</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[#8B95A1] hover:text-[#191F28] transition-colors text-xl">✕</button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2">
              <span>🔒</span>
              <p className="text-xs text-[#3182F6]">토스페이먼츠 보안 결제로 카드 정보가 안전하게 처리됩니다</p>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-[#4E5968] mb-1.5">카드 번호</label>
                <input
                  type="text"
                  value={cardForm.number}
                  onChange={e => setCardForm(p => ({ ...p, number: e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim() }))}
                  placeholder="0000 0000 0000 0000"
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors tracking-widest"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#4E5968] mb-1.5">유효기간</label>
                  <input
                    type="text"
                    value={cardForm.expiry}
                    onChange={e => setCardForm(p => ({ ...p, expiry: e.target.value }))}
                    placeholder="MM/YY"
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4E5968] mb-1.5">생년월일(법인: 사업자번호)</label>
                  <input
                    type="password"
                    value={cardForm.birth}
                    onChange={e => setCardForm(p => ({ ...p, birth: e.target.value }))}
                    placeholder="6자리"
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4E5968] mb-1.5">카드 비밀번호 앞 2자리</label>
                <input
                  type="password"
                  value={cardForm.pwd}
                  onChange={e => setCardForm(p => ({ ...p, pwd: e.target.value.slice(0, 2) }))}
                  placeholder="**"
                  maxLength={2}
                  className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#3182F6] transition-colors"
                />
              </div>
            </div>

            <div className="text-xs text-[#8B95A1] mb-4 space-y-1">
              <p>✓ 등록한 카드로 매월 자동 결제됩니다</p>
              <p>✓ 카드 정보는 토스페이먼츠 서버에 안전하게 저장됩니다</p>
              <p>✓ 언제든지 결제 수단을 변경하거나 삭제할 수 있습니다</p>
            </div>

            <button onClick={handleCardRegister}
              disabled={!cardForm.number || !cardForm.expiry}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${!cardForm.number || !cardForm.expiry ? 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
              카드 등록하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메인 설정 페이지 ────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('매장 정보')

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">
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
