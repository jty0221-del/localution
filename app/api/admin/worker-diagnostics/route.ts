// app/api/admin/worker-diagnostics/route.ts
// ============================================================
// 43차-5 · 워커 진단 집계 (관리자 전용)
//
//   GET /api/admin/worker-diagnostics
//
//   목적
//     · 셀렉터 변경/캡차/IP 차단 등으로 워커 로그인이 실패한 사용자 한눈에 확인
//     · 답글 등록(post_reply) 실패 잡 누적도 함께 집계
//     · Fly.io 로그(dumpPageDiagnostics) 를 직접 보러 가기 전 1차 스크리닝
//
//   응답
//     {
//       generated_at,
//       login_issues: [{ user_id, platform, last_login_status, last_login_at, account_id, store_name }],
//       reply_failures_7d: [{ platform, count, sample: { id, error, posted_at } }],
//       totals: { login_issues, reply_failures_7d }
//     }
// ============================================================
import { NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })
  }

  const svc = createServiceClient()

  // 1) 로그인 이상 — last_login_status 가 success 로 시작하지 않는 케이스 전부
  const { data: creds, error: credErr } = await svc
    .from('platform_credentials')
    .select('user_id, platform, account_id, platform_store_name, last_login_status, last_login_at')
    .order('last_login_at', { ascending: false, nullsFirst: false })
    .limit(200)

  if (credErr) {
    return NextResponse.json({ ok: false, error: 'creds 조회 실패: ' + credErr.message }, { status: 500 })
  }

  const loginIssues = (creds || []).filter((c) => {
    const s = String(c.last_login_status || '')
    if (!s) return false
    return !s.startsWith('success')
  }).map((c) => ({
    user_id: c.user_id,
    platform: c.platform,
    account_id: c.account_id,
    store_name: c.platform_store_name,
    last_login_status: c.last_login_status,
    last_login_at: c.last_login_at,
  }))

  // 2) 최근 7일 post_reply 실패 — reply_status='failed' + reply_queued_at 기준
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()
  const { data: failures, error: failErr } = await svc
    .from('platform_reviews')
    .select('id, platform, reply_error, reply_queued_at, posted_at, user_id')
    .eq('reply_status', 'failed')
    .gte('reply_queued_at', since)
    .order('reply_queued_at', { ascending: false })
    .limit(200)

  if (failErr) {
    return NextResponse.json({ ok: false, error: 'failures 조회 실패: ' + failErr.message }, { status: 500 })
  }

  // 플랫폼별 집계
  const byPlatform = new Map<string, { platform: string; count: number; sample: any | null }>()
  for (const row of failures || []) {
    const p = String(row.platform)
    const cur = byPlatform.get(p) || { platform: p, count: 0, sample: null }
    cur.count += 1
    if (!cur.sample) {
      cur.sample = {
        id: row.id,
        user_id: row.user_id,
        error: row.reply_error,
        queued_at: row.reply_queued_at,
        posted_at: row.posted_at,
      }
    }
    byPlatform.set(p, cur)
  }
  const replyFailures = Array.from(byPlatform.values()).sort((a, b) => b.count - a.count)

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    totals: {
      login_issues: loginIssues.length,
      reply_failures_7d: failures?.length ?? 0,
    },
    login_issues: loginIssues,
    reply_failures_7d: replyFailures,
  })
}
