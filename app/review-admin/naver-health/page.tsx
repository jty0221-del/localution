'use client'
// ============================================================
// /review-admin/naver-health — 네이버 AI 답글 시스템 진단
// · 일반 로그인 사용자 접근 가능 (관리자 불필요)
// · API: GET /api/admin/naver-health
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
 RefreshCw, CheckCircle2, AlertTriangle, XCircle,
 MinusCircle, ExternalLink, Clock, Wifi, Database,
 Key, Activity, ArrowLeft, Zap,
} from 'lucide-react'

type CheckStatus = 'ok' | 'warn' | 'error' | 'skip'

interface CheckItem {
 id: string
 label: string
 category: string
 status: CheckStatus
 message: string
 detail?: string | null
 value?: string | number | null
 action_url?: string | null
}

interface HealthReport {
 ok: boolean
 overall: CheckStatus
 checked_at: string
 checks: CheckItem[]
 summary: { ok: number; warn: number; error: number; skip: number }
}

const STATUS_STYLE: Record<CheckStatus, {
 badge: string; icon: React.ReactNode; label: string
}> = {
 ok: {
 badge: 'bg-[#DCFCE7] text-[#166534]',
 icon: <CheckCircle2 size={17} className="text-[#22C55E]" />,
 label: '정상',
 },
 warn: {
 badge: 'bg-[#FEF3C7] text-[#92400E]',
 icon: <AlertTriangle size={17} className="text-[#F59E0B]" />,
 label: '주의',
 },
 error: {
 badge: 'bg-[#FFE4E6] text-[#9F1239]',
 icon: <XCircle size={17} className="text-[#F43F5E]" />,
 label: '오류',
 },
 skip: {
 badge: 'bg-[#F1F5F9] text-[#64748B]',
 icon: <MinusCircle size={17} className="text-[#94A3B8]" />,
 label: '건너뜀',
 },
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
 '환경변수': <Key size={13} />,
 '연동 상태': <Database size={13} />,
 '리뷰 수집': <Activity size={13} />,
 '크론 상태': <Clock size={13} />,
 'API 테스트': <Wifi size={13} />,
 'AI 상태': <Zap size={13} />,
}

const CATEGORY_ORDER = ['환경변수', '연동 상태', '리뷰 수집', '크론 상태', 'API 테스트', 'AI 상태']

const OVERALL_BG: Record<CheckStatus, string> = {
 ok: 'from-[#DCFCE7] to-[#F0FDF4] border-[#86EFAC]',
 warn: 'from-[#FEF3C7] to-[#FFFBEB] border-[#FCD34D]',
 error: 'from-[#FFE4E6] to-[#FFF1F2] border-[#FDA4AF]',
 skip: 'from-[#F1F5F9] to-[#F8FAFC] border-[#CBD5E1]',
}
const OVERALL_ICON: Record<CheckStatus, React.ReactNode> = {
 ok: <CheckCircle2 size={32} className="text-[#22C55E]" />,
 warn: <AlertTriangle size={32} className="text-[#F59E0B]" />,
 error: <XCircle size={32} className="text-[#F43F5E]" />,
 skip: <MinusCircle size={32} className="text-[#94A3B8]" />,
}
const OVERALL_TITLE: Record<CheckStatus, string> = {
 ok: '네이버 AI 시스템 정상',
 warn: '일부 항목 주의 필요',
 error: '오류 발견 — 즉시 확인 필요',
 skip: '진단 대기 중',
}

export default function NaverHealthPage() {
 const [report, setReport] = useState<HealthReport | null>(null)
 const [loading, setLoading] = useState(false)
 const [err, setErr] = useState<string | null>(null)
 const [lastAt, setLastAt] = useState<Date | null>(null)
 const [countdown, setCountdown] = useState(60)
 const [autoRefresh, setAuto] = useState(true)
 const timer = useRef<ReturnType<typeof setInterval> | null>(null)
 const ticker = useRef<ReturnType<typeof setInterval> | null>(null)

 const fetchHealth = useCallback(async () => {
 setLoading(true); setErr(null)
 try {
 const r = await fetch('/api/admin/naver-health', { cache: 'no-store' })
 if (r.status === 401) {
 setErr('로그인이 필요합니다. 로그인 후 다시 시도해 주세요.')
 return
 }
 const j = await r.json()
 if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
 setReport(j); setLastAt(new Date()); setCountdown(60)
 } catch (e) {
 setErr(e instanceof Error ? e.message : '진단 실패')
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => { fetchHealth() }, [fetchHealth])

 useEffect(() => {
 if (!autoRefresh) {
 timer.current && clearInterval(timer.current)
 ticker.current && clearInterval(ticker.current)
 return
 }
 timer.current = setInterval(fetchHealth, 60000)
 ticker.current = setInterval(() => setCountdown(p => p <= 1 ? 60 : p - 1), 1000)
 return () => {
 timer.current && clearInterval(timer.current)
 ticker.current && clearInterval(ticker.current)
 }
 }, [autoRefresh, fetchHealth])

 const grouped = CATEGORY_ORDER.map(cat => ({
 cat,
 items: (report?.checks ?? []).filter(c => c.category === cat),
 })).filter(g => g.items.length > 0)

 const overall = report?.overall ?? 'skip'
 const summary = report?.summary

 return (
 <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8">
 <div className="max-w-3xl mx-auto">

 {/* 헤더 */}
 <div className="mb-5 flex flex-wrap items-center gap-3">
 <Link href="/review-admin/naver"
 className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] transition">
 <ArrowLeft size={15} /> 리뷰 관리로 돌아가기
 </Link>
 <div className="ml-auto flex items-center gap-2">
 {lastAt && (
 <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
 <Clock size={11} />
 {lastAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
 </span>
 )}
 <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
 <div
 onClick={() => setAuto(p => !p)}
 className={`relative w-8 h-[18px] rounded-full transition-colors ${autoRefresh ? 'bg-[#22C55E]' : 'bg-[#CBD5E1]'}`}
 >
 <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${autoRefresh ? 'left-[18px]' : 'left-0.5'}`} />
 </div>
 <span className="text-[11px] text-[#4E5968]">
 {autoRefresh ? `${countdown}s` : 'off'}
 </span>
 </label>
 <button
 onClick={fetchHealth}
 disabled={loading}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F172A] text-white text-[12px] font-bold hover:bg-[#1E293B] disabled:opacity-50 transition"
 >
 <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
 {loading ? '체크 중' : '다시 체크'}
 </button>
 </div>
 </div>

 <div className="mb-5">
 <h1 className="text-lg font-black text-[#0F172A]">네이버 AI 시스템 진단</h1>
 <p className="text-[12px] text-[#64748B] mt-0.5">
 Claude AI · 네이버 API · 리뷰 수집 · 크론 상태를 실시간으로 확인합니다.
 </p>
 </div>

 {/* 에러 */}
 {err && (
 <div className="mb-4 p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-[13px] flex items-start gap-2">
 <XCircle size={14} className="mt-0.5 flex-shrink-0" />
 {err}
 </div>
 )}

 {/* 로딩 스켈레톤 */}
 {loading && !report && (
 <div className="space-y-3">
 {[1, 2, 3].map(i => (
 <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-[#F1F5F9]" />
 ))}
 </div>
 )}

 {report && (
 <>
 {/* Overall 배너 */}
 <div className={`mb-5 p-4 rounded-2xl bg-gradient-to-r border ${OVERALL_BG[overall]}`}>
 <div className="flex items-center gap-3">
 <div className="flex-shrink-0">{OVERALL_ICON[overall]}</div>
 <div className="flex-1">
 <div className="text-sm font-bold text-[#0F172A]">{OVERALL_TITLE[overall]}</div>
 {summary && (
 <div className="flex flex-wrap gap-1.5 mt-1.5">
 {[
 { label: '정상', count: summary.ok, cls: 'bg-[#DCFCE7] text-[#166534]' },
 { label: '주의', count: summary.warn, cls: 'bg-[#FEF3C7] text-[#92400E]' },
 { label: '오류', count: summary.error, cls: 'bg-[#FFE4E6] text-[#9F1239]' },
 { label: '건너뜀', count: summary.skip, cls: 'bg-[#F1F5F9] text-[#64748B]' },
 ].map(s => (
 <span key={s.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.cls}`}>
 {s.label} {s.count}
 </span>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>

 {/* 카테고리별 체크 */}
 <div className="space-y-3">
 {grouped.map(({ cat, items }) => (
 <div key={cat} className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
 <div className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] border-b border-[#F1F5F9]">
 <span className="text-[#64748B]">{CATEGORY_ICON[cat]}</span>
 <span className="text-[11px] font-bold text-[#334155]">{cat}</span>
 <span className="ml-auto text-[10px] text-[#94A3B8]">{items.length}개</span>
 </div>
 <div className="divide-y divide-[#F1F5F9]">
 {items.map(item => {
 const sc = STATUS_STYLE[item.status]
 return (
 <div key={item.id} className="px-4 py-3 flex items-start gap-3">
 <div className="flex-shrink-0 mt-0.5">{sc.icon}</div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
 <span className="text-[12px] font-semibold text-[#1E293B]">{item.label}</span>
 <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold ${sc.badge}`}>
 {sc.label}
 </span>
 </div>
 <p className="text-[11px] text-[#475569]">{item.message}</p>
 {item.detail && (
 <p className="text-[10px] text-[#94A3B8] mt-0.5">{item.detail}</p>
 )}
 </div>
 {item.value != null && (
 <div className="flex-shrink-0 text-right">
 <span className="text-[16px] font-black text-[#1E293B]">{item.value}</span>
 <p className="text-[9px] text-[#94A3B8]">건</p>
 </div>
 )}
 {item.action_url && (
 <a
 href={item.action_url}
 target={item.action_url.startsWith('http') ? '_blank' : '_self'}
 rel="noopener noreferrer"
 className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E2E8F0] text-[10px] font-semibold text-[#475569] hover:text-[#3182F6] hover:border-[#3182F6] bg-white transition"
 >
 {item.action_url.startsWith('http') ? '설정' : '이동'}
 <ExternalLink size={9} />
 </a>
 )}
 </div>
 )
 })}
 </div>
 </div>
 ))}
 </div>

 <div className="mt-3 text-center text-[10px] text-[#CBD5E1]">
 진단 시각: {new Date(report.checked_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
 </div>
 </>
 )}
 </div>
 </div>
 )
}
