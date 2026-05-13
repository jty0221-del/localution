// app/api/admin/reseller-overview/route.ts
// ============================================================
// v38: Reseller (마케터) 가 관리하는 여러 사장님 한 번에 보기
//   · admin 권한 사용자가 모든 사용자별 핵심 stats 한 화면
//   · 사용자 클릭 → impersonate 또는 detail
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const svc = createServiceClient()
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  // 모든 활성 사용자 (platform_credentials 가 1개 이상)
  const { data: allCreds } = await svc
    .from('platform_credentials')
    .select('user_id, platform, platform_store_name, last_login_status')

  const userMap = new Map<string, {
    user_id: string
    platforms: string[]
    store_names: string[]
    has_login_issue: boolean
  }>()

  for (const c of (allCreds || [])) {
    const u = c.user_id
    if (!userMap.has(u)) userMap.set(u, { user_id: u, platforms: [], store_names: [], has_login_issue: false })
    const entry = userMap.get(u)!
    entry.platforms.push(c.platform)
    if (c.platform_store_name) entry.store_names.push(c.platform_store_name)
    const s = String(c.last_login_status || '')
    if (s && !s.startsWith('success') && s !== 'not_connected') entry.has_login_issue = true
  }

  const userIds = Array.from(userMap.keys())

  // 사용자별 리뷰 + 답글 카운트 (배치)
  const { data: stats30 } = await svc
    .from('platform_reviews')
    .select('user_id, reply_status, rating, has_reply')
    .gte('posted_at', since30d)
    .in('user_id', userIds.length > 0 ? userIds : ['__none__'])
    .limit(20000)

  const userStats: Record<string, {
    reviews: number; replied: number; submitted_by_us: number;
    unreplied: number; negative_unreplied: number; avg_rating: number | null;
  }> = {}
  for (const u of userIds) userStats[u] = { reviews: 0, replied: 0, submitted_by_us: 0, unreplied: 0, negative_unreplied: 0, avg_rating: null }

  const ratingAcc: Record<string, { sum: number; count: number }> = {}
  for (const r of (stats30 || [])) {
    const u = r.user_id
    if (!userStats[u]) continue
    userStats[u].reviews++
    if (r.has_reply) userStats[u].replied++
    if (r.reply_status === 'submitted') userStats[u].submitted_by_us++
    if (!r.has_reply) userStats[u].unreplied++
    if (!r.has_reply && r.rating != null && r.rating <= 2) userStats[u].negative_unreplied++
    if (r.rating != null && r.rating >= 1 && r.rating <= 5) {
      if (!ratingAcc[u]) ratingAcc[u] = { sum: 0, count: 0 }
      ratingAcc[u].sum += r.rating
      ratingAcc[u].count++
    }
  }
  for (const u of Object.keys(ratingAcc)) {
    if (ratingAcc[u].count > 0) {
      userStats[u].avg_rating = Math.round((ratingAcc[u].sum / ratingAcc[u].count) * 10) / 10
    }
  }

  // 프로필 매핑 (이메일 표시용)
  let profileMap = new Map<string, any>()
  try {
    const { data: profiles } = await svc
      .from('profiles')
      .select('id, email, display_name')
      .in('id', userIds.length > 0 ? userIds : ['__none__'])
    for (const p of (profiles || [])) profileMap.set(p.id, p)
  } catch (_) {}

  const users = Array.from(userMap.values())
    .map(u => ({
      user_id: u.user_id,
      user_id_short: u.user_id.slice(0, 12) + '...',
      email: profileMap.get(u.user_id)?.email || null,
      display_name: profileMap.get(u.user_id)?.display_name || u.store_names[0] || null,
      platforms: Array.from(new Set(u.platforms)).sort(),
      has_login_issue: u.has_login_issue,
      ...userStats[u.user_id],
    }))
    .sort((a, b) => (b.reviews - a.reviews) || (b.negative_unreplied - a.negative_unreplied))

  return NextResponse.json({
    ok: true,
    total_users: users.length,
    summary: {
      total_reviews_30d: Object.values(userStats).reduce((s, x) => s + x.reviews, 0),
      total_unreplied: Object.values(userStats).reduce((s, x) => s + x.unreplied, 0),
      total_negative_unreplied: Object.values(userStats).reduce((s, x) => s + x.negative_unreplied, 0),
      users_with_login_issue: users.filter(u => u.has_login_issue).length,
    },
    users,
    triggered_by: admin.email,
    generated_at: new Date().toISOString(),
  })
}
