// app/api/admin/queue-emergency-cleanup/route.ts
// ============================================================
// 관리자: 큐 적체 + 중복 잡 비상 정리
//   1) waiting 의 모든 fetch_reviews 제거 (cron 이 다음 사이클에 재생성 OK)
//   2) prioritized 의 중복 post_reply dedup (platform+review_id 별 최신 1개만)
//   3) delayed 의 모든 잡 제거 (재시도 대기 중 정리)
//
// GET ?dry=1  → 시뮬레이션
// GET ?dry=0  → 실제 정리
// GET ?clean_fetch=1  → fetch_reviews 도 정리 (기본 off — 답글 작업만 dedup)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const dry = searchParams.get('dry') !== '0'
  const cleanFetch = searchParams.get('clean_fetch') === '1'

  const q = getPlatformQueue() as any
  const stats = {
    prioritized_total: 0,
    prioritized_post_reply: 0,
    prioritized_duplicates_to_remove: 0,
    waiting_total: 0,
    waiting_fetch_reviews_to_remove: 0,
    delayed_total: 0,
    delayed_to_remove: 0,
  }

  // 1) prioritized 분석 — naver post_reply dedup
  const prioritized = typeof q.getPrioritized === 'function'
    ? await q.getPrioritized(0, 999)
    : []
  stats.prioritized_total = prioritized.length

  // (platform, platform_review_id) 별로 가장 최근 enqueue 된 것만 남기고 나머지 제거 대상
  const latestByKey = new Map<string, any>()
  const toRemove: any[] = []
  for (const j of prioritized) {
    if (j.data?.action !== 'post_reply') continue
    stats.prioritized_post_reply++
    const reviewId = j.data?.payload?.platform_review_id || j.data?.payload?.review_id || ''
    if (!reviewId) continue
    const key = `${j.data?.platform || 'unknown'}|${reviewId}`
    const existing = latestByKey.get(key)
    if (!existing) {
      latestByKey.set(key, j)
    } else {
      // 더 최근 timestamp 가 살아남는다
      if ((j.timestamp || 0) > (existing.timestamp || 0)) {
        toRemove.push(existing)
        latestByKey.set(key, j)
      } else {
        toRemove.push(j)
      }
    }
  }
  stats.prioritized_duplicates_to_remove = toRemove.length

  // 2) waiting 분석 — fetch_reviews 청소 옵션
  //    timeout 방지: 최대 200개씩 처리 (Vercel 60s 제한)
  const waiting = await q.getWaiting(0, 200)
  stats.waiting_total = waiting.length
  const waitingToRemove: any[] = []
  if (cleanFetch) {
    for (const j of waiting) {
      if (j.data?.action === 'fetch_reviews') {
        waitingToRemove.push(j)
      }
    }
    stats.waiting_fetch_reviews_to_remove = waitingToRemove.length
  }

  // 3) delayed 분석
  const delayed = await q.getDelayed(0, 999)
  stats.delayed_total = delayed.length
  // delayed 는 일단 보존 (수동 retry 가능)

  if (dry) {
    const sampleDuplicates = toRemove.slice(0, 5).map((j: any) => ({
      id: j.id,
      platform: j.data?.platform,
      action: j.data?.action,
      platform_review_id: j.data?.payload?.platform_review_id,
      timestamp: j.timestamp,
    }))
    const sampleKept = Array.from(latestByKey.values()).slice(0, 5).map((j: any) => ({
      id: j.id,
      platform: j.data?.platform,
      action: j.data?.action,
      platform_review_id: j.data?.payload?.platform_review_id,
      timestamp: j.timestamp,
    }))
    return NextResponse.json({
      ok: true,
      dry: true,
      stats,
      sample_duplicates_to_remove: sampleDuplicates,
      sample_kept: sampleKept,
      hint: 'dry-run 모드. 실제 정리하려면 ?dry=0 추가. fetch_reviews 도 정리하려면 &clean_fetch=1.',
    })
  }

  // 실제 제거 — Promise.all 병렬 처리 (Vercel timeout 회피)
  const removeResults = await Promise.allSettled([
    ...toRemove.map((j: any) => j.remove()),
    ...waitingToRemove.map((j: any) => j.remove()),
  ])
  let removedDuplicates = 0
  let removedFetch = 0
  removeResults.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (i < toRemove.length) removedDuplicates++
      else removedFetch++
    }
  })

  return NextResponse.json({
    ok: true,
    stats,
    removed: {
      prioritized_duplicates: removedDuplicates,
      waiting_fetch_reviews: removedFetch,
    },
    kept_unique_post_replies: latestByKey.size,
    triggered_by: admin.email,
    message: `중복 ${removedDuplicates}개 제거, fetch_reviews ${removedFetch}개 정리. 유니크 post_reply ${latestByKey.size}개 유지.`,
  })
}
