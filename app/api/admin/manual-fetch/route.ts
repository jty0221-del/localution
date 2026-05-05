// app/api/admin/manual-fetch/route.ts
// ============================================================
// 사장님 수동 풀 fetch 트리거
// GET ?days=180&platform=coupangeats
// · 60일/180일/365일 풀 fetch
// · 평소 cron (14일) 보다 긴 범위 — 오래된 review 답글 갱신
// · iproyal 트래픽 일시 소비 (사장님 의도)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PLATFORMS: Platform[] = ['coupangeats', 'baemin', 'yogiyo']

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const { searchParams } = new URL(req.url)
 const days = Math.min(parseInt(searchParams.get('days') || '180', 10), 365)
 const platformParam = (searchParams.get('platform') || 'coupangeats') as Platform

 if (!VALID_PLATFORMS.includes(platformParam)) {
 return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
 }

 const svc = createServiceClient()

 // 사장님의 storeId 조회
 const { data: cred } = await svc
 .from('platform_credentials')
 .select('platform_store_id')
 .eq('user_id', auth.userId)
 .eq('platform', platformParam)
 .maybeSingle()

 if (!cred) {
 return NextResponse.json({ ok: false, error: '플랫폼 연결이 안 돼있어요' }, { status: 404 })
 }

 // 큐에 enqueue (priority 1 — 빠른 처리)
 const jobResult = await enqueuePlatformJob({
 platform: platformParam,
 action: 'fetch_reviews',
 userId: auth.userId,
 storeId: cred.platform_store_id || 'unknown',
 payload: { days_back: days, manual: true },
 }, { priority: 1 })

 if (!jobResult.ok) {
 return NextResponse.json({ ok: false, error: jobResult.error }, { status: 500 })
 }

 return NextResponse.json({
 ok: true,
 jobId: jobResult.jobId,
 platform: platformParam,
 days_back: days,
 estimated_time_min: Math.ceil(days / 30),
 message: `${platformParam} ${days}일치 fetch 시작 — 약 ${Math.ceil(days / 30)}분 소요`,
 })
}
