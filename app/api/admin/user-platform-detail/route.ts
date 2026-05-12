// app/api/admin/user-platform-detail/route.ts
// ============================================================
// v38: 특정 사용자의 모든 플랫폼 상세 정보 조회 — 매장 매핑 진단/수동 fix 용
//   · platform_credentials + stores + place_targets + recent reviews
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || ''
  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })

  const svc = createServiceClient()

  const { data: creds } = await svc
    .from('platform_credentials')
    .select('platform, platform_store_id, platform_store_name, last_login_status, last_login_at, extra_data, updated_at')
    .eq('user_id', userId)

  const { data: stores } = await svc
    .from('stores')
    .select('id, name, address, category, naver_place_id, naver_url, created_at, updated_at')
    .eq('user_id', userId)

  const { data: targets } = await svc
    .from('place_targets')
    .select('place_id, name, address, enabled, created_at')
    .eq('user_id', userId)

  // 사용자 프로필 (auth.users 가 아닌 public.profiles 또는 비슷)
  let profile = null
  try {
    const { data } = await svc
      .from('profiles')
      .select('email, display_name, phone, created_at')
      .eq('id', userId)
      .maybeSingle()
    profile = data
  } catch (_) {}

  // 최근 리뷰 (수집된 데이터 있는지 확인)
  const { data: recentReviews } = await svc
    .from('platform_reviews')
    .select('platform, platform_store_id, posted_at, author_name')
    .eq('user_id', userId)
    .order('posted_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    ok: true,
    user_id: userId,
    profile,
    platform_credentials: creds || [],
    stores: stores || [],
    place_targets: targets || [],
    recent_reviews: recentReviews || [],
    triggered_by: admin.email,
  })
}
