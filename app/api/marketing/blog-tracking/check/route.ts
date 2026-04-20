// app/api/marketing/blog-tracking/check/route.ts
// ============================================================
// 블로그 키워드 순위 — 수동 즉시 체크 (v2 — 18차-4)
//   · v2 파서 (naver-rank.ts) 의 smart_blocks / blog_tab / best_hit 반환값을
//     rank_hits jsonb 로 압축 저장.
//   · rank / section / total_found 는 v1 호환 필드로 best_hit 기반 산출.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { checkNaverBlogRank, RankResult } from '@/app/lib/naver-rank'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BULK = 20

interface TargetRow {
  id: string
  keyword: string
  target_url: string
  label: string
}

// rank_hits jsonb 용으로 RankResult 를 슬림하게 압축
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

async function runOne(
  svc: ReturnType<typeof createServiceClient>,
  t: TargetRow,
) {
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

  // 1차: rank_hits 포함 — 컬럼 없으면 fallback (SQL 마이그레이션 전 안전장치)
  const basePayload = {
    target_id:   t.id,
    rank:        r.rank,
    section:     r.section,
    source:      'naver_mobile',
    total_found: r.total_found,
    note:        r.note ?? null,
  }
  const { error: insErr } = await svc
    .from('blog_tracking_history')
    .insert({ ...basePayload, rank_hits: compactHits(r) })
  if (insErr && /rank_hits|column.*exist/i.test(insErr.message)) {
    // 마이그레이션 이전 → rank_hits 빼고 재시도
    await svc.from('blog_tracking_history').insert(basePayload)
  }
  return { target_id: t.id, label: t.label, ...r }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { target_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const target_id = (body.target_id ?? '').trim()
  if (!target_id) return NextResponse.json({ error: 'target_id 누락' }, { status: 400 })

  const svc = createServiceClient()

  // ---- 일괄 모드 ----
  if (target_id === 'all') {
    const { data: rows, error } = await svc
      .from('blog_tracking_targets')
      .select('id,keyword,target_url,label')
      .eq('user_id', auth.userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(MAX_BULK)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const results: Array<Awaited<ReturnType<typeof runOne>>> = []
    for (const t of (rows ?? []) as TargetRow[]) {
      // eslint-disable-next-line no-await-in-loop
      const r = await runOne(svc, t)
      results.push(r)
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r2 => setTimeout(r2, 300))
    }
    return NextResponse.json({ mode: 'all', count: results.length, results })
  }

  // ---- 단일 모드 ----
  const { data: t, error: getErr } = await svc
    .from('blog_tracking_targets')
    .select('id,keyword,target_url,label,user_id')
    .eq('id', target_id)
    .single()
  if (getErr || !t) return NextResponse.json({ error: '타겟을 찾을 수 없습니다.' }, { status: 404 })
  if (t.user_id !== auth.userId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const result = await runOne(svc, t as TargetRow)
  return NextResponse.json({ mode: 'one', result })
}
