'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Send, RefreshCw, Clock, CheckCircle2, XCircle, Loader2, User } from 'lucide-react'

type TesterRequest = {
 id: string
 user_id: string
 instagram_id: string
 store_name: string | null
 contact: string | null
 status: 'pending' | 'processing' | 'done' | 'rejected'
 memo: string | null
 created_at: string
 updated_at: string
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
 pending: { label: '대기중', color: '#92400E', bg: '#FEF3C7' },
 processing: { label: '처리중', color: '#1E40AF', bg: '#DBEAFE' },
 done: { label: '등록완료', color: '#065F46', bg: '#D1FAE5' },
 rejected: { label: '거절', color: '#991B1B', bg: '#FEE2E2' },
}

export default function ThreadsTestersPage() {
 const [rows, setRows] = useState<TesterRequest[]>([])
 const [loading, setLoading] = useState(true)
 const [err, setErr] = useState<string | null>(null)
 const [updating, setUpdating] = useState<string | null>(null)
 const [memo, setMemo] = useState<Record<string, string>>({})

 const load = useCallback(async () => {
 setLoading(true)
 setErr(null)
 try {
 const res = await fetch('/api/threads/admin/tester-requests')
 const json = await res.json()
 if (!json.ok) { setErr(json.error || '로드 실패'); return }
 setRows(json.requests ?? [])
 } catch (e) {
 setErr(e instanceof Error ? e.message : '네트워크 오류')
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => { load() }, [load])

 async function updateStatus(id: string, status: string) {
 setUpdating(id)
 try {
 const res = await fetch('/api/threads/admin/tester-requests', {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ id, status, memo: memo[id] ?? null }),
 })
 const json = await res.json()
 if (json.ok) {
 setRows(prev => prev.map(r => r.id === id ? { ...r, status: status as TesterRequest['status'] } : r))
 }
 } finally {
 setUpdating(null)
 }
 }

 const counts = {
 total: rows.length,
 pending: rows.filter(r => r.status === 'pending').length,
 processing: rows.filter(r => r.status === 'processing').length,
 done: rows.filter(r => r.status === 'done').length,
 }

 return (
 <div className="p-4 md:p-8 max-w-6xl mx-auto">
 <header className="mb-6 flex items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <div className="w-9 h-9 bg-gradient-to-br from-[#111827] to-[#374151] rounded-xl flex items-center justify-center">
 <Send size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <h1 className="text-2xl font-black text-[#191F28] tracking-tight">Threads 테스터 신청</h1>
 </div>
 <p className="text-sm text-[#8B95A1] ml-12">
 신청자를 Meta Developer에서 테스터로 추가한 후 상태를 업데이트하세요
 </p>
 </div>
 <button onClick={load} className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] bg-white border border-[#E5E8EB] rounded-xl px-3 py-2 transition-colors">
 <RefreshCw size={13} strokeWidth={2} />
 새로고침
 </button>
 </header>

 {/* 통계 */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
 {[
 { label: '전체', value: counts.total, color: '#6B7280' },
 { label: '대기중', value: counts.pending, color: '#D97706' },
 { label: '처리중', value: counts.processing, color: '#2563EB' },
 { label: '등록완료', value: counts.done, color: '#059669' },
 ].map(s => (
 <div key={s.label} className="bg-white rounded-xl border border-[#E5E8EB] p-4 text-center">
 <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
 <div className="text-xs text-[#8B95A1] mt-0.5">{s.label}</div>
 </div>
 ))}
 </div>

 {err && (
 <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-sm rounded-xl p-4 mb-5">{err}</div>
 )}

 {loading ? (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#9CA3AF]" strokeWidth={2} />
 </div>
 ) : rows.length === 0 ? (
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-12 text-center">
 <div className="w-12 h-12 bg-[#F9FAFB] rounded-xl flex items-center justify-center mx-auto mb-3">
 <User size={20} className="text-[#9CA3AF]" strokeWidth={2} />
 </div>
 <p className="text-sm font-semibold text-[#374151]">신청 내역이 없습니다</p>
 <p className="text-xs text-[#9CA3AF] mt-1">고객이 연결 페이지에서 신청하면 여기에 표시됩니다</p>
 </div>
 ) : (
 <div className="space-y-3">
 {rows.map(row => {
 const sm = STATUS_META[row.status] ?? STATUS_META.pending
 const isUpdating = updating === row.id
 return (
 <div key={row.id} className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-5">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap mb-2">
 <span
 className="text-xs font-bold px-2.5 py-1 rounded-full"
 style={{ color: sm.color, backgroundColor: sm.bg }}
 >
 {sm.label}
 </span>
 <span className="text-xs text-[#9CA3AF]">
 {new Date(row.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-base font-black text-[#111827]">@{row.instagram_id}</span>
 {row.store_name && (
 <span className="text-sm text-[#6B7280]">· {row.store_name}</span>
 )}
 </div>
 <div className="text-xs text-[#9CA3AF] font-mono truncate">{row.user_id}</div>
 {row.memo && (
 <div className="mt-2 text-xs text-[#6B7280] bg-[#F9FAFB] rounded-lg px-3 py-2">{row.memo}</div>
 )}
 </div>

 {/* 액션 */}
 <div className="flex flex-col gap-2 flex-shrink-0">
 {row.status === 'pending' && (
 <button
 onClick={() => updateStatus(row.id, 'processing')}
 disabled={isUpdating}
 className="flex items-center gap-1.5 text-xs font-semibold bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
 >
 {isUpdating ? <Loader2 size={12} className="animate-spin" strokeWidth={2} /> : <Clock size={12} strokeWidth={2.5} />}
 처리중으로
 </button>
 )}
 {(row.status === 'pending' || row.status === 'processing') && (
 <button
 onClick={() => updateStatus(row.id, 'done')}
 disabled={isUpdating}
 className="flex items-center gap-1.5 text-xs font-semibold bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
 >
 {isUpdating ? <Loader2 size={12} className="animate-spin" strokeWidth={2} /> : <CheckCircle2 size={12} strokeWidth={2.5} />}
 등록 완료
 </button>
 )}
 {row.status !== 'rejected' && row.status !== 'done' && (
 <button
 onClick={() => updateStatus(row.id, 'rejected')}
 disabled={isUpdating}
 className="flex items-center gap-1.5 text-xs font-semibold bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
 >
 {isUpdating ? <Loader2 size={12} className="animate-spin" strokeWidth={2} /> : <XCircle size={12} strokeWidth={2.5} />}
 거절
 </button>
 )}
 </div>
 </div>

 {/* 메모 입력 */}
 {row.status !== 'done' && row.status !== 'rejected' && (
 <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
 <input
 type="text"
 value={memo[row.id] ?? ''}
 onChange={e => setMemo(prev => ({ ...prev, [row.id]: e.target.value }))}
 placeholder="처리 메모 (선택)"
 className="w-full text-xs px-3 py-2 border border-[#E5E8EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3182F6]/30 focus:border-[#3182F6] bg-[#F9FAFB]"
 />
 </div>
 )}
 </div>
 )
 })}
 </div>
 )}
 </div>
 )
}
