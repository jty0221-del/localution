// app/api/cron/blog-tracking-digest/route.ts
// ============================================================
// 아침 요약 카톡 전송 크론 — 18차-5
//
//   Vercel Cron: "0 23 * * *" (UTC 23:00 = KST 08:00)
//   Authorization: Bearer <CRON_SECRET>
//
//   동작:
//     1) kakao_tokens 에서 alert_prefs.daily_digest != false 인 user 전체 조회
//     2) 각 user 의 활성 타겟(blog_tracking_targets) 의 직전 체크 결과(history 최신 1건) 수집
//     3) buildDigestMessage 로 메시지 조립 → sendMemoForUser
//     4) blog_tracking_alerts 에 event_type='daily_digest' 로 로그 기록
//
//   수동 테스트:
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//          https://www.localution.co.kr/api/cron/blog-tracking-digest
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { sendMemoForUser } from '@/app/lib/kakao-api'
import { buildDigestMessage, shouldSend, DigestItem } from '@/app/lib/rank-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 500 })
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const startedAt = Date.now()
  const svc = createServiceClient()

  // (1) 알림 대상 사용자 목록
  const { data: users, error: uErr } = await svc
    .from('kakao_tokens')
    .select('user_id, alert_prefs')
  if (uErr) {
    return NextResponse.json({ error: 'kakao_tokens_load_failed', detail: uErr.message }, { status: 500 })
  }

  const digestUsers = (users ?? []).filter(u =>
    shouldSend('daily_digest', u.alert_prefs as Record<string, unknown>),
  )
  if (digestUsers.length === 0) {
    return NextResponse.json({
      ok: true, mode: 'cron_digest', count: 0,
      message: '요약 전송 대상 없음',
      duration_ms: Date.now() - startedAt,
    })
  }

  let sent = 0, failed = 0
  const results: Array<{ user_id: string; items: number; ok: boolean; error?: string }> = []

  for (const u of digestUsers) {
    // (2) 이 user 의 활성 타겟 전체
    // eslint-disable-next-line no-await-in-loop
    const { data: targets } = await svc
      .from('blog_tracking_targets')
      .select('id, label, keyword')
      .eq('user_id', u.user_id)
      .eq('active', true)

    if (!targets || targets.length === 0) {
      results.push({ user_id: u.user_id, items: 0, ok: false, error: 'no_targets' })
      continue
    }

    // (3) 각 타겟별 최신 2건 (prev, curr) 수집
    const items: DigestItem[] = []
    for (const t of targets) {
      // eslint-disable-next-line no-await-in-loop
      const { data: hist } = await svc
        .from('blog_tracking_history')
        .select('rank, section, created_at')
        .eq('target_id', t.id)
        .order('created_at', { ascending: false })
        .limit(2)
      const latest = hist?.[0]
      const prior  = hist?.[1]
      items.push({
        label:     t.label,
        keyword:   t.keyword,
        prev_rank: prior?.rank ?? null,
        new_rank:  latest?.rank ?? null,
      })
    }

    const msg = buildDigestMessage(items)

    // (4) 전송
    // eslint-disable-next-line no-await-in-loop
    const send = await sendMemoForUser(u.user_id, msg, { buttonTitle: '대시보드 열기' })
    if (send.ok) sent += 1
    else         failed += 1

    // eslint-disable-next-line no-await-in-loop
    await svc.from('blog_tracking_alerts').insert({
      user_id:     u.user_id,
      event_type:  'daily_digest',
      message:     msg,
      payload:     { items, kind: 'daily_digest' },
      sent_status: send.ok ? 'sent' : 'failed',
      sent_error:  send.ok ? null : send.error,
      sent_at:     send.ok ? new Date().toISOString() : null,
    })

    results.push({
      user_id: u.user_id,
      items:   items.length,
      ok:      send.ok,
      error:   send.ok ? undefined : send.error,
    })
  }

  return NextResponse.json({
    ok: true,
    mode: 'cron_digest',
    count: digestUsers.length,
    sent, failed,
    duration_ms: Date.now() - startedAt,
    results,
  })
}
