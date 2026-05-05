// app/api/review-reply/naver-debug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: 'not logged in' }, { status: 401 })

 const reviewId = req.nextUrl.searchParams.get('review_id') || 'e9d5e346-f82f-4e57-ba5f-f67e4ad022eb'
 const dryRun = req.nextUrl.searchParams.get('dry_run') !== '0'
 const testDb = req.nextUrl.searchParams.get('test_db') === '1'
 const svc = createServiceClient()

 const redisUrl = process.env.REDIS_URL || null

 const { data: row } = await svc
 .from('platform_reviews')
 .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, has_reply, reply_status, reply_error')
 .eq('id', reviewId)
 .maybeSingle()

 const { data: cred } = await svc
 .from('platform_credentials')
 .select('platform_store_id, extra_data')
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 .maybeSingle()

 const bizId = (cred?.extra_data as any)?.smartplace_biz_id || null

 // DB 직접 업데이트 테스트 (?test_db=1)
 let dbTestResult: any = null
 if (testDb && row) {
 const { error } = await svc
 .from('platform_reviews')
 .update({ reply_error: 'test-from-vercel-' + Date.now() })
 .eq('id', reviewId)
 .eq('user_id', auth.userId)
 dbTestResult = { ok: !error, error: error?.message || null }
 }

 // 실제 enqueue (?dry_run=0)
 let enqueueResult: any = { skipped: true }
 if (!dryRun && row) {
 const draft = String(row.draft_reply || '').trim()
 const storeId = row.platform_store_id || cred?.platform_store_id || 'unknown'
 const payload: Record<string, string> = { platform_review_id: row.platform_review_id, reply_text: draft }
 if (bizId) payload.biz_id = bizId
 enqueueResult = await enqueuePlatformJob({
 platform: 'naver_place', action: 'post_reply',
 userId: auth.userId, storeId, payload,
 })
 if (enqueueResult.ok) {
 await svc.from('platform_reviews')
 .update({ reply_status: 'queued', reply_queued_at: new Date().toISOString(), reply_error: null })
 .eq('id', reviewId).eq('user_id', auth.userId)
 }
 }

 return NextResponse.json({
 ok: true,
 userId: auth.userId,
 redis: { available: !!redisUrl, url_prefix: redisUrl ? redisUrl.slice(0, 20) + '...' : null },
 review: row ? { id: row.id, status: row.reply_status, platform_review_id: row.platform_review_id, reply_error: (row as any).reply_error || null, draft_reply_len: String(row.draft_reply || '').length } : null,
 credentials: { storeId: cred?.platform_store_id, bizId },
 dbTest: dbTestResult,
 enqueue: enqueueResult,
 })
}
