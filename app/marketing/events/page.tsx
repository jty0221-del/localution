'use client'

// ============================================================
// /marketing/events — 매장 이벤트·프로모션 매니저
//   · 단속 이벤트 / 시즌 프로모션 / 단골 보상 캠페인
//   · 시작·종료 일정 + 자동 종료 알림
//   · 카드뉴스/스레드/유튜브 커뮤니티 자동 발행 연동 (예정)
// ============================================================
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import {
  Sparkles, Plus, Calendar, Clock, Tag, X, Edit3, Trash2,
  PartyPopper, Gift, TrendingUp, Coffee, Star,
  AlertCircle, CheckCircle2, ArrowRight, Megaphone,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type EventType = 'open' | 'season' | 'loyalty' | 'flash' | 'collab'
type EventStatus = 'scheduled' | 'active' | 'ended'

type StoreEvent = {
  id: string
  type: EventType
  title: string
  description: string
  startDate: string  // 'YYYY-MM-DD'
  endDate: string
  reward: string     // '아메리카노 1잔 무료', '20% 할인' 등
  targetAudience: string
  publishChannels: string[]  // ['card-news', 'threads', 'youtube']
  createdAt: string
}

const STORAGE_KEY = 'localution.events'

const EVENT_TYPES: Record<EventType, { label: string; Icon: typeof Sparkles; color: string; bg: string }> = {
  open:    { label: '오픈/리뉴얼', Icon: PartyPopper,  color: '#3182F6', bg: '#EFF6FF' },
  season:  { label: '시즌',        Icon: Sparkles,     color: '#7C3AED', bg: '#F3E8FF' },
  loyalty: { label: '단골',        Icon: Gift,         color: '#10B981', bg: '#D1FAE5' },
  flash:   { label: '타임세일',    Icon: TrendingUp,   color: '#F59E0B', bg: '#FEF3C7' },
  collab:  { label: '협업',        Icon: Coffee,       color: '#EC4899', bg: '#FCE7F3' },
}

const TEMPLATE_PRESETS = [
  { type: 'open' as EventType, title: '신규 오픈 기념 이벤트', description: '새로 오픈한 우리 매장을 응원해 주세요!', reward: '첫 방문 시 아메리카노 1잔 무료', target: '신규 고객' },
  { type: 'season' as EventType, title: '여름 시즌 메뉴 출시', description: '시원한 여름 신메뉴를 만나보세요', reward: '시즌 메뉴 주문 시 사이드 무료', target: '전체 고객' },
  { type: 'loyalty' as EventType, title: '단골 감사 이벤트', description: '늘 와주시는 단골님께 드리는 작은 선물', reward: '5번 방문 시 1잔 무료', target: '단골·VIP' },
  { type: 'flash' as EventType, title: '타임세일 (저녁 7-9시)', description: '매일 저녁 7-9시 한정 할인', reward: '20% 즉시 할인', target: '저녁 손님' },
  { type: 'collab' as EventType, title: '인근 매장 협업 쿠폰', description: '근처 매장과 함께 진행하는 크로스 쿠폰', reward: '10% 상호 할인', target: '신규·재방문' },
]

function loadEvents(): StoreEvent[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveEvents(list: StoreEvent[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}
function eventStatus(e: StoreEvent, today: string): EventStatus {
  if (today < e.startDate) return 'scheduled'
  if (today > e.endDate) return 'ended'
  return 'active'
}

export default function EventsPage() {
  const [events, setEvents] = useState<StoreEvent[]>([])
  const [filter, setFilter] = useState<'all' | EventStatus>('all')
  const [editOpen, setEditOpen] = useState<StoreEvent | 'new' | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') setEvents(loadEvents())
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const enriched = useMemo(() => events.map(e => ({ ...e, status: eventStatus(e, today) })), [events, today])
  const filtered = filter === 'all' ? enriched : enriched.filter(e => e.status === filter)
  const sorted = [...filtered].sort((a, b) => b.startDate.localeCompare(a.startDate))

  const stats = useMemo(() => ({
    total: enriched.length,
    active: enriched.filter(e => e.status === 'active').length,
    scheduled: enriched.filter(e => e.status === 'scheduled').length,
    ended: enriched.filter(e => e.status === 'ended').length,
  }), [enriched])

  function saveEvent(e: StoreEvent) {
    const exists = events.find(x => x.id === e.id)
    const next = exists ? events.map(x => x.id === e.id ? e : x) : [...events, e]
    setEvents(next); saveEvents(next); setEditOpen(null)
  }
  function deleteEvent(id: string) {
    if (!confirm('정말 삭제하시겠어요?')) return
    const next = events.filter(e => e.id !== id)
    setEvents(next); saveEvents(next)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<Megaphone size={28} className="text-white" strokeWidth={2.5} />}
          title="매장 이벤트·프로모션"
          subtitle="단속 이벤트·시즌 프로모션·단골 보상 — 카드뉴스·스레드 자동 발행 연동"
          variant="pink"
        />

        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-4 md:space-y-6">

          {/* 안내 */}
          <div className="rounded-2xl border border-[#E9D5FF] bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] p-3 md:p-4 flex items-start gap-2.5">
            <Sparkles size={14} className="text-[#7C3AED] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-bold text-[#7C3AED] mb-0.5">이벤트 매니저 베타</p>
              <p className="text-[11px] md:text-xs text-[#7C3AED]/90 leading-relaxed">
                이벤트 등록 → 카드뉴스·스레드·유튜브 커뮤니티 자동 발행 연동 (곧 추가).
                지금은 등록·일정 관리만 지원하며, 로컬 저장 방식입니다.
              </p>
            </div>
          </div>

          {/* 4 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
            <StatCard color="from-[#3182F6] to-[#1B64DA]" label="전체 이벤트" value={stats.total + '건'} icon={<Tag size={14} className="text-white" strokeWidth={2.5} />} />
            <StatCard color="from-[#10B981] to-[#059669]" label="진행 중" value={stats.active + '건'} icon={<CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />} />
            <StatCard color="from-[#F59E0B] to-[#D97706]" label="예정" value={stats.scheduled + '건'} icon={<Clock size={14} className="text-white" strokeWidth={2.5} />} />
            <StatCard color="from-[#8B95A1] to-[#6B7280]" label="종료" value={stats.ended + '건'} icon={<X size={14} className="text-white" strokeWidth={2.5} />} />
          </div>

          {/* 필터 + 추가 버튼 */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'all', label: '전체' },
              { key: 'active', label: '진행 중' },
              { key: 'scheduled', label: '예정' },
              { key: 'ended', label: '종료' },
            ] as const).map(f => (
              <button key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f.key ? 'bg-[#3182F6] text-white' : 'bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F8F9FA]'}`}>
                {f.label}
              </button>
            ))}
            <button onClick={() => setEditOpen('new')}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-sm">
              <Plus size={12} strokeWidth={2.5} /> 이벤트 추가
            </button>
          </div>

          {/* 이벤트 목록 */}
          {sorted.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center mx-auto mb-3 shadow-md">
                <Megaphone size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-base md:text-lg font-black text-[#191F28] mb-1">아직 등록한 이벤트가 없어요</h2>
              <p className="text-xs md:text-sm text-[#8B95A1] mb-5 leading-relaxed">
                템플릿으로 빠르게 시작하거나 직접 만들어 보세요.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {TEMPLATE_PRESETS.map((tp, i) => {
                  const cfg = EVENT_TYPES[tp.type]
                  return (
                    <button key={i}
                      onClick={() => setEditOpen({
                        id: 'new-' + i, type: tp.type, title: tp.title, description: tp.description,
                        startDate: today, endDate: addDays(today, 14), reward: tp.reward,
                        targetAudience: tp.target, publishChannels: [], createdAt: new Date().toISOString(),
                      })}
                      className="text-left p-3 rounded-xl border border-[#F2F4F6] hover:border-[#EC4899] hover:shadow-sm transition-all bg-white">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                          <cfg.Icon size={12} style={{ color: cfg.color }} strokeWidth={2.5} />
                        </div>
                        <p className="text-xs font-bold text-[#191F28]">{tp.title}</p>
                      </div>
                      <p className="text-[10px] text-[#8B95A1] line-clamp-2">{tp.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sorted.map(e => {
                const cfg = EVENT_TYPES[e.type]
                const statusCfg = e.status === 'active' ? { label: '진행 중', color: '#059669', bg: '#D1FAE5' }
                  : e.status === 'scheduled' ? { label: '예정', color: '#D97706', bg: '#FEF3C7' }
                  : { label: '종료', color: '#6B7280', bg: '#E5E7EB' }
                return (
                  <div key={e.id} className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                          <cfg.Icon size={16} style={{ color: cfg.color }} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
                          <p className="text-sm font-bold text-[#191F28] truncate">{e.title}</p>
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#4E5968] line-clamp-2 mb-3 leading-relaxed">{e.description}</p>
                    <div className="space-y-1.5 mb-3 text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#4E5968]">
                        <Calendar size={11} strokeWidth={2.5} className="text-[#8B95A1]" />
                        <span>{e.startDate} ~ {e.endDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#4E5968]">
                        <Gift size={11} strokeWidth={2.5} className="text-[#8B95A1]" />
                        <span className="truncate">{e.reward}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t border-[#F2F4F6]">
                      <button onClick={() => setEditOpen(e)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#E5E8EB] text-[11px] font-bold text-[#4E5968] hover:bg-[#F8F9FA]">
                        <Edit3 size={11} strokeWidth={2.5} /> 편집
                      </button>
                      <button onClick={() => deleteEvent(e.id)}
                        className="px-2 py-1.5 rounded-lg border border-[#E5E8EB] text-[11px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]">
                        <Trash2 size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 자동 발행 연동 안내 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm md:text-base font-bold text-[#191F28] mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-[#7C3AED]" strokeWidth={2.5} />
              이벤트 자동 발행 연동 (곧 추가)
            </h2>
            <p className="text-xs text-[#4E5968] mb-3 leading-relaxed">
              이벤트 등록 → 자동으로 카드뉴스 슬라이드 + 스레드 글 + 유튜브 커뮤니티 게시글이 만들어져요.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link href="/marketing/card-news" className="p-3 rounded-xl border border-[#F2F4F6] hover:border-[#EC4899] hover:bg-[#FCE7F3]/30 transition-all flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
                  <Star size={12} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold text-[#191F28] truncate">카드뉴스</span>
                <ArrowRight size={11} className="text-[#8B95A1] ml-auto" strokeWidth={2.5} />
              </Link>
              <Link href="/marketing/threads" className="p-3 rounded-xl border border-[#F2F4F6] hover:border-[#3182F6] hover:bg-[#EFF6FF]/30 transition-all flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Star size={12} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold text-[#191F28] truncate">스레드</span>
                <ArrowRight size={11} className="text-[#8B95A1] ml-auto" strokeWidth={2.5} />
              </Link>
              <Link href="/marketing/youtube-community" className="p-3 rounded-xl border border-[#F2F4F6] hover:border-[#DC2626] hover:bg-[#FEF2F2]/30 transition-all flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#DC2626] to-[#991B1B] flex items-center justify-center">
                  <Star size={12} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold text-[#191F28] truncate">유튜브</span>
                <ArrowRight size={11} className="text-[#8B95A1] ml-auto" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

        </main>
        <Footer />
      </div>

      {editOpen && (
        <EditModal
          initial={editOpen === 'new' ? null : editOpen}
          onClose={() => setEditOpen(null)}
          onSave={saveEvent}
        />
      )}
    </div>
  )
}

function StatCard({ color, label, value, icon }: { color: string; label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <span className="text-[10px] md:text-[11px] font-semibold text-[#8B95A1] truncate">{label}</span>
      </div>
      <p className="text-base md:text-lg font-black text-[#191F28]">{value}</p>
    </div>
  )
}

function addDays(date: string, n: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function EditModal({ initial, onClose, onSave }: {
  initial: StoreEvent | null;
  onClose: () => void;
  onSave: (e: StoreEvent) => void;
}) {
  const [type, setType] = useState<EventType>(initial?.type || 'open')
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(initial?.startDate || today)
  const [endDate, setEndDate] = useState(initial?.endDate || addDays(today, 14))
  const [reward, setReward] = useState(initial?.reward || '')
  const [targetAudience, setTargetAudience] = useState(initial?.targetAudience || '전체 고객')

  const canSubmit = title.trim() && reward.trim() && startDate && endDate

  function submit() {
    const id = initial?.id?.startsWith('new-') || !initial?.id
      ? Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      : initial.id
    onSave({
      id, type, title: title.trim(), description: description.trim(),
      startDate, endDate, reward: reward.trim(), targetAudience: targetAudience.trim(),
      publishChannels: initial?.publishChannels || [],
      createdAt: initial?.createdAt || new Date().toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-[#191F28]">{initial ? '이벤트 편집' : '새 이벤트'}</h3>
          <button onClick={onClose} className="p-1 text-[#8B95A1]">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="space-y-3">
          {/* 타입 선택 */}
          <div>
            <label className="text-[11px] font-bold text-[#4E5968] mb-1.5 block">유형</label>
            <div className="grid grid-cols-5 gap-1">
              {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES['open']][]).map(([k, cfg]) => (
                <button key={k}
                  onClick={() => setType(k)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors ${type === k ? 'border-[#EC4899] bg-[#FCE7F3]' : 'border-[#E5E8EB] hover:bg-[#F8F9FA]'}`}>
                  <cfg.Icon size={14} style={{ color: cfg.color }} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold text-[#191F28]">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label="제목" required>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="여름 시즌 신메뉴 출시"
              className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
          </Field>
          <Field label="설명">
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="이벤트 내용을 손님께 안내하는 문구"
              className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6] resize-y min-h-[60px]" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="시작일">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
            </Field>
            <Field label="종료일">
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
            </Field>
          </div>
          <Field label="혜택" required>
            <input type="text" value={reward} onChange={e => setReward(e.target.value)} placeholder="아메리카노 1잔 무료, 20% 할인 등"
              className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
          </Field>
          <Field label="대상 고객">
            <input type="text" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="전체 / 신규 / 단골 / VIP"
              className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-sm font-bold text-[#4E5968] hover:bg-[#F8F9FA]">
            취소
          </button>
          <button disabled={!canSubmit}
            onClick={submit}
            className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
            {initial ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">
        {label} {required && <span className="text-[#DC2626]">*</span>}
      </label>
      {children}
    </div>
  )
}
