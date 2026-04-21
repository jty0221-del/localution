// app/api/cron/place-tracking-daily/route.ts
// ============================================================
// 22차-3c · 네이버 플레이스 추적 일 1회 크론
//   매일 KST 05:30 (UTC 20:30) 호출.
//   Authorization: Bearer <CRON_SECRET> 검증 후
//   place_targets.enabled=true 전체 타겟을 축차 조회하고
//   place_snapshots 에 source='cron' 으로 INSERT.
//
//   수동 테스트:
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//          https://www.localution.co.kr/api/cron/place-tracking-daily
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { lookupPlace } from '@/app/lib/naver-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_PER_RUN = 30
const GAP_MS = 400

interface TargetRow {
  id: string
  user_id: string
  place_id: string
  category: string
  name: string
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
    .from('place_targets')
    .select('id,user_id,place_id,category,name')
    .eq('enabled', true)
    .order('updated_at', { ascending: true }) // 오래된 것부터 갱신
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
      ok: true,
      mode: 'cron_place_daily',
      count: 0,
      message: '활성 타겟 없음 — 종료',
      duration_ms: Date.now() - startedAt,
    })
  }

  let ok = 0
  let fail = 0
  const results: Array<{
    target_id: string
    name: string
    place_id: string
    visitor_review_count: number | null
    blog_review_count: number | null
    rating: number | null
    error?: string
  }> = []

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]

    // (1) 네이버 플레이스 조회
    let info
    try {
      // eslint-disable-next-line no-await-in-loop
      info = await lookupPlace(t.place_id, t.category)
    } catch (e) {
      fail += 1
      results.push({
        target_id: t.id,
        name: t.name,
        place_id: t.place_id,
        visitor_review_count: null,
        blog_review_count: null,
        rating: null,
        error: e instanceof Error ? e.message : 'lookup_error',
      })
      if (i < targets.length - 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => setTimeout(res, GAP_MS))
      }
      continue
    }

    if (!info) {
      fail += 1
      results.push({
        target_id: t.id,
        name: t.name,
        place_id: t.place_id,
        visitor_review_count: null,
        blog_review_count: null,
        rating: null,
        error: 'not_found',
      })
      if (i < targets.length - 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => setTimeout(res, GAP_MS))
      }
      continue
    }

    // (2) 타겟 메타 업데이트 (이름/업종 변경 대응) — 부차
    try {
      // eslint-disable-next-line no-await-in-loop
      await svc
        .from('place_targets')
        .update({
          category_name: info.categoryName || null,
          name:          info.name,
          road_address:  info.roadAddress || null,
          phone:         info.phone || null,
          thumbnail_url: info.thumbnail || null,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', t.id)
    } catch { /* 메타 업데이트 실패는 무시 */ }

    // (3) 스냅샷 insert
    // eslint-disable-next-line no-await-in-loop
    const { error: insErr } = await svc
      .from('place_snapshots')
      .insert({
        target_id:             t.id,
        user_id:               t.user_id,
        place_id:              info.placeId,
        visitor_review_count:  info.visitorReviewCount,
        blog_review_count:     info.blogReviewCount,
        rating:                info.rating,
        source:                'cron',
        raw_info:              info,
      })

    if (insErr) {
      fail += 1
      results.push({
        target_id: t.id,
        name: t.name,
        place_id: t.place_id,
        visitor_review_count: info.visitorReviewCount ?? null,
        blog_review_count: info.blogReviewCount ?? null,
        rating: info.rating ?? null,
        error: insErr.message,
      })
    } else {
      ok += 1
      results.push({
        target_id: t.id,
        name: info.name,
        place_id: info.placeId,
        visitor_review_count: info.visitorReviewCount ?? null,
        blog_review_count: info.blogReviewCount ?? null,
        rating: info.rating ?? null,
      })
    }

    if (i < targets.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, GAP_MS))
    }
  }

  return NextResponse.json({
    ok: true,
    mode: 'cron_place_daily',
    count: targets.length,
    inserted: ok,
    failed: fail,
    duration_ms: Date.now() - startedAt,
    results,
  })
}
