// app/api/admin/trigger-fetch/route.ts
// ============================================================
// 관리자용: 특정 사장님의 쿠팡/배민/요기요 리뷰 수동 fetch 트리거
//
// GET ?platform=coupangeats&user_id=<uuid>&days=180
// · 관리자만 호출 가능 (requireAdmin)
// · 지정 user_id 의 platform_credentials 조회
// · 큐에 fetch_reviews 잡 추가 (priority 1)
//
// 일반 사장님 self-service 는 /api/admin/manual-fetch (auth.userId 사용)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PLATFORMS: Platform[] = ['coupangeats', 'baemin', 'yogiyo']

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || ''
  const platformParam = (searchParams.get('platform') || 'coupangeats') as Platform
  const days = Math.min(parseInt(searchParams.get('days') || '180', 10), 365)

  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })
  if (!VALID_PLATFORMS.includes(platformParam)) {
    return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('platform_store_id, platform_store_name')
    .eq('user_id', userId)
    .eq('platform', platformParam)
    .maybeSingle()

  if (!cred) {
    return NextResponse.json({ ok: false, error: '해당 사용자의 ' + platformParam + ' 연결 없음' }, { status: 404 })
  }

  const jobResult = await enqueuePlatformJob({
    platform: platformParam,
    action: 'fetch_reviews',
    userId,
    storeId: cred.platform_store_id || 'unknown',
    payload: { days_back: days, manual: true, triggered_by: 'admin', admin_email: admin.email },
  }, { priority: 1 })

  if (!jobResult.ok) {
    return NextResponse.json({ ok: false, error: jobResult.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    jobId: jobResult.jobId,
    user_id: userId,
    platform: platformParam,
    days,
    store_name: cred.platform_store_name,
    message: `${platformParam} ${days}일치 fetch 큐 등록 완료`,
  })
}
