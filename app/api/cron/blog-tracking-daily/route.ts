// app/api/cron/blog-tracking-daily/route.ts
// ============================================================
// 18차-3 → 18차-4 → 18차-5 업데이트 — 블로그 순위 일 1회 크론 (v3)
//
//   Vercel Cron 이 매일 새벽 KST 05:00 (UTC 20:00) 호출.
//   Authorization: Bearer <CRON_SECRET> 헤더 검증 후
//   blog_tracking_targets.active=true 전체 타겟을 축차 체크하고
//   blog_tracking_history 에 v2 rank_hits jsonb 포함 INSERT.
//   18차-5: 이전 레코드와 비교해 band_change / entered / dropped 이벤트를
//           감지하고 카카오톡 알림 발송 (alert_prefs 존중).
//
//   수동 테스트:
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//          https://www.localution.co.kr/api/cron/blog-tracking-daily
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { checkNaverBlogRank, RankResult } from '@/app/lib/naver-rank'
import { deriveEvent, shouldSend } from '@/app/lib/rank-events'
import { sendMemoForUser } from '@/app/lib/kakao-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_PER_RUN = 30
const GAP_MS = 400

interface TargetRow {
  id: string
  keyword: string
  target_url: string
  label: string
  user_id: string
}

interface RunResultItem {
  target_id: string
  label: string
  keyword: string
  rank: number | null
  section: string
  total_found: number
  note?: string | null
  best_hit?: RankResult['best_hit']
  event?: string | null
  alert_sent?: boolean
}

function compactHits(r: RankResult) {
  return {
    smart_blocks: r.smart_blocks.map(b => ({
      block_id:    b.block_id,
      block_title: b.block_title,
      my_rank:     b.my_rank,
      items:       b.items.length,
    })),
    blog_tab: {
      my_rank: r.blog_tab.my_rank,
      items:   r.blog_tab.items.length,
      checked: r.blog_tab.checked,
    },
    best_hit: r.best_hit,
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET 미설정 (Vercel Dashboard)' },
      { status: 500 },
    )
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const svc = createServiceClient()

  const { data: rows, error: listErr } = await svc
    .from('blog_tracking_targets')
    .select('id,keyword,target_url,label,user_id')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN)

  if (listErr) {
    return NextResponse.json(
      { error: 'targets_load_failed', detail: listErr.message },
      { status: 500 },
    )
  }

  const targets = (rows ?? []) as TargetRow[]
  if (targets.length === 0) {
    return NextResponse.json({
      ok: true, mode: 'cron_daily', count: 0,
      message: '활성 타겟 없음 — 종료',
      duration_ms: Date.now() - startedAt,
    })
  }

  const results: RunResultItem[] = []
  let ok = 0, fail = 0, alerts = 0

  for (const t of targets) {
    // (1) 이전 레코드 조회 (이벤트 비교용)
    // eslint-disable-next-line no-await-in-loop
    const { data: prevRow } = await svc
      .from('blog_tracking_history')
      .select('rank')
      .eq('target_id', t.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // (2) 네이버 순위 체크
    // eslint-disable-next-line no-await-in-loop
    const r: RankResult = await checkNaverBlogRank(t.keyword, t.target_url).catch(
      (e: unknown): RankResult => ({
        smart_blocks: [],
        blog_tab:     { items: [], my_rank: null, checked: false },
        best_hit:     null,
        rank:         null,
        section:      'not_found',
        total_found:  0,
        note:         e instanceof Error ? e.message : 'check_error',
      }),
    )

    // (3) 히스토리 INSERT (rank_hits fallback 포함)
    const basePayload = {
      target_id:   t.id,
      rank:        r.rank,
      section:     r.section,
      source:      'cron_daily',
      total_found: r.total_found,
      note:        r.note ?? null,
    }
    // eslint-disable-next-line no-await-in-loop
    let { error: insErr } = await svc
      .from('blog_tracking_history')
      .insert({ ...basePayload, rank_hits: compactHits(r) })
    if (insErr && /rank_hits|column.*exist/i.test(insErr.message)) {
      // eslint-disable-next-line no-await-in-loop
      const retry = await svc.from('blog_tracking_history').insert(basePayload)
      insErr = retry.error ?? null
    }
    if (insErr) fail += 1
    else ok += 1

    // (4) 이벤트 감지 + 카카오 알림 발송
    let detectedType: string | null = null
    let sent = false
    try {
      const ev = deriveEvent(
        { target_id: t.id, label: t.label, keyword: t.keyword },
        prevRow ? { rank: prevRow.rank } : null,
        { rank: r.rank, best_hit: r.best_hit },
      )
      if (ev) {
        detectedType = ev.type
        // 사용자 alert_prefs 확인
        // eslint-disable-next-line no-await-in-loop
        const { data: kak } = await svc
          .from('kakao_tokens')
          .select('alert_prefs')
          .eq('user_id', t.user_id)
          .maybeSingle()

        if (kak && shouldSend(ev.type, kak.alert_prefs as Record<string, unknown>)) {
          // eslint-disable-next-line no-await-in-loop
          const sendRes = await sendMemoForUser(t.user_id, ev.message, {
            buttonTitle: '대시보드 열기',
          })
          sent = sendRes.ok
          if (sendRes.ok) alerts += 1

          // eslint-disable-next-line no-await-in-loop
          await svc.from('blog_tracking_alerts').insert({
            user_id:     t.user_id,
            target_id:   t.id,
            event_type:  ev.type,
            message:     ev.message,
            payload: {
              prev_rank: ev.prev_rank,
              new_rank:  ev.new_rank,
              prev_band: ev.prev_band,
              new_band:  ev.new_band,
              direction: ev.direction,
              block_title: ev.block_title,
            },
            sent_status: sendRes.ok ? 'sent' : 'failed',
            sent_error:  sendRes.ok ? null : sendRes.error,
            sent_at:     sendRes.ok ? new Date().toISOString() : null,
          })
        }
      }
    } catch { /* 알림 파이프라인 실패는 메인 결과에 영향 없음 */ }

    results.push({
      target_id:   t.id,
      label:       t.label,
      keyword:     t.keyword,
      rank:        r.rank,
      section:     r.section,
      total_found: r.total_found,
      note:        r.note ?? null,
      best_hit:    r.best_hit,
      event:       detectedType,
      alert_sent:  sent,
    })

    if (t !== targets[targets.length - 1]) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, GAP_MS))
    }
  }

  return NextResponse.json({
    ok: true,
    mode: 'cron_daily',
    count: targets.length,
    inserted: ok,
    failed: fail,
    alerts_sent: alerts,
    duration_ms: Date.now() - startedAt,
    results,
  })
}
