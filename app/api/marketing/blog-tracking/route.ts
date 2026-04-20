// app/api/marketing/blog-tracking/route.ts
// ============================================================
// 블로그 키워드 순위 추적 — 타겟 CRUD
//   · GET   : 내 타겟 목록 + 최신 순위 (뷰 blog_tracking_latest 조회)
//   · POST  : 신규 타겟 등록 (옵션: check=true 이면 즉시 1회 순위 체크)
//   · DELETE: ?id=<uuid> 삭제
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { parseBlogUrl, checkNaverBlogRank } from '@/app/lib/naver-rank'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------- next cron run (UTC 20:00 = KST 05:00) ----------
function nextCronRunUTC(now: Date = new Date()): string {
  const n = new Date(now)
  const today20 = new Date(Date.UTC(
    n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 20, 0, 0,
  ))
  const out = n.getTime() < today20.getTime()
    ? today20
    : new Date(today20.getTime() + 24 * 60 * 60 * 1000)
  return out.toISOString()
}

// ---------- GET: list + cron 상태 ----------
export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const svc = createServiceClient()

  // 타겟 목록
  const { data: targets, error: tErr } = await svc
    .from('blog_tracking_latest')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

  const targetIds = (targets ?? []).map(t => t.target_id)

  // 크론 요약 (내 타겟 한정 · source='cron_daily')
  let lastCronAt: string | null = null
  let cronRuns7d = 0
  if (targetIds.length > 0) {
    // 마지막 cron 실행
    const { data: lastRow } = await svc
      .from('blog_tracking_history')
      .select('checked_at')
      .in('target_id', targetIds)
      .eq('source', 'cron_daily')
      .order('checked_at', { ascending: false })
      .limit(1)
    lastCronAt = lastRow?.[0]?.checked_at ?? null

    // 지난 7일 누적
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await svc
      .from('blog_tracking_history')
      .select('id', { count: 'exact', head: true })
      .in('target_id', targetIds)
      .eq('source', 'cron_daily')
      .gte('checked_at', since)
    cronRuns7d = count ?? 0
  }

  return NextResponse.json({
    targets: targets ?? [],
    cron: {
      enabled:      true,
      schedule:     '0 20 * * *',        // UTC 20:00
      schedule_kst: '매일 오전 5시',
      last_run_at:  lastCronAt,
      next_run_at:  nextCronRunUTC(),
      runs_last_7d: cronRuns7d,
    },
  })
}

// ---------- POST: create (옵션 즉시 체크) ----------
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: {
    label?: string
    keyword?: string
    target_url?: string
    memo?: string
    tags?: string[]
    check_now?: boolean
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const label      = (body.label ?? '').trim()
  const keyword    = (body.keyword ?? '').trim()
  const target_url = (body.target_url ?? '').trim()
  if (!label || !keyword || !target_url) {
    return NextResponse.json({ error: 'label/keyword/target_url 누락' }, { status: 400 })
  }
  const { blogId, postId } = parseBlogUrl(target_url)
  if (!blogId || !postId) {
    return NextResponse.json({
      error: 'target_url 형식 오류 (blog.naver.com/{blogId}/{postId} 형태여야 함)',
    }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: inserted, error: insErr } = await svc
    .from('blog_tracking_targets')
    .insert({
      user_id:    auth.userId,
      label,
      keyword,
      target_url,
      blog_id:    blogId,
      post_id:    postId,
      memo:       body.memo ?? null,
      tags:       Array.isArray(body.tags) ? body.tags : [],
    })
    .select('*')
    .single()

  if (insErr) {
    if (insErr.code === '23505') {
      return NextResponse.json({ error: '같은 키워드·URL 조합이 이미 등록되어 있습니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // 옵션: 등록 즉시 1회 체크
  let checked: Awaited<ReturnType<typeof checkNaverBlogRank>> | null = null
  if (body.check_now) {
    checked = await checkNaverBlogRank(keyword, target_url).catch(() => null)
    if (checked) {
      await svc.from('blog_tracking_history').insert({
        target_id:   inserted.id,
        rank:        checked.rank,
        section:     checked.section,
        source:      'naver_mobile',
        total_found: checked.total_found,
        note:        checked.note ?? null,
      })
    }
  }

  return NextResponse.json({ target: inserted, checked })
}

// ---------- DELETE: ?id=<uuid> ----------
export async function DELETE(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 누락' }, { status: 400 })

  const svc = createServiceClient()
  const { error, count } = await svc
    .from('blog_tracking_targets')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: '해당 타겟을 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ ok: true, deleted: count })
}
