// app/api/cron/blog-tracking-daily/route.ts
// ============================================================
// 18차-3 → 18차-4 업데이트 — 블로그 순위 일 1회 크론 (v2)
//
//   Vercel Cron 이 매일 새벽 KST 05:00 (UTC 20:00) 호출.
//   Authorization: Bearer <CRON_SECRET> 헤더 검증 후
//   blog_tracking_targets.active=true 전체 타겟을 축차 체크하고
//   blog_tracking_history 에 v2 rank_hits jsonb 포함 INSERT.
//
//   수동 테스트:
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//          https://www.localution.co.kr/api/cron/blog-tracking-daily
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { checkNaverBlogRank, RankResult } from '@/app/lib/naver-rank'

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
  let ok = 0, fail = 0

  for (const t of targets) {
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

    results.push({
      target_id:   t.id,
      label:       t.label,
      keyword:     t.keyword,
      rank:        r.rank,
      section:     r.section,
      total_found: r.total_found,
      note:        r.note ?? null,
      best_hit:    r.best_hit,
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
    duration_ms: Date.now() - startedAt,
    results,
  })
}
