// app/api/marketing/blog-tracking/series/route.ts
// ============================================================
// 20차-1: 전체 타겟의 기간별 순위 시계열 — 표 + 스파크라인용
// · GET ?days=7|30 (또는 ?start=YYYY-MM-DD&end=YYYY-MM-DD)
// · 로그인 유저의 모든 타겟에 대해 "일 단위 최고 순위" 시계열 반환
// · 별도 API 라 기존 GET 응답 스키마는 건드리지 않음
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
 // 계산값
 first_rank: number | null // 기간 시작 시점(가장 오래된) 순위
 best_rank: number | null // 기간 내 최고 순위(숫자 가장 작음)
 worst_rank: number | null
 avg_rank: number | null
 delta: number | null // (first - last). 양수=순위 상승, 음수=하락
 delta_abs: number // 정렬용
 points_count: number
}

function dayKeyKST(iso: string): string {
 // Asia/Seoul 기준 YYYY-MM-DD
 const d = new Date(iso)
 const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
 return kst.toISOString().slice(0, 10)
}

function fillRange(start: Date, end: Date): string[] {
 const out: string[] = []
 const s = new Date(start.getTime()); s.setUTCHours(0, 0, 0, 0)
 const e = new Date(end.getTime()); e.setUTCHours(0, 0, 0, 0)
 for (let t = s.getTime(); t <= e.getTime(); t += 86400000) {
 const d = new Date(t + 9 * 60 * 60 * 1000)
 out.push(d.toISOString().slice(0, 10))
 }
 return out
}

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const sp = req.nextUrl.searchParams
 const start = sp.get('start')
 const end = sp.get('end')
 const daysR = parseInt(sp.get('days') ?? '7', 10)
 const days = Math.min(Math.max(isFinite(daysR) ? daysR : 7, 1), 90)

 // 기간 결정
 const now = new Date()
 let rangeStart: Date
 let rangeEnd: Date = now
 if (start && end) {
 rangeStart = new Date(start + 'T00:00:00+09:00')
 rangeEnd = new Date(end + 'T23:59:59+09:00')
 if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
 return NextResponse.json({ error: '날짜 형식 오류 (YYYY-MM-DD)' }, { status: 400 })
 }
 const diff = (rangeEnd.getTime() - rangeStart.getTime()) / 86400000
 if (diff < 0) return NextResponse.json({ error: 'start > end' }, { status: 400 })
 if (diff > 90) return NextResponse.json({ error: '최대 90일까지 지원' }, { status: 400 })
 } else {
 rangeStart = new Date(now.getTime() - (days - 1) * 86400000)
 }

 const svc = createServiceClient()

 // 1) 타겟 목록
 const { data: targets, error: tErr } = await svc
 .from('blog_tracking_latest')
 .select('target_id,label,keyword,target_url,last_rank,last_checked_at,created_at')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

 const targetIds = (targets ?? []).map(t => t.target_id)
 if (targetIds.length === 0) {
 return NextResponse.json({
 range: {
 start: rangeStart.toISOString(),
 end: rangeEnd.toISOString(),
 days,
 },
 points: [],
 })
 }

 // 2) 기간 내 history 일괄 조회
 const { data: history, error: hErr } = await svc
 .from('blog_tracking_history')
 .select('target_id,checked_at,rank')
 .in('target_id', targetIds)
 .gte('checked_at', rangeStart.toISOString())
 .lte('checked_at', rangeEnd.toISOString())
 .order('checked_at', { ascending: true })
 if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 })

 // 3) target_id → day(YYYY-MM-DD) → 최고 순위(숫자 가장 작음)
 const byTarget: Record<string, Record<string, number | null>> = {}
 for (const h of (history ?? [])) {
 const tid = h.target_id as string
 const day = dayKeyKST(h.checked_at as string)
 const rank = (h.rank === null || h.rank === undefined) ? null : Number(h.rank)
 if (!byTarget[tid]) byTarget[tid] = {}
 const cur = byTarget[tid][day]
 if (cur === undefined) {
 byTarget[tid][day] = rank
 } else {
 // 숫자가 더 작은(=순위가 더 높은) 값을 채택, 둘 다 null 이면 null
 if (cur === null) byTarget[tid][day] = rank
 else if (rank !== null && rank < cur) byTarget[tid][day] = rank
 }
 }

 const allDays = fillRange(rangeStart, rangeEnd)

 const points: TargetSeries[] = (targets ?? []).map(t => {
 const dayMap = byTarget[t.target_id] || {}
 const series: SeriesPoint[] = allDays.map(d => ({
 date: d,
 rank: dayMap[d] === undefined ? null : dayMap[d],
 }))

 // 실제 측정된 포인트들만 모아서 통계 계산
 const measured = series.filter(p => p.rank !== null) as { date: string; rank: number }[]
 const firstMeasured = measured[0] ?? null
 const lastMeasured = measured[measured.length - 1] ?? null
 const ranks = measured.map(p => p.rank)
 const best = ranks.length ? Math.min(...ranks) : null
 const worst = ranks.length ? Math.max(...ranks) : null
 const avg = ranks.length ? Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 10) / 10 : null

 // delta: firstMeasured.rank - lastMeasured.rank (양수=상승, 음수=하락)
 let delta: number | null = null
 if (firstMeasured && lastMeasured && firstMeasured.date !== lastMeasured.date) {
 delta = firstMeasured.rank - lastMeasured.rank
 }

 return {
 target_id: t.target_id as string,
 label: t.label as string,
 keyword: t.keyword as string,
 target_url: t.target_url as string,
 last_rank: (t.last_rank === null || t.last_rank === undefined) ? null : Number(t.last_rank),
 last_checked_at: (t.last_checked_at as string) ?? null,
 created_at: t.created_at as string,
 series,
 first_rank: firstMeasured ? firstMeasured.rank : null,
 best_rank: best,
 worst_rank: worst,
 avg_rank: avg,
 delta,
 delta_abs: delta === null ? -1 : Math.abs(delta),
 points_count: measured.length,
 }
 })

 return NextResponse.json({
 range: {
 start: rangeStart.toISOString(),
 end: rangeEnd.toISOString(),
 days,
 },
 points,
 })
}
