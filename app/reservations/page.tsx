'use client'

// ============================================================
// /reservations — 예약·일정 관리 (Phase 1 placeholder)
// · 예약 / 단체 / 행사 일정
// · 휴무일 표시
// · 캘린더 + 리스트 뷰 토글
// · 추후 네이버 예약 / 카카오 예약 연동 예정
// ============================================================
import { useState, useMemo, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import {
 Calendar as CalendarIcon, Clock, Plus, Phone, Users, MapPin,
 ChevronLeft, ChevronRight, AlertCircle, X, Edit3,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type Reservation = {
 id: string
 date: string // 'YYYY-MM-DD'
 time: string // 'HH:MM'
 customerName: string
 phone: string
 partySize: number
 note: string
 status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
}

const STORAGE_KEY = 'localution.reservations'

const STATUS_LABEL: Record<Reservation['status'], { label: string; bg: string; color: string }> = {
 confirmed: { label: '확정', bg: '#D1FAE5', color: '#059669' },
 pending: { label: '대기', bg: '#FEF3C7', color: '#D97706' },
 completed: { label: '완료', bg: '#E5E7EB', color: '#4B5563' },
 cancelled: { label: '취소', bg: '#FEE2E2', color: '#DC2626' },
}

function loadResv(): Reservation[] {
 try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveResv(list: Reservation[]) {
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

export default function ReservationsPage() {
 const today = new Date()
 const [yr, setYr] = useState(today.getFullYear())
 const [mo, setMo] = useState(today.getMonth())
 const [resv, setResv] = useState<Reservation[]>([])
 const [selectedDate, setSelectedDate] = useState<string | null>(null)
 const [addOpen, setAddOpen] = useState(false)

  // 마운트 시 로드 (useMemo 안에서 setState 호출은 React 규칙 위반 — useEffect 로 수정)
 useEffect(() => {
 if (typeof window !== 'undefined') {
 setResv(loadResv())
 }
 }, [])

 const daysInMonth = new Date(yr, mo + 1, 0).getDate()
 const firstDow = new Date(yr, mo, 1).getDay()
 const days = Array.from({ length: daysInMonth }, (_, i) => {
 const d = i + 1
 return `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
 })
 const cells = [...Array(firstDow).fill(null), ...days]

 const resvByDate = useMemo(() => {
 const m: Record<string, Reservation[]> = {}
 for (const r of resv) {
 if (!m[r.date]) m[r.date] = []
 m[r.date].push(r)
 }
 return m
 }, [resv])

 const upcoming = useMemo(() => {
 const todayStr = today.toISOString().slice(0, 10)
 return resv
 .filter(r => r.date >= todayStr && r.status !== 'cancelled' && r.status !== 'completed')
 .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
 .slice(0, 10)
 }, [resv, today])

 const selectedList = selectedDate ? (resvByDate[selectedDate] || []) : []

 const prevMonth = () => { if (mo === 0) { setMo(11); setYr(y => y - 1) } else setMo(m => m - 1) }
 const nextMonth = () => { if (mo === 11) { setMo(0); setYr(y => y + 1) } else setMo(m => m + 1) }

 function addReservation(r: Omit<Reservation, 'id'>) {
 const next = [...resv, { ...r, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }]
 setResv(next); saveResv(next)
 }
 function cancelReservation(id: string) {
 const next = resv.map(r => r.id === id ? { ...r, status: 'cancelled' as const } : r)
 setResv(next); saveResv(next)
 }

 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <Sidebar />
 <div className="md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 icon={<CalendarIcon size={28} className="text-white" strokeWidth={2.5} />}
 title="예약·일정 관리"
 subtitle="단체 예약 · 행사 · 휴무일을 한 캘린더에서 — 노쇼 방지 알림 (준비 중)"
 variant="primary"
 />

 <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-4 md:space-y-6">

 {/* 베타 안내 */}
 <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3 md:p-4 flex items-start gap-2.5">
 <AlertCircle size={14} className="text-[#92400E] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
 <div className="flex-1 min-w-0">
 <p className="text-xs md:text-sm font-bold text-[#92400E] mb-0.5">초기 버전</p>
 <p className="text-[11px] md:text-xs text-[#92400E] leading-relaxed">
 현재는 로컬 저장 방식입니다 (이 기기에만 저장).
 네이버 예약 / 카카오 예약 자동 연동, 노쇼 방지 카톡 알림은 곧 추가됩니다.
 </p>
 </div>
 </div>

 {/* 다가오는 예약 */}
 <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F6]">
 <div className="flex items-center gap-2">
 <Clock size={14} className="text-[#3182F6]" strokeWidth={2.5} />
 <h2 className="text-sm md:text-base font-bold text-[#191F28]">
 다가오는 예약 <span className="text-[#3182F6]">{upcoming.length}건</span>
 </h2>
 </div>
 <button onClick={() => setAddOpen(true)}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#3182F6] text-white rounded-lg text-xs font-bold hover:bg-[#1B64DA]">
 <Plus size={12} strokeWidth={2.5} /> 예약 추가
 </button>
 </div>
 {upcoming.length === 0 ? (
 <div className="p-8 text-center text-[#8B95A1]">
 <CalendarIcon size={28} className="mx-auto mb-2 text-[#D1D5DB]" strokeWidth={2} />
 <p className="text-sm font-semibold mb-1">예약된 일정이 없어요</p>
 <p className="text-[11px]">+ 예약 추가 버튼으로 첫 예약을 등록해 보세요.</p>
 </div>
 ) : (
 <div className="divide-y divide-[#F2F4F6]">
 {upcoming.map(r => (
 <ResvRow key={r.id} r={r} onCancel={() => cancelReservation(r.id)} />
 ))}
 </div>
 )}
 </div>

 {/* 캘린더 */}
 <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F6]">
 <h2 className="text-sm md:text-base font-bold text-[#191F28]">{yr}년 {mo + 1}월</h2>
 <div className="flex items-center gap-1">
 <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#F2F4F6]" aria-label="이전 달">
 <ChevronLeft size={16} className="text-[#4E5968]" strokeWidth={2.5} />
 </button>
 <button onClick={() => { const d = new Date(); setYr(d.getFullYear()); setMo(d.getMonth()) }}
 className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#3182F6] bg-[#EFF6FF] hover:bg-[#DBEAFE]">
 오늘
 </button>
 <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#F2F4F6]" aria-label="다음 달">
 <ChevronRight size={16} className="text-[#4E5968]" strokeWidth={2.5} />
 </button>
 </div>
 </div>
 <div className="grid grid-cols-7 border-b border-[#F2F4F6]">
 {['일','월','화','수','목','금','토'].map((d, i) => (
 <div key={d} className={`text-center text-[11px] font-bold py-2 ${i === 0 ? 'text-[#DC2626]' : i === 6 ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}>
 {d}
 </div>
 ))}
 </div>
 <div className="grid grid-cols-7">
 {cells.map((cell, i) => {
 if (!cell) return <div key={i} className="aspect-square md:aspect-auto md:min-h-[80px] bg-[#FAFBFC] border-b border-r border-[#F2F4F6]" />
 const dt = cell as string
 const day = parseInt(dt.slice(8), 10)
 const dow = new Date(dt).getDay()
 const isToday = dt === today.toISOString().slice(0, 10)
 const isSelected = dt === selectedDate
 const list = resvByDate[dt] || []
 const activeCount = list.filter(r => r.status !== 'cancelled').length
 return (
 <button
 key={dt}
 onClick={() => setSelectedDate(dt)}
 className={`aspect-square md:aspect-auto md:min-h-[80px] p-1 md:p-2 text-left border-b border-r border-[#F2F4F6] hover:bg-[#EFF6FF] transition-colors ${isSelected ? 'ring-2 ring-[#3182F6] ring-inset bg-[#EFF6FF]' : ''}`}
 >
 <div className={`text-[11px] md:text-xs font-bold mb-0.5 ${dow === 0 ? 'text-[#DC2626]' : dow === 6 ? 'text-[#3182F6]' : 'text-[#191F28]'} ${isToday ? 'inline-flex w-5 h-5 md:w-6 md:h-6 items-center justify-center bg-[#3182F6] text-white rounded-full' : ''}`}>
 {day}
 </div>
 {activeCount > 0 && (
 <div className="hidden md:block text-[9px] font-bold text-white bg-[#3182F6] rounded px-1 py-0.5 inline-block">
 {activeCount}건
 </div>
 )}
 {activeCount > 0 && (
 <div className="md:hidden flex items-center justify-center mt-0.5">
 <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
 </div>
 )}
 </button>
 )
 })}
 </div>

 {selectedDate && (
 <div className="bg-[#FAFBFF] border-t border-[#E5E8EB] p-4">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-bold text-[#191F28]">{selectedDate} 예약 {selectedList.length}건</h3>
 <button onClick={() => setSelectedDate(null)} className="text-xs text-[#8B95A1] hover:text-[#4E5968]">
 닫기
 </button>
 </div>
 {selectedList.length === 0 ? (
 <p className="text-xs text-[#8B95A1] text-center py-3">이 날엔 예약이 없어요.</p>
 ) : (
 <div className="space-y-2">
 {selectedList.map(r => <ResvRow key={r.id} r={r} compact onCancel={() => cancelReservation(r.id)} />)}
 </div>
 )}
 </div>
 )}
 </div>
 </main>
 <Footer />
 </div>

 {addOpen && (
 <AddModal
 defaultDate={selectedDate || today.toISOString().slice(0, 10)}
 onClose={() => setAddOpen(false)}
 onAdd={(r) => { addReservation(r); setAddOpen(false) }}
 />
 )}
 </div>
 )
}

function ResvRow({ r, compact, onCancel }: { r: Reservation; compact?: boolean; onCancel: () => void }) {
 const cfg = STATUS_LABEL[r.status]
 return (
 <div className={`flex items-start gap-3 ${compact ? 'p-2 bg-white rounded-lg border border-[#F2F4F6]' : 'p-4'}`}>
 <div className="flex-shrink-0 w-12 text-center">
 <p className="text-[10px] text-[#8B95A1] font-medium">{r.date.slice(5).replace('-','/')}</p>
 <p className="text-sm font-black text-[#3182F6]">{r.time}</p>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5 mb-0.5">
 <p className="text-sm font-bold text-[#191F28] truncate">{r.customerName}</p>
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
 {cfg.label}
 </span>
 </div>
 <div className="flex items-center gap-2 text-[11px] text-[#8B95A1]">
 <span className="inline-flex items-center gap-0.5"><Users size={10} strokeWidth={2.5} /> {r.partySize}명</span>
 {r.phone && <span className="inline-flex items-center gap-0.5"><Phone size={10} strokeWidth={2.5} /> {r.phone}</span>}
 </div>
 {r.note && <p className="text-[11px] text-[#4E5968] mt-1 line-clamp-2">{r.note}</p>}
 </div>
 {r.status !== 'cancelled' && r.status !== 'completed' && (
 <button onClick={onCancel}
 className="flex-shrink-0 text-[10px] text-[#DC2626] hover:underline font-semibold">
 취소
 </button>
 )}
 </div>
 )
}

function AddModal({ defaultDate, onClose, onAdd }: {
 defaultDate: string;
 onClose: () => void;
 onAdd: (r: Omit<Reservation, 'id'>) => void;
}) {
 const [date, setDate] = useState(defaultDate)
 const [time, setTime] = useState('19:00')
 const [name, setName] = useState('')
 const [phone, setPhone] = useState('')
 const [partySize, setPartySize] = useState(2)
 const [note, setNote] = useState('')

 const canSubmit = name.trim() && date && time

 return (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
 <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base font-black text-[#191F28]">예약 추가</h3>
 <button onClick={onClose} className="p-1 text-[#8B95A1]">
 <X size={18} strokeWidth={2.5} />
 </button>
 </div>
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">날짜</label>
 <input type="date" value={date} onChange={e => setDate(e.target.value)}
 className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
 </div>
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">시간</label>
 <input type="time" value={time} onChange={e => setTime(e.target.value)}
 className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
 </div>
 </div>
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">고객명 <span className="text-[#DC2626]">*</span></label>
 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
 className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">전화번호</label>
 <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-1234-5678"
 className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
 </div>
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">인원</label>
 <input type="number" min={1} max={50} value={partySize} onChange={e => setPartySize(parseInt(e.target.value) || 1)}
 className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6]" />
 </div>
 </div>
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">메모</label>
 <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="예: 알러지 / 비건 / 생일"
 className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#3182F6] resize-y min-h-[60px]" />
 </div>
 </div>
 <div className="flex gap-2 mt-5">
 <button onClick={onClose}
 className="flex-1 px-3 py-2.5 rounded-xl border border-[#E5E8EB] text-sm font-bold text-[#4E5968] hover:bg-[#F8F9FA]">
 취소
 </button>
 <button
 disabled={!canSubmit}
 onClick={() => onAdd({ date, time, customerName: name.trim(), phone: phone.trim(), partySize, note: note.trim(), status: 'confirmed' })}
 className="flex-1 px-3 py-2.5 rounded-xl bg-[#3182F6] text-white text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-40">
 추가하기
 </button>
 </div>
 </div>
 </div>
 )
}
