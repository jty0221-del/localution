'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '../../lib/adminFetch'
import {
 Search, Inbox, MessageSquare, CheckCircle2, Clock, Mail, Phone,
 ArrowLeft, RefreshCw, Send, Filter, X, User,
} from 'lucide-react'

type InquiryStatus = 'new' | 'replied' | 'completed'

interface Inquiry {
 id: string
 name: string
 contact: string
 category: string
 message: string
 status: InquiryStatus
 createdAt: string
 reply: string | null
 repliedAt: string | null
 completedAt: string | null
}

interface Summary {
 total: number
 new: number
 replied: number
 completed: number
}

const STATUS_META: Record<InquiryStatus, { label: string; bg: string; color: string; dot: string }> = {
 new: { label: '신규 접수', bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
 replied: { label: '답변 완료', bg: '#DBEAFE', color: '#1E40AF', dot: '#3182F6' },
 completed: { label: '처리 완료', bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
}

const CATEGORIES = ['전체', '서비스문의', '기술문의', '요금결제', '기능요청', '기타']

function formatDate(iso: string) {
 const d = new Date(iso)
 return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: InquiryStatus }) {
 const m = STATUS_META[status]
 return (
 <span
 className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
 style={{ background: m.bg, color: m.color }}
 >
 <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
 {m.label}
 </span>
 )
}

export default function AdminInquiriesPage() {
 const [items, setItems] = useState<Inquiry[]>([])
 const [summary, setSummary] = useState<Summary>({ total: 0, new: 0, replied: 0, completed: 0 })
 const [loading, setLoading] = useState(true)
 const [err, setErr] = useState<string | null>(null)
 const [refreshKey, setRefreshKey] = useState(0)

 const [filterStatus, setFilterStatus] = useState<'all' | InquiryStatus>('all')
 const [filterCategory, setFilterCategory] = useState<string>('전체')
 const [query, setQuery] = useState('')

 const [active, setActive] = useState<Inquiry | null>(null)
 const [replyDraft, setReplyDraft] = useState('')
 const [savingReply, setSavingReply] = useState(false)
 const [markingDone, setMarkingDone] = useState(false)
 const [actionMsg, setActionMsg] = useState<string | null>(null)

 const load = useCallback(async () => {
 setLoading(true); setErr(null)
 try {
 const res = await adminFetch('/api/inquiry')
 if (!res.ok) {
 setErr(`목록 로드 실패 (${res.status}) — ADMIN_SECRET 설정을 확인해주세요.`)
 setLoading(false)
 return
 }
 const json = await res.json()
 setItems(json.inquiries || [])
 setSummary(json.summary || { total: 0, new: 0, replied: 0, completed: 0 })
 } catch (e) {
 setErr(e instanceof Error ? e.message : 'fetch error')
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => { load() }, [load, refreshKey])

 const filtered = useMemo(() => {
 const q = query.trim().toLowerCase()
 return items.filter(it => {
 if (filterStatus !== 'all' && it.status !== filterStatus) return false
 if (filterCategory !== '전체' && it.category !== filterCategory) return false
 if (q) {
 const hay = (it.name + ' ' + it.message + ' ' + it.contact + ' ' + it.category).toLowerCase()
 if (!hay.includes(q)) return false
 }
 return true
 })
 }, [items, filterStatus, filterCategory, query])

 const openDetail = (inq: Inquiry) => {
 setActive(inq)
 setReplyDraft(inq.reply || '')
 setActionMsg(null)
 }

 const closeDetail = () => {
 setActive(null)
 setReplyDraft('')
 setActionMsg(null)
 }

 const sendReply = async () => {
 if (!active) return
 const body = replyDraft.trim()
 if (body.length === 0) { setActionMsg('답변 내용을 입력해주세요.'); return }
 setSavingReply(true); setActionMsg(null)
 try {
 const res = await adminFetch('/api/inquiry', {
 method: 'PATCH',
 body: JSON.stringify({ id: active.id, reply: body }),
 })
 if (!res.ok) { setActionMsg(`저장 실패 (${res.status})`); return }
 const json = await res.json()
 const updated = json.inquiry as Inquiry
 setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
 setActive(updated)
 setActionMsg('답변이 저장되었습니다.')
 setRefreshKey(k => k + 1) // summary 재집계 유도
 } catch (e) {
 setActionMsg(e instanceof Error ? e.message : '네트워크 오류')
 } finally {
 setSavingReply(false)
 }
 }

 const markCompleted = async () => {
 if (!active) return
 setMarkingDone(true); setActionMsg(null)
 try {
 const res = await adminFetch('/api/inquiry', {
 method: 'PATCH',
 body: JSON.stringify({ id: active.id, markCompleted: true }),
 })
 if (!res.ok) { setActionMsg(`완료 처리 실패 (${res.status})`); return }
 const json = await res.json()
 const updated = json.inquiry as Inquiry
 setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
 setActive(updated)
 setActionMsg('처리 완료로 변경되었습니다.')
 setRefreshKey(k => k + 1)
 } catch (e) {
 setActionMsg(e instanceof Error ? e.message : '네트워크 오류')
 } finally {
 setMarkingDone(false)
 }
 }

 const reopen = async () => {
 if (!active) return
 setMarkingDone(true); setActionMsg(null)
 try {
 const res = await adminFetch('/api/inquiry', {
 method: 'PATCH',
 body: JSON.stringify({ id: active.id, status: active.reply ? 'replied' : 'new' }),
 })
 if (!res.ok) { setActionMsg(`재오픈 실패 (${res.status})`); return }
 const json = await res.json()
 const updated = json.inquiry as Inquiry
 setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
 setActive(updated)
 setActionMsg('재오픈되었습니다.')
 setRefreshKey(k => k + 1)
 } catch (e) {
 setActionMsg(e instanceof Error ? e.message : '네트워크 오류')
 } finally {
 setMarkingDone(false)
 }
 }

 const kpis = [
 { label: '전체 문의', value: summary.total, icon: Inbox, color: '#3182F6', bg: '#EFF6FF' },
 { label: '신규 접수', value: summary.new, icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
 { label: '답변 완료', value: summary.replied, icon: MessageSquare, color: '#1E40AF', bg: '#DBEAFE' },
 { label: '처리 완료', value: summary.completed, icon: CheckCircle2, color: '#065F46', bg: '#D1FAE5' },
 ]

 return (
 <div className="p-4 md:p-8 max-w-6xl mx-auto">
 {/* 헤더 */}
 <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
 <div>
 <div className="flex items-center gap-2">
 <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-xs text-[#8B95A1] hover:text-[#3182F6]">
 <ArrowLeft size={12} /> 대시보드
 </Link>
 </div>
 <h1 className="text-2xl font-black text-[#191F28] tracking-tight mt-1">1:1 문의 관리</h1>
 <p className="text-sm text-[#8B95A1] mt-1">고객 문의 조회 · 답변 작성 · 처리 완료</p>
 </div>
 <button
 onClick={() => setRefreshKey(k => k + 1)}
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E8EB] text-[#4E5968] text-sm font-semibold hover:bg-[#F9FAFB]"
 >
 <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
 </button>
 </header>

 {/* 에러 */}
 {err && (
 <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-sm rounded-xl p-4 mb-5">
 {err}
 </div>
 )}

 {/* KPI */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
 {kpis.map(k => {
 const Icon = k.icon
 return (
 <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm">
 <div
 className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
 style={{ background: k.bg, color: k.color }}
 >
 <Icon size={18} strokeWidth={2.25} />
 </div>
 <div className="text-2xl font-black" style={{ color: k.color }}>
 {loading ? '—' : k.value.toLocaleString()}
 </div>
 <div className="text-xs text-[#8B95A1] font-medium mt-0.5">{k.label}</div>
 </div>
 )
 })}
 </div>

 {/* 필터 */}
 <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
 <div className="flex flex-col md:flex-row md:items-center gap-3">
 <div className="flex-1 flex items-center gap-2 border border-[#E5E8EB] rounded-xl px-3 py-2">
 <Search size={14} className="text-[#8B95A1]" />
 <input
 value={query}
 onChange={e => setQuery(e.target.value)}
 placeholder="이름 · 내용 · 연락처 검색"
 className="flex-1 text-sm outline-none bg-transparent"
 />
 {query && (
 <button onClick={() => setQuery('')} className="text-[#8B95A1] hover:text-[#4E5968]">
 <X size={14} />
 </button>
 )}
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <Filter size={12} className="text-[#8B95A1]" />
 {(['all', 'new', 'replied', 'completed'] as const).map(s => {
 const meta = s === 'all' ? { label: '전체', color: '#4E5968', bg: '#F2F4F6' } : STATUS_META[s]
 const active = filterStatus === s
 return (
 <button
 key={s}
 onClick={() => setFilterStatus(s)}
 className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
 style={{
 background: active ? meta.bg : '#FFFFFF',
 color: active ? meta.color : '#8B95A1',
 border: `1px solid ${active ? 'transparent' : '#E5E8EB'}`,
 }}
 >
 {meta.label}
 </button>
 )
 })}
 </div>
 <select
 value={filterCategory}
 onChange={e => setFilterCategory(e.target.value)}
 className="text-sm border border-[#E5E8EB] rounded-xl px-3 py-2 bg-white"
 >
 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 </div>

 {/* 목록 */}
 <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
 <div className="px-4 py-3 border-b border-[#F2F4F6] text-xs text-[#8B95A1] font-semibold">
 {loading ? '불러오는 중…' : `${filtered.length}건 표시 · 전체 ${items.length}건`}
 </div>
 {loading ? (
 <div className="divide-y divide-[#F2F4F6]">
 {Array.from({ length: 5 }).map((_, i) => (
 <div key={i} className="p-4 animate-pulse">
 <div className="h-3 w-24 bg-[#F2F4F6] rounded mb-2" />
 <div className="h-4 w-2/3 bg-[#F2F4F6] rounded mb-2" />
 <div className="h-3 w-1/2 bg-[#F2F4F6] rounded" />
 </div>
 ))}
 </div>
 ) : filtered.length === 0 ? (
 <div className="p-10 text-center text-sm text-[#8B95A1]">
 <Inbox size={28} strokeWidth={1.75} className="mx-auto mb-2 text-[#CBD2D9]" />
 조건에 맞는 문의가 없습니다.
 </div>
 ) : (
 <ul className="divide-y divide-[#F2F4F6]">
 {filtered.map(it => (
 <li
 key={it.id}
 onClick={() => openDetail(it)}
 className="px-4 py-4 hover:bg-[#FAFBFF] cursor-pointer transition-colors"
 >
 <div className="flex items-start justify-between gap-3 mb-1.5">
 <div className="flex items-center gap-2 flex-wrap">
 <StatusBadge status={it.status} />
 <span className="text-[11px] font-semibold text-[#4E5968] bg-[#F2F4F6] px-2 py-0.5 rounded-full">
 {it.category}
 </span>
 <span className="text-[11px] text-[#191F28] font-bold flex items-center gap-1">
 <User size={11} strokeWidth={2.25} className="text-[#8B95A1]" />
 {it.name}
 </span>
 {it.contact && (
 <span className="text-[11px] text-[#8B95A1] flex items-center gap-1">
 <Phone size={10} strokeWidth={2.25} />
 {it.contact}
 </span>
 )}
 </div>
 <span className="text-[11px] text-[#8B95A1] flex-shrink-0">{formatDate(it.createdAt)}</span>
 </div>
 <p className="text-sm text-[#191F28] line-clamp-2 whitespace-pre-wrap">{it.message}</p>
 {it.reply && (
 <div className="mt-2 text-xs text-[#1E40AF] bg-[#F0F7FF] rounded-lg px-3 py-2 line-clamp-1">
 <span className="font-bold">답변: </span>
 {it.reply}
 </div>
 )}
 </li>
 ))}
 </ul>
 )}
 </div>

 {/* 상세 모달 */}
 {active && (
 <div className="fixed inset-0 z-[9999] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-6" onClick={closeDetail}>
 <div
 className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
 onClick={e => e.stopPropagation()}
 >
 <div className="px-6 py-5 border-b border-[#F2F4F6] flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
 <div className="flex-1">
 <div className="flex items-center gap-2 flex-wrap mb-1">
 <StatusBadge status={active.status} />
 <span className="text-[11px] font-semibold text-[#4E5968] bg-[#F2F4F6] px-2 py-0.5 rounded-full">
 {active.category}
 </span>
 </div>
 <h3 className="text-lg font-black text-[#191F28]">{active.name}</h3>
 <p className="text-xs text-[#8B95A1] mt-0.5">
 접수 {formatDate(active.createdAt)}
 {active.repliedAt && ` · 답변 ${formatDate(active.repliedAt)}`}
 {active.completedAt && ` · 완료 ${formatDate(active.completedAt)}`}
 </p>
 </div>
 <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-[#F2F4F6] text-[#8B95A1]">
 <X size={18} />
 </button>
 </div>

 <div className="px-6 py-5 space-y-4">
 {active.contact && (
 <div className="flex items-center gap-3 text-sm bg-[#F9FAFB] rounded-xl px-4 py-3">
 <Phone size={14} className="text-[#8B95A1]" />
 <span className="font-semibold text-[#191F28]">{active.contact}</span>
 <button
 onClick={() => navigator.clipboard?.writeText(active.contact)}
 className="ml-auto text-[11px] text-[#3182F6] font-semibold hover:underline"
 >
 복사
 </button>
 </div>
 )}

 <div>
 <div className="text-xs font-black text-[#8B95A1] mb-1.5">문의 내용</div>
 <div className="text-sm text-[#191F28] leading-relaxed whitespace-pre-wrap bg-[#F9FAFB] rounded-xl p-4">
 {active.message}
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between mb-1.5">
 <div className="text-xs font-black text-[#8B95A1]">관리자 답변</div>
 {active.repliedAt && (
 <span className="text-[10px] text-[#8B95A1]">마지막 저장 {formatDate(active.repliedAt)}</span>
 )}
 </div>
 <textarea
 value={replyDraft}
 onChange={e => setReplyDraft(e.target.value)}
 rows={6}
 placeholder="답변 내용을 작성해주세요. 저장하면 고객 문의내역에 자동으로 반영됩니다."
 className="w-full border border-[#E5E8EB] rounded-xl p-3 text-sm leading-relaxed focus:outline-none focus:border-[#3182F6] resize-none"
 />
 </div>

 {actionMsg && (
 <div className="text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] rounded-lg px-3 py-2">
 {actionMsg}
 </div>
 )}

 <div className="flex flex-col md:flex-row gap-2 pt-2">
 <button
 onClick={sendReply}
 disabled={savingReply}
 className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3182F6] text-white font-bold text-sm hover:bg-[#1B64DA] disabled:opacity-60"
 >
 <Send size={14} strokeWidth={2.5} />
 {savingReply ? '저장 중…' : (active.reply ? '답변 수정 저장' : '답변 전송')}
 </button>
 {active.status !== 'completed' ? (
 <button
 onClick={markCompleted}
 disabled={markingDone}
 className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#10B981] text-white font-bold text-sm hover:bg-[#059669] disabled:opacity-60"
 >
 <CheckCircle2 size={14} strokeWidth={2.5} />
 {markingDone ? '처리 중…' : '완료 처리'}
 </button>
 ) : (
 <button
 onClick={reopen}
 disabled={markingDone}
 className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-[#E5E8EB] text-[#4E5968] font-bold text-sm hover:bg-[#F9FAFB] disabled:opacity-60"
 >
 {markingDone ? '처리 중…' : '재오픈'}
 </button>
 )}
 </div>

 <p className="text-[10px] text-[#8B95A1] text-center pt-2">
 답변 저장 시 고객의 <Link href="/inquiry" className="text-[#3182F6] font-semibold">내 문의 내역</Link> 에 자동으로 표시됩니다.
 </p>
 </div>
 </div>
 </div>
 )}

 <p className="text-[10px] text-[#8B95A1] mt-5 text-center">
 * 현재 저장소는 서버 메모리(재배포 시 초기화) + localStorage(고객 측) 조합입니다. Supabase 이관 시 영속 보장.
 </p>
 </div>
 )
}
