'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { COMPANY } from '../lib/company'
import {
  MessageCircle, Wrench, CreditCard, Sparkles, FileText,
  CheckCircle2, ShoppingCart, Mail, Inbox, Plus, LucideIcon,
  Clock, MessageSquare, X, RefreshCw, ArrowRight,
  Headphones, Send, Zap,
} from 'lucide-react'

// ── 전역 keyframe ────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes pulse-dot {
    0%,100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.5); opacity: 0.6; }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes check-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
`

const CATEGORIES: { value: string; label: string; Icon: LucideIcon; color: string }[] = [
  { value: '서비스문의', label: '서비스 문의', Icon: MessageCircle, color: '#3182F6' },
  { value: '기술문의',   label: '기술 문의',   Icon: Wrench,        color: '#8B5CF6' },
  { value: '요금결제',   label: '요금 · 결제', Icon: CreditCard,    color: '#059669' },
  { value: '기능요청',   label: '기능 요청',   Icon: Sparkles,      color: '#F59E0B' },
  { value: '기타',       label: '기타',         Icon: FileText,      color: '#4E5968' },
]

const STORAGE_KEY = 'localution.inquiries_mine'

type InquiryStatus = 'new' | 'replied' | 'completed'

interface MyInquiry {
  id: string
  name: string
  contact: string
  category: string
  message: string
  status: InquiryStatus
  createdAt: string
  reply?: string | null
  repliedAt?: string | null
  completedAt?: string | null
}

const STATUS_META: Record<InquiryStatus, { label: string; bg: string; color: string; icon: LucideIcon }> = {
  new:       { label: '접수 완료', bg: '#FEF3C7', color: '#92400E', icon: Clock },
  replied:   { label: '답변 완료', bg: '#DBEAFE', color: '#1E40AF', icon: MessageSquare },
  completed: { label: '처리 완료', bg: '#D1FAE5', color: '#065F46', icon: CheckCircle2 },
}

function loadMine(): MyInquiry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function saveMine(list: MyInquiry[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50))) } catch {}
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── FAQ ────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)
  const faqs = [
    { q: '무료 체험이 있나요?', a: '네, 베타 테스트 기간 동안 전 기능을 100% 무료로 사용하실 수 있어요. 카드 등록 없이 바로 시작 가능합니다.' },
    { q: '요금제는 어떻게 구성되나요?', a: '필요한 기능만 골라 담는 모듈형입니다. 3개 이상 선택 시 최대 20% 번들 할인이 자동 적용돼요.' },
    { q: '해지는 언제든 가능한가요?', a: '월 단위 구독이며 언제든 해지할 수 있습니다. 해지 즉시 다음 결제일부터 과금이 중단돼요.' },
    { q: '세금계산서 발행되나요?', a: '네, 사업자 회원은 매월 자동으로 전자세금계산서가 발행됩니다. 홈택스 연동도 지원해요.' },
    { q: '매장이 여러 개여도 쓸 수 있나요?', a: '다중 매장 관리 기능으로 한 계정에서 여러 지점을 통합 운영할 수 있어요. 마케팅 대행사용 멀티 클라이언트 모드도 제공합니다.' },
    { q: '기존 데이터 이관이 가능한가요?', a: '기존 리뷰·고객 데이터 CSV 임포트를 지원합니다. 도입 담당자가 이관 과정을 직접 도와드려요.' },
  ]
  return (
    <aside className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E8EB] shadow-sm lg:sticky lg:top-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
          <MessageCircle size={15} strokeWidth={2} className="text-[#3182F6]" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-black text-[#191F28]">자주 묻는 질문</h2>
          <p className="text-[10px] text-[#8B95A1]">문의 전에 먼저 확인해 보세요</p>
        </div>
      </div>
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <div key={i} className="border border-[#F2F4F6] rounded-xl overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[#F8F9FA] transition-colors">
              <span className="font-bold text-[#191F28] text-xs sm:text-sm break-keep leading-snug">{f.q}</span>
              <Plus size={15} strokeWidth={2.25}
                className={'text-[#8B95A1] shrink-0 transition-transform ' + (open === i ? 'rotate-45' : '')} />
            </button>
            {open === i && (
              <div className="px-3.5 pb-3.5 text-xs sm:text-sm text-[#4E5968] leading-relaxed border-t border-[#F2F4F6] pt-3 break-keep">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 p-3.5 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE]">
        <p className="text-[11px] font-black text-[#3182F6] mb-1">원하시는 답변을 못 찾으셨나요?</p>
        <p className="text-[11px] text-[#4E5968] leading-relaxed break-keep">왼쪽 양식으로 문의하시거나 카카오톡 채널로 빠르게 상담받아 보세요.</p>
      </div>
    </aside>
  )
}

// ── 상태 뱃지 ──────────────────────────────────────────────
function StatusBadge({ status }: { status: InquiryStatus }) {
  const m = STATUS_META[status]
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: m.bg, color: m.color }}>
      <Icon size={11} strokeWidth={2.5} />{m.label}
    </span>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function InquiryPage() {
  const [tab,          setTab]          = useState<'new' | 'history'>('new')
  const [form,         setForm]         = useState({ name: '', contact: '', category: '서비스문의', message: '' })
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [error,        setError]        = useState('')
  const [myInquiries,  setMyInquiries]  = useState<MyInquiry[]>([])
  const [copied,       setCopied]       = useState(false)
  const [quoteBanner,  setQuoteBanner]  = useState('')
  const [active,       setActive]       = useState<MyInquiry | null>(null)
  const [syncing,      setSyncing]      = useState(false)
  const [syncedAt,     setSyncedAt]     = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setMyInquiries(loadMine())
    try {
      const raw = localStorage.getItem('localution.pricing_quote')
      if (raw) {
        const q = JSON.parse(raw) as { items: { name: string; price: number }[]; subtotal: number; discountRate: number; discountAmount: number; total: number }
        if (q.items?.length > 0) {
          const lines = q.items.map((it, i) => `${i + 1}. ${it.name}  ${it.price.toLocaleString()}원/월`)
          const discountText = q.discountRate > 0 ? `\n- 묶음 할인: ${Math.round(q.discountRate * 100)}% (-${q.discountAmount.toLocaleString()}원)` : ''
          const msg =
`[견적 문의] 가격 페이지에서 선택한 구성
${lines.join('\n')}

- 원가: ${q.subtotal.toLocaleString()}원${discountText}
- 월 합계: ${q.total.toLocaleString()}원 (VAT 포함)

※ 이 구성으로 시작 가능한지, 세금계산서/결제수단/도입 일정 안내 부탁드립니다.`
          setForm(p => ({ ...p, category: '서비스문의', message: msg }))
          setQuoteBanner(`가격 페이지에서 ${q.items.length}개 기능(월 ${q.total.toLocaleString()}원)을 선택하셨어요. 이름·연락처만 입력해주세요.`)
          localStorage.removeItem('localution.pricing_quote')
        }
      }
      // v1.6z+: 통계 페이지 등에서 자동 prefill (category + message)
      const prefillRaw = localStorage.getItem('localution.inquiry_prefill')
      if (prefillRaw) {
        try {
          const pf = JSON.parse(prefillRaw) as { category?: string; message?: string; source?: string }
          if (pf.message) {
            setForm(p => ({
              ...p,
              category: pf.category || p.category || '기술문의',
              message: pf.message!,
            }))
            setQuoteBanner('통계 페이지에서 발행 문제 정보를 자동 첨부했어요. 이름·연락처만 입력해주세요.')
          }
        } catch {}
        localStorage.removeItem('localution.inquiry_prefill')
      }
    } catch {}
  }, [])

  const syncFromServer = useCallback(async () => {
    const saved = loadMine()
    if (saved.length === 0) return
    setSyncing(true)
    try {
      const ids = saved.map(s => s.id).join(',')
      const res = await fetch(`/api/inquiry?mine=true&ids=${encodeURIComponent(ids)}`)
      if (!res.ok) return
      const data = await res.json()
      const serverList: MyInquiry[] = Array.isArray(data.inquiries) ? data.inquiries : []
      const merged = saved.map(local => {
        const hit = serverList.find(s => s.id === local.id)
        return hit ? { ...local, ...hit } : local
      })
      setMyInquiries(merged)
      saveMine(merged)
      setSyncedAt(new Date().toISOString())
    } catch {} finally { setSyncing(false) }
  }, [])

  useEffect(() => { syncFromServer() }, [syncFromServer])
  useEffect(() => { if (tab === 'history') syncFromServer() }, [tab, syncFromServer])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(COMPANY.EMAIL)
    } catch {
      const el = document.createElement('textarea')
      el.value = COMPANY.EMAIL
      document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.message) { setError('이름과 문의 내용을 입력해 주세요.'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        const saved: MyInquiry = {
          id: data.id, name: form.name, contact: form.contact,
          category: form.category, message: form.message,
          status: 'new', createdAt: new Date().toISOString(),
          reply: null, repliedAt: null, completedAt: null,
        }
        const next = [saved, ...myInquiries].slice(0, 50)
        setMyInquiries(next); saveMine(next)
        setSubmitted(true)
        setForm({ name: '', contact: '', category: '서비스문의', message: '' })
      } else { setError('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.') }
    } catch { setError('네트워크 오류가 발생했습니다.') }
    setSubmitting(false)
  }

  const unreadCount    = myInquiries.filter(i => i.status === 'replied').length
  const historyLabel   = `내 문의 내역${myInquiries.length ? ` (${myInquiries.length})` : ''}`

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <style>{GLOBAL_STYLES}</style>
      <Sidebar />
      <main className="flex-1 md:ml-[220px]">

        {/* ── 히어로 헤더 ─────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,#1B3FD8 0%,#3182F6 100%)' }} className="text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-12">
            {/* 응답 보장 뱃지 */}
            <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white/90 text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full mb-4 sm:mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"
                style={{ animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
              영업일 기준 1~2일 내 답변 보장
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2.5 sm:mb-3 break-keep leading-tight">
              1:1 문의
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed break-keep max-w-lg mb-6 sm:mb-8">
              궁금하신 내용을 편하게 남겨주세요.<br className="sm:hidden" /> 담당자가 직접 확인하고 빠르게 답변드립니다.
            </p>

            {/* 통계 3종 */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-sm sm:max-w-md">
              {[
                { icon: <Clock size={16} strokeWidth={2} />, value: '1~2일', label: '평균 답변 시간' },
                { icon: <Zap size={16} strokeWidth={2} />,   value: '카카오', label: '실시간 채널 운영' },
                { icon: <CheckCircle2 size={16} strokeWidth={2} />, value: '100%', label: '모든 문의 답변' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-center gap-1.5 text-white/60 text-[11px] mb-1">{s.icon}{s.label}</div>
                  <div className="text-lg sm:text-2xl font-black">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 본문 ────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* 견적 자동 채움 배너 */}
          {quoteBanner && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-gradient-to-r from-[#EFF6FF] to-[#F5F3FF] border border-[#3182F6]/30 rounded-2xl"
              style={{ animation: 'slide-up 0.3s ease-out forwards' }}>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                <ShoppingCart size={16} strokeWidth={2} className="text-[#3182F6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#191F28]">견적 내용이 자동 입력됐어요</p>
                <p className="text-xs text-[#4E5968] mt-0.5 break-keep">{quoteBanner}</p>
              </div>
            </div>
          )}

          {/* 빠른 연락 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <a href="https://open.kakao.com/o/gSC9jrqi" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[#FEE500] bg-[#FFFDE7] hover:bg-[#FEE500]/30 hover:shadow-md transition-all group active:scale-[0.98]">
              <div className="w-11 h-11 rounded-xl bg-[#FEE500] flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-[#191F28] font-black text-lg leading-none">K</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[#191F28] text-sm">카카오톡 채널 상담</p>
                <p className="text-[11px] text-[#78350F] mt-0.5">가장 빠른 답변 · 실시간 채팅</p>
              </div>
              <ArrowRight size={15} strokeWidth={2.5} className="text-[#78350F] shrink-0 group-hover:translate-x-1 transition-transform" />
            </a>

            <button onClick={copyEmail}
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[#E5E8EB] bg-white hover:border-[#3182F6] hover:shadow-md transition-all text-left w-full group active:scale-[0.98]">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <Mail size={18} strokeWidth={2} className="text-[#3182F6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[#191F28] text-sm">이메일 문의</p>
                <p className="text-[11px] text-[#8B95A1] mt-0.5 truncate">{COMPANY.EMAIL} · 클릭해서 복사</p>
              </div>
              <ArrowRight size={15} strokeWidth={2.5} className="text-[#3182F6] shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* ── 메인 2열 ──────────────────────────────── */}
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 sm:gap-6 items-start">

            {/* 좌: 폼 / 내역 */}
            <div>
              {/* 탭 */}
              <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm mb-5 w-fit border border-[#E5E8EB]">
                {([['new', '문의하기'], ['history', historyLabel]] as const).map(([t, l]) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`relative px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${tab === t ? 'bg-[#3182F6] text-white shadow-sm' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}>
                    {l}
                    {t === 'history' && unreadCount > 0 && tab !== 'history' && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-black flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* 문의하기 폼 */}
              {tab === 'new' && (
                <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm overflow-hidden">
                  {submitted ? (
                    <div className="text-center py-12 px-6" style={{ animation: 'slide-up 0.3s ease-out' }}>
                      <div className="w-16 h-16 rounded-2xl bg-[#D1FAE5] mx-auto mb-4 flex items-center justify-center"
                        style={{ animation: 'check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                        <CheckCircle2 size={32} strokeWidth={2} className="text-[#10B981]" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-[#191F28] mb-2">문의가 접수되었습니다!</h2>
                      <p className="text-[#4E5968] text-sm leading-relaxed mb-6 break-keep">
                        영업일 기준 1~2일 내로 답변드립니다.<br/>
                        답변이 달리면 내 문의 내역에 자동으로 표시돼요.
                      </p>
                      <div className="flex gap-2.5 justify-center flex-col sm:flex-row">
                        <button onClick={() => setSubmitted(false)}
                          className="px-5 py-2.5 bg-[#F2F4F6] text-[#4E5968] font-bold rounded-xl text-sm hover:bg-[#E5E8EB] transition-colors">
                          추가 문의하기
                        </button>
                        <button onClick={() => { setTab('history'); setSubmitted(false) }}
                          className="px-5 py-2.5 bg-[#3182F6] text-white font-bold rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">
                          내 문의 내역 보기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 sm:p-6 space-y-5">
                      {/* 분류 선택 */}
                      <div>
                        <label className="text-xs sm:text-sm font-black text-[#191F28] block mb-2.5">문의 분류</label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map(cat => {
                            const active = form.category === cat.value
                            return (
                              <button key={cat.value} onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all border-2 ${
                                  active ? 'text-white border-transparent shadow-sm' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6] bg-white'
                                }`}
                                style={active ? { background: cat.color, borderColor: cat.color } : {}}>
                                <cat.Icon size={13} strokeWidth={2.25} />
                                {cat.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* 이름 + 연락처 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="text-xs sm:text-sm font-black text-[#191F28] block mb-1.5">
                            이름 <span className="text-red-500">*</span>
                          </label>
                          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="홍길동"
                            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs sm:text-sm font-black text-[#191F28] block mb-1.5">연락처</label>
                          <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                            placeholder="010-0000-0000 또는 이메일"
                            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
                        </div>
                      </div>

                      {/* 문의 내용 */}
                      <div>
                        <label className="text-xs sm:text-sm font-black text-[#191F28] block mb-1.5">
                          문의 내용 <span className="text-red-500">*</span>
                        </label>
                        <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                          rows={7} placeholder="문의하실 내용을 자세히 작성해 주세요. 자세할수록 더 정확한 답변을 드릴 수 있어요."
                          className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-[#3182F6] transition-colors resize-none" />
                        <p className="text-[11px] text-[#B0B8C1] mt-1 text-right">{form.message.length}자</p>
                      </div>

                      {error && (
                        <p className="text-red-500 text-xs sm:text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3 break-keep">
                          {error}
                        </p>
                      )}

                      <button onClick={handleSubmit} disabled={submitting}
                        className={`w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                          submitting
                            ? 'bg-[#93C5FD] cursor-not-allowed text-white'
                            : 'bg-[#3182F6] text-white hover:bg-[#1B64DA] shadow-[0_4px_16px_rgba(49,130,246,0.28)] active:scale-[0.99]'
                        }`}>
                        {submitting
                          ? <><RefreshCw size={15} className="animate-spin" /> 접수 중...</>
                          : <><Send size={15} strokeWidth={2.5} /> 문의 접수하기</>}
                      </button>

                      <div className="pt-1 border-t border-[#F2F4F6] flex items-center justify-center gap-3 text-xs text-[#8B95A1]">
                        <span className="inline-flex items-center gap-1">
                          <Mail size={11} strokeWidth={2.25} /> 이메일 직접 문의
                        </span>
                        <button onClick={copyEmail} className="font-bold text-[#3182F6] hover:underline">{COMPANY.EMAIL}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 내 문의 내역 */}
              {tab === 'history' && (
                <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm">
                  <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#F2F4F6]">
                    <div>
                      <p className="text-sm font-black text-[#191F28]">내 문의 내역</p>
                      <p className="text-[11px] text-[#8B95A1] mt-0.5 break-keep">
                        이 기기에서 접수한 문의{syncedAt && <span> · 동기화 {formatDate(syncedAt)}</span>}
                      </p>
                    </div>
                    <button onClick={() => syncFromServer()} disabled={syncing || myInquiries.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F4F6] text-[#4E5968] text-xs font-bold hover:bg-[#E5E8EB] disabled:opacity-50 transition-colors">
                      <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
                      {syncing ? '동기화 중…' : '새로고침'}
                    </button>
                  </div>

                  {myInquiries.length === 0 ? (
                    <div className="text-center py-14 px-6 flex flex-col items-center">
                      {/* SVG 빈 상태 — 편지봉투 일러스트 */}
                      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-4 opacity-70" aria-hidden="true">
                        <rect x="6" y="18" width="60" height="40" rx="6" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2" />
                        <path d="M6 24l30 20 30-20" stroke="#3182F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <circle cx="54" cy="20" r="10" fill="#DBEAFE" />
                        <path d="M49 20h10M54 15v10" stroke="#3182F6" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <p className="font-bold text-[#191F28] text-sm mb-1">문의 내역이 없습니다</p>
                      <p className="text-xs text-[#8B95A1] mb-4 break-keep">궁금한 점이 있으시면 언제든 문의해 주세요.<br/>평균 1~2일 내 답변드립니다.</p>
                      <button onClick={() => setTab('new')}
                        className="px-5 py-2.5 bg-[#3182F6] text-white font-bold rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">
                        첫 문의 남기기
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F2F4F6]">
                      {myInquiries.map(inq => (
                        <button key={inq.id} onClick={() => setActive(inq)}
                          className="w-full text-left px-5 sm:px-6 py-4 hover:bg-[#FAFBFF] transition-colors">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <StatusBadge status={inq.status} />
                            <span className="text-[10px] font-bold text-[#4E5968] bg-[#F2F4F6] px-2 py-0.5 rounded-full">{inq.category}</span>
                            <span className="text-[10px] text-[#B0B8C1] ml-auto shrink-0">{formatDate(inq.createdAt)}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#191F28] line-clamp-2 whitespace-pre-wrap break-keep">{inq.message}</p>
                          {inq.reply && (
                            <div className="mt-2 flex items-start gap-2 bg-[#F0F7FF] rounded-xl px-3 py-2">
                              <MessageSquare size={11} strokeWidth={2.25} className="text-[#3182F6] mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-[10px] font-black text-[#3182F6] mb-0.5">관리자 답변</div>
                                <div className="text-[11px] text-[#1E3A8A] line-clamp-1 break-keep">{inq.reply}</div>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 우: FAQ */}
            <FAQSection />
          </div>
        </div>

        {/* 상세 모달 */}
        {active && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setActive(null)}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>
              {/* 모달 헤더 */}
              <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[#F2F4F6] flex items-start justify-between gap-3 sticky top-0 bg-white z-10 rounded-t-3xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <StatusBadge status={active.status} />
                    <span className="text-[10px] font-bold text-[#4E5968] bg-[#F2F4F6] px-2 py-0.5 rounded-full">{active.category}</span>
                  </div>
                  <p className="text-[11px] text-[#8B95A1]">
                    접수 {formatDate(active.createdAt)}
                    {active.repliedAt   && ` · 답변 ${formatDate(active.repliedAt)}`}
                    {active.completedAt && ` · 완료 ${formatDate(active.completedAt)}`}
                  </p>
                </div>
                <button onClick={() => setActive(null)} className="p-1.5 rounded-lg hover:bg-[#F2F4F6] text-[#8B95A1] transition-colors shrink-0">
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="px-5 sm:px-6 py-5 space-y-4">
                <div>
                  <p className="text-[11px] font-black text-[#8B95A1] mb-2">내 문의 내용</p>
                  <div className="text-xs sm:text-sm text-[#191F28] leading-relaxed whitespace-pre-wrap bg-[#F8F9FA] rounded-xl p-4 break-keep">
                    {active.message}
                  </div>
                </div>
                {active.reply ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-5 h-5 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                        <Headphones size={11} strokeWidth={2.5} className="text-[#3182F6]" />
                      </div>
                      <span className="text-[11px] font-black text-[#3182F6]">관리자 답변</span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#1E3A8A] leading-relaxed whitespace-pre-wrap bg-[#EFF6FF] rounded-xl p-4 break-keep">
                      {active.reply}
                    </div>
                    {active.status === 'completed' && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#065F46] bg-[#D1FAE5] rounded-xl py-2.5">
                        <CheckCircle2 size={12} strokeWidth={2.5} />
                        이 문의는 처리 완료되었습니다
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[#8B95A1] bg-[#F8F9FA] rounded-xl p-4 text-center leading-relaxed break-keep">
                    아직 답변이 작성되지 않았습니다.<br />
                    영업일 기준 1~2일 내로 답변드릴게요.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="-mx-0 mt-16">
          <Footer />
        </div>
      </main>

      {/* 이메일 복사 토스트 */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          style={{ animation: 'slide-up 0.25s ease-out' }}>
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[#191F28] text-white rounded-2xl shadow-2xl text-sm font-bold whitespace-nowrap">
            <CheckCircle2 size={15} strokeWidth={2.25} className="text-[#10B981]" />
            이메일 주소가 복사되었습니다
            <span className="text-[#8B95A1] text-xs">{COMPANY.EMAIL}</span>
          </div>
        </div>
      )}
    </div>
  )
}
