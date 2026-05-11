// app/api/admin/cleanup-admin-connections/route.ts
// ============================================================
// 관리자: 관리자 본인 계정의 테스트 플랫폼 연결 정리
//   · 사장님 (마대남 OGcUgEmBV7V9...) 가 관리자 모드 만들기 전 테스트로 연동한
//     platform_credentials / stores / place_targets 정리
//
// GET ?dry=1 → 시뮬레이션 (삭제 대상 표시만)
// GET ?dry=0 → 실제 삭제
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 관리자 본인 user_id (마대남 — 테스트용 연결)
const ADMIN_TEST_USER_ID = 'OGcUgEmBV7V9urNSSC5rW-OFtFc_g9do3X5sVxHI0Lw'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const dry = searchParams.get('dry') !== '0'

  const svc = createServiceClient()

  // 1) 대상 platform_credentials 조회
  const { data: creds } = await svc
    .from('platform_credentials')
    .select('id, platform, platform_store_id, platform_store_name')
    .eq('user_id', ADMIN_TEST_USER_ID)

  // 2) 대상 stores 조회
  const { data: stores } = await svc
    .from('stores')
    .select('id, name, naver_place_id')
    .eq('user_id', ADMIN_TEST_USER_ID)

  // 3) 대상 place_targets 조회
  const { data: targets } = await svc
    .from('place_targets')
    .select('id, name, place_id')
    .eq('user_id', ADMIN_TEST_USER_ID)

  // 4) platform_reviews 정리도 함께 (수집된 리뷰 = 다른 사장 데이터일 수 있음 → 제거)
  const { count: reviewCount } = await svc
    .from('platform_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ADMIN_TEST_USER_ID)

  const summary = {
    user_id: ADMIN_TEST_USER_ID,
    user_id_short: ADMIN_TEST_USER_ID.slice(0, 12) + '...',
    platform_credentials: creds || [],
    stores: stores || [],
    place_targets: targets || [],
    platform_reviews_count: reviewCount || 0,
  }

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      summary,
      hint: 'dry-run. 실제 삭제하려면 ?dry=0',
    })
  }

  // 실제 삭제
  const results = {
    platform_credentials: 0,
    stores: 0,
    place_targets: 0,
    platform_reviews: 0,
    errors: [] as string[],
  }

  try {
    const { error, count } = await svc
      .from('platform_credentials')
      .delete({ count: 'exact' })
      .eq('user_id', ADMIN_TEST_USER_ID)
    if (error) results.errors.push('platform_credentials: ' + error.message)
    else results.platform_credentials = count || 0
  } catch (e: any) { results.errors.push('platform_credentials exception: ' + e.message) }

  try {
    const { error, count } = await svc
      .from('stores')
      .delete({ count: 'exact' })
      .eq('user_id', ADMIN_TEST_USER_ID)
    if (error) results.errors.push('stores: ' + error.message)
    else results.stores = count || 0
  } catch (e: any) { results.errors.push('stores exception: ' + e.message) }

  try {
    const { error, count } = await svc
      .from('place_targets')
      .delete({ count: 'exact' })
      .eq('user_id', ADMIN_TEST_USER_ID)
    if (error) results.errors.push('place_targets: ' + error.message)
    else results.place_targets = count || 0
  } catch (e: any) { results.errors.push('place_targets exception: ' + e.message) }

  try {
    const { error, count } = await svc
      .from('platform_reviews')
      .delete({ count: 'exact' })
      .eq('user_id', ADMIN_TEST_USER_ID)
    if (error) results.errors.push('platform_reviews: ' + error.message)
    else results.platform_reviews = count || 0
  } catch (e: any) { results.errors.push('platform_reviews exception: ' + e.message) }

  return NextResponse.json({
    ok: true,
    summary,
    deleted: results,
    triggered_by: admin.email,
    message: `${ADMIN_TEST_USER_ID.slice(0, 12)} 관리자 테스트 연결 모두 제거 완료 — 다른 사장님 데이터 보존됨`,
  })
}
