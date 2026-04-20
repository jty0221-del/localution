'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { COMPANY } from '../lib/company'
import {
  MessageCircle, Wrench, CreditCard, Sparkles, FileText,
  CheckCircle2, ShoppingCart, Mail, Inbox, Plus, LucideIcon,
  Clock, MessageSquare, X, RefreshCw,
} from 'lucide-react'

const CATEGORIES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: '서비스문의',   label: '서비스 문의',  Icon: MessageCircle },
  { value: '기술문의',     label: '기술 문의',    Icon: Wrench },
  { value: '요금결제',     label: '요금 · 결제',  Icon: CreditCard },
  { value: '기능요청',     label: '기능 요청',    Icon: Sparkles },
  { value: '기타',         label: '기타',         Icon: FileText },
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

const STATUS_META: Record<InquiryStatus, { label: string; bg: string; color: string; dot: string; icon: LucideIcon }> = {
  new:       { label: '접수 완료', bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B', icon: Clock },
  replied:   { label: '답변 완료', bg: '#DBEAFE', color: '#1E40AF', dot: '#3182F6', icon: MessageSquare },
  completed: { label: '처리 완료', bg: '#D1FAE5', color: '#065F46', dot: '#10B981', icon: CheckCircle2 },
}

function loadMine(): MyInquiry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
  } catch { return [] }
}

function saveMine(list: MyInquiry[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50))) } catch {}
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)
  const faqs = [
    { q: '무료 체험이 있나요?', a: '네, 핵심 모듈은 14일 무료 체험이 가능합니다. 카드 등록 없이 바로 시작할 수 있어요.' },
    { q: '요금제는 어떻게 구성되나요?', a: '필요한 기능만 골라 담는 모듈형입니다. 3개 이상 선택 시 최대 20% 번들 할인이 자동 적용돼요.' },
    { q: '해지는 언제든 가능한가요?', a: '월 단위 구독이며 언제든 해지할 수 있습니다. 해지 즉시 다음 결제일부터 과금이 중단돼요.' },
    { q: '세금계산서 발행되나요?', a: '네, 사업자 회원은 매월 자동으로 전자세금계산서가 발행됩니다. 홈택스 연동 지원.' },
    { q: '매장이 여러 개여도 쓸 수 있나요?', a: '다중 매장 관리 기능으로 한 계정에서 여러 지점을 통합 운영할 수 있습니다. 마케팅 대행사용 멀티 클라이언트 모드도 제공해요.' },
    { q: '기존 데이터 이관이 가능한가요?', a: '기존 리뷰·고객 데이터 CSV 임포트를 지원합니다. 도입 담당자가 이관 과정을 직접 도와드려요.' },
  ]
  return (
    <aside className="bg-white rounded-2xl p-6 shadow-sm lg:sticky lg:top-6">
      <h2 className="text-xl md:text-2xl font-black text-[#191F28] mb-1">자주 묻는 질문</h2>
      <p className="text-sm text-[#8B95A1] mb-5">문의 전에 먼저 확인해 보세요</p>
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <div key={i} className="border border-[#E5E8EB] rounded-xl overflow-hidden">
            <button onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#F9FAFB] transition-colors">
              <span className="font-bold text-[#191F28] text-sm">{f.q}</span>
              <Plus size={18} strokeWidth={2.25}
                className={'text-[#8B95A1] flex-shrink-0 transition-transform ' + (open === i ? 'rotate-45' : '')} />
            </button>
            {open === i && (
              <div className="px-4 pb-4 pt-0 text-sm text-[#4E5968] leading-relaxed border-t border-[#F2F4F6]">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 p-4 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE]">
        <p className="text-xs font-black text-[#3182F6] mb-1">원하시는 답변을 못 찾으셨나요?</p>
        <p className="text-xs text-[#4E5968] leading-relaxed">왼쪽 양식으로 문의하시거나 카카오톡 채널로 빠르게 상담받아 보세요.</p>
      </div>
    </aside>
  )
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const m = STATUS_META[status]
  const Icon = m.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: m.bg, color: m.color }}
    >
      <Icon size={11} strokeWidth={2.5} />
      {m.label}
    </span>
  )
}

export default function InquiryPage() {
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [form, setForm] = useState({ name: '', contact: '', category: '서비스문의', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]   = useState('')
  const [myInquiries, setMyInquiries] = useState<MyInquiry[]>([])
  const [copied, setCopied] = useState(false)
  const [quoteBanner, setQuoteBanner] = useState<string>('')
  const [active, setActive] = useState<MyInquiry | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)

  // 초기 마운트: localStorage 로드 + 서버 최신 상태 병합
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = loadMine()
    setMyInquiries(saved)

    // /pricing 에서 넘어온 견적 자동 채움
    try {
      const raw = localStorage.getItem('localution.pricing_quote')
      if (raw) {
        const q = JSON.parse(raw) as { items: { name: string; price: number }[]; subtotal: number; discountRate: number; discountAmount: number; total: number }
        if (q.items && q.items.length > 0) {
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
    } catch {}
  }, [])

  // 서버 재조회 → 답변/상태 최신화
  const syncFromServer = useCallback(async (force = false) => {
    const saved = loadMine()
    if (saved.length === 0) return
    setSyncing(true)
    try {
      const ids = saved.map(s => s.id).join(',')
      const res = await fetch(`/api/inquiry?mine=true&ids=${encodeURIComponent(ids)}`)
      if (!res.ok) return
      const data = await res.json()
      const serverList: MyInquiry[] = Array.isArray(data.inquiries) ? data.inquiries : []
      // 서버에 있는 id는 서버 레코드로 교체, 서버에 없는 건(재배포로 유실) 기존 로컬 유지 (status는 접수 상태 유지)
      const merged = saved.map(local => {
        const hit = serverList.find(s => s.id === local.id)
        return hit ? { ...local, ...hit } : local
      })
      setMyInquiries(merged)
      saveMine(merged)
      setSyncedAt(new Date().toISOString())
    } catch (_) {
      // 네트워크 오류 무시
    } finally {
      setSyncing(false)
    }
  }, [])

  // 마운트 시 1회 + 탭이 history로 전환될 때마다 재조회
  useEffect(() => { syncFromServer() }, [syncFromServer])
  useEffect(() => {
    if (tab === 'history') syncFromServer()
  }, [tab, syncFromServer])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(COMPANY.EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const el = document.createElement('textarea')
      el.value = COMPANY.EMAIL
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
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
          id: data.id,
          name: form.name,
          contact: form.contact,
          category: form.category,
          message: form.message,
          status: 'new',
          createdAt: new Date().toISOString(),
          reply: null,
          repliedAt: null,
          completedAt: null,
        }
        const next = [saved, ...myInquiries].slice(0, 50)
        setMyInquiries(next)
        saveMine(next)
        setSubmitted(true)
        setForm({ name: '', contact: '', category: '서비스문의', message: '' })
      } else { setError('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.') }
    } catch { setError('네트워크 오류가 발생했습니다.') }
    setSubmitting(false)
  }

  const unreadCount = myInquiries.filter(i => i.status === 'replied').length
  const historyLabel = `내 문의 내역${myInquiries.length ? ` (${myInquiries.length})` : ''}`

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8 max-w-[1280px] w-full mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-[#191F28]">1:1 문의</h1>
          <p className="text-base text-[#8B95A1] mt-2">궁금하신 내용을 편하게 남겨주세요. 영업일 기준 1-2일 내 답변드립니다.</p>
        </div>

        {quoteBanner && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-gradient-to-r from-[#EFF6FF] to-[#F5F3FF] border border-[#3182F6]/30 rounded-2xl">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={18} strokeWidth={2} className="text-[#3182F6]" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-bold text-[#191F28]">견적 내용이 문의 본문에 자동 입력되었어요</div>
              <div className="text-xs text-[#4E5968] mt-0.5">{quoteBanner}</div>
            </div>
          </div>
        )}

        {/* 빠른 연락 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <a href="https://open.kakao.com/o/gSC9jrqi" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-[#FEE500] rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#191F28] flex items-center justify-center flex-shrink-0">
              <span className="text-[#FEE500] font-black text-lg leading-none">K</span>
            </div>
            <div>
              <p className="font-bold text-[#191F28] text-sm">카카오톡 채널</p>
              <p className="text-[11px] text-[#78350F]">빠른 상담 가능</p>
            </div>
          </a>

          <button onClick={copyEmail}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-left w-full group">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
              <Mail size={18} strokeWidth={2} className="text-[#3182F6]" />
            </div>
            <div>
              <p className="font-bold text-[#191F28] text-sm">이메일 문의</p>
              <p className="text-[11px] text-[#8B95A1]">클릭해서 주소 복사</p>
            </div>
          </button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <div className="min-w-0 space-y-6">
        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm mb-6 w-fit">
          {([['new', '문의하기'], ['history', historyLabel]] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-[#3182F6] text-white' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}>
              {l}
              {t === 'history' && unreadCount > 0 && tab !== 'history' && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'new' && (
          <div className="bg-white rounded-2xl p-7 md:p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#D1FAE5] mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle2 size={32} strokeWidth={2.25} className="text-[#10B981]" />
                </div>
                <h2 className="text-xl font-black text-[#191F28] mb-2">문의가 접수되었습니다!</h2>
                <p className="text-[#4E5968] text-sm mb-6">영업일 기준 1-2일 내로 답변드립니다. 답변이 달리면 내 문의 내역에 자동으로 표시돼요.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setSubmitted(false)} className="px-5 py-2.5 bg-[#F2F4F6] text-[#4E5968] font-semibold rounded-xl text-sm">추가 문의하기</button>
                  <button onClick={() => { setTab('history'); setSubmitted(false) }} className="px-5 py-2.5 bg-[#3182F6] text-white font-semibold rounded-xl text-sm">내 문의 내역 보기</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="text-base font-black text-[#191F28] block mb-3">문의 분류</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.value} onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border-2 ${form.category === cat.value ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]'}`}>
                        <cat.Icon size={14} strokeWidth={2.25} />{cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="form-name" className="text-base font-black text-[#191F28] block mb-2">이름 <span className="text-red-500">*</span></label>
                    <input id="form-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="홍길동" className="w-full border border-[#E5E8EB] rounded-xl px-5 py-3.5 text-base focus:outline-none focus:border-[#3182F6]" />
                  </div>
                  <div>
                    <label htmlFor="form-contact" className="text-base font-black text-[#191F28] block mb-2">연락처</label>
                    <input id="form-contact" value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                      placeholder="010-0000-0000 또는 이메일" className="w-full border border-[#E5E8EB] rounded-xl px-5 py-3.5 text-base focus:outline-none focus:border-[#3182F6]" />
                  </div>
                </div>
                <div>
                  <label htmlFor="form-message" className="text-base font-black text-[#191F28] block mb-2">문의 내용 <span className="text-red-500">*</span></label>
                  <textarea id="form-message" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    rows={7} placeholder="문의하실 내용을 자세히 작성해 주세요. 자세할수록 정확한 답변을 드릴 수 있어요."
                    className="w-full border border-[#E5E8EB] rounded-xl px-5 py-4 text-base leading-relaxed focus:outline-none focus:border-[#3182F6] resize-none" />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={handleSubmit} disabled={submitting}
                  className={`w-full py-4 rounded-xl font-black text-base transition-colors ${submitting ? 'bg-[#93C5FD] cursor-not-allowed text-white' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA] shadow-[0_4px_16px_rgba(49,130,246,0.28)]'}`}>
                  {submitting ? '접수 중...' : '문의 접수하기'}
                </button>
                <div className="pt-2 border-t border-[#F2F4F6] flex items-center justify-center gap-4 text-xs text-[#8B95A1]">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={12} strokeWidth={2.25} />
                    이메일 문의
                  </span>
                  <button onClick={copyEmail} className="font-semibold text-[#3182F6] hover:underline">{COMPANY.EMAIL} 복사</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-2xl p-7 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-black text-[#191F28]">내 문의 내역</p>
                <p className="text-xs text-[#8B95A1] mt-0.5">
                  이 기기에서 접수한 문의 · 답변 달리면 자동으로 표시됩니다.
                  {syncedAt && <span> · 마지막 동기화 {formatDate(syncedAt)}</span>}
                </p>
              </div>
              <button
                onClick={() => syncFromServer(true)}
                disabled={syncing || myInquiries.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E8EB] text-[#4E5968] text-xs font-semibold hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? '동기화 중…' : '새로고침'}
              </button>
            </div>
            {myInquiries.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-[#F2F4F6] mx-auto mb-3 flex items-center justify-center">
                  <Inbox size={26} strokeWidth={1.75} className="text-[#8B95A1]" />
                </div>
                <p className="font-bold text-[#191F28] mb-1">문의 내역이 없습니다</p>
                <p className="text-sm text-[#8B95A1] mb-4">궁금한 점이 있으시면 문의해 주세요.</p>
                <button onClick={() => setTab('new')} className="px-5 py-2.5 bg-[#3182F6] text-white font-semibold rounded-xl text-sm">문의하기</button>
              </div>
            ) : (
              <div className="space-y-3">
                {myInquiries.map(inq => (
                  <button
                    key={inq.id}
                    onClick={() => setActive(inq)}
                    className="w-full text-left p-4 rounded-xl border border-[#E5E8EB] hover:border-[#3182F6] hover:bg-[#FAFBFF] transition-all"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <StatusBadge status={inq.status} />
                      <span className="text-[11px] font-semibold text-[#4E5968] bg-[#F2F4F6] px-2 py-0.5 rounded-full">{inq.category}</span>
                      <span className="text-[11px] text-[#8B95A1] ml-auto">{formatDate(inq.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[#191F28] line-clamp-2 whitespace-pre-wrap">{inq.message}</p>
                    {inq.reply && (
                      <div className="mt-2 flex items-start gap-2 bg-[#F0F7FF] rounded-lg px-3 py-2">
                        <MessageSquare size={12} strokeWidth={2.25} className="text-[#3182F6] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-[#3182F6] mb-0.5">관리자 답변</div>
                          <div className="text-xs text-[#1E3A8A] line-clamp-2 whitespace-pre-wrap">{inq.reply}</div>
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
          <FAQSection />
        </div>

        {/* 상세 모달 */}
        {active && (
          <div className="fixed inset-0 z-[9999] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setActive(null)}>
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-[#F2F4F6] flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <StatusBadge status={active.status} />
                    <span className="text-[11px] font-semibold text-[#4E5968] bg-[#F2F4F6] px-2 py-0.5 rounded-full">{active.category}</span>
                  </div>
                  <p className="text-xs text-[#8B95A1] mt-1">
                    접수 {formatDate(active.createdAt)}
                    {active.repliedAt   && ` · 답변 ${formatDate(active.repliedAt)}`}
                    {active.completedAt && ` · 완료 ${formatDate(active.completedAt)}`}
                  </p>
                </div>
                <button onClick={() => setActive(null)} className="p-2 rounded-lg hover:bg-[#F2F4F6] text-[#8B95A1]">
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <div className="text-xs font-black text-[#8B95A1] mb-1.5">내 문의 내용</div>
                  <div className="text-sm text-[#191F28] leading-relaxed whitespace-pre-wrap bg-[#F9FAFB] rounded-xl p-4">
                    {active.message}
                  </div>
                </div>
                {active.reply ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MessageSquare size={12} strokeWidth={2.5} className="text-[#3182F6]" />
                      <span className="text-xs font-black text-[#3182F6]">관리자 답변</span>
                    </div>
                    <div className="text-sm text-[#1E3A8A] leading-relaxed whitespace-pre-wrap bg-[#F0F7FF] rounded-xl p-4">
                      {active.reply}
                    </div>
                    {active.status === 'completed' && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#065F46] bg-[#D1FAE5] rounded-xl py-2">
                        <CheckCircle2 size={12} strokeWidth={2.5} />
                        이 문의는 처리 완료 처리되었습니다
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[#8B95A1] bg-[#F9FAFB] rounded-xl p-4 text-center">
                    아직 답변이 작성되지 않았습니다.<br />
                    영업일 기준 1-2일 내로 답변드릴게요.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="-mx-4 md:-mx-8 mt-20">
          <Footer />
        </div>
      </main>

      {/* 이메일 복사 토스트 */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[#191F28] text-white rounded-2xl shadow-2xl text-sm font-semibold">
            <CheckCircle2 size={16} strokeWidth={2.25} className="text-[#10B981]" />
            <span>이메일 주소가 복사되었습니다</span>
            <span className="text-[#8B95A1] text-xs">{COMPANY.EMAIL}</span>
          </div>
        </div>
      )}
    </div>
  )
}
