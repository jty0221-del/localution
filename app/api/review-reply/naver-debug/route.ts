// app/api/review-reply/naver-debug/route.ts
// 네이버 자동발행 전체 흐름 진단
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
  const svc = createServiceClient()

  // 1) Redis 환경변수 확인
  const redisUrl = process.env.REDIS_URL || null
  const redisAvailable = !!redisUrl

  // 2) 리뷰 조회
  const { data: row, error: rowErr } = await svc
    .from('platform_reviews')
    .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, has_reply, reply_status')
    .eq('id', reviewId)
    .maybeSingle()

  // 3) 자격증명 조회
  const { data: cred, error: credErr } = await svc
    .from('platform_credentials')
    .select('platform_store_id, extra_data')
    .eq('user_id', auth.userId)
    .eq('platform', 'naver_place')
    .maybeSingle()

  const bizId = (cred?.extra_data as any)?.smartplace_biz_id || null

  // 4) 실제 enqueue 시도 (dry_run=1 이면 스킵)
  const dryRun = req.nextUrl.searchParams.get('dry_run') !== '0'
  let enqueueResult: any = { skipped: true, reason: 'dry_run=1 (add ?dry_run=0 to actually enqueue)' }

  if (!dryRun) {
    if (!row) {
      enqueueResult = { error: '리뷰 없음' }
    } else if (!redisAvailable) {
      enqueueResult = { error: 'REDIS_URL 없음' }
    } else {
      const draft = String(row.draft_reply || '').trim()
      const storeId = row.platform_store_id || cred?.platform_store_id || 'unknown'
      const payload: Record<string, string> = { platform_review_id: row.platform_review_id, reply_text: draft }
      if (bizId) payload.biz_id = bizId
      enqueueResult = await enqueuePlatformJob({
        platform: 'naver_place',
        action: 'post_reply',
        userId: auth.userId,
        storeId,
        payload,
      })
      if (enqueueResult.ok) {
        await svc.from('platform_reviews')
          .update({ reply_status: 'queued', reply_queued_at: new Date().toISOString(), reply_error: null })
          .eq('id', reviewId).eq('user_id', auth.userId)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    userId: auth.userId,
    redis: { available: redisAvailable, url_prefix: redisUrl ? redisUrl.slice(0, 20) + '...' : null },
    review: row ? { id: row.id, status: row.reply_status, hasDraft: !!row.draft_reply } : { error: rowErr?.message || 'not found' },
    credentials: cred ? { storeId: cred.platform_store_id, bizId } : { error: credErr?.message || 'not found' },
    enqueue: enqueueResult,
  })
}
