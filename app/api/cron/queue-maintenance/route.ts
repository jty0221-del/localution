// app/api/cron/queue-maintenance/route.ts
// ============================================================
// v38: 큐 자동 유지보수 — 매 15분 자동 실행
//   1) prioritized 중복 dedup
//   2) waiting 의 fetch_reviews 적체 청소 (200건 초과 시)
//   3) 3시간+ 묵은 stale priority 1 잡 제거
//   4) 5분+ active hang 잡 강제 해제 (fetch_reviews 만)
//
// 사장님이 admin/queue-control 에서 수동으로 안 누르도록 자동화
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STALE_HOURS = 3
const HANG_THRESHOLD_MS = 5 * 60_000  // 5분 — 정상 fetch_reviews 도 가능. 보수적
const WAITING_TRIGGER = 200            // waiting > 200 일 때만 fetch_reviews 청소

export async function GET(req: NextRequest) {
  const a = verifyCronAuth(req.headers.get('authorization'))
  if (!a.ok) return NextResponse.json({ error: a.message }, { status: a.status })

  const q = getPlatformQueue() as any
  const startedAt = Date.now()
  const result = {
    dedup: 0,
    stale: 0,
    hang_released: 0,
    fetch_cleaned: 0,
    elapsed_ms: 0,
  }

  // 1) prioritized dedup (post_reply 같은 (platform, review_id) 별 최신 1개만)
  try {
    const prioritized = typeof q.getPrioritized === 'function'
      ? await q.getPrioritized(0, 500)
      : []
    const latestByKey = new Map<string, any>()
    const toRemove: any[] = []
    for (const j of prioritized) {
      if (j.data?.action !== 'post_reply') continue
      const rid = j.data?.payload?.platform_review_id || j.data?.payload?.review_id
      if (!rid) continue
      const key = `${j.data?.platform}|${rid}`
      const existing = latestByKey.get(key)
      if (!existing) latestByKey.set(key, j)
      else if ((j.timestamp || 0) > (existing.timestamp || 0)) {
        toRemove.push(existing)
        latestByKey.set(key, j)
      } else {
        toRemove.push(j)
      }
    }
    const removed = await Promise.allSettled(toRemove.map(j => j.remove()))
    result.dedup = removed.filter(r => r.status === 'fulfilled').length
  } catch (e) { /* skip on error */ }

  // 2) 3h+ stale priority 1 잡 제거
  try {
    const prioritized = typeof q.getPrioritized === 'function'
      ? await q.getPrioritized(0, 500)
      : []
    const cutoff = Date.now() - STALE_HOURS * 3600 * 1000
    const stale = prioritized.filter((j: any) => (j.timestamp || 0) < cutoff)
    const removed = await Promise.allSettled(stale.map((j: any) => j.remove()))
    result.stale = removed.filter(r => r.status === 'fulfilled').length
  } catch (e) { /* skip */ }

  // 3) hang 된 active fetch_reviews 강제 해제 (5분+ active)
  try {
    const active = await q.getActive(0, 50)
    const hang = active.filter((j: any) =>
      j.data?.action === 'fetch_reviews' &&
      j.processedOn &&
      (Date.now() - j.processedOn) > HANG_THRESHOLD_MS
    )
    const released = await Promise.allSettled(hang.map(async (j: any) => {
      try {
        await j.moveToFailed(new Error('AUTO_RELEASED: 5min+ hang'), '0', false)
      } catch {
        await j.remove()
      }
    }))
    result.hang_released = released.filter(r => r.status === 'fulfilled').length
  } catch (e) { /* skip */ }

  // 4) waiting fetch_reviews 적체 청소 (waiting > 200 일 때만)
  try {
    const waitingCount = await q.getWaitingCount()
    if (waitingCount > WAITING_TRIGGER) {
      const waiting = await q.getWaiting(0, 200)
      const toRemove = waiting.filter((j: any) => j.data?.action === 'fetch_reviews')
      const removed = await Promise.allSettled(toRemove.map((j: any) => j.remove()))
      result.fetch_cleaned = removed.filter(r => r.status === 'fulfilled').length
    }
  } catch (e) { /* skip */ }

  // 5) 24h+ 묵은 failed 잡 자동 제거 (UI 어지럽게 안 함)
  try {
    const failed = await q.getFailed(0, 200)
    const cutoff = Date.now() - 24 * 3600 * 1000
    const oldFailed = failed.filter((j: any) => (j.finishedOn || j.processedOn || j.timestamp || 0) < cutoff)
    const removed = await Promise.allSettled(oldFailed.map((j: any) => j.remove()))
    ;(result as any).old_failed_cleaned = removed.filter(r => r.status === 'fulfilled').length
  } catch (e) { /* skip */ }

  // 6) v38c: DB stuck queued > 1h 자동 재 enqueue (admin 수동 retry 없이 자동 복구)
  //    enqueuePlatformJob 의 deterministic jobId 가 중복 차단해서 안전
  try {
    const { createServiceClient } = await import('@/app/lib/adminAuth')
    const { enqueuePlatformJob } = await import('@/app/lib/queue')
    const svc = createServiceClient()
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: stuck } = await svc
      .from('platform_reviews')
      .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, has_reply')
      .eq('reply_status', 'queued')
      .lte('reply_queued_at', cutoff)
      .limit(50)

    let requeued = 0
    let markedSubmitted = 0
    let markedFailed = 0
    for (const r of (stuck || [])) {
      if (r.has_reply) {
        await svc.from('platform_reviews').update({ reply_status: 'submitted', reply_submitted_at: new Date().toISOString() }).eq('id', r.id)
        markedSubmitted++
        continue
      }
      if (!r.draft_reply || !String(r.draft_reply).trim()) {
        await svc.from('platform_reviews').update({ reply_status: 'none' }).eq('id', r.id)
        continue
      }
      const { data: cred } = await svc
        .from('platform_credentials')
        .select('platform_store_id, extra_data')
        .eq('user_id', r.user_id).eq('platform', r.platform).maybeSingle()
      if (!cred) {
        await svc.from('platform_reviews').update({ reply_status: 'failed', reply_error: '계정 미연결 (auto-marked by cron)' }).eq('id', r.id)
        markedFailed++
        continue
      }
      const storeId = r.platform_store_id || cred.platform_store_id || 'unknown'
      const extra = (cred.extra_data as any) || {}
      const bizId = r.platform === 'naver_place' ? (extra?.smartplace_biz_id || undefined) : undefined
      const payload: Record<string, string> = {
        platform_review_id: r.platform_review_id,
        reply_text: String(r.draft_reply),
      }
      if (bizId) payload.biz_id = bizId
      if (r.platform === 'baemin' && r.platform_store_id) payload.shop_no = String(r.platform_store_id)
      const enq = await enqueuePlatformJob({
        platform: r.platform as any,
        action: 'post_reply',
        userId: r.user_id,
        storeId,
        payload,
      }, { priority: 1 })
      if (enq.ok) {
        await svc.from('platform_reviews').update({ reply_queued_at: new Date().toISOString() }).eq('id', r.id)
        requeued++
      }
    }
    ;(result as any).db_stuck_requeued = requeued
    ;(result as any).db_marked_submitted = markedSubmitted
    ;(result as any).db_marked_failed = markedFailed
  } catch (e) { /* skip */ }

  result.elapsed_ms = Date.now() - startedAt
  return NextResponse.json({
    ok: true,
    mode: 'cron_queue_maintenance',
    ...result,
    triggered_at: new Date().toISOString(),
  })
}
