// app/api/marketing/blog-tracking/check/route.ts
// ============================================================
// 블로그 키워드 순위 — 수동 즉시 체크
//   · POST { target_id: uuid }  → 1개 타겟 즉시 순위 조회 + history 저장
//   · POST { target_id: 'all' } → 내 활성 타겟 전체 일괄 체크 (최대 20건)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { checkNaverBlogRank } from '@/app/lib/naver-rank'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BULK = 20

interface TargetRow {
  id: string
  keyword: string
  target_url: string
  label: string
}

async function runOne(
  svc: ReturnType<typeof createServiceClient>,
  t: TargetRow,
) {
  const r = await checkNaverBlogRank(t.keyword, t.target_url).catch((e: unknown) => ({
    rank: null as number | null,
    section: 'not_found' as const,
    total_found: 0,
    note: e instanceof Error ? e.message : 'check_error',
  }))
  await svc.from('blog_tracking_history').insert({
    target_id:   t.id,
    rank:        r.rank,
    section:     r.section,
    source:      'naver_mobile',
    total_found: r.total_found,
    note:        r.note ?? null,
  })
  return { target_id: t.id, label: t.label, ...r }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { target_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const target_id = (body.target_id ?? '').trim()
  if (!target_id) return NextResponse.json({ error: 'target_id 누락' }, { status: 400 })

  const svc = createServiceClient()

  // ---- 일괄 모드 ----
  if (target_id === 'all') {
    const { data: rows, error } = await svc
      .from('blog_tracking_targets')
      .select('id,keyword,target_url,label')
      .eq('user_id', auth.userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(MAX_BULK)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const results: Array<Awaited<ReturnType<typeof runOne>>> = []
    for (const t of (rows ?? []) as TargetRow[]) {
      // 네이버 rate-limit 보호: 간단 축차 실행 + 300ms gap
      // eslint-disable-next-line no-await-in-loop
      const r = await runOne(svc, t)
      results.push(r)
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r2 => setTimeout(r2, 300))
    }
    return NextResponse.json({ mode: 'all', count: results.length, results })
  }

  // ---- 단일 모드 ----
  const { data: t, error: getErr } = await svc
    .from('blog_tracking_targets')
    .select('id,keyword,target_url,label,user_id')
    .eq('id', target_id)
    .single()
  if (getErr || !t) return NextResponse.json({ error: '타겟을 찾을 수 없습니다.' }, { status: 404 })
  if (t.user_id !== auth.userId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const result = await runOne(svc, t as TargetRow)
  return NextResponse.json({ mode: 'one', result })
}
