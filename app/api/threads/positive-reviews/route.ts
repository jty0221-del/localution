// app/api/threads/positive-reviews/route.ts
// 스레드 작성용 — 최근 긍정 리뷰 조회 (service client, 인증 불필요)
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const svc = createServiceClient()

  const { data, error } = await svc
    .from('platform_reviews')
    .select('id, platform, customer_name, rating, content, posted_at')
    .gte('rating', 4)
    .not('content', 'is', null)
    .neq('content', '')
    .order('posted_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const reviews = (data ?? [])
    .filter(r => (r.content as string).trim().length >= 10)
    .slice(0, 12)

  return NextResponse.json({ ok: true, reviews })
}
