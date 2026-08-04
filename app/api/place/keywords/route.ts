// app/api/place/keywords/route.ts
// ============================================================
// 플레이스 추적 키워드 CRUD (AdRank 벤치마킹 Phase 0)
//
//   GET    /api/place/keywords?target_id={uuid}
//     · target_id 생략 시 본인의 전체 키워드
//     · place_keyword_latest 뷰를 조인해 최신 순위·점수 동봉
//
//   POST   /api/place/keywords   { target_id, keyword }
//     · 소유권 검증 후 upsert. 이미 있으면 enabled=true 로 복구
//
//   DELETE /api/place/keywords?id={uuid}
//     · 소유권 검증 후 삭제 (ranks 는 FK CASCADE)
//
// 인증: requireUser() — localution_user(HMAC 서명) 또는 Supabase 토큰
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 사장님 1인당 추적 키워드 상한 — 크론 부하 방어 */
const MAX_KEYWORDS_PER_USER = 50

// ─────────────────────────────────────────────
// GET — 키워드 목록 (+ 최신 순위·점수)
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const targetId = new URL(req.url).searchParams.get('target_id')
  const svc = createServiceClient()

  let q = svc
    .from('place_keyword_targets')
    .select('id, target_id, keyword, enabled, last_rank, last_score, last_checked_at, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: true })

  if (targetId) q = q.eq('target_id', targetId)

  const { data: keywords, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows = keywords ?? []

  // 최신 스냅샷 조인 (부차 쿼리 — 실패해도 목록 자체는 반환)
  let latestByKt: Record<string, unknown> = {}
  if (rows.length) {
    try {
      const { data: latest } = await svc
        .from('place_keyword_latest')
        .select('keyword_target_id, rank, total, score, visitor_review_count, blog_review_count, rating, method, ts')
        .in('keyword_target_id', rows.map(r => r.id))
      for (const l of latest ?? []) {
        latestByKt[(l as { keyword_target_id: string }).keyword_target_id] = l
      }
    } catch {
      latestByKt = {}
    }
  }

  return NextResponse.json({
    ok: true,
    keywords: rows.map(r => ({ ...r, latest: latestByKt[r.id] ?? null })),
    limit: MAX_KEYWORDS_PER_USER,
  })
}

// ─────────────────────────────────────────────
// POST — 키워드 추가
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  let body: { target_id?: string; keyword?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const targetId = String(body.target_id || '').trim()
  const keyword = String(body.keyword || '').trim().replace(/\s+/g, ' ')

  if (!targetId) {
    return NextResponse.json({ ok: false, error: 'target_id 가 필요해요' }, { status: 400 })
  }
  if (keyword.length < 2 || keyword.length > 40) {
    return NextResponse.json({ ok: false, error: '키워드는 2~40자로 입력해주세요' }, { status: 400 })
  }

  const svc = createServiceClient()

  // 소유권 검증 — 남의 매장에 키워드를 붙이지 못하게
  const { data: target, error: tErr } = await svc
    .from('place_targets')
    .select('id, user_id, name, place_id')
    .eq('id', targetId)
    .maybeSingle()

  if (tErr) {
    return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 })
  }
  if (!target || target.user_id !== auth.userId) {
    return NextResponse.json({ ok: false, error: '해당 매장을 찾을 수 없어요' }, { status: 404 })
  }

  // 상한 검사
  const { count } = await svc
    .from('place_keyword_targets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .eq('enabled', true)

  if ((count ?? 0) >= MAX_KEYWORDS_PER_USER) {
    return NextResponse.json(
      { ok: false, error: `추적 키워드는 최대 ${MAX_KEYWORDS_PER_USER}개까지 등록할 수 있어요` },
      { status: 409 },
    )
  }

  const { data, error } = await svc
    .from('place_keyword_targets')
    .upsert(
      {
        user_id: auth.userId,
        target_id: targetId,
        keyword,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'target_id,keyword' },
    )
    .select('id, target_id, keyword, enabled, created_at')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, keyword: data, store: { name: target.name, place_id: target.place_id } })
}

// ─────────────────────────────────────────────
// DELETE — 키워드 삭제
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id 가 필요해요' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('place_keyword_targets')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId) // 소유권을 where 로 강제
    .select('id')

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!data?.length) {
    return NextResponse.json({ ok: false, error: '해당 키워드를 찾을 수 없어요' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, removed: data.length })
}
