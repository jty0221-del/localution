// app/api/admin/sync-naver-store-ids/route.ts
// ============================================================
// 관리자: platform_credentials.platform_store_id 가 NULL 인 네이버 사용자에
//   다른 테이블 (stores, place_targets, platform_reviews) 의 place_id 복사
// → 답글 발행 가능 상태로 정정
//
// GET ?dry=1  → 대상 표시만
// GET ?dry=0  → 실제 update
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const dry = searchParams.get('dry') !== '0'

  const svc = createServiceClient()

  // 1) platform_credentials 에서 naver_place + platform_store_id 가 null 인 행
  const { data: creds, error } = await svc
    .from('platform_credentials')
    .select('user_id, platform_store_id, platform_store_name')
    .eq('platform', 'naver_place')
    .or('platform_store_id.is.null,platform_store_id.eq.')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!creds || creds.length === 0) {
    return NextResponse.json({ ok: true, found: 0, message: '모든 네이버 사용자 platform_store_id 정상' })
  }

  const targets: any[] = []
  for (const c of creds) {
    let placeId: string | null = null
    let source = ''

    // 2-A: stores 테이블에서 naver_place_id
    const { data: store } = await svc
      .from('stores')
      .select('naver_place_id, name, address, category')
      .eq('user_id', c.user_id)
      .not('naver_place_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (store?.naver_place_id && /^\d+$/.test(String(store.naver_place_id))) {
      placeId = String(store.naver_place_id)
      source = 'stores'
    }

    // 2-B: place_targets
    if (!placeId) {
      const { data: target } = await svc
        .from('place_targets')
        .select('place_id, name')
        .eq('user_id', c.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (target?.place_id && /^\d+$/.test(String(target.place_id))) {
        placeId = String(target.place_id)
        source = 'place_targets'
      }
    }

    // 2-C: platform_reviews 의 platform_store_id (이미 수집된 리뷰가 있으면)
    if (!placeId) {
      const { data: reviewRow } = await svc
        .from('platform_reviews')
        .select('platform_store_id')
        .eq('user_id', c.user_id)
        .eq('platform', 'naver_place')
        .not('platform_store_id', 'is', null)
        .limit(1)
        .maybeSingle()
      if (reviewRow?.platform_store_id && /^\d+$/.test(String(reviewRow.platform_store_id))) {
        placeId = String(reviewRow.platform_store_id)
        source = 'platform_reviews'
      }
    }

    if (placeId) {
      targets.push({
        user_id: c.user_id,
        user_id_short: c.user_id.slice(0, 12) + '...',
        place_id: placeId,
        source,
        store_name: store?.name || null,
      })
    } else {
      targets.push({
        user_id: c.user_id,
        user_id_short: c.user_id.slice(0, 12) + '...',
        place_id: null,
        source: 'NOT_FOUND',
        store_name: null,
      })
    }
  }

  const fixable = targets.filter(t => t.place_id)
  const not_fixable = targets.filter(t => !t.place_id)

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      total_null: creds.length,
      fixable: fixable.length,
      not_fixable: not_fixable.length,
      fixable_sample: fixable,
      not_fixable_sample: not_fixable,
      hint: 'dry-run. 실제 처리하려면 ?dry=0',
    })
  }

  // 실제 업데이트
  let updated = 0
  for (const t of fixable) {
    const { error: upErr } = await svc
      .from('platform_credentials')
      .update({
        platform_store_id: t.place_id,
        platform_store_name: t.store_name || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', t.user_id)
      .eq('platform', 'naver_place')
    if (!upErr) updated++
  }

  return NextResponse.json({
    ok: true,
    total_null: creds.length,
    fixable: fixable.length,
    updated,
    not_fixable: not_fixable.length,
    not_fixable_sample: not_fixable,
    triggered_by: admin.email,
    message: `네이버 ${updated}명 platform_store_id 자동 복원 완료. 답글 발행 가능 상태.`,
  })
}
