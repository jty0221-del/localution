'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '../../lib/adminFetch'
import { MessageSquare, ArrowRight, Clock, CheckCircle2, Inbox, AlertCircle, Circle, Coins, Users, UserCheck, type LucideIcon } from 'lucide-react'
import {
 LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
 BarChart, Bar, Cell, Legend,
} from 'recharts'

type Overview = {
 subscriptions: { active: number; past_due: number; cancelled: number; total: number }
 mrr_krw: number
 users_total: number
 customers_total: number
 loaded: boolean
}

type InquirySummary = {
 total: number; new: number; replied: number; completed: number
}
type InquiryLite = {
 id: string; name: string; category: string; message: string;
 status: 'new' | 'replied' | 'completed'; createdAt: string
}

const EMPTY: Overview = {
 subscriptions: { active: 0, past_due: 0, cancelled: 0, total: 0 },
 mrr_krw: 0,
 users_total: 0,
 customers_total: 0,
 loaded: false,
}

const INQ_STATUS: Record<InquiryLite['status'], { label: string; bg: string; color: string }> = {
 new: { label: '신규', bg: '#FEF3C7', color: '#92400E' },
 replied: { label: '답변완료', bg: '#DBEAFE', color: '#1E40AF' },
 completed: { label: '처리완료', bg: '#D1FAE5', color: '#065F46' },
}

function fmtInqDate(iso: string) {
 const d = new Date(iso)
 return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 지난 6개월 mock 추이 (실제 데이터 누적 전 시뮬레이션)
function buildMrrTrend(currentMrr: number) {
 // 현재 MRR을 최신 포인트로 두고 과거 5개월은 감소 곡선
 const curve = [0.42, 0.58, 0.67, 0.79, 0.9, 1]
 const now = new Date()
 return curve.map((r, i) => {
 const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
 const label = `${String(d.getMonth() + 1).padStart(2, '0')}월`
 const base = currentMrr > 0 ? currentMrr : 1_200_000 // mock fallback
 return { month: label, mrr: Math.round(base * r) }
 })
}

// 모듈별 활성 구독 mock 분포 (Phase 0 카탈로그 기준 + 25차 신규 3종 포함)
function buildModuleDist(totalActive: number) {
 const weights = [
 { module: '리뷰관리', w: 0.22, color: '#3182F6' },
 { module: '키워드', w: 0.17, color: '#10B981' },
 { module: '블로그AI', w: 0.12, color: '#06B6D4' },
 { module: '릴스', w: 0.10, color: '#F43F5E' },
 { module: 'QR체험단', w: 0.08, color: '#8B5CF6' },
 { module: '고객관리', w: 0.07, color: '#F97316' },
 { module: '커뮤니티', w: 0.04, color: '#14B8A6' },
 { module: '카드뉴스', w: 0.08, color: '#EC4899' }, // 25차 신규
 { module: '플랫폼허브', w: 0.07, color: '#6366F1' }, // 25차 신규
 { module: '블로그순위', w: 0.05, color: '#D97706' }, // 25차 신규
 ]
 const base = totalActive > 0 ? totalActive : 100 // mock fallback
 return weights.map(w => ({
 module: w.module,
 count: Math.max(1, Math.round(base * w.w)),
 color: w.color,
 }))
}

export default function AdminDashboardPage() {
 const [data, setData] = useState<Overview>(EMPTY)
 const [err, setErr] = useState<string | null>(null)
 const [inqSummary, setInqSummary] = useState<InquirySummary>({ total: 0, new: 0, replied: 0, completed: 0 })
 const [inqRecent, setInqRecent] = useState<InquiryLite[]>([])
 const [inqLoaded, setInqLoaded] = useState(false)

 useEffect(() => {
 (async () => {
 try {
 const res = await adminFetch('/api/admin/overview')
 if (!res.ok) {
 setErr(`오버뷰 로드 실패 (${res.status})`)
 return
 }
 const json = await res.json()
 setData({ ...json, loaded: true })
 } catch (e) {
 setErr(e instanceof Error ? e.message : 'fetch error')
 }
 })()
 }, [])

 useEffect(() => {
 (async () => {
 try {
 const res = await adminFetch('/api/inquiry')
 if (!res.ok) { setInqLoaded(true); return }
 const json = await res.json()
 if (json.summary) setInqSummary(json.summary)
 if (Array.isArray(json.inquiries)) setInqRecent(json.inquiries.slice(0, 5))
 } catch {}
 finally { setInqLoaded(true) }
 })()
 }, [])

 const mrrTrend = useMemo(() => buildMrrTrend(data.mrr_krw), [data.mrr_krw])
 const moduleDist = useMemo(() => buildModuleDist(data.subscriptions.active), [data.subscriptions.active])

 const kpis: { label: string; value: number; Icon: LucideIcon; color: string; krw?: boolean }[] = [
 { label: '활성 구독', value: data.subscriptions.active, Icon: CheckCircle2, color: '#16A34A' },
 { label: '연체 구독', value: data.subscriptions.past_due, Icon: AlertCircle, color: '#CA8A04' },
 { label: '해지 구독', value: data.subscriptions.cancelled, Icon: Circle, color: '#8B95A1' },
 { label: '월 예상 매출', value: data.mrr_krw, Icon: Coins, color: '#3182F6', krw: true },
 { label: '가입 사용자', value: data.users_total, Icon: Users, color: '#7C3AED' },
 { label: '등록 고객 합계', value: data.customers_total, Icon: UserCheck, color: '#F59E0B' },
 ]

 return (
 <div className="p-4 md:p-8 max-w-6xl mx-auto">
 <header className="mb-6">
 <h1 className="text-2xl font-black text-[#191F28] tracking-tight">대시보드</h1>
 <p className="text-sm text-[#8B95A1] mt-1">전체 구독 · 매출 · 사용자 · CRM 현황</p>
 </header>

 {err && (
 <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-sm rounded-xl p-4 mb-5">
 {err} — 서비스 롤 키 또는 RLS 설정을 확인해주세요.
 </div>
 )}

 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
 {kpis.map(k => (
 <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: k.color + '15', color: k.color }}>
 <k.Icon size={18} strokeWidth={2.5} />
 </div>
 <div className="text-2xl md:text-3xl font-black" style={{ color: k.color }}>
 {!data.loaded ? '—' : k.krw ? `₩${k.value.toLocaleString()}` : k.value.toLocaleString()}
 </div>
 <div className="text-xs text-[#8B95A1] font-medium mt-1">{k.label}</div>
 </div>
 ))}
 </div>

 {/* MRR 6개월 추이 + 모듈별 분포 (2-col on md) */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
 <div className="bg-white rounded-2xl shadow-sm p-5">
 <div className="flex items-center justify-between mb-3">
 <div>
 <h2 className="font-black text-[#191F28]">월 예상 매출 추이</h2>
 <p className="text-[11px] text-[#8B95A1] mt-0.5">최근 6개월 · 실데이터 누적 전 mock 곡선</p>
 </div>
 <span className="text-[10px] font-bold text-[#3182F6] bg-[#EFF6FF] px-2 py-0.5 rounded-full">DEMO</span>
 </div>
 <div className="w-full h-[220px]">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={mrrTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
 <defs>
 <linearGradient id="mrrStroke" x1="0" y1="0" x2="1" y2="0">
 <stop offset="0%" stopColor="#3182F6" />
 <stop offset="100%" stopColor="#10B981" />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
 <XAxis dataKey="month" stroke="#8B95A1" fontSize={11} tickLine={false} axisLine={false} />
 <YAxis
 stroke="#8B95A1"
 fontSize={11}
 tickLine={false}
 axisLine={false}
 tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${Math.round(v/1000)}K`}
 />
 <Tooltip
 formatter={(v: number) => [`₩${v.toLocaleString()}`, 'MRR']}
 contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 12, fontSize: 12 }}
 />
 <Line
 type="monotone"
 dataKey="mrr"
 stroke="url(#mrrStroke)"
 strokeWidth={3}
 dot={{ r: 4, fill: '#3182F6', stroke: '#fff', strokeWidth: 2 }}
 activeDot={{ r: 6 }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 <div className="bg-white rounded-2xl shadow-sm p-5">
 <div className="flex items-center justify-between mb-3">
 <div>
 <h2 className="font-black text-[#191F28]">모듈별 활성 구독</h2>
 <p className="text-[11px] text-[#8B95A1] mt-0.5">Phase 0 카탈로그 + 25차 신규 3종 · mock 가중치</p>
 </div>
 <div className="flex items-center gap-1">
 <span className="text-[10px] font-bold text-[#EC4899] bg-[#FDF2F8] px-2 py-0.5 rounded-full">+3 NEW</span>
 <span className="text-[10px] font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full">DEMO</span>
 </div>
 </div>
 <div className="w-full h-[240px]">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={moduleDist} margin={{ top: 8, right: 12, left: -12, bottom: 20 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
 <XAxis
 dataKey="module"
 stroke="#8B95A1"
 fontSize={9}
 tickLine={false}
 axisLine={false}
 interval={0}
 angle={-30}
 textAnchor="end"
 height={40}
 />
 <YAxis stroke="#8B95A1" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
 <Tooltip
 formatter={(v: number) => [`${v}건`, '활성']}
 contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 12, fontSize: 12 }}
 />
 <Bar dataKey="count" radius={[6, 6, 0, 0]}>
 {moduleDist.map((entry, i) => (
 <Cell key={i} fill={entry.color} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-2xl shadow-sm p-5">
 <div className="flex items-center justify-between mb-3">
 <h2 className="font-black text-[#191F28]">구독 상태 분포</h2>
 <span className="text-xs text-[#8B95A1]">총 {data.subscriptions.total}건</span>
 </div>
 <div className="space-y-2">
 {[
 { label: '활성', value: data.subscriptions.active, color: '#16A34A' },
 { label: '연체', value: data.subscriptions.past_due, color: '#CA8A04' },
 { label: '해지', value: data.subscriptions.cancelled, color: '#8B95A1' },
 ].map(row => {
 const pct = data.subscriptions.total > 0
 ? Math.round((row.value / data.subscriptions.total) * 100)
 : 0
 return (
 <div key={row.label}>
 <div className="flex justify-between text-xs text-[#4E5968] font-semibold mb-1">
 <span>{row.label}</span>
 <span>{row.value}건 · {pct}%</span>
 </div>
 <div className="w-full bg-[#F2F4F6] rounded-full h-2">
 <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: row.color }} />
 </div>
 </div>
 )
 })}
 </div>
 </div>

 {/* 1:1 문의 요약 + 최근 5건 */}
 <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
 <MessageSquare size={16} strokeWidth={2.25} className="text-[#3182F6]" />
 </div>
 <div>
 <h2 className="font-black text-[#191F28]">1:1 문의 관리</h2>
 <p className="text-[11px] text-[#8B95A1] mt-0.5">고객 문의 종합 조회 · 답변 작성 · 완료 처리</p>
 </div>
 </div>
 <Link
 href="/admin/inquiries"
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3182F6] text-white text-xs font-bold hover:bg-[#1B64DA]"
 >
 관리 페이지 열기 <ArrowRight size={12} strokeWidth={2.5} />
 </Link>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
 {[
 { label: '전체', value: inqSummary.total, icon: Inbox, color: '#3182F6', bg: '#EFF6FF' },
 { label: '신규', value: inqSummary.new, icon: Clock, color: '#92400E', bg: '#FEF3C7' },
 { label: '답변완료', value: inqSummary.replied, icon: MessageSquare, color: '#1E40AF', bg: '#DBEAFE' },
 { label: '처리완료', value: inqSummary.completed, icon: CheckCircle2, color: '#065F46', bg: '#D1FAE5' },
 ].map(k => {
 const Icon = k.icon
 return (
 <div key={k.label} className="rounded-xl p-3" style={{ background: k.bg }}>
 <div className="flex items-center justify-between">
 <Icon size={14} strokeWidth={2.5} style={{ color: k.color }} />
 <span className="text-xl font-black" style={{ color: k.color }}>
 {inqLoaded ? k.value.toLocaleString() : '—'}
 </span>
 </div>
 <div className="text-[10px] font-bold mt-0.5" style={{ color: k.color }}>{k.label}</div>
 </div>
 )
 })}
 </div>

 <div className="border border-[#F2F4F6] rounded-xl overflow-hidden">
 <div className="px-4 py-2.5 border-b border-[#F2F4F6] bg-[#FAFBFF] text-[11px] text-[#8B95A1] font-bold">
 최근 문의 {inqRecent.length === 0 ? '' : `5건`}
 </div>
 {!inqLoaded ? (
 <div className="px-4 py-6 text-center text-xs text-[#8B95A1]">불러오는 중…</div>
 ) : inqRecent.length === 0 ? (
 <div className="px-4 py-6 text-center text-xs text-[#8B95A1]">아직 접수된 문의가 없습니다.</div>
 ) : (
 <ul className="divide-y divide-[#F2F4F6]">
 {inqRecent.map(inq => {
 const m = INQ_STATUS[inq.status]
 return (
 <li key={inq.id} className="px-4 py-2.5 flex items-center gap-3">
 <span
 className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
 style={{ background: m.bg, color: m.color }}
 >
 {m.label}
 </span>
 <span className="text-[11px] font-bold text-[#191F28] flex-shrink-0">{inq.name}</span>
 <span className="text-[11px] text-[#4E5968] line-clamp-1 flex-1">{inq.message}</span>
 <span className="text-[10px] text-[#8B95A1] flex-shrink-0">{fmtInqDate(inq.createdAt)}</span>
 </li>
 )
 })}
 </ul>
 )}
 </div>
 </div>

 <p className="text-[10px] text-[#8B95A1] mt-4 text-center">
 * 차트의 <span className="font-bold">DEMO</span> 배지 표시 영역은 실 구독 데이터 누적 전까지 mock 곡선/가중치로 표시됩니다.
 </p>
 </div>
 )
}
