// app/lib/place-rank-collect.ts
// ============================================================
// 키워드 순위 1건 수집 → 시계열 + 경쟁사 스냅샷 저장 (서버 전용)
//
// 수동 새로고침 API 와 일일 크론이 이 함수를 공유한다.
// 로직이 두 곳에 복사되면 반드시 어긋나므로 단일 출처로 유지할 것.
//
// 2026-08-19 (P2):
//   · 경쟁 매장 목록을 함께 저장 — 경쟁률·검색깊이 같은 상대 지표의 재료
//   · 네이버가 응답에 실어 보내는 노출 점수(totalScore 계열)를 우선 사용.
//     이 값 정렬 순서가 실제 순위와 일치하므로 '확정' 지표다.
//     못 받으면 place-score.ts 자체 산식으로 폴백하고 '추정' 으로 표시한다.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { scanPlaceRank, type PlaceCandidate } from './place-rank'
import { calcPlaceScore } from './place-score'
import { computeCompetition } from './place-competition'

export type KeywordTargetRow = {
  id: string
  user_id: string
  target_id: string
  keyword: string
}

export type StoreMeta = {
  place_id: string
  name: string | null
  category_name?: string | null
}

export type CollectResult = {
  ok: boolean
  keyword: string
  rank: number | null
  /** 대표 점수 — 네이버 점수가 있으면 그 값, 없으면 자체 산식 */
  score: number | null
  /** 'naver' = 확정 · 'formula' = 추정 */
  scoreSource: 'naver' | 'formula'
  total: number
  method: string
  competitorCount: number
  competitiveness: number | null
  error?: string
}

/**
 * 최신 매장 지표(리뷰수·평점)를 place_snapshots 에서 가져온다.
 * 점수 계산에 필요. 스냅샷이 없으면 전부 null 로 진행 (순위 점수만 반영).
 */
async function loadLatestSnapshot(
  svc: SupabaseClient,
  targetId: string,
): Promise<{
  visitor: number | null
  blog: number | null
  rating: number | null
  save: number | null
  photo: number | null
}> {
  try {
    const { data } = await svc
      .from('place_snapshots')
      .select('visitor_review_count, blog_review_count, rating, save_count, photo_count')
      .eq('target_id', targetId)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()
    return {
      visitor: data?.visitor_review_count ?? null,
      blog: data?.blog_review_count ?? null,
      rating: data?.rating ?? null,
      save: data?.save_count ?? null,
      photo: data?.photo_count ?? null,
    }
  } catch {
    return { visitor: null, blog: null, rating: null, save: null, photo: null }
  }
}

/** 경쟁사 목록에서 내 매장 항목을 찾는다 (placeId 우선) */
function findMine(competitors: PlaceCandidate[], placeId: string, rank: number | null): PlaceCandidate | null {
  const byId = competitors.find(c => c.placeId && c.placeId === placeId)
  if (byId) return byId
  if (rank != null) return competitors.find(c => c.rank === rank) ?? null
  return null
}

/**
 * 키워드 1건의 순위를 측정하고 시계열 + 경쟁사 스냅샷을 기록한다.
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
    scoreSource: 'formula',
    total: 0,
    method: 'none',
    competitorCount: 0,
    competitiveness: null,
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

  // ── 대표 점수 결정 ──────────────────────────────────────
  // 네이버가 직접 준 점수가 있으면 그것이 곧 정렬 키이므로 '확정'.
  // 없으면 자체 산식으로 계산하고 '추정' 으로 표시한다.
  const mineCandidate = findMine(scan.competitors, store.place_id, scan.rank)
  const naverScore = mineCandidate?.naverScore ?? null
  const formulaScore = calcPlaceScore({
    rank: scan.rank,
    blogReviewCount: snap.blog,
    visitorReviewCount: snap.visitor,
    rating: snap.rating,
  }).score

  const scoreSource: 'naver' | 'formula' = naverScore != null ? 'naver' : 'formula'
  const representativeScore = naverScore != null ? naverScore : formulaScore

  // ── 경쟁 지표 계산 ──────────────────────────────────────
  const comp = computeCompetition({
    rank: scan.rank,
    total: scan.total,
    keyword: kt.keyword,
    naverScore,
    mine: {
      visitorReviewCount: snap.visitor,
      blogReviewCount: snap.blog,
      saveCount: snap.save,
      rating: snap.rating,
      category: store.category_name ?? null,
    },
    competitors: scan.competitors,
  })

  const nowIso = new Date().toISOString()

  // ── 시계열 기록 ─────────────────────────────────────────
  const { error: insErr } = await svc.from('place_keyword_ranks').insert({
    keyword_target_id: kt.id,
    user_id: kt.user_id,
    target_id: kt.target_id,
    keyword: kt.keyword,
    rank: scan.rank,
    total: scan.total,
    // score 컬럼은 항상 자체 산식값을 유지한다 (산식 변경 시 재계산 가능하도록).
    // 대표 점수는 naver_score + score_source 조합으로 화면에서 판단한다.
    score: formulaScore,
    visitor_review_count: snap.visitor,
    blog_review_count: snap.blog,
    rating: snap.rating,
    save_count: snap.save,
    photo_count: snap.photo,
    method: scan.method,
    source,
    ts: nowIso,
    ...comp.raw,
  })

  if (insErr) {
    return {
      ...base,
      rank: scan.rank,
      total: scan.total,
      method: scan.method,
      error: insErr.message,
    }
  }

  // ── 경쟁사 스냅샷 기록 (부차 — 실패해도 순위 기록은 유지) ─
  if (scan.competitors.length) {
    try {
      await svc.from('place_keyword_competitors').insert(
        scan.competitors.map(c => ({
          keyword_target_id: kt.id,
          user_id: kt.user_id,
          target_id: kt.target_id,
          keyword: kt.keyword,
          batch_ts: nowIso,
          rank: c.rank,
          place_id: c.placeId,
          name: c.name || null,
          visitor_review_count: c.visitorReviewCount ?? null,
          blog_review_count: c.blogReviewCount ?? null,
          rating: c.rating ?? null,
          category: c.category ?? null,
          naver_score: c.naverScore ?? null,
          is_mine: !!(c.placeId && c.placeId === store.place_id),
        })),
      )
    } catch (e) {
      console.warn('[place-rank-collect] competitor insert failed (non-fatal):', e)
    }
  }

  // ── 목록 화면용 캐시 갱신 (부차) ────────────────────────
  try {
    await svc
      .from('place_keyword_targets')
      .update({
        last_rank: scan.rank,
        last_score: representativeScore,
        last_competitiveness: comp.competitiveness,
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
    score: representativeScore,
    scoreSource,
    total: scan.total,
    method: scan.method,
    competitorCount: scan.competitors.length,
    competitiveness: comp.competitiveness,
  }
}
