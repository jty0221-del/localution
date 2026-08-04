// app/api/cron/place-rank-daily/route.ts
// ============================================================
// 플레이스 키워드 순위 일 1회 수집 크론 (AdRank 벤치마킹 Phase 0)
//
// 매일 KST 06:00 (UTC 21:00) 호출.
// place-tracking-daily(05:30, 리뷰수·평점 수집) 30분 뒤에 돌아
// 최신 스냅샷을 기준으로 점수를 계산하도록 순서를 맞춘다.
//
// Authorization: Bearer <CRON_SECRET>
//
// 수동 테스트:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     https://www.localution.co.kr/api/cron/place-rank-daily
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { collectKeywordRank } from '@/app/lib/place-rank-collect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** 1회 실행당 처리 상한 */
const MAX_PER_RUN = 40
/** 네이버 요청 간 간격 — 차단 회피 */
const GAP_MS = 700
/**
 * 시간 예산. maxDuration 300s 인데 키워드 1건이 최악의 경우
 * (3전략 × 9s 타임아웃) 27초까지 걸릴 수 있어 상한만으로는 부족하다.
 * 남은 시간이 이보다 적으면 다음 실행에 넘긴다.
 */
const TIME_BUDGET_MS = 240_000
const PER_ITEM_RESERVE_MS = 30_000

type KeywordRow = {
  id: string
  user_id: string
  target_id: string
  keyword: string
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || ''
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET 미설정 (Vercel Dashboard)' }, { status: 500 })
  }
  if ((req.headers.get('authorization') || '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const svc = createServiceClient()

  // 오래 방치된 키워드부터 — 라운드로빈 효과
  const { data: rows, error: listErr } = await svc
    .from('place_keyword_targets')
    .select('id, user_id, target_id, keyword')
    .eq('enabled', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN)

  if (listErr) {
    return NextResponse.json(
      { error: 'keyword_targets_load_failed', detail: listErr.message },
      { status: 500 },
    )
  }

  const keywords = (rows ?? []) as KeywordRow[]
  if (!keywords.length) {
    return NextResponse.json({
      ok: true,
      mode: 'cron_place_rank_daily',
      count: 0,
      message: '활성 키워드 없음 — 종료',
      duration_ms: Date.now() - startedAt,
    })
  }

  // 매장 메타를 한 번에 로드 (키워드마다 조회하면 N+1)
  const targetIds = Array.from(new Set(keywords.map(k => k.target_id)))
  const storeById: Record<string, { place_id: string; name: string | null }> = {}
  try {
    const { data: targets } = await svc
      .from('place_targets')
      .select('id, place_id, name')
      .in('id', targetIds)
    for (const t of targets ?? []) {
      storeById[(t as { id: string }).id] = {
        place_id: (t as { place_id: string }).place_id,
        name: (t as { name: string | null }).name ?? null,
      }
    }
  } catch {
    /* 아래 루프에서 개별 처리 */
  }

  let ok = 0
  let failed = 0
  let skipped = 0
  const methodCount: Record<string, number> = {}
  const results: Array<Record<string, unknown>> = []

  let deferred = 0

  for (let i = 0; i < keywords.length; i++) {
    // 남은 시간이 1건 처리분보다 적으면 다음 실행으로 미룬다.
    // last_checked_at 오름차순 정렬이므로 미뤄진 건이 다음 회차에 먼저 처리됨.
    if (Date.now() - startedAt > TIME_BUDGET_MS - PER_ITEM_RESERVE_MS) {
      deferred = keywords.length - i
      break
    }

    const kt = keywords[i]
    const store = storeById[kt.target_id]

    if (!store?.place_id) {
      skipped += 1
      results.push({ keyword: kt.keyword, skipped: 'store_not_found' })
      continue
    }

    // eslint-disable-next-line no-await-in-loop
    const r = await collectKeywordRank(svc, kt, store, 'cron')

    if (r.ok) {
      ok += 1
      methodCount[r.method] = (methodCount[r.method] || 0) + 1
    } else {
      failed += 1
    }
    results.push({
      keyword: r.keyword,
      rank: r.rank,
      score: r.score,
      method: r.method,
      ...(r.error ? { error: r.error.slice(0, 120) } : {}),
    })

    if (i < keywords.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, GAP_MS))
    }
  }

  return NextResponse.json({
    ok: true,
    mode: 'cron_place_rank_daily',
    count: keywords.length,
    inserted: ok,
    failed,
    skipped,
    deferred,
    methods: methodCount,
    duration_ms: Date.now() - startedAt,
    results,
  })
}
