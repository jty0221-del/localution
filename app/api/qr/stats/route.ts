// app/api/qr/stats/route.ts
// ============================================================
// 사장님용 QR 활동 통계 조회
// GET /api/qr/stats?days=7 → 본인 매장 활동 집계
//
// · 인증 필요
// · 본인 user_id 의 qr_review_logs 만 조회
// · 일/주별 카운트 + 이벤트별 funnel + 최근 활동
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '7', 10)))
 const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

 const svc = createServiceClient()

 // 본인 매장 logs 만 조회
 const { data, error } = await svc
 .from('qr_review_logs')
 .select('id, store_slug, event_type, meta, device_kind, visitor_hash, created_at')
 .eq('user_id', auth.userId)
 .gte('created_at', since)
 .order('created_at', { ascending: false })
 .limit(500)

 if (error) {
 return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 })
 }

 const rows = data || []

 // 이벤트별 카운트
 const counts: Record<string, number> = {}
 // 일별 scan/submit 추이
 const dailyMap: Record<string, { scan: number; submit: number; ai: number }> = {}
 // 고유 방문자 (visitor_hash)
 const uniqueVisitors = new Set<string>()
 // 디바이스 분포
 const deviceCounts: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 }

 for (const r of rows) {
 counts[r.event_type] = (counts[r.event_type] || 0) + 1
 if (r.visitor_hash) uniqueVisitors.add(r.visitor_hash)
 if (r.device_kind) deviceCounts[r.device_kind] = (deviceCounts[r.device_kind] || 0) + 1

 const day = String(r.created_at || '').slice(0, 10)
 if (!dailyMap[day]) dailyMap[day] = { scan: 0, submit: 0, ai: 0 }
 if (r.event_type === 'scan') dailyMap[day].scan += 1
 if (r.event_type === 'ai_generated') dailyMap[day].ai += 1
 if (r.event_type.startsWith('submitted_')) dailyMap[day].submit += 1
 }

 // funnel (스캔 → AI → 등록)
 const scans = counts.scan || 0
 const aiCount = counts.ai_generated || 0
 const submits = (counts.submitted_naver || 0) + (counts.submitted_google || 0) + (counts.submitted_kakao || 0)
 const funnel = {
 scan: scans,
 ai_generated: aiCount,
 submitted: submits,
 scan_to_ai_rate: scans > 0 ? Math.round((aiCount / scans) * 100) : 0,
 ai_to_submit_rate: aiCount > 0 ? Math.round((submits / aiCount) * 100) : 0,
 overall_rate: scans > 0 ? Math.round((submits / scans) * 100) : 0,
 }

 // 일별 배열 (since 부터 오늘까지 — 빈 날도 0 으로 채움)
 const daily: Array<{ date: string; scan: number; submit: number; ai: number }> = []
 for (let i = days - 1; i >= 0; i--) {
 const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
 daily.push({ date: d, ...(dailyMap[d] || { scan: 0, submit: 0, ai: 0 }) })
 }

 // 최근 활동 타임라인 (20개)
 const recent = rows.slice(0, 20).map(r => ({
 event_type: r.event_type,
 device_kind: r.device_kind,
 meta: r.meta,
 created_at: r.created_at,
 }))

 return NextResponse.json({
 ok: true,
 period: { days, since },
 counts,
 funnel,
 unique_visitors: uniqueVisitors.size,
 devices: deviceCounts,
 daily,
 recent,
 })
}
