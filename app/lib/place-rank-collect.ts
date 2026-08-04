// app/lib/place-rank-collect.ts
// ============================================================
// 키워드 순위 1건 수집 → place_keyword_ranks 저장 (서버 전용)
//
// 수동 새로고침 API 와 일일 크론이 이 함수를 공유한다.
// 로직이 두 곳에 복사되면 반드시 어긋나므로 단일 출처로 유지할 것.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { scanPlaceRank } from './place-rank'
import { calcPlaceScore } from './place-score'

export type KeywordTargetRow = {
  id: string
  user_id: string
  target_id: string
  keyword: string
}

export type StoreMeta = {
  place_id: string
  name: string | null
}

export type CollectResult = {
  ok: boolean
  keyword: string
  rank: number | null
  score: number | null
  total: number
  method: string
  error?: string
}

/**
 * 최신 매장 지표(리뷰수·평점)를 place_snapshots 에서 가져온다.
 * 점수 계산에 필요. 스냅샷이 없으면 전부 null 로 진행 (순위 점수만 반영).
 */
async function loadLatestSnapshot(
  svc: SupabaseClient,
  targetId: string,
): Promise<{ visitor: number | null; blog: number | null; rating: number | null }> {
  try {
    const { data } = await svc
      .from('place_snapshots')
      .select('visitor_review_count, blog_review_count, rating')
      .eq('target_id', targetId)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()
    return {
      visitor: data?.visitor_review_count ?? null,
      blog: data?.blog_review_count ?? null,
      rating: data?.rating ?? null,
    }
  } catch {
    return { visitor: null, blog: null, rating: null }
  }
}

/**
 * 키워드 1건의 순위를 측정하고 시계열에 기록한다.
 *
 * 실패해도 예외를 던지지 않는다 — 크론이 한 건 때문에 통째로 멈추면 안 되므로
 * 항상 CollectResult 로 결과를 돌려주고 호출자가 집계한다.
 */
export async function collectKeywordRank(
  svc: SupabaseClient,
  kt: KeywordTargetRow,
  store: StoreMeta,
  source: 'cron' | 'manual' = 'cron',
): Promise<CollectResult> {
  const base: CollectResult = {
    ok: false,
    keyword: kt.keyword,
    rank: null,
    score: null,
    total: 0,
    method: 'none',
  }

  let scan
  try {
    scan = await scanPlaceRank({
      keyword: kt.keyword,
      placeId: store.place_id,
      businessName: store.name,
      maxRank: 100,
    })
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : 'scan_failed' }
  }

  // 전략이 전부 막힌 경우 — 기록하지 않는다.
  // (미노출 null 과 "측정 실패" 를 구분해야 차트가 거짓말을 하지 않음)
  if (scan.method === 'none') {
    return { ...base, error: scan.errors.join(', ') || 'all_strategies_failed' }
  }

  const snap = await loadLatestSnapshot(svc, kt.target_id)
  const { score } = calcPlaceScore({
    rank: scan.rank,
    blogReviewCount: snap.blog,
    visitorReviewCount: snap.visitor,
    rating: snap.rating,
  })

  const nowIso = new Date().toISOString()

  const { error: insErr } = await svc.from('place_keyword_ranks').insert({
    keyword_target_id: kt.id,
    user_id: kt.user_id,
    target_id: kt.target_id,
    keyword: kt.keyword,
    rank: scan.rank,
    total: scan.total,
    score,
    visitor_review_count: snap.visitor,
    blog_review_count: snap.blog,
    rating: snap.rating,
    method: scan.method,
    source,
    ts: nowIso,
  })

  if (insErr) {
    return { ...base, rank: scan.rank, total: scan.total, method: scan.method, error: insErr.message }
  }

  // 목록 화면용 캐시 갱신 (실패해도 시계열은 이미 저장됨 — 부차)
  try {
    await svc
      .from('place_keyword_targets')
      .update({
        last_rank: scan.rank,
        last_score: score,
        last_checked_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', kt.id)
  } catch {
    /* 캐시 갱신 실패는 무시 */
  }

  return {
    ok: true,
    keyword: kt.keyword,
    rank: scan.rank,
    score,
    total: scan.total,
    method: scan.method,
  }
}
