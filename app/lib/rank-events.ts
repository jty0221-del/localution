// app/lib/rank-events.ts
// ============================================================
// 블로그 순위 변동 이벤트 도출 (18차-5)
//   · 이전 rank vs 신규 rank → 구간 변경/신규 노출/이탈 이벤트 감지
//   · band_change / entered / dropped / daily_digest 4종
//   · 메시지 템플릿 동봉 (sendMemoText text 필드 200자 제한 고려)
// ============================================================

// ------------------------------------------------------------
// 구간 분류 (UI 뱃지 컬러와 동일 4구간)
// ------------------------------------------------------------
export type RankBand = 'top3' | 'top10' | 'top30' | 'top50' | 'out'

export function bandOf(rank: number | null | undefined): RankBand {
  if (rank == null || rank <= 0) return 'out'
  if (rank <= 3)  return 'top3'
  if (rank <= 10) return 'top10'
  if (rank <= 30) return 'top30'
  if (rank <= 50) return 'top50'
  return 'out'
}

const BAND_LABEL: Record<RankBand, string> = {
  top3:  'TOP3',
  top10: 'TOP10',
  top30: 'TOP30',
  top50: 'TOP50',
  out:   '미노출',
}

const BAND_RANK: Record<RankBand, number> = {
  top3: 4, top10: 3, top30: 2, top50: 1, out: 0,
}

function bandImproved(prev: RankBand, next: RankBand): boolean {
  return BAND_RANK[next] > BAND_RANK[prev]
}

// ------------------------------------------------------------
// 이벤트 타입
// ------------------------------------------------------------
export type RankEventType = 'band_change' | 'entered' | 'dropped' | 'daily_digest'

export interface RankEvent {
  type:        RankEventType
  target_id:   string
  label:       string
  keyword:     string
  prev_rank:   number | null
  new_rank:    number | null
  prev_band:   RankBand
  new_band:    RankBand
  block_title?: string | null
  direction:   'up' | 'down' | 'neutral'
  message:     string
  emoji:       string
}

// ------------------------------------------------------------
// 단일 타겟 이벤트 도출
//   prev: 직전 체크 (없으면 null)
//   curr: 이번 체크
// ------------------------------------------------------------
export interface RankSnapshot {
  rank:        number | null
  best_hit?:   { block_title?: string | null; block_id?: string | null } | null
}

export interface TargetInfo {
  target_id: string
  label:     string
  keyword:   string
}

export function deriveEvent(
  target: TargetInfo,
  prev:   RankSnapshot | null,
  curr:   RankSnapshot,
): RankEvent | null {
  const prevRank = prev?.rank ?? null
  const newRank  = curr.rank
  const prevBand = bandOf(prevRank)
  const newBand  = bandOf(newRank)
  const blockTitle = curr.best_hit?.block_title ?? null

  // (a) 미노출 → 노출 전환
  if (prevBand === 'out' && newBand !== 'out') {
    return {
      type: 'entered',
      target_id: target.target_id,
      label:     target.label,
      keyword:   target.keyword,
      prev_rank: prevRank, new_rank: newRank,
      prev_band: prevBand, new_band: newBand,
      block_title: blockTitle,
      direction: 'up',
      emoji:     '🎯',
      message:   `🎯 [${target.label}] "${target.keyword}" 신규 진입 ${newRank}위${blockTitle ? ` (${blockTitle})` : ''}`,
    }
  }

  // (b) 노출 → 미노출 전환 (이탈)
  if (prevBand !== 'out' && newBand === 'out') {
    return {
      type: 'dropped',
      target_id: target.target_id,
      label:     target.label,
      keyword:   target.keyword,
      prev_rank: prevRank, new_rank: newRank,
      prev_band: prevBand, new_band: newBand,
      block_title: null,
      direction: 'down',
      emoji:     '⚠️',
      message:   `⚠️ [${target.label}] "${target.keyword}" 이탈 (직전 ${prevRank}위 → 미노출)`,
    }
  }

  // (c) 구간 변경 (상승/하락)
  if (prevBand !== newBand) {
    const up = bandImproved(prevBand, newBand)
    return {
      type: 'band_change',
      target_id: target.target_id,
      label:     target.label,
      keyword:   target.keyword,
      prev_rank: prevRank, new_rank: newRank,
      prev_band: prevBand, new_band: newBand,
      block_title: blockTitle,
      direction: up ? 'up' : 'down',
      emoji:     up ? '📈' : '📉',
      message:   `${up ? '📈' : '📉'} [${target.label}] "${target.keyword}" ${BAND_LABEL[prevBand]} → ${BAND_LABEL[newBand]} (${prevRank ?? '미'}위 → ${newRank ?? '미'}위)${blockTitle ? ` · ${blockTitle}` : ''}`,
    }
  }

  // (d) 구간 동일 → 이벤트 없음 (잔잔한 순위 소폭 변동은 스킵)
  return null
}

// ------------------------------------------------------------
// 일일 요약 메시지 (cron 직후 또는 별도 digest cron 용)
//   items: 이번 라운드 체크 결과 (전체)
// ------------------------------------------------------------
export interface DigestItem {
  label:     string
  keyword:   string
  prev_rank: number | null
  new_rank:  number | null
  block_title?: string | null
}

export function buildDigestMessage(items: DigestItem[]): string {
  if (items.length === 0) return '🗓 오늘 체크할 블로그 타겟이 없습니다.'

  const head = `🗓 오늘의 블로그 순위 요약 (${items.length}건)`
  const lines = items.slice(0, 5).map(it => {
    const prev = bandOf(it.prev_rank)
    const next = bandOf(it.new_rank)
    const arrow = prev === next ? '=' : bandImproved(prev, next) ? '↑' : '↓'
    const prevTxt = it.prev_rank ?? '미'
    const newTxt  = it.new_rank ?? '미'
    return `${arrow} ${it.label}: ${prevTxt}→${newTxt}위`
  })
  const rest = items.length > 5 ? `\n외 ${items.length - 5}건` : ''
  return [head, ...lines].join('\n') + rest
}

// ------------------------------------------------------------
// alert_prefs 체크
// ------------------------------------------------------------
export function shouldSend(
  eventType: RankEventType,
  prefs: Record<string, unknown> | null | undefined,
): boolean {
  if (!prefs) return true  // 기본 ON
  const v = prefs[eventType]
  return v !== false
}
