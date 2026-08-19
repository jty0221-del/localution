// app/lib/place-competition.ts
// ============================================================
// 경쟁 지표 계산 — "네이버가 준 원자료" → "판단에 쓸 수 있는 숫자"
//
// 중요한 전제:
//   네이버는 자기 랭킹 알고리즘 점수를 절대 공개하지 않는다.
//   따라서 여기서 만드는 지표는 두 종류로 명확히 나뉜다.
//
//     measured (확정) — 네이버가 실제로 준 값으로만 계산. 반박 불가.
//       예) 내 방문자리뷰 203건, TOP10 평균 39.6건 → 경쟁률 513%
//
//     estimated (추정) — 우리가 세운 가설이 섞인 해석 점수.
//       예) 종합 경쟁력 58.1
//
//   화면에서 이 둘을 배지로 구분해 보여준다.
//   "추정" 을 "확정" 처럼 보여주면 사장님이 잘못된 의사결정을 하게 된다.
// ============================================================

import type { PlaceCandidate } from './place-rank'

export type MetricConfidence = 'measured' | 'estimated'
export type MetricTone = 'good' | 'neutral' | 'warn'

export type CompetitionMetric = {
  key: string
  label: string
  /** 원시 값. 계산 불가면 null */
  value: number | null
  /** 화면에 그대로 찍을 문자열 (예: "513%", "상위 7%", "5.12") */
  display: string
  confidence: MetricConfidence
  /** 이 지표가 무엇인지 한 줄 설명 */
  description: string
  /** 사장님이 지금 할 행동 */
  action: string
  tone: MetricTone
}

export type CompetitionInput = {
  /** 내 매장 순위 (미노출이면 null) */
  rank: number | null
  /** 검색 결과 전체 노출 업체 수 */
  total: number | null
  /** 내 매장 지표 */
  mine: {
    visitorReviewCount: number | null
    blogReviewCount: number | null
    saveCount?: number | null
    rating?: number | null
    /** 업종 (예: "가발") */
    category?: string | null
    /** 대표 키워드 목록 */
    representativeKeywords?: string[] | null
  }
  /** 검색 결과 상위 경쟁 매장 (내 매장 포함 가능) */
  competitors: PlaceCandidate[]
  /** 지금 분석 중인 검색어 */
  keyword: string
  /** 상위 몇 개를 비교군으로 볼지 (기본 10) */
  topN?: number
  /**
   * 네이버가 직접 준 내 매장 노출 점수 (totalScore).
   * 있으면 '종합 경쟁력' 자리를 이 값이 대체하고 등급이 확정으로 올라간다.
   */
  naverScore?: number | null
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────

function avgOf(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => n != null && Number.isFinite(n) && n >= 0)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function round(n: number, digits = 1): number {
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/**
 * 한글 검색어 연관도 — 문자 bigram 자카드 유사도.
 *
 * 형태소 분석기 없이 "부천 가발" 과 "가발 · 부천여성가발" 의 겹침을
 * 대략 잡아내기 위한 근사치다. 그래서 estimated 로 분류한다.
 */
function bigrams(s: string): Set<string> {
  const t = s.toLowerCase().replace(/[^0-9a-z가-힣]/g, '')
  const out = new Set<string>()
  if (t.length === 1) out.add(t)
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2))
  return out
}

function similarity(a: string, b: string): number {
  const A = bigrams(a)
  const B = bigrams(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const g of A) if (B.has(g)) inter++
  const union = A.size + B.size - inter
  return union > 0 ? inter / union : 0
}

// ─────────────────────────────────────────────
// 개별 지표
// ─────────────────────────────────────────────

/**
 * 경쟁률 = 내 값 / 비교군 평균 × 100 (%)
 * 100% 면 딱 평균, 500% 면 평균의 5배.
 */
function ratioPct(mine: number | null, peerAvg: number | null): number | null {
  if (mine == null || peerAvg == null || peerAvg <= 0) return null
  return round((mine / peerAvg) * 100, 0)
}

function toneByPct(pct: number | null): MetricTone {
  if (pct == null) return 'neutral'
  if (pct >= 120) return 'good'
  if (pct >= 80) return 'neutral'
  return 'warn'
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

export type ScoreSource = 'naver' | 'formula'

export type CompetitionResult = {
  metrics: CompetitionMetric[]
  /** 자체 산식 종합 경쟁력 0~100 (추정) — 네이버 점수가 없을 때의 대표 숫자 */
  competitiveness: number | null
  /** 네이버가 직접 준 노출 점수 (확정). 없으면 null */
  naverScore: number | null
  /** 대표 점수의 출처 — 화면 배지 분기용 */
  scoreSource: ScoreSource
  /** 경쟁군 최고 점수 (1위까지 몇 점 남았는지 계산용) */
  peerTopScore: number | null
  /** 비교에 실제로 쓴 경쟁사 수 */
  peerCount: number
  /** DB 저장용 평탄화 값 */
  raw: {
    visitor_competitive_pct: number | null
    blog_competitive_pct: number | null
    depth_percentile: number | null
    save_conversion: number | null
    relevance_signal: number | null
    competitiveness: number | null
    competitor_count: number
    naver_score: number | null
    score_source: ScoreSource
  }
}

export function computeCompetition(input: CompetitionInput): CompetitionResult {
  const topN = input.topN ?? 10
  const { rank, total, mine, keyword } = input

  // 내 매장을 비교군에서 제외한 상위 N개
  const peers = input.competitors
    .filter(c => !c.placeId || !mineMatches(c, input))
    .slice(0, topN)

  const peerVisitorAvg = avgOf(peers.map(p => p.visitorReviewCount))
  const peerBlogAvg = avgOf(peers.map(p => p.blogReviewCount))

  // 네이버가 직접 준 점수가 있는가 — 있으면 '추정' 이 아니라 '확정' 이다.
  const hasNaverScore = input.naverScore != null && Number.isFinite(input.naverScore)
  // 경쟁군 중 최고 점수 (1위까지 몇 점 남았는지 안내용)
  const peerScores = input.competitors
    .map(c => c.naverScore)
    .filter((n): n is number => n != null && Number.isFinite(n))
  const peerTopScore = peerScores.length ? Math.max(...peerScores) : null

  // ── 1) 영수증(방문자) 리뷰 경쟁률 — 확정 ──────────────
  const visitorPct = ratioPct(mine.visitorReviewCount, peerVisitorAvg)

  // ── 2) 블로그 콘텐츠 경쟁률 — 확정 ────────────────────
  const blogPct = ratioPct(mine.blogReviewCount, peerBlogAvg)

  // ── 3) 검색 깊이 위치 — 확정 ──────────────────────────
  // 전체 노출 업체 중 내가 상위 몇 %인가
  const depthPct =
    rank != null && total != null && total > 0
      ? round(clamp((rank / total) * 100, 0.1, 100), 1)
      : null

  // ── 4) 저장/리뷰 전환 신호 — 추정 ─────────────────────
  // 저장 수 대비 리뷰 수. 저장이 상대적으로 많으면 "비교 중인 잠재고객" 이 많다는 해석.
  const reviewSum = (mine.visitorReviewCount ?? 0) + (mine.blogReviewCount ?? 0)
  const saveConv =
    mine.saveCount != null && reviewSum > 0 ? round(mine.saveCount / reviewSum, 2) : null

  // ── 5) 카테고리·키워드 연관 신호 — 추정 ───────────────
  const relevanceSources = [
    mine.category ?? '',
    ...(mine.representativeKeywords ?? []),
  ].filter(Boolean)
  const relevance = relevanceSources.length
    ? round(Math.max(...relevanceSources.map(s => similarity(keyword, s))) * 100, 1)
    : null

  // ── 6) 이 키워드 유불리 Δ — 추정 ──────────────────────
  // 내 "체급 백분위"(리뷰 기준) 대비 "실제 순위 백분위" 를 비교한다.
  // 양수면 체급보다 잘 나오는 키워드(유리), 음수면 체급 대비 밀리는 키워드(불리).
  let advantage: number | null = null
  if (rank != null && peers.length >= 3) {
    const allVisitor = peers.map(p => p.visitorReviewCount).filter((n): n is number => n != null)
    if (allVisitor.length >= 3 && mine.visitorReviewCount != null) {
      const better = allVisitor.filter(v => v < (mine.visitorReviewCount as number)).length
      // 리뷰 기준으로 기대되는 순위 백분위 (0=최상위)
      const expectedPctile = 100 - (better / allVisitor.length) * 100
      const actualPctile = total && total > 0 ? (rank / total) * 100 : null
      if (actualPctile != null) advantage = round(expectedPctile - actualPctile, 1)
    }
  }

  // ── 7) 종합 경쟁력 — 추정 ─────────────────────────────
  // 계산 가능한 항목만 가중 평균한다 (없는 항목은 분모에서 제외).
  const parts: Array<{ w: number; v: number }> = []
  if (rank != null && total != null && total > 0) {
    // 순위가 앞설수록 100 에 가깝게
    parts.push({ w: 40, v: clamp(100 - (rank / Math.max(total, 1)) * 100, 0, 100) })
  }
  if (visitorPct != null) parts.push({ w: 25, v: clamp(visitorPct / 2, 0, 100) })
  if (blogPct != null) parts.push({ w: 25, v: clamp(blogPct / 2, 0, 100) })
  if (relevance != null) parts.push({ w: 10, v: relevance })

  const wSum = parts.reduce((a, p) => a + p.w, 0)
  const competitiveness = wSum > 0
    ? round(parts.reduce((a, p) => a + p.w * p.v, 0) / wSum, 1)
    : null

  // ── 화면용 메트릭 목록 ────────────────────────────────
  const metrics: CompetitionMetric[] = [
    {
      key: 'visitor_competitive',
      label: '영수증 리뷰 경쟁률',
      value: visitorPct,
      display: visitorPct == null ? '-' : `${visitorPct}%`,
      confidence: 'measured',
      description: `상위 ${peers.length}개 매장 평균 대비 방문 리뷰 체급이에요.`,
      action:
        visitorPct == null
          ? '경쟁사 리뷰 수집이 아직 안 됐어요'
          : visitorPct >= 120
            ? '우위예요. 리뷰 유입이 끊기지 않게 유지하세요'
            : '리뷰 요청 QR·문자를 늘려 체급을 올려보세요',
      tone: toneByPct(visitorPct),
    },
    {
      key: 'blog_competitive',
      label: '블로그 콘텐츠 경쟁률',
      value: blogPct,
      display: blogPct == null ? '-' : `${blogPct}%`,
      confidence: 'measured',
      description: `상위 ${peers.length}개 매장 평균 대비 블로그 후기 체급이에요.`,
      action:
        blogPct == null
          ? '경쟁사 블로그 수집이 아직 안 됐어요'
          : blogPct >= 120
            ? '우위예요. 신메뉴·후기형 콘텐츠를 계속 발행하세요'
            : '블로그 후기가 부족해요. 체험단·후기 요청을 검토하세요',
      tone: toneByPct(blogPct),
    },
    {
      key: 'depth',
      label: '검색 깊이 위치',
      value: depthPct,
      display: depthPct == null ? '-' : `상위 ${depthPct}%`,
      confidence: 'measured',
      description: '전체 노출 업체 안에서의 상대 위치예요.',
      action:
        depthPct == null
          ? '아직 노출되지 않았어요'
          : depthPct <= 10
            ? '상위권이에요. 최근성 중심으로 관리하세요'
            : '노출 순위를 끌어올릴 여지가 커요',
      tone: depthPct == null ? 'warn' : depthPct <= 10 ? 'good' : depthPct <= 30 ? 'neutral' : 'warn',
    },
    {
      key: 'save_conversion',
      label: '저장/리뷰 전환 신호',
      value: saveConv,
      display: saveConv == null ? '-' : saveConv.toFixed(2),
      confidence: 'estimated',
      description: '리뷰 수 대비 저장 관심도예요. 저장이 높으면 비교·재방문 의도로 봅니다.',
      action:
        saveConv == null
          ? '저장 수를 아직 수집하지 못했어요'
          : '저장 관심도를 예약·전화 버튼으로 연결하세요',
      tone: 'neutral',
    },
    {
      key: 'relevance',
      label: '카테고리·키워드 연관 신호',
      value: relevance,
      display: relevance == null ? '-' : relevance.toFixed(1),
      confidence: 'estimated',
      description: '검색어와 업종·대표키워드가 얼마나 맞는지 보는 해석 점수예요.',
      action:
        relevance == null
          ? '업종 정보가 없어요'
          : relevance >= 40
            ? '검색어와 잘 맞아요. 현재 구성을 유지하세요'
            : '대표키워드·업종·메뉴명에 검색어 표현을 넣어보세요',
      tone: relevance == null ? 'neutral' : relevance >= 40 ? 'good' : 'warn',
    },
    {
      key: 'advantage',
      label: '이 키워드 유불리',
      value: advantage,
      display: advantage == null ? '-' : `${advantage > 0 ? '+' : ''}${advantage.toFixed(1)}`,
      confidence: 'estimated',
      description: '매장 체급 대비 이 키워드에서 유리한지 불리한지예요.',
      action:
        advantage == null
          ? '비교할 경쟁사 데이터가 부족해요'
          : advantage > 0
            ? '체급보다 잘 나오는 키워드예요. 확장 후보로 유지하세요'
            : '체급 대비 밀려요. 이 키워드는 콘텐츠 보강이 필요해요',
      tone: advantage == null ? 'neutral' : advantage > 0 ? 'good' : 'warn',
    },
    // 종합 지표 — 네이버가 준 점수가 있으면 그걸 쓰고 '확정', 없으면 자체 산식 '추정'
    hasNaverScore
      ? {
          key: 'naver_score',
          label: '네이버 노출 점수',
          value: input.naverScore ?? null,
          display: (input.naverScore as number).toFixed(1),
          confidence: 'measured',
          description: '네이버가 이 키워드에서 매긴 점수예요. 이 값 순서가 곧 검색 순위입니다.',
          action:
            peerTopScore != null && input.naverScore != null && peerTopScore > input.naverScore
              ? `1위까지 ${round(peerTopScore - input.naverScore, 1)}점 남았어요`
              : '현재 점수를 유지하세요',
          tone: 'good',
        }
      : {
          key: 'competitiveness',
          label: '종합 경쟁력',
          value: competitiveness,
          display: competitiveness == null ? '-' : competitiveness.toFixed(1),
          confidence: 'estimated',
          description: '네이버 점수를 못 받아 순위·리뷰·블로그·키워드로 추정한 참고 점수예요.',
          action:
            competitiveness == null
              ? '데이터가 더 쌓이면 계산돼요'
              : competitiveness >= 60
                ? '강점을 유지하면서 최근 리뷰 흐름만 관리하세요'
                : '순위와 리뷰 체급 중 약한 쪽부터 보완하세요',
          tone:
            competitiveness == null
              ? 'neutral'
              : competitiveness >= 60
                ? 'good'
                : competitiveness >= 40
                  ? 'neutral'
                  : 'warn',
        },
  ]

  return {
    metrics,
    competitiveness,
    naverScore: input.naverScore ?? null,
    scoreSource: hasNaverScore ? 'naver' : 'formula',
    peerTopScore,
    peerCount: peers.length,
    raw: {
      visitor_competitive_pct: visitorPct,
      blog_competitive_pct: blogPct,
      depth_percentile: depthPct,
      save_conversion: saveConv,
      relevance_signal: relevance,
      competitiveness,
      competitor_count: peers.length,
      naver_score: input.naverScore ?? null,
      score_source: hasNaverScore ? 'naver' : 'formula',
    },
  }
}

/** 경쟁사 목록에서 내 매장을 식별 (비교군에서 빼기 위함) */
function mineMatches(c: PlaceCandidate, input: CompetitionInput): boolean {
  // rank 가 같으면 내 매장으로 간주 (placeId 를 직접 넘기지 않는 호출부 대비)
  if (input.rank != null && c.rank === input.rank) return true
  return false
}

export const CONFIDENCE_STYLE: Record<MetricConfidence, { label: string; text: string; bg: string }> = {
  measured: { label: '확정', text: '#92400E', bg: '#FEF3C7' },
  estimated: { label: '추정', text: '#B45309', bg: '#FFFBEB' },
}

export const TONE_STYLE: Record<MetricTone, { text: string; bar: string }> = {
  good: { text: '#059669', bar: '#059669' },
  neutral: { text: '#4E5968', bar: '#8B95A1' },
  warn: { text: '#DC2626', bar: '#DC2626' },
}
