// app/api/admin/coupang-discover-stores/route.ts
// ============================================================
// 관리자: 사용자의 쿠팡이츠 계정에 연결된 모든 매장 발견 (비번 없이)
//
// GET ?user_id=<uuid>
//   1) extra_data.session_cookies 로 whoami 호출
//   2) whoami.stores 배열 + responsibleStoreId 등 추출
//   3) 모든 storeId 반환 — 관리자가 정확한 매장 선택 가능
//
// 쿠키 만료 시: 자동으로 retry-coupang-login 안내
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { whoamiWithCookies } from '@/app/lib/coupang-login'

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
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('extra_data, platform_store_id, platform_store_name, account_id')
    .eq('user_id', userId).eq('platform', 'coupangeats')
    .maybeSingle()

  if (!cred) return NextResponse.json({ ok: false, error: '연결 안 됨' }, { status: 404 })

  const extra = (cred.extra_data as Record<string, unknown>) || {}
  const cookies = Array.isArray(extra.session_cookies) ? (extra.session_cookies as any[]) : []
  if (cookies.length === 0) {
    return NextResponse.json({
      ok: false,
      step: 'no_cookies',
      error: '저장된 세션 쿠키 없음 — 먼저 [재로그인] 버튼 눌러 save-login 시도해주세요',
    }, { status: 400 })
  }

  const t0 = Date.now()
  const result = await whoamiWithCookies(cookies as any)
  const elapsed = Date.now() - t0

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      step: 'whoami_failed',
      elapsed_ms: elapsed,
      error: result.error || ('HTTP ' + result.status),
      hint: result.status === 401 || result.status === 403
        ? '쿠키 만료 — [재로그인] 버튼으로 갱신 필요'
        : '쿠팡 endpoint 응답 이상',
    })
  }

  // whoami body 분석 — 여러 필드 후보
  const body: any = result.body || {}
  const data = body.data || body  // { data: { ... } } 또는 평탄
  const allStores: Array<{ storeId: string; name: string | null; raw?: any }> = []

  // 1) data.stores 배열
  if (Array.isArray(data?.stores)) {
    for (const s of data.stores) {
      const sid = String(s.storeId || s.id || '').trim()
      if (/^\d+$/.test(sid)) {
        allStores.push({
          storeId: sid,
          name: s.name || s.storeName || s.shopName || null,
          raw: s,
        })
      }
    }
  }
  // 2) responsibleStoreId / storeId / defaultStoreId
  for (const key of ['responsibleStoreId', 'storeId', 'defaultStoreId']) {
    const sid = String(data?.[key] || '').trim()
    if (/^\d+$/.test(sid) && !allStores.find(s => s.storeId === sid)) {
      allStores.push({
        storeId: sid,
        name: data.storeName || data.name || null,
        raw: { source: key },
      })
    }
  }

  // whoami 응답 자체를 extra_data 에 저장 — 다음에 디버깅 시 참조
  try {
    await svc.from('platform_credentials').update({
      extra_data: {
        ...extra,
        last_whoami_at: new Date().toISOString(),
        last_whoami_response: data,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId).eq('platform', 'coupangeats')
  } catch {}

  return NextResponse.json({
    ok: true,
    elapsed_ms: elapsed,
    user_id: userId,
    account_id_hint: cred.account_id ? cred.account_id.slice(0, 3) + '***' : null,
    current_primary_store_id: cred.platform_store_id,
    current_primary_store_name: cred.platform_store_name,
    discovered_count: allStores.length,
    discovered_stores: allStores,
    raw_whoami: data,  // 관리자가 직접 보고 판단 가능
    message: allStores.length === 0
      ? '쿠팡 응답에 매장 정보 없음 — 권한 없는 계정일 수 있음'
      : allStores.length === 1
      ? `매장 1개 감지: ${allStores[0].storeId}`
      : `매장 ${allStores.length}개 감지 — 진단 페이지 [매장ID] 버튼으로 등록`,
  })
}
