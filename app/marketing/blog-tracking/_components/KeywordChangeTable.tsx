'use client'

/**
 * /marketing/blog-tracking/_components/KeywordChangeTable.tsx (20차-1)
 *
 * 키워드 변동 요약표 + 스파크라인
 * · 기간 토글: 7일 / 30일 / 기간선택
 * · 정렬 토글: 변동폭 / 현재순위 / 이름 / 등록순
 * · 행 클릭 시 상세 모달이 아닌, 상위 페이지의 카드 뷰로 이동시키는 건
 * 별도 콜백(onSelect)으로 확장. 현재는 테이블만 담당.
 *
 * 외부 의존 zero — inline SVG sparkline.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
 ArrowDown, ArrowUp, Minus, Calendar, TrendingUp, TrendingDown,
 Loader2, AlertCircle, ExternalLink,
} from 'lucide-react'

type SeriesPoint = { date: string; rank: number | null }
type TargetSeries = {
 target_id: string
 label: string
 keyword: string
 target_url: string
 last_rank: number | null
 last_checked_at: string | null
 created_at: string
 series: SeriesPoint[]
 first_rank: number | null
 best_rank: number | null
 worst_rank: number | null
 avg_rank: number | null
 delta: number | null
 delta_abs: number
 points_count: number
}

type PeriodPreset = 7 | 30 | 'custom'
type SortKey = 'delta' | 'current' | 'name' | 'created'

function rankColor(rank: number | null): string {
 if (rank === null) return '#8B95A1'
 if (rank <= 3) return '#03C75A'
 if (rank <= 10) return '#22C55E'
 if (rank <= 30) return '#3182F6'
 return '#F5A623'
}
function rankBadge(rank: number | null): { label: string; cls: string } {
 if (rank === null) return { label: '미노출', cls: 'bg-[#F2F4F6] text-[#8B95A1] border-[#E5E8EB]' }
 if (rank <= 3) return { label: `${rank}위`, cls: 'bg-[#03C75A] text-white border-[#03C75A]' }
 if (rank <= 10) return { label: `${rank}위`, cls: 'bg-[#E8F6EA] text-[#03C75A] border-[#C7E9CE]' }
 if (rank <= 30) return { label: `${rank}위`, cls: 'bg-[#E8F1FE] text-[#3182F6] border-[#CFDFFC]' }
 return { label: `${rank}위`, cls: 'bg-[#FEF9E8] text-[#F5A623] border-[#FCEBC0]' }
}

// 스파크라인: 낮은 순위(=숫자 작음)가 위로 올라가는 차트
function Sparkline({ series, width = 120, height = 36 }: { series: SeriesPoint[]; width?: number; height?: number }) {
 const measured = series.filter(p => p.rank !== null) as { date: string; rank: number }[]
 if (measured.length === 0) {
 return (
 <svg width={width} height={height} className="overflow-visible">
 <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#E5E8EB" strokeWidth={1} strokeDasharray="2,2" />
 <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize="10" fill="#8B95A1">데이터 없음</text>
 </svg>
 )
 }
 const ranks = measured.map(p => p.rank)
 const minR = Math.min(...ranks)
 const maxR = Math.max(...ranks)
 const padY = 4
 const usableH = height - padY * 2
 const getY = (r: number) => {
 if (maxR === minR) return height / 2
 // 낮은 순위(1위)가 위로 -> rank 값이 작을수록 y가 작아야 함
 const t = (r - minR) / (maxR - minR)
 return padY + t * usableH
 }
 const n = series.length
 const stepX = n > 1 ? width / (n - 1) : 0
 const pts = series.map((p, i) => {
 const x = i * stepX
 if (p.rank === null) return null
 return { x, y: getY(p.rank as number), rank: p.rank as number, date: p.date }
 })

 // 연결된 구간만 선으로 그림 (null 은 끊음)
 const segs: { x: number; y: number }[][] = []
 let cur: { x: number; y: number }[] = []
 for (const pt of pts) {
 if (pt === null) {
 if (cur.length) { segs.push(cur); cur = [] }
 } else {
 cur.push({ x: pt.x, y: pt.y })
 }
 }
 if (cur.length) segs.push(cur)

 const last = pts.filter(Boolean).pop() as { x: number; y: number; rank: number } | undefined
 const first = pts.find(Boolean) as { x: number; y: number; rank: number } | undefined
 const stroke = last ? rankColor(last.rank) : '#8B95A1'

 return (
 <svg width={width} height={height} className="overflow-visible">
 {/* baseline */}
 <line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke="#F2F4F6" strokeWidth={1} />
 {segs.map((seg, idx) => {
 if (seg.length === 1) {
 return <circle key={idx} cx={seg[0].x} cy={seg[0].y} r={1.8} fill={stroke} />
 }
 const d = seg.map((s, i) => (i === 0 ? `M ${s.x} ${s.y}` : `L ${s.x} ${s.y}`)).join(' ')
 return <path key={idx} d={d} stroke={stroke} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
 })}
 {/* 시작/끝 점 강조 */}
 {first && <circle cx={first.x} cy={first.y} r={2} fill="#CFDFFC" stroke={stroke} strokeWidth={1} />}
 {last && <circle cx={last.x} cy={last.y} r={2.5} fill={stroke} />}
 </svg>
 )
}

function DeltaTag({ delta }: { delta: number | null }) {
 if (delta === null) return <span className="inline-flex items-center gap-1 text-[11px] text-[#8B95A1]"><Minus size={11} />—</span>
 if (delta === 0) return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4E5968]"><Minus size={11} />0</span>
 if (delta > 0) {
 // 상승 (first rank 숫자 > last rank 숫자)
 return (
 <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#03C75A]">
 <TrendingUp size={12} />▲{delta}
 </span>
 )
 }
 return (
 <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#EF4444]">
 <TrendingDown size={12} />▼{Math.abs(delta)}
 </span>
 )
}

function fmtDate(iso: string | null): string {
 if (!iso) return '—'
 try {
 const d = new Date(iso)
 return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
 } catch { return iso }
}

function isoDay(d: Date): string {
 const k = new Date(d.getTime() + 9 * 60 * 60 * 1000)
 return k.toISOString().slice(0, 10)
}

export default function KeywordChangeTable({
 reloadToken,
 onClose,
}: {
 reloadToken?: number
 onClose?: () => void
}) {
 const [period, setPeriod] = useState<PeriodPreset>(7)
 const [start, setStart] = useState<string>(() => isoDay(new Date(Date.now() - 6 * 86400000)))
 const [end, setEnd] = useState<string>(() => isoDay(new Date()))
 const [sort, setSort] = useState<SortKey>('delta')
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [range, setRange] = useState<{ start: string; end: string; days: number } | null>(null)
 const [points, setPoints] = useState<TargetSeries[]>([])

 const load = useCallback(async () => {
 setLoading(true)
 setError(null)
 try {
 const qs = new URLSearchParams()
 if (period === 'custom') {
 qs.set('start', start)
 qs.set('end', end)
 } else {
 qs.set('days', String(period))
 }
 const res = await fetch('/api/marketing/blog-tracking/series?' + qs.toString(), {
 cache: 'no-store', credentials: 'include',
 })
 const j = await res.json()
 if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
 setPoints(Array.isArray(j.points) ? j.points : [])
 setRange(j.range ?? null)
 } catch (e) {
 setError(e instanceof Error ? e.message : '불러오기 실패')
 } finally {
 setLoading(false)
 }
 }, [period, start, end])

 useEffect(() => { load() }, [load, reloadToken])

 const sorted = useMemo(() => {
 const arr = [...points]
 arr.sort((a, b) => {
 if (sort === 'delta') {
 // 변동폭 큰 순 (측정 없는 것은 맨 뒤)
 if (a.delta_abs !== b.delta_abs) return b.delta_abs - a.delta_abs
 // 동점이면 현재 순위 낮은 숫자(=상위) 우선
 const ar = a.last_rank ?? 9999
 const br = b.last_rank ?? 9999
 return ar - br
 }
 if (sort === 'current') {
 const ar = a.last_rank ?? 9999
 const br = b.last_rank ?? 9999
 if (ar !== br) return ar - br
 return a.label.localeCompare(b.label, 'ko')
 }
 if (sort === 'name') {
 return a.label.localeCompare(b.label, 'ko')
 }
 // created 등록순 (최신 먼저)
 return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
 })
 return arr
 }, [points, sort])

 const summary = useMemo(() => {
 let up = 0, down = 0, flat = 0, none = 0
 for (const p of points) {
 if (p.delta === null) none++
 else if (p.delta > 0) up++
 else if (p.delta < 0) down++
 else flat++
 }
 return { up, down, flat, none, total: points.length }
 }, [points])

 const rangeLabelKo = useMemo(() => {
 if (!range) return ''
 const s = new Date(range.start), e = new Date(range.end)
 const f = (d: Date) => d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
 return `${f(s)} ~ ${f(e)}`
 }, [range])

 return (
 <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-sm mb-6">
 {/* 컨트롤 바 */}
 <div className="p-4 md:p-5 border-b border-[#F2F4F6] flex flex-wrap items-center gap-3">
 <div className="flex items-center gap-2 mr-auto">
 <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#3182F6]">
 <Calendar size={15} />
 </span>
 <div>
 <div className="text-[13px] font-bold text-[#191F28]">키워드 변동 요약표</div>
 <div className="text-[11px] text-[#8B95A1]">
 {range ? `${rangeLabelKo} · ${range.days}일` : '기간 선택'}
 </div>
 </div>
 </div>

 {/* 기간 프리셋 */}
 <div className="inline-flex rounded-xl border border-[#E5E8EB] overflow-hidden text-[12px] font-semibold">
 {([7, 30, 'custom'] as PeriodPreset[]).map(p => (
 <button
 key={String(p)}
 onClick={() => setPeriod(p)}
 className={`px-3 py-1.5 transition ${
 period === p
 ? 'bg-[#3182F6] text-white'
 : 'bg-white text-[#4E5968] hover:text-[#191F28]'
 }`}
 >
 {p === 7 ? '7일' : p === 30 ? '30일' : '기간선택'}
 </button>
 ))}
 </div>

 {period === 'custom' && (
 <div className="flex items-center gap-1.5 text-[12px] text-[#4E5968]">
 <input
 type="date"
 value={start}
 max={end}
 onChange={e => setStart(e.target.value)}
 className="px-2 py-1 border border-[#E5E8EB] rounded-lg text-[12px]"
 />
 <span className="text-[#8B95A1]">~</span>
 <input
 type="date"
 value={end}
 min={start}
 onChange={e => setEnd(e.target.value)}
 className="px-2 py-1 border border-[#E5E8EB] rounded-lg text-[12px]"
 />
 </div>
 )}

 {/* 정렬 */}
 <select
 value={sort}
 onChange={e => setSort(e.target.value as SortKey)}
 className="px-2.5 py-1.5 border border-[#E5E8EB] rounded-xl text-[12px] font-semibold text-[#4E5968] bg-white"
 >
 <option value="delta">정렬: 변동폭 큰 순</option>
 <option value="current">정렬: 현재 순위</option>
 <option value="name">정렬: 이름(가나다)</option>
 <option value="created">정렬: 최근 등록순</option>
 </select>

 {onClose && (
 <button
 onClick={onClose}
 className="text-[12px] text-[#8B95A1] hover:text-[#191F28] font-semibold px-2 py-1"
 >
 닫기
 </button>
 )}
 </div>

 {/* 요약 스트립 */}
 {!loading && !error && summary.total > 0 && (
 <div className="px-4 md:px-5 py-2.5 border-b border-[#F2F4F6] flex flex-wrap items-center gap-4 text-[12px]">
 <div className="flex items-center gap-1.5">
 <span className="inline-flex items-center gap-1 text-[#03C75A] font-bold">
 <ArrowUp size={12} />상승
 </span>
 <span className="text-[#191F28] font-semibold">{summary.up}건</span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="inline-flex items-center gap-1 text-[#EF4444] font-bold">
 <ArrowDown size={12} />하락
 </span>
 <span className="text-[#191F28] font-semibold">{summary.down}건</span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="inline-flex items-center gap-1 text-[#4E5968] font-bold">
 <Minus size={12} />유지
 </span>
 <span className="text-[#191F28] font-semibold">{summary.flat}건</span>
 </div>
 <div className="flex items-center gap-1.5 text-[#8B95A1]">
 <span>측정 부족</span>
 <span className="font-semibold">{summary.none}건</span>
 </div>
 <div className="ml-auto text-[#8B95A1]">
 총 <b className="text-[#191F28]">{summary.total}</b>개 타겟
 </div>
 </div>
 )}

 {/* 본문 */}
 {loading ? (
 <div className="py-10 flex items-center justify-center text-[#8B95A1] text-[13px]">
 <Loader2 size={16} className="animate-spin mr-2" />
 기간 데이터 불러오는 중…
 </div>
 ) : error ? (
 <div className="p-5 bg-[#FEF2F2] text-[#DC2626] text-[13px] rounded-b-2xl flex items-start gap-2">
 <AlertCircle size={15} className="mt-0.5" />
 <span>{error}</span>
 </div>
 ) : sorted.length === 0 ? (
 <div className="py-10 text-center text-[#8B95A1] text-[13px]">
 등록된 타겟이 없습니다. 아래에서 먼저 타겟을 추가해주세요.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="bg-[#FAFBFC] text-[11px] uppercase tracking-wider text-[#8B95A1]">
 <th className="text-left font-semibold px-4 py-2.5 w-[28%]">키워드 / 라벨</th>
 <th className="text-center font-semibold px-2 py-2.5 w-[9%]">현재</th>
 <th className="text-center font-semibold px-2 py-2.5 w-[9%]">기간 시작</th>
 <th className="text-center font-semibold px-2 py-2.5 w-[9%]">변동</th>
 <th className="text-center font-semibold px-2 py-2.5 w-[9%]">최고</th>
 <th className="text-center font-semibold px-2 py-2.5 w-[9%]">평균</th>
 <th className="text-left font-semibold px-3 py-2.5">추이</th>
 <th className="text-center font-semibold px-2 py-2.5 w-[7%]">이동</th>
 </tr>
 </thead>
 <tbody>
 {sorted.map(p => {
 const cur = rankBadge(p.last_rank)
 const first = rankBadge(p.first_rank)
 const best = rankBadge(p.best_rank)
 return (
 <tr key={p.target_id} className="border-t border-[#F2F4F6] hover:bg-[#FAFBFC]">
 <td className="px-4 py-3">
 <div className="font-semibold text-[#191F28] truncate max-w-[280px]">{p.label}</div>
 <div className="text-[12px] text-[#4E5968] truncate max-w-[280px]">#{p.keyword}</div>
 <div className="text-[11px] text-[#8B95A1] mt-0.5">
 측정 {p.points_count}회 · 마지막 {fmtDate(p.last_checked_at)}
 </div>
 </td>
 <td className="px-2 py-3 text-center">
 <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${cur.cls}`}>
 {cur.label}
 </span>
 </td>
 <td className="px-2 py-3 text-center">
 <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${first.cls}`}>
 {first.label}
 </span>
 </td>
 <td className="px-2 py-3 text-center">
 <DeltaTag delta={p.delta} />
 </td>
 <td className="px-2 py-3 text-center">
 <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${best.cls}`}>
 {best.label}
 </span>
 </td>
 <td className="px-2 py-3 text-center text-[12px] text-[#4E5968]">
 {p.avg_rank === null ? '—' : `${p.avg_rank}위`}
 </td>
 <td className="px-3 py-3">
 <Sparkline series={p.series} />
 </td>
 <td className="px-2 py-3 text-center">
 <a
 href={p.target_url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#8B95A1] hover:text-[#3182F6] hover:bg-[#EFF6FF]"
 title="블로그 글 열기"
 >
 <ExternalLink size={13} />
 </a>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}

 {/* 범례 */}
 {!loading && !error && sorted.length > 0 && (
 <div className="px-4 md:px-5 py-2.5 border-t border-[#F2F4F6] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8B95A1]">
 <span>변동 = 기간 시작 순위 − 현재 순위</span>
 <span>· ▲ 숫자가 커질수록 더 크게 상승</span>
 <span>· 측정이 1회뿐인 타겟은 변동이 —</span>
 <span>· 일 단위 최고 순위 기준 집계</span>
 </div>
 )}
 </div>
 )
}
