// app/api/cron/delivery-reviews-fetch/route.ts
// ============================================================
// 배달 플랫폼(배민/요기요/쿠팡이츠) 리뷰 자동 수집 크론
//   - 매 6시간마다 Vercel Cron 이 호출
//   - 각 플랫폼에 credentials 연결된 유저 조회
//   - Railway Worker 에 fetch_reviews job enqueue
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PLATFORMS: Platform[] = ['baemin', 'yogiyo', 'coupangeats']
const GAP_MS = 800

export async function GET(req: NextRequest) {
  const cronCheck = verifyCronAuth(req.headers.get('authorization'))
  if (!cronCheck.ok) {
    return NextResponse.json({ ok: false, error: cronCheck.message }, { status: cronCheck.status })
  }

  const svc = createServiceClient()
  const results: Record<string, { queued: number; failed: number; errors: string[] }> = {}

  for (const platform of PLATFORMS) {
    results[platform] = { queued: 0, failed: 0, errors: [] }

    // 해당 플랫폼 연결된 유저 목록
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
      try {
        const jobResult = await enqueuePlatformJob({
          platform,
          action: 'fetch_reviews',
          userId: cred.user_id,
          storeId: cred.platform_store_id || 'unknown',
        })

        if (jobResult.ok) {
          results[platform].queued++
        } else {
          results[platform].failed++
          results[platform].errors.push(cred.user_id + ': ' + jobResult.error)
        }

        // 연속 enqueue 간격
        await new Promise(r => setTimeout(r, GAP_MS))
      } catch (e: any) {
        results[platform].failed++
        results[platform].errors.push(cred.user_id + ': ' + (e?.message || String(e)))
      }
    }
  }

  const totalQueued = Object.values(results).reduce((s, r) => s + r.queued, 0)
  const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0)

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    totalQueued,
    totalFailed,
    results,
  })
}
