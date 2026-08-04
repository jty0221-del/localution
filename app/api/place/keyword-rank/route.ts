// app/api/place/keyword-rank/route.ts
// ============================================================
// 키워드 순위 즉시 조회 (수동 새로고침)
//
//   POST /api/place/keyword-rank  { keyword_target_id }
//     · 등록된 키워드를 지금 바로 측정하고 시계열에 기록
//
//   POST /api/place/keyword-rank  { target_id, keyword }
//     · 등록 없이 1회성 미리보기 (기록도 함께 남김 — 등록되어 있으면)
//
// rate limit: 네이버 스크래핑 보호 — 사용자당 10회/60초
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'
import { collectKeywordRank } from '@/app/lib/place-rank-collect'
import { scanPlaceRank } from '@/app/lib/place-rank'
import { calcPlaceScore } from '@/app/lib/place-score'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const rl = rateLimitByIp(req, `place-keyword-rank:${auth.userId}`, 10, 60)
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` },
      { status: 429 },
    )
  }

  let body: { keyword_target_id?: string; target_id?: string; keyword?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const svc = createServiceClient()

  // ── (A) 등록된 키워드 재측정 ──────────────────────────────
  if (body.keyword_target_id) {
    const { data: kt, error: ktErr } = await svc
      .from('place_keyword_targets')
      .select('id, user_id, target_id, keyword')
      .eq('id', body.keyword_target_id)
      .maybeSingle()

    if (ktErr) return NextResponse.json({ ok: false, error: ktErr.message }, { status: 500 })
    if (!kt || kt.user_id !== auth.userId) {
      return NextResponse.json({ ok: false, error: '해당 키워드를 찾을 수 없어요' }, { status: 404 })
    }

    const { data: target } = await svc
      .from('place_targets')
      .select('place_id, name')
      .eq('id', kt.target_id)
      .maybeSingle()

    if (!target?.place_id) {
      return NextResponse.json({ ok: false, error: '매장 정보를 찾을 수 없어요' }, { status: 404 })
    }

    const result = await collectKeywordRank(
      svc,
      kt as { id: string; user_id: string; target_id: string; keyword: string },
      { place_id: target.place_id, name: target.name ?? null },
      'manual',
    )

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: '순위를 가져오지 못했어요. 잠시 후 다시 시도해주세요.',
          detail: result.error,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      keyword: result.keyword,
      rank: result.rank,
      score: result.score,
      total: result.total,
      method: result.method,
    })
  }

  // ── (B) 등록 없이 1회성 조회 ──────────────────────────────
  const targetId = String(body.target_id || '').trim()
  const keyword = String(body.keyword || '').trim()

  if (!targetId || !keyword) {
    return NextResponse.json(
      { ok: false, error: 'keyword_target_id 또는 (target_id + keyword) 가 필요해요' },
      { status: 400 },
    )
  }

  const { data: target } = await svc
    .from('place_targets')
    .select('id, user_id, place_id, name')
    .eq('id', targetId)
    .maybeSingle()

  if (!target || target.user_id !== auth.userId) {
    return NextResponse.json({ ok: false, error: '해당 매장을 찾을 수 없어요' }, { status: 404 })
  }

  const scan = await scanPlaceRank({
    keyword,
    placeId: target.place_id,
    businessName: target.name,
    maxRank: 100,
  })

  if (scan.method === 'none') {
    return NextResponse.json(
      { ok: false, error: '순위를 가져오지 못했어요.', detail: scan.errors.join(', ') },
      { status: 502 },
    )
  }

  const { data: snap } = await svc
    .from('place_snapshots')
    .select('visitor_review_count, blog_review_count, rating')
    .eq('target_id', targetId)
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { score } = calcPlaceScore({
    rank: scan.rank,
    blogReviewCount: snap?.blog_review_count ?? null,
    visitorReviewCount: snap?.visitor_review_count ?? null,
    rating: snap?.rating ?? null,
  })

  return NextResponse.json({
    ok: true,
    keyword,
    rank: scan.rank,
    total: scan.total,
    score,
    method: scan.method,
    matchedName: scan.matchedName,
    preview: true,
  })
}
