// app/api/admin/test-user-pipeline/route.ts
// ============================================================
// v38: 특정 사용자의 전체 리뷰 파이프라인 진단 (1-call diagnostic)
//   1) platform_credentials 상태 (success/failed/missing)
//   2) stores 매장 정보 (naver_place_id 등)
//   3) 최근 리뷰 수집 통계 (per platform, 최근 7일)
//   4) 답글 발행 상태 통계 (submitted/queued/failed)
//   5) 큐의 활성 잡 (이 사용자 관련)
//   6) 최근 실패 이유 (top 5)
//
// GET ?user_id=...  → 사용자 전체 상태 한 번에
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || ''
  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })

  const svc = createServiceClient()
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  // 1) platform_credentials
  const { data: creds } = await svc
    .from('platform_credentials')
    .select('platform, platform_store_id, platform_store_name, last_login_status, last_login_at, last_login_error_message, extra_data')
    .eq('user_id', userId)

  const credSummary: Record<string, any> = {}
  for (const c of (creds || [])) {
    const status = String(c.last_login_status || '')
    credSummary[c.platform] = {
      connected: true,
      store_id: c.platform_store_id || null,
      store_name: c.platform_store_name || null,
      login_ok: status.startsWith('success'),
      login_status_raw: c.last_login_status,
      last_error: status.startsWith('success') ? null : String(c.last_login_error_message || '').slice(0, 100),
      last_login_at: c.last_login_at,
      autoreply_enabled: (c.extra_data as any)?.autoreply_enabled === true,
      autoreply_tone: (c.extra_data as any)?.autoreply_tone,
    }
  }

  // 2) stores
  const { data: stores } = await svc
    .from('stores')
    .select('id, name, naver_place_id, naver_url, address, category, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(5)

  // 3) 리뷰 수집 (7일 / 플랫폼별)
  const { data: reviews7d } = await svc
    .from('platform_reviews')
    .select('platform')
    .eq('user_id', userId)
    .gte('collected_at', since7d)
    .limit(5000)

  const collectedByPlatform: Record<string, number> = {}
  for (const r of (reviews7d || [])) {
    collectedByPlatform[r.platform] = (collectedByPlatform[r.platform] || 0) + 1
  }

  // 4) 답글 통계 (24h)
  const { data: replies24h } = await svc
    .from('platform_reviews')
    .select('platform, reply_status, reply_error')
    .eq('user_id', userId)
    .gte('reply_submitted_at', since24h)
    .limit(1000)

  const replyStats: Record<string, { submitted: number; failed: number; queued: number; reasons: Record<string, number> }> = {}
  for (const r of (replies24h || [])) {
    if (!replyStats[r.platform]) replyStats[r.platform] = { submitted: 0, failed: 0, queued: 0, reasons: {} }
    const s = r.reply_status
    if (s === 'submitted') replyStats[r.platform].submitted++
    else if (s === 'failed') replyStats[r.platform].failed++
    else if (s === 'queued') replyStats[r.platform].queued++
    if (s === 'failed' && r.reply_error) {
      const reason = String(r.reply_error).slice(0, 60)
      replyStats[r.platform].reasons[reason] = (replyStats[r.platform].reasons[reason] || 0) + 1
    }
  }

  // 5) 큐의 이 사용자 잡들
  let queueJobs: any[] = []
  try {
    const q = getPlatformQueue() as any
    const [prioritized, waiting, active] = await Promise.all([
      typeof q.getPrioritized === 'function' ? q.getPrioritized(0, 100) : Promise.resolve([]),
      q.getWaiting(0, 100),
      q.getActive(0, 50),
    ])
    const all = [...prioritized, ...waiting, ...active]
    queueJobs = all
      .filter((j: any) => j.data?.userId === userId)
      .map((j: any) => ({
        id: String(j.id),
        platform: j.data?.platform,
        action: j.data?.action,
        priority: j.opts?.priority,
        timestamp: j.timestamp,
        processedOn: j.processedOn,
        reviewId: j.data?.payload?.platform_review_id,
      }))
  } catch (_) {}

  // 6) 현재 stuck queued (DB)
  const { data: stuckQueued } = await svc
    .from('platform_reviews')
    .select('id, platform, platform_review_id, reply_queued_at, draft_reply')
    .eq('user_id', userId)
    .eq('reply_status', 'queued')
    .limit(20)

  // 종합 진단
  const diagnostics: string[] = []
  for (const platform of Object.keys(credSummary)) {
    const c = credSummary[platform]
    if (!c.store_id && platform !== 'threads') {
      diagnostics.push(`❌ ${platform}: 매장 ID 누락 — admin/fix-store-id 에서 URL 입력`)
    } else if (!c.login_ok && c.last_error) {
      diagnostics.push(`⚠️ ${platform}: 로그인 실패 (${c.last_error.slice(0, 50)})`)
    } else if (c.login_ok) {
      diagnostics.push(`✅ ${platform}: 정상 연결 (매장 ${c.store_id})`)
    }
  }
  if (stuckQueued && stuckQueued.length > 0) {
    diagnostics.push(`⏰ ${stuckQueued.length}건 stuck queued — 다음 cron 사이클에서 자동 처리`)
  }
  if (queueJobs.length > 0) {
    diagnostics.push(`📋 큐에 ${queueJobs.length}건 잡 진행 중`)
  }

  return NextResponse.json({
    ok: true,
    user_id: userId,
    user_id_short: userId.slice(0, 12) + '...',
    credentials: credSummary,
    stores: stores || [],
    collected_7d_by_platform: collectedByPlatform,
    reply_stats_24h: replyStats,
    queue_jobs: queueJobs,
    stuck_queued_count: stuckQueued?.length || 0,
    stuck_queued_sample: (stuckQueued || []).slice(0, 5),
    diagnostics,
    triggered_by: admin.email,
    generated_at: new Date().toISOString(),
  })
}
