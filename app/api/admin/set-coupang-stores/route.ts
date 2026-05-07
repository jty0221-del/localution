// app/api/admin/set-coupang-stores/route.ts
// ============================================================
// 관리자: 사용자의 쿠팡이츠 매장 ID 설정 (다중 매장 지원)
//
// POST { user_id, store_ids: ['779523', '...'], primary_store_id?: '779523' }
//   · platform_credentials.platform_store_id = primary_store_id (또는 첫번째)
//   · platform_credentials.extra_data.store_ids = 전체 배열 (워커가 순회)
//   · 워커는 array 가 있으면 모두 fetch, 없으면 platform_store_id 만 fetch
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  let body: any = {}
  try { body = await req.json() } catch {}
  const userId = String(body.user_id || '').trim()

  // store_meta: [{id, name}, ...] 우선 — 다중 매장 + 각 매장명 함께 저장
  // store_ids: ['...'], store_name: '...' — 기존 호환
  const rawMeta = Array.isArray(body.store_meta) ? body.store_meta : []
  const metaList = rawMeta
    .map((m: any) => ({
      id: String(m?.id || m?.storeId || '').trim(),
      name: String(m?.name || m?.storeName || '').trim() || null,
    }))
    .filter((m: any) => /^\d+$/.test(m.id))

  const rawIds = Array.isArray(body.store_ids) ? body.store_ids : []
  const fallbackIds = rawIds.map((s: any) => String(s).trim()).filter((s: string) => /^\d+$/.test(s))
  const storeIds = metaList.length > 0
    ? metaList.map((m: { id: string; name: string | null }) => m.id)
    : fallbackIds
  const primary = String(body.primary_store_id || storeIds[0] || '').trim()
  const storeName = (metaList.find((m: { id: string; name: string | null }) => m.id === primary)?.name)
    || String(body.store_name || '').trim()
    || null

  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })
  if (storeIds.length === 0) return NextResponse.json({ ok: false, error: 'store_ids 최소 1개 필수 (숫자만)' }, { status: 400 })

  const svc = createServiceClient()

  const { data: cred } = await svc
    .from('platform_credentials')
    .select('extra_data, platform_store_name')
    .eq('user_id', userId).eq('platform', 'coupangeats')
    .maybeSingle()

  if (!cred) {
    return NextResponse.json({ ok: false, error: '해당 사용자의 쿠팡이츠 연결 없음' }, { status: 404 })
  }

  const existingExtra = (cred.extra_data as Record<string, unknown>) || {}
  // store_meta — 매장별 ID + 이름 매핑 (중복 제거 + meta 우선)
  const finalMeta = storeIds.map((id: string) => {
    const found = metaList.find((m: { id: string; name: string | null }) => m.id === id)
    return { id, name: found?.name || null }
  })
  const newExtra = {
    ...existingExtra,
    store_ids: storeIds,
    store_meta: finalMeta,
    store_ids_set_at: new Date().toISOString(),
    store_ids_set_by: admin.email,
  }

  const updateRow: Record<string, unknown> = {
    platform_store_id: primary,
    extra_data: newExtra,
    updated_at: new Date().toISOString(),
  }
  if (storeName) updateRow.platform_store_name = storeName

  const { error } = await svc
    .from('platform_credentials')
    .update(updateRow)
    .eq('user_id', userId).eq('platform', 'coupangeats')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    user_id: userId,
    primary_store_id: primary,
    all_store_ids: storeIds,
    store_meta: finalMeta,
    count: storeIds.length,
    message: storeIds.length > 1
      ? `매장 ${storeIds.length}개 등록 완료 (primary=${primary}). 다음 cron 부터 모든 매장 fetch.`
      : `매장 ${primary} 등록 완료.`,
  })
}
