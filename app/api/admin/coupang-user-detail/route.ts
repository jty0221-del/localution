// app/api/admin/coupang-user-detail/route.ts
// ============================================================
// 관리자: 특정 사용자의 쿠팡이츠 상세 정보 조회
//
// GET ?user_id=<uuid>
//   · 자격증명 + extra_data (store_meta, session_cookies count 등)
//   · 매장별 review_count + last_collected_at + last_review
//   · 최근 50개 review (storeId 별 그룹 가능)
//   · 매장별 미답변 수
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

  // 1) 자격증명 + extra_data
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('account_id, platform_store_id, platform_store_name, last_login_status, last_login_at, connected_at, updated_at, extra_data')
    .eq('user_id', userId).eq('platform', 'coupangeats')
    .maybeSingle()

  if (!cred) return NextResponse.json({ ok: false, error: '연결 안 됨' }, { status: 404 })

  const extra = (cred.extra_data as Record<string, unknown>) || {}
  const storeMeta = Array.isArray(extra.store_meta)
    ? (extra.store_meta as any[]).map(m => ({ id: String(m?.id || ''), name: m?.name ? String(m.name) : null }))
    : []
  const storeIds = Array.isArray(extra.store_ids) ? (extra.store_ids as any[]).map(s => String(s)) : []

  // store_meta 가 비어있으면 store_ids 로 채우고, 그것도 없으면 platform_store_id 로
  let stores = storeMeta.length > 0
    ? storeMeta
    : storeIds.map(id => ({ id, name: id === cred.platform_store_id ? cred.platform_store_name : null }))
  if (stores.length === 0 && cred.platform_store_id) {
    stores = [{ id: String(cred.platform_store_id), name: cred.platform_store_name }]
  }

  // 2) 매장별 review_count + last_collected
  const storeStats: Array<{ id: string; name: string | null; review_count: number; unreplied: number; last_collected_at: string | null; last_review_posted_at: string | null }> = []
  for (const s of stores) {
    const { count: total } = await svc
      .from('platform_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('platform', 'coupangeats')
      .eq('platform_store_id', s.id)
    const { count: unreplied } = await svc
      .from('platform_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('platform', 'coupangeats')
      .eq('platform_store_id', s.id)
      .eq('has_reply', false)
    const { data: latest } = await svc
      .from('platform_reviews')
      .select('collected_at, posted_at')
      .eq('user_id', userId).eq('platform', 'coupangeats')
      .eq('platform_store_id', s.id)
      .order('collected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    storeStats.push({
      id: s.id,
      name: s.name,
      review_count: total || 0,
      unreplied: unreplied || 0,
      last_collected_at: latest?.collected_at || null,
      last_review_posted_at: latest?.posted_at || null,
    })
  }

  // 3) 전체 리뷰 (최근 50)
  const { data: reviews } = await svc
    .from('platform_reviews')
    .select('id, platform_review_id, platform_store_id, author_name, author_mask, rating, content, photos, posted_at, collected_at, has_reply, reply_content, reply_status')
    .eq('user_id', userId).eq('platform', 'coupangeats')
    .order('posted_at', { ascending: false })
    .limit(50)

  // 4) 전체 합산
  const total_reviews = storeStats.reduce((s, x) => s + x.review_count, 0)
  const total_unreplied = storeStats.reduce((s, x) => s + x.unreplied, 0)

  // 5) cookies / extra_data 메타
  const sessionCookies = Array.isArray(extra.session_cookies) ? (extra.session_cookies as any[]) : []

  return NextResponse.json({
    ok: true,
    user_id: userId,
    account_id: cred.account_id,
    primary_store_id: cred.platform_store_id,
    primary_store_name: cred.platform_store_name,
    last_login_status: cred.last_login_status,
    last_login_at: cred.last_login_at,
    connected_at: cred.connected_at,
    updated_at: cred.updated_at,
    has_session_cookies: sessionCookies.length > 0,
    session_cookie_count: sessionCookies.length,
    coupang_login_at: extra.coupang_login_at || null,
    coupang_login_method: extra.coupang_login_method || null,
    last_whoami_at: extra.last_whoami_at || null,
    stores: storeStats,
    total_reviews,
    total_unreplied,
    recent_reviews: (reviews || []).map((r: any) => ({
      id: r.id,
      platform_review_id: r.platform_review_id,
      store_id: r.platform_store_id,
      author: r.author_mask || r.author_name || '익명',
      rating: r.rating,
      content: (r.content || '').slice(0, 200),
      has_photos: Array.isArray(r.photos) && r.photos.length > 0,
      posted_at: r.posted_at,
      collected_at: r.collected_at,
      has_reply: !!r.has_reply,
      reply_status: r.reply_status,
      reply_preview: r.reply_content ? (r.reply_content.slice(0, 100)) : null,
    })),
  })
}
