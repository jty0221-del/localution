// app/api/admin/trigger-delivery-cron/route.ts
// ============================================================
// 관리자: 배달 플랫폼 리뷰 fetch cron 즉시 수동 실행
//   · Vercel cron 일정 (KST 13:00) 까지 기다리지 않고 지금 실행
//   · /api/cron/delivery-reviews-fetch 와 동일 로직, 인증만 다름
// ============================================================
import { NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PLATFORMS: Platform[] = ['baemin', 'yogiyo', 'coupangeats']
const GAP_MS = 800

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const svc = createServiceClient()
  const results: Record<string, { queued: number; failed: number; skipped: number; errors: string[] }> = {}

  for (const platform of PLATFORMS) {
    results[platform] = { queued: 0, failed: 0, skipped: 0, errors: [] }

    const { data: creds, error } = await svc
      .from('platform_credentials')
      .select('user_id, platform_store_id, last_login_status')
      .eq('platform', platform)
      .or('last_login_status.neq.disabled,last_login_status.is.null')

    if (error) {
      results[platform].errors.push('DB 조회 실패: ' + error.message)
      continue
    }
    if (!creds || creds.length === 0) continue

    for (const cred of creds) {
      const status = String(cred.last_login_status || '')
      if (
        status.startsWith('failed') ||
        status.startsWith('credentials_invalid') ||
        status.startsWith('account_locked') ||
        status.startsWith('captcha')
      ) {
        results[platform].skipped++
        continue
      }

      try {
        const hourBucket = Math.floor(Date.now() / 3_600_000)
        const jobId = `manual_cron_${platform}_${cred.user_id}_${hourBucket}`
        const validShopId = cred.platform_store_id && /^\d+$/.test(String(cred.platform_store_id))
          ? String(cred.platform_store_id) : ''
        const jobResult = await enqueuePlatformJob({
          platform,
          action: 'fetch_reviews',
          userId: cred.user_id,
          storeId: validShopId || 'auto-detect',
          payload: validShopId
            ? { shop_no: validShopId, days_back: 30, manual: true, triggered_by: 'admin' }
            : { days_back: 30, manual: true, triggered_by: 'admin' },
        }, { jobId, priority: 1 })

        if (jobResult.ok) {
          results[platform].queued++
        } else {
          results[platform].failed++
          results[platform].errors.push(cred.user_id.slice(0, 8) + ': ' + jobResult.error)
        }

        await new Promise(r => setTimeout(r, GAP_MS))
      } catch (e: any) {
        results[platform].failed++
        results[platform].errors.push(cred.user_id.slice(0, 8) + ': ' + (e?.message || String(e)))
      }
    }
  }

  const totalQueued = Object.values(results).reduce((s, r) => s + r.queued, 0)
  const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0)
  const totalSkipped = Object.values(results).reduce((s, r) => s + r.skipped, 0)

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    triggered_by: admin.email,
    totalQueued,
    totalFailed,
    totalSkipped,
    results,
    message: `큐 등록 ${totalQueued}건 / 실패 ${totalFailed}건 / skip ${totalSkipped}건 — Railway 워커가 1~5분 안에 처리`,
  })
}
