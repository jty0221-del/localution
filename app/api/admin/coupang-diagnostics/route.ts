// app/api/admin/coupang-diagnostics/route.ts
// ============================================================
// 쿠팡이츠 연동 시스템 종합 진단 (관리자 전용)
//
// GET /api/admin/coupang-diagnostics
//
// 응답:
//   {
//     env: { PROXY_HOST, ENCRYPTION_KEK_HEX, REDIS_URL },        // 환경변수 OK 여부
//     users: [
//       {
//         user_id, account_id_mask, store_name, store_id,
//         connected_at, last_login_status, last_login_at,
//         has_session_cookies, cookies_age_hours, has_unify_token,
//         review_count, last_review_at, last_collected_at,
//         likely_issue: 'ok' | 'no_cookies' | 'cookies_stale' | 'login_failed' | 'no_reviews_in_window' | 'never_fetched'
//       }
//     ],
//     queue: { active, waiting, failed, coupang_active, coupang_waiting },
//     summary: {
//       total_users, ok_users, broken_users,
//       common_issues: { cookies_stale: N, login_failed: N, ... }
//     }
//   }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function maskId(id: string | null | undefined): string | null {
  if (!id) return null
  const s = String(id).trim()
  if (s.length <= 2) return s
  if (s.length <= 4) return s[0] + '*'.repeat(s.length - 1)
  if (s.length <= 6) return s.slice(0, 2) + '*'.repeat(s.length - 3) + s.slice(-1)
  return s.slice(0, 2) + '*'.repeat(s.length - 4) + s.slice(-2)
}

function diffHours(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (isNaN(t)) return null
  return Math.round((Date.now() - t) / 3600000)
}

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  // ── 1) 환경변수 점검 ──
  const env = {
    PROXY_HOST: !!process.env.PROXY_HOST,
    PROXY_USER: !!process.env.PROXY_USER,
    PROXY_PASS: !!process.env.PROXY_PASS,
    ENCRYPTION_KEK_HEX: (process.env.ENCRYPTION_KEK_HEX || '').replace(/\s/g, '').length === 64,
    REDIS_URL: !!process.env.REDIS_URL,
  }

  // ── 2) 모든 쿠팡이츠 사용자 조회 ──
  const svc = createServiceClient()
  const { data: creds, error: credErr } = await svc
    .from('platform_credentials')
    .select('user_id, account_id, platform_store_id, platform_store_name, last_login_status, last_login_at, connected_at, updated_at, extra_data')
    .eq('platform', 'coupangeats')
    .order('updated_at', { ascending: false })

  if (credErr) {
    return NextResponse.json({ ok: false, error: credErr.message }, { status: 500 })
  }

  // ── 3) 각 사용자별 진단 ──
  const userIds = (creds || []).map(c => c.user_id)
  const reviewCounts = new Map<string, { count: number; latest: string | null; latest_collected: string | null }>()

  if (userIds.length > 0) {
    // 최근 리뷰 1건씩 (latest posted, latest collected)
    for (const uid of userIds) {
      const { count } = await svc
        .from('platform_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('platform', 'coupangeats')

      const { data: latestReview } = await svc
        .from('platform_reviews')
        .select('posted_at, collected_at')
        .eq('user_id', uid)
        .eq('platform', 'coupangeats')
        .order('posted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      reviewCounts.set(uid, {
        count: count || 0,
        latest: latestReview?.posted_at || null,
        latest_collected: latestReview?.collected_at || null,
      })
    }
  }

  // ── 4) 큐 상태 ──
  let queueState: any = { error: null }
  try {
    const q = getPlatformQueue()
    const counts = await q.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed')
    const waiting = await q.getWaiting(0, 200)
    const active = await q.getActive(0, 50)
    const failed = await q.getFailed(0, 30)
    queueState = {
      counts,
      coupang_waiting: waiting.filter((j: any) => j.data?.platform === 'coupangeats').length,
      coupang_active: active.filter((j: any) => j.data?.platform === 'coupangeats').length,
      coupang_failed_recent: failed
        .filter((j: any) => j.data?.platform === 'coupangeats')
        .slice(0, 10)
        .map((j: any) => ({
          user_id: j.data?.userId,
          action: j.data?.action,
          reason: String(j.failedReason || '').slice(0, 200),
          attempts: j.attemptsMade,
          finishedOn: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
        })),
    }
  } catch (e: any) {
    queueState = { error: e?.message || 'queue check failed' }
  }

  // ── 5) 사용자별 종합 분석 ──
  const issueDist: Record<string, number> = {}
  const users = (creds || []).map((c) => {
    const extra = (c.extra_data as Record<string, unknown>) || {}
    const sessionCookies = Array.isArray(extra.session_cookies) ? (extra.session_cookies as any[]) : []
    const hasUnifyToken = sessionCookies.some(ck => ck?.name === 'unify-token')
    const cookieAge = diffHours((extra.coupang_login_at as string) || c.last_login_at)
    const rev = reviewCounts.get(c.user_id) || { count: 0, latest: null, latest_collected: null }
    const collectedAge = diffHours(rev.latest_collected)
    const lastStatus = String(c.last_login_status || '')

    // likely_issue 판정
    let likely_issue = 'ok'
    if (sessionCookies.length === 0) {
      likely_issue = 'no_cookies'
    } else if (lastStatus.includes('credentials_invalid') || lastStatus.includes('failed:credentials')) {
      likely_issue = 'login_failed'
    } else if (lastStatus.includes('account_locked')) {
      likely_issue = 'account_locked'
    } else if (cookieAge !== null && cookieAge > 168) {
      // 7일 이상 — Akamai cookies stale 가능성
      likely_issue = 'cookies_stale'
    } else if (rev.count === 0 && lastStatus.startsWith('success')) {
      likely_issue = 'no_reviews_in_window'
    } else if (rev.count === 0) {
      likely_issue = 'never_fetched'
    } else if (collectedAge !== null && collectedAge > 48) {
      likely_issue = 'fetch_stale'
    }

    issueDist[likely_issue] = (issueDist[likely_issue] || 0) + 1

    // 다중 매장 — extra_data.store_ids
    const allStoreIds = Array.isArray(extra.store_ids) ? (extra.store_ids as any[]).map(s => String(s)) : []

    return {
      user_id: c.user_id,
      account_id_mask: maskId(c.account_id),
      store_name: c.platform_store_name,
      store_id: c.platform_store_id,
      all_store_ids: allStoreIds,
      connected_at: c.connected_at,
      last_login_status: c.last_login_status,
      last_login_at: c.last_login_at,
      has_session_cookies: sessionCookies.length > 0,
      session_cookie_count: sessionCookies.length,
      has_unify_token: hasUnifyToken,
      cookies_age_hours: cookieAge,
      review_count: rev.count,
      last_review_posted_at: rev.latest,
      last_collected_at: rev.latest_collected,
      collected_age_hours: collectedAge,
      likely_issue,
    }
  })

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    env,
    queue: queueState,
    summary: {
      total_users: users.length,
      ok_users: users.filter(u => u.likely_issue === 'ok').length,
      issues: issueDist,
    },
    users,
    legend: {
      ok: '정상 — 쿠키 있고 리뷰 수집됨',
      no_cookies: 'save-login 실패 (Vercel raw HTTP 통과 못 함, iproyal proxy 점검 필요)',
      login_failed: '아이디/비밀번호 오류 — 사장님 재입력 필요',
      account_locked: '계정 잠김 — 쿠팡이츠 사장님 사이트에서 직접 잠금 해제',
      cookies_stale: '쿠키 7일 초과 — 재로그인 필요',
      no_reviews_in_window: '로그인 OK 인데 14일 내 리뷰 없음 (정상일 수 있음, manual-fetch days=180 권장)',
      never_fetched: '한 번도 fetch 안 됨 — 큐 점검 필요',
      fetch_stale: '마지막 수집 48시간 초과 — cron 또는 워커 점검',
    },
  })
}
