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

  result.elapsed_ms = Date.now() - startedAt
  return NextResponse.json({
    ok: true,
    mode: 'cron_queue_maintenance',
    ...result,
    triggered_at: new Date().toISOString(),
  })
}
