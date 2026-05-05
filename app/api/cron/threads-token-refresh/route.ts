// app/api/cron/threads-token-refresh/route.ts
// 토큰 갱신 cron — 매일 새벽 3시, 만료 7일 이내 모든 사용자 토큰 갱신
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { refreshThreadsTokenIfNeeded } from '@/app/lib/threads-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // platform_credentials 에서 threads 계정 전체 조회 후 expires_at 필터
  const { data: accounts } = await svc
    .from('platform_credentials')
    .select('user_id, extra_data')
    .eq('platform', 'threads')

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ ok: true, refreshed: 0, total: 0 })
  }

  // 만료 7일 이내인 계정만 추려서 갱신
  const due = accounts.filter(a => {
    const exp = a.extra_data?.expires_at
    if (!exp) return true // expires_at 없으면 일단 갱신 시도
    return new Date(exp) <= new Date(sevenDaysLater)
  })

  let refreshed = 0
  for (const account of due) {
    try {
      await refreshThreadsTokenIfNeeded(svc, account.user_id)
      refreshed++
    } catch (e) {
      console.error(`[threads-token-refresh] userId=${account.user_id}`, e)
    }
  }

  return NextResponse.json({ ok: true, refreshed, total: accounts.length })
}
