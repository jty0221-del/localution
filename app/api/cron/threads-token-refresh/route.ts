// app/api/cron/threads-token-refresh/route.ts
// 토큰 갱신 cron — 매일 새벽 3시, 만료 7일 이내 계정 갱신
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { refreshThreadsTokenIfNeeded } from '@/app/lib/threads-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: accounts } = await svc
    .from('threads_accounts')
    .select('user_id')
    .lte('expires_at', sevenDaysLater)

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ ok: true, refreshed: 0 })
  }

  let refreshed = 0
  for (const account of accounts) {
    try {
      await refreshThreadsTokenIfNeeded(svc, account.user_id)
      refreshed++
    } catch (e) {
      console.error(`[threads-token-refresh] userId=${account.user_id}`, e)
    }
  }

  return NextResponse.json({ ok: true, refreshed })
}
