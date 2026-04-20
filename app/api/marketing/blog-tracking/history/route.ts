// app/api/marketing/blog-tracking/history/route.ts
// ============================================================
// 블로그 키워드 순위 — 특정 타겟의 체크 이력 조회 (v2 — 18차-4)
//   · GET ?target_id=<uuid>&limit=50
//   · rank_hits jsonb 도 함께 반환 (UI 상세 표시용)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const target_id = req.nextUrl.searchParams.get('target_id')?.trim()
  const limitRaw  = req.nextUrl.searchParams.get('limit')
  const limit     = Math.min(Math.max(parseInt(limitRaw ?? '50', 10) || 50, 1), 365)
  if (!target_id) return NextResponse.json({ error: 'target_id 누락' }, { status: 400 })

  const svc = createServiceClient()

  const { data: t, error: tErr } = await svc
    .from('blog_tracking_targets')
    .select('id,user_id,label,keyword,target_url,blog_id,post_id')
    .eq('id', target_id)
    .single()
  if (tErr || !t) return NextResponse.json({ error: '타겟을 찾을 수 없습니다.' }, { status: 404 })
  if (t.user_id !== auth.userId) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { data: history, error: hErr } = await svc
    .from('blog_tracking_history')
    .select('id,checked_at,rank,section,total_found,note,source,rank_hits')
    .eq('target_id', target_id)
    .order('checked_at', { ascending: false })
    .limit(limit)
  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 })

  return NextResponse.json({
    target: {
      id:         t.id,
      label:      t.label,
      keyword:    t.keyword,
      target_url: t.target_url,
      blog_id:    t.blog_id,
      post_id:    t.post_id,
    },
    history: history ?? [],
  })
}
