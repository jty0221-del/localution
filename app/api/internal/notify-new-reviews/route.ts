// app/api/internal/notify-new-reviews/route.ts
// ============================================================
// Worker → Vercel 알림 트리거 (Web Push + 카카오 알림톡)
// POST { user_id, platform, review_ids?: string[] | 'all_new' }
// Authorization: Bearer ${TRIGGER_SECRET}
// · 워커가 fetchCoupangReviews 완료 직후 호출
// · 새 리뷰만 알림 (notification_log 중복 체크 자동)
// · review_ids 미지정 시 최근 24h 새 리뷰 모두
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { triggerReviewNotifications } from '@/app/lib/notifications-trigger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
 // 1) TRIGGER_SECRET 검증
 const expected = process.env.TRIGGER_SECRET || ''
 const auth = req.headers.get('authorization') || ''
 if (!expected || auth !== `Bearer ${expected}`) {
 return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
 }

 let body: any = {}
 try { body = await req.json() } catch {
 return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
 }

 const userId = String(body?.user_id || '').trim()
 const platform = String(body?.platform || '').trim()
 const reviewIds: string[] | 'all_new' = Array.isArray(body?.review_ids)
 ? body.review_ids.filter((s: any) => typeof s === 'string')
 : (body?.review_ids === 'all_new' ? 'all_new' : [])

 if (!userId || !platform) {
 return NextResponse.json({ ok: false, error: 'missing_user_id_or_platform' }, { status: 400 })
 }

 const svc = createServiceClient()

 // 2) 알림 대상 리뷰 조회
 let q = svc
 .from('platform_reviews')
 .select('id, platform, platform_review_id, author_name, author_mask, rating, content, posted_at, collected_at')
 .eq('user_id', userId)
 .eq('platform', platform)
 .order('collected_at', { ascending: false })
 .limit(50)

 if (Array.isArray(reviewIds) && reviewIds.length > 0) {
 q = q.in('platform_review_id', reviewIds)
 } else if (reviewIds === 'all_new') {
 // 최근 24시간 안에 collected 된 리뷰
 const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
 q = q.gte('collected_at', since)
 }

 const { data: reviews, error } = await q
 if (error) {
 return NextResponse.json({ ok: false, error: 'db_error', message: error.message }, { status: 500 })
 }

 if (!reviews || reviews.length === 0) {
 return NextResponse.json({ ok: true, sent: 0, skipped: 0, failed: 0, total: 0 })
 }

 // 3) triggerReviewNotifications 호출 (notification_log 중복 자동 처리)
 const rows = reviews.map((r: any) => ({
 id: r.id,
 platform: r.platform,
 platform_review_id: r.platform_review_id,
 author_name: r.author_name,
 author_mask: r.author_mask,
 rating: r.rating,
 content: r.content,
 posted_at: r.posted_at,
 collected_at: r.collected_at,
 }))

 const result = await triggerReviewNotifications(svc, userId, rows)

 return NextResponse.json({
 ok: true,
 total: reviews.length,
 sent: result.sent,
 skipped: result.skipped,
 failed: result.failed,
 })
}
