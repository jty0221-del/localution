// app/api/admin/platform-issues-overview/route.ts
// ============================================================
// v38: 시스템 전체 플랫폼 이슈 한눈에 보기
//   · 자격증명 오류 (credentials_invalid)
//   · 최근 24h failed 답글
//   · 최근 24h failed 수집 (last_login_status='failed')
//   · stuck queued 답글
//   · place_id 누락 사용자
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const svc = createServiceClient()
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  // 1) 자격증명 오류 사용자 — last_login_status 는 'success' 또는 'success:note' 또는 'failed:note' 형식
  //    'success' 로 시작하지 않는 모든 값 = 실패/잠금 상태
  const { data: allCreds } = await svc
    .from('platform_credentials')
    .select('user_id, platform, last_login_status, last_login_error_message, last_login_at, platform_store_name')
    .not('last_login_status', 'is', null)
    .order('last_login_at', { ascending: false })
    .limit(200)

  const failedCreds = (allCreds || []).filter(c => {
    const s = String(c.last_login_status || '')
    return !!s && !s.startsWith('success')
  }).slice(0, 50)

  // 2) 누락 place_id 사용자 (자격증명 있지만 store_id 없음)
  const { data: nullPlaceId } = await svc
    .from('platform_credentials')
    .select('user_id, platform')
    .or('platform_store_id.is.null,platform_store_id.eq.')
    .limit(20)

  // 3) 24h failed 답글 (replies) 집계
  const { data: failedReplies, count: failedReplyCount } = await svc
    .from('platform_reviews')
    .select('user_id, platform, reply_error', { count: 'exact' })
    .eq('reply_status', 'failed')
    .gte('reply_submitted_at', since24h)
    .limit(20)

  // failed_reply 패턴 분석
  const failedReplyPatterns: Record<string, number> = {}
  for (const r of (failedReplies || [])) {
    const err = String(r.reply_error || '')
    let pattern = '기타'
    if (err.includes('login failed')) pattern = '로그인 실패'
    else if (err.includes('안전하지 않은') || err.includes('비정상')) pattern = '네이버 잠금'
    else if (err.includes('silent reject')) pattern = 'silent reject'
    else if (err.includes('review card not found')) pattern = '리뷰 카드 못찾음'
    else if (err.includes('입력란')) pattern = '답글 입력란 없음'
    else if (err.includes('credentials_invalid') || err.includes('아이디 또는 비밀번호')) pattern = '자격증명 오류'
    else if (err.includes('큐 분실')) pattern = '큐 분실'
    failedReplyPatterns[pattern] = (failedReplyPatterns[pattern] || 0) + 1
  }

  // 4) stuck queued 답글
  const { data: stuckQueued, count: stuckCount } = await svc
    .from('platform_reviews')
    .select('user_id, platform, reply_queued_at', { count: 'exact' })
    .eq('reply_status', 'queued')
    .lte('reply_queued_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(20)

  // 5) 플랫폼별 사용자 카운트
  const { data: platformStats } = await svc
    .from('platform_credentials')
    .select('platform, last_login_status')

  const platformCounts: Record<string, { total: number; success: number; failed: number; disabled: number; never: number }> = {}
  for (const p of (platformStats || [])) {
    const plat = p.platform
    if (!platformCounts[plat]) platformCounts[plat] = { total: 0, success: 0, failed: 0, disabled: 0, never: 0 }
    platformCounts[plat].total++
    const status = String(p.last_login_status || '')
    // markLoginStatus 는 'success' / 'success:note' / 'failed:note' / 'credentials_invalid:note' 등 형식 저장
    if (status.startsWith('success')) platformCounts[plat].success++
    else if (status.startsWith('disabled') || status === 'not_connected') platformCounts[plat].disabled++
    else if (status) platformCounts[plat].failed++  // 비어있지 않으면 실패 계열
    else platformCounts[plat].never++
  }

  // failed creds 사용자별 그룹화 (UI 친화)
  const credsByUser: Record<string, any[]> = {}
  for (const c of (failedCreds || [])) {
    const u = c.user_id
    if (!credsByUser[u]) credsByUser[u] = []
    credsByUser[u].push({
      platform: c.platform,
      status: c.last_login_status,
      error: String(c.last_login_error_message || '').slice(0, 150),
      last_login_at: c.last_login_at,
      store: c.platform_store_name,
    })
  }

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    summary: {
      failed_credentials_count: failedCreds?.length || 0,
      null_place_id_count: nullPlaceId?.length || 0,
      failed_replies_24h: failedReplyCount || 0,
      stuck_queued_count: stuckCount || 0,
    },
    platform_counts: platformCounts,
    failed_replies_pattern: failedReplyPatterns,
    failed_credentials_users: Object.entries(credsByUser).slice(0, 20).map(([uid, list]) => ({
      user_id: uid.slice(0, 12) + '...',
      issues: list,
    })),
    null_place_id_users: (nullPlaceId || []).map(r => ({
      user_id: r.user_id.slice(0, 12) + '...',
      platform: r.platform,
    })),
    stuck_queued_sample: (stuckQueued || []).slice(0, 10).map(r => ({
      user_id: r.user_id.slice(0, 12) + '...',
      platform: r.platform,
      queued_at: r.reply_queued_at,
    })),
    triggered_by: admin.email,
    hint: '문제 발견 시: 자격증명 오류 → 사용자에게 재연결 안내. 누락 place_id → sync-naver-store-ids. stuck queued → admin/queue-control 의 4번 액션.',
  })
}
