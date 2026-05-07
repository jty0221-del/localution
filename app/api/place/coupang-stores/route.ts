// app/api/place/coupang-stores/route.ts
// ============================================================
// 사장님 본인용: 본인 쿠팡이츠 계정의 매장 목록 조회/설정
//
// GET → 저장된 쿠키로 whoami 호출 → 모든 매장 반환
// POST { store_id, store_ids? } → primary + 다중 매장 등록 + 즉시 fetch
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { whoamiWithCookies } from '@/app/lib/coupang-login'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('extra_data, platform_store_id, platform_store_name')
    .eq('user_id', auth.userId).eq('platform', 'coupangeats')
    .maybeSingle()

  if (!cred) return NextResponse.json({ ok: false, error: '쿠팡이츠 연결 안 됨' }, { status: 404 })

  const extra = (cred.extra_data as Record<string, unknown>) || {}
  const cookies = Array.isArray(extra.session_cookies) ? (extra.session_cookies as any[]) : []
  if (cookies.length === 0) {
    return NextResponse.json({
      ok: false,
      error: '저장된 세션이 없어요. 다시 연결해주세요.',
      need_relogin: true,
    }, { status: 400 })
  }

  const result = await whoamiWithCookies(cookies as any)
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.status === 401 || result.status === 403
        ? '로그인이 만료됐어요. 다시 연결해주세요.'
        : '쿠팡이츠 응답을 받지 못했어요. 잠시 후 다시 시도해주세요.',
      need_relogin: result.status === 401 || result.status === 403,
    })
  }

  const body: any = result.body || {}
  const data = body.data || body
  const stores: Array<{ storeId: string; name: string | null }> = []

  if (Array.isArray(data?.stores)) {
    for (const s of data.stores) {
      const sid = String(s.storeId || s.id || '').trim()
      if (/^\d+$/.test(sid)) {
        stores.push({
          storeId: sid,
          name: s.name || s.storeName || s.shopName || null,
        })
      }
    }
  }
  for (const key of ['responsibleStoreId', 'storeId', 'defaultStoreId']) {
    const sid = String(data?.[key] || '').trim()
    if (/^\d+$/.test(sid) && !stores.find(s => s.storeId === sid)) {
      stores.push({ storeId: sid, name: data.storeName || data.name || null })
    }
  }

  return NextResponse.json({
    ok: true,
    current_primary: cred.platform_store_id,
    current_name: cred.platform_store_name,
    stores,
    count: stores.length,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: any = {}
  try { body = await req.json() } catch {}
  const primary = String(body.store_id || '').trim()
  const allRaw = Array.isArray(body.store_ids) ? body.store_ids : [primary]
  const allIds = allRaw.map((s: any) => String(s).trim()).filter((s: string) => /^\d+$/.test(s))
  if (!primary || !/^\d+$/.test(primary)) {
    return NextResponse.json({ ok: false, error: 'store_id 숫자 필요' }, { status: 400 })
  }
  if (!allIds.includes(primary)) allIds.unshift(primary)

  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', auth.userId).eq('platform', 'coupangeats')
    .maybeSingle()

  const existingExtra = (cred?.extra_data as Record<string, unknown>) || {}
  const newExtra = {
    ...existingExtra,
    store_ids: allIds,
    store_ids_set_at: new Date().toISOString(),
    store_ids_set_by: 'self',
  }

  await svc.from('platform_credentials').update({
    platform_store_id: primary,
    extra_data: newExtra,
    updated_at: new Date().toISOString(),
  })
  .eq('user_id', auth.userId).eq('platform', 'coupangeats')

  // 즉시 180일치 fetch 트리거 (모든 매장)
  for (const sid of allIds) {
    try {
      await enqueuePlatformJob({
        platform: 'coupangeats',
        action: 'fetch_reviews',
        userId: auth.userId,
        storeId: sid,
        payload: { shop_no: sid, days_back: 180, manual: true, triggered_by: 'self_pick_store' },
      }, { priority: 1 })
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    primary_store_id: primary,
    all_store_ids: allIds,
    message: `매장 ${allIds.length}개 등록 + 6개월치 수집 시작`,
  })
}
