// app/api/admin/detect-duplicate-stores/route.ts
// ============================================================
// 관리자: 여러 사용자가 같은 platform_store_id 사용 감지
//   · 데이터 정합성 확인 — 매장 매핑 실수 또는 의도된 공유 식별
//   · platform_credentials + stores + place_targets 3개 테이블 cross-check
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const svc = createServiceClient()

  // 1) platform_credentials 에서 (platform, platform_store_id) 중복 user_id 찾기
  const { data: creds } = await svc
    .from('platform_credentials')
    .select('user_id, platform, platform_store_id, platform_store_name')
    .not('platform_store_id', 'is', null)
    .neq('platform_store_id', '')

  const groupByKey = new Map<string, any[]>()
  for (const c of creds || []) {
    const key = `${c.platform}|${c.platform_store_id}`
    if (!groupByKey.has(key)) groupByKey.set(key, [])
    groupByKey.get(key)!.push(c)
  }

  const duplicates: any[] = []
  for (const [key, rows] of groupByKey) {
    if (rows.length > 1) {
      const [platform, storeId] = key.split('|')
      duplicates.push({
        platform,
        platform_store_id: storeId,
        user_count: rows.length,
        users: rows.map(r => ({
          user_id: String(r.user_id).slice(0, 12) + '...',
          store_name: r.platform_store_id_name || r.platform_store_name || null,
        })),
      })
    }
  }

  // 2) stores 테이블의 naver_place_id 중복 체크
  const { data: stores } = await svc
    .from('stores')
    .select('user_id, name, naver_place_id')
    .not('naver_place_id', 'is', null)

  const naverPlaceGroup = new Map<string, any[]>()
  for (const s of stores || []) {
    if (!s.naver_place_id) continue
    const key = String(s.naver_place_id)
    if (!naverPlaceGroup.has(key)) naverPlaceGroup.set(key, [])
    naverPlaceGroup.get(key)!.push(s)
  }

  const storeDuplicates: any[] = []
  for (const [placeId, rows] of naverPlaceGroup) {
    if (rows.length > 1) {
      storeDuplicates.push({
        naver_place_id: placeId,
        user_count: rows.length,
        stores: rows.map(r => ({
          user_id: String(r.user_id).slice(0, 12) + '...',
          name: r.name,
        })),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    duplicate_credentials_count: duplicates.length,
    duplicate_credentials: duplicates,
    duplicate_naver_stores_count: storeDuplicates.length,
    duplicate_naver_stores: storeDuplicates,
    triggered_by: admin.email,
    hint: '같은 매장을 의도적으로 공유하는 게 아니라면 사장님께 매장 ID 재확인 요청',
  })
}
