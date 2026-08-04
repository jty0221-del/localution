// app/lib/place-score.ts
// ============================================================
// 로컬루션 플레이스 노출점수 산식 — 단일 출처 (Single Source of Truth)
//
// 서버(크론·API)와 클라이언트(차트·표) 가 모두 이 파일만 import 한다.
// 산식을 바꾸려면 여기만 고치면 전 화면에 반영된다.
//
// 설계 원칙:
//   1) 0~100 범위, 소수 1자리
//   2) 순위가 가장 큰 비중(40%) — 실제 매출에 직결되는 지표
//   3) 리뷰 수는 로그 스케일 — 1,000건 매장과 5,000건 매장 차이가
//      과대평가되지 않도록 (선형이면 대형 프랜차이즈만 만점)
//   4) 평점은 3.0 을 바닥, 5.0 을 만점으로 정규화
//   5) 미노출(rank=null)이어도 리뷰·평점 점수는 살아있음 → 0점 되지 않음
// ============================================================

export type PlaceScoreInput = {
  /** 키워드 검색 순위. 미노출이면 null */
  rank?: number | null
  /** 블로그 리뷰 수 */
  blogReviewCount?: number | null
  /** 방문자(영수증) 리뷰 수 */
  visitorReviewCount?: number | null
  /** 평점 0~5 */
  rating?: number | null
}

export type PlaceScoreBreakdown = {
  score: number
  rankFactor: number
  blogFactor: number
  visitorFactor: number
  ratingFactor: number
}

/** 가중치 — 합계 100 */
export const SCORE_WEIGHTS = {
  rank: 40,
  blog: 25,
  visitor: 25,
  rating: 10,
} as const

/** 로그 스케일 기준점: 이 건수에서 해당 항목 만점 */
const REVIEW_FULL_MARK = 1000

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * 순위 → 0~1.
 * 1위 = 1.0, 100위 = 0.01, 미노출 = 0
 */
export function rankFactorOf(rank?: number | null): number {
  if (rank == null || !Number.isFinite(rank) || rank <= 0) return 0
  return clamp01((101 - rank) / 100)
}

/**
 * 리뷰 수 → 0~1 (로그 스케일).
 * 0건 = 0, 약 1,000건 = 1.0
 */
export function reviewFactorOf(count?: number | null): number {
  if (count == null || !Number.isFinite(count) || count <= 0) return 0
  return clamp01(Math.log10(1 + count) / Math.log10(1 + REVIEW_FULL_MARK))
}

/**
 * 평점 → 0~1.
 * 3.0 이하 = 0, 5.0 = 1.0, 평점 없으면 중립 0.5
 */
export function ratingFactorOf(rating?: number | null): number {
  if (rating == null || !Number.isFinite(rating) || rating <= 0) return 0.5
  return clamp01((rating - 3) / 2)
}

/**
 * 노출점수 계산 (0~100, 소수 1자리).
 */
export function calcPlaceScore(input: PlaceScoreInput): PlaceScoreBreakdown {
  const rankFactor = rankFactorOf(input.rank)
  const blogFactor = reviewFactorOf(input.blogReviewCount)
  const visitorFactor = reviewFactorOf(input.visitorReviewCount)
  const ratingFactor = ratingFactorOf(input.rating)

  const raw =
    SCORE_WEIGHTS.rank * rankFactor +
    SCORE_WEIGHTS.blog * blogFactor +
    SCORE_WEIGHTS.visitor * visitorFactor +
    SCORE_WEIGHTS.rating * ratingFactor

  return {
    score: Math.round(raw * 10) / 10,
    rankFactor,
    blogFactor,
    visitorFactor,
    ratingFactor,
  }
}

/**
 * 매장 기본 점수 (키워드·순위와 무관한 매장 자체의 체력).
 *
 * place_snapshots.place_score 에 저장한다.
 * 순위 항목을 뺀 나머지(블로그 25 + 방문자 25 + 평점 10 = 60)를
 * 100점 만점으로 재정규화하므로, 키워드별 점수와 직접 비교하면 안 된다.
 *
 * 용도: 플레이스 진단 화면의 "매장 노출 점수 추이" 미니 차트.
 */
export function calcStoreScore(input: Omit<PlaceScoreInput, 'rank'>): number {
  const blogFactor = reviewFactorOf(input.blogReviewCount)
  const visitorFactor = reviewFactorOf(input.visitorReviewCount)
  const ratingFactor = ratingFactorOf(input.rating)

  const denom = SCORE_WEIGHTS.blog + SCORE_WEIGHTS.visitor + SCORE_WEIGHTS.rating
  const raw =
    SCORE_WEIGHTS.blog * blogFactor +
    SCORE_WEIGHTS.visitor * visitorFactor +
    SCORE_WEIGHTS.rating * ratingFactor

  return Math.round((raw / denom) * 100 * 10) / 10
}

// ─────────────────────────────────────────────
// UI 보조 — 순위 구간 색상 / 라벨
// (기존 keyword-rank 페이지 색상 규칙과 동일하게 유지)
// ─────────────────────────────────────────────

export type RankTier = 'top3' | 'top5' | 'top10' | 'top20' | 'low' | 'none'

export function rankTierOf(rank?: number | null): RankTier {
  if (rank == null || rank <= 0) return 'none'
  if (rank <= 3) return 'top3'
  if (rank <= 5) return 'top5'
  if (rank <= 10) return 'top10'
  if (rank <= 20) return 'top20'
  return 'low'
}

export const RANK_TIER_STYLE: Record<RankTier, { text: string; bg: string; label: string }> = {
  top3: { text: '#3182F6', bg: '#EFF6FF', label: '최상위' },
  top5: { text: '#059669', bg: '#ECFDF5', label: '상위' },
  top10: { text: '#F59E0B', bg: '#FFFBEB', label: '중위' },
  top20: { text: '#DC2626', bg: '#FEF2F2', label: '하위' },
  low: { text: '#6B7280', bg: '#F9FAFB', label: '권외' },
  none: { text: '#9CA3AF', bg: '#F9FAFB', label: '미노출' },
}

/**
 * 점수 → 진단 등급.
 * 플레이스 진단 화면의 "경고 / 주의 / 양호" 박스에 사용.
 */
export type ScoreGrade = 'good' | 'warn' | 'danger'

export function scoreGradeOf(score?: number | null): ScoreGrade {
  if (score == null) return 'danger'
  if (score >= 60) return 'good'
  if (score >= 35) return 'warn'
  return 'danger'
}

export const SCORE_GRADE_STYLE: Record<ScoreGrade, { text: string; bg: string; border: string; label: string }> = {
  good: { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: '양호' },
  warn: { text: '#B45309', bg: '#FFFBEB', border: '#FDE68A', label: '주의' },
  danger: { text: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', label: '경고' },
}
