// app/api/baemin/cleanup-reviews/route.ts
// ============================================================
// 배민 리뷰 데이터 정리 — 잘못 수집된 기존 데이터 wipe
// POST /api/baemin/cleanup-reviews
// body: { mode: 'all' | 'old' (기본 all), days?: 30 }
// · 'all' — 사용자의 모든 baemin 리뷰 삭제 (재수집 전용)
// · 'old' — N일 이전 리뷰만 삭제
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 const userId = auth.userId!

 const body = await req.json().catch(() => ({}))
 const mode = body.mode || 'all'
 const days = typeof body.days === 'number' ? body.days : 30

 const svc = createServiceClient()

 try {
 if (mode === 'all') {
 // 사용자 본인의 baemin 리뷰만 전부 삭제 (다른 user 영향 X)
 const { data, error } = await svc
 .from('platform_reviews')
 .delete()
 .eq('user_id', userId)
 .eq('platform', 'baemin')
 .select('id')
 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

 // v1.4: 삭제 후 즉시 Worker 큐로 재수집 enqueue
 // (Vercel 직접 fetch 는 403 이라 의미 없음 → Worker Playwright 만 작동)
 let queued = false
 let jobId: string | undefined
 try {
 if (process.env.REDIS_URL) {
 // shopNo 가져오기
 const { data: cred } = await svc
 .from('platform_credentials')
 .select('platform_store_id')
 .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()
 const shopNo = cred?.platform_store_id || 'unknown'
 const jr = await enqueuePlatformJob({
 platform: 'baemin', action: 'fetch_reviews',
 userId, storeId: shopNo,
 payload: { shop_no: shopNo, days_back: 30, source: 'cleanup-refetch' },
 })
 if (jr.ok) { queued = true; jobId = jr.jobId }
 }
 } catch { /* ignore */ }

 return NextResponse.json({
 ok: true,
 deleted: data?.length ?? 0,
 queued,
 jobId,
 message: '배민 리뷰 ' + (data?.length ?? 0) + '건 삭제 완료. ' +
 (queued ? 'Worker 가 1-2분 안에 30일치 새로 수집해요.' : '"지금 수집" 버튼으로 다시 가져오세요.'),
 })
 }

 if (mode === 'old') {
 const cutoff = new Date(Date.now() - days * 86400_000).toISOString()
 const { data, error } = await svc
 .from('platform_reviews')
 .delete()
 .eq('user_id', userId)
 .eq('platform', 'baemin')
 .lt('posted_at', cutoff)
 .select('id')
 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
 return NextResponse.json({
 ok: true,
 deleted: data?.length ?? 0,
 cutoff,
 message: days + '일 이전 배민 리뷰 ' + (data?.length ?? 0) + '건 삭제 완료.',
 })
 }

 return NextResponse.json({ ok: false, error: 'unknown mode' }, { status: 400 })
 } catch (e: any) {
 return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
 }
}
