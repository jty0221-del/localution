// app/api/place/keyword-history/route.ts
// ============================================================
// 키워드별 순위·점수 시계열 조회 (차트·표용)
//
//   GET /api/place/keyword-history?keyword_target_id={uuid}&days=30
//     · 단일 키워드의 일자별 순위/점수
//
//   GET /api/place/keyword-history?target_id={uuid}&days=7
//     · 한 매장의 전체 키워드를 한 번에 (모니터링 카드 그리드용)
//
// 응답의 rows 는 ts 오름차순 — 차트가 그대로 그릴 수 있는 순서
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ROWS = 500

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const sp = new URL(req.url).searchParams
  const keywordTargetId = sp.get('keyword_target_id')
  const targetId = sp.get('target_id')

  if (!keywordTargetId && !targetId) {
    return NextResponse.json(
      { ok: false, error: 'keyword_target_id 또는 target_id 가 필요해요' },
      { status: 400 },
    )
  }

  const daysRaw = Number(sp.get('days') || 30)
  const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(1, Math.floor(daysRaw))) : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const svc = createServiceClient()

  let q = svc
    .from('place_keyword_ranks')
    .select('id, keyword_target_id, keyword, rank, total, score, visitor_review_count, blog_review_count, rating, method, source, ts')
    .eq('user_id', auth.userId) // 소유권을 where 로 강제
    .gte('ts', since)
    .order('ts', { ascending: true })
    .limit(MAX_ROWS)

  if (keywordTargetId) q = q.eq('keyword_target_id', keywordTargetId)
  else if (targetId) q = q.eq('target_id', targetId)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows = data ?? []

  // 키워드별로 묶어서 반환 — 카드 그리드가 그대로 렌더 가능
  const byKeyword: Record<string, typeof rows> = {}
  for (const r of rows) {
    const k = r.keyword_target_id as string
    if (!byKeyword[k]) byKeyword[k] = []
    byKeyword[k].push(r)
  }

  return NextResponse.json({
    ok: true,
    days,
    count: rows.length,
    rows,
    by_keyword: byKeyword,
  })
}
