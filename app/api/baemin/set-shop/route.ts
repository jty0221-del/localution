// app/api/baemin/set-shop/route.ts
// ============================================================
// 사장님 본인의 platform_store_id 를 직접 설정 (다중 매장 또는 default 매장 우회)
//   POST /api/baemin/set-shop  body: { shop_no: '14637452' }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const body = await req.json().catch(() => ({}))
  const shopNo = String(body.shop_no || '').trim()
  if (!/^\d+$/.test(shopNo)) {
    return NextResponse.json({ ok: false, error: 'shop_no 는 숫자만 가능 (예: 14637452)' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: cred, error } = await svc
    .from('platform_credentials')
    .update({ platform_store_id: shopNo })
    .eq('user_id', userId).eq('platform', 'baemin')
    .select('id, platform_store_id')
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!cred) return NextResponse.json({ ok: false, error: '배민 계정 미연결' }, { status: 404 })

  // 자동으로 새 fetch 트리거
  let queued = false
  let jobId: string | undefined
  try {
    if (process.env.REDIS_URL) {
      const jr = await enqueuePlatformJob({
        platform: 'baemin', action: 'fetch_reviews',
        userId, storeId: shopNo,
        payload: { shop_no: shopNo, days_back: 30, source: 'set-shop' },
      })
      if (jr.ok) { queued = true; jobId = jr.jobId }
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: true,
    platform_store_id: cred.platform_store_id,
    queued,
    jobId,
    message: 'platform_store_id = ' + shopNo + ' 로 설정 완료. ' +
      (queued ? 'Worker 가 1-2분 안에 fetch 시작.' : 'fetch 는 다음 cron 또는 수동 트리거 시 실행.'),
  })
}
