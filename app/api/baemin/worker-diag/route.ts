// app/api/baemin/worker-diag/route.ts
// ============================================================
// 배민 Worker 종합 진단 + 강제 트리거
//   GET /api/baemin/worker-diag        — 현황만 조회
//   POST /api/baemin/worker-diag       — 강제 enqueue + 30초 폴링
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function getStatus(userId: string) {
  const out: any = {
    redis_configured: !!process.env.REDIS_URL,
    redis_url_preview: process.env.REDIS_URL ? process.env.REDIS_URL.slice(0, 25) + '...' : 'NOT_SET',
    proxy_configured: !!process.env.PROXY_HOST,
  }

  try {
    const q = getPlatformQueue()
    const counts = await q.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed')
    out.queue_counts = counts

    const waiting = await q.getWaiting(0, 50)
    const active = await q.getActive(0, 10)
    const failed = await q.getFailed(0, 20)
    const completed = await q.getCompleted(0, 10)

    const myWaiting = waiting.filter((j: any) => j.data?.userId === userId && j.data?.platform === 'baemin')
    const myActive = active.filter((j: any) => j.data?.userId === userId && j.data?.platform === 'baemin')
    const myFailed = failed.filter((j: any) => j.data?.userId === userId && j.data?.platform === 'baemin')
    const myCompleted = completed.filter((j: any) => j.data?.userId === userId && j.data?.platform === 'baemin')

    out.my_baemin_jobs = {
      waiting: myWaiting.length,
      active: myActive.length,
      failed: myFailed.length,
      completed_recent: myCompleted.length,
      waiting_detail: myWaiting.slice(0, 5).map((j: any) => ({
        id: j.id,
        action: j.data?.action,
        ts: new Date(j.timestamp).toISOString(),
        priority: j.opts?.priority,
        delay: j.opts?.delay,
      })),
      active_detail: myActive.slice(0, 5).map((j: any) => ({
        id: j.id,
        action: j.data?.action,
        ts: new Date(j.timestamp).toISOString(),
      })),
      failed_detail: myFailed.slice(0, 10).map((j: any) => ({
        id: j.id,
        action: j.data?.action,
        attempts: j.attemptsMade,
        failedReason: String(j.failedReason || '').slice(0, 300),
        ts: new Date(j.timestamp).toISOString(),
      })),
      completed_recent_detail: myCompleted.slice(0, 5).map((j: any) => ({
        id: j.id,
        action: j.data?.action,
        finished: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
        returnvalue: j.returnvalue,
      })),
    }
  } catch (e: any) {
    out.queue_error = e?.message || 'queue access failed'
  }

  // platform_credentials 상태
  try {
    const svc = createServiceClient()
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('account_id, platform_store_id, last_login_status, last_login_at, extra_data')
      .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()
    if (cred) {
      const extra = (cred.extra_data as any) || {}
      out.credentials = {
        account_id: cred.account_id,
        platform_store_id: cred.platform_store_id,
        last_login_status: cred.last_login_status,
        last_login_at: cred.last_login_at,
        cookie_age_hours: extra.cookie_saved_at
          ? Math.round((Date.now() - new Date(extra.cookie_saved_at).getTime()) / 3_600_000)
          : null,
        has_cookie: !!extra.baemin_cookie_enc,
        has_pw: !!(extra.baemin_pw_enc || cred),
      }
    } else {
      out.credentials = { error: '배민 자격증명 미연결' }
    }

    // DB 의 baemin 리뷰 수
    const { count } = await svc
      .from('platform_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('platform', 'baemin')
    out.db_review_count = count ?? 0
  } catch (e: any) {
    out.db_error = e?.message
  }

  return out
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const status = await getStatus(auth.userId!)
  return NextResponse.json({ ok: true, status })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const body = await req.json().catch(() => ({}))
  const daysBack = typeof body.days_back === 'number' ? body.days_back : 30

  const before = await getStatus(userId)

  // 강제 enqueue (priority 1, no jobId dedupe)
  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('platform_store_id')
    .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()
  const shopNo = cred?.platform_store_id || 'unknown'

  let enqueueResult: any = null
  try {
    const jr = await enqueuePlatformJob({
      platform: 'baemin', action: 'fetch_reviews',
      userId, storeId: shopNo,
      payload: { shop_no: shopNo, days_back: daysBack, source: 'force-diag' },
    })
    enqueueResult = jr
  } catch (e: any) {
    enqueueResult = { ok: false, error: e?.message }
  }

  // 30초 폴링하여 잡 완료 대기
  let pollResult: any = null
  if (enqueueResult?.ok && enqueueResult?.jobId) {
    try {
      const q = getPlatformQueue()
      const startMs = Date.now()
      while (Date.now() - startMs < 30000) {
        const job = await q.getJob(enqueueResult.jobId)
        if (job) {
          const state = await job.getState()
          if (state === 'completed' || state === 'failed') {
            pollResult = {
              state,
              returnvalue: job.returnvalue,
              failedReason: job.failedReason ? String(job.failedReason).slice(0, 500) : null,
              attemptsMade: job.attemptsMade,
              finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
            }
            break
          }
          pollResult = { state, attemptsMade: job.attemptsMade }
        }
        await new Promise(r => setTimeout(r, 2000))
      }
    } catch (e: any) {
      pollResult = { error: e?.message }
    }
  }

  const after = await getStatus(userId)

  return NextResponse.json({
    ok: true,
    enqueue: enqueueResult,
    poll: pollResult,
    before: {
      db_review_count: before.db_review_count,
      my_baemin_jobs: before.my_baemin_jobs,
    },
    after,
    summary: {
      jobsCreated: ((after.my_baemin_jobs?.waiting || 0) + (after.my_baemin_jobs?.active || 0)) > ((before.my_baemin_jobs?.waiting || 0) + (before.my_baemin_jobs?.active || 0)),
      reviewCountChanged: after.db_review_count !== before.db_review_count,
      reviewCountDelta: (after.db_review_count || 0) - (before.db_review_count || 0),
    },
  })
}
