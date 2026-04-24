import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const svc = createServiceClient()

    const [{ count: storeCount }, { count: replyCount }] = await Promise.all([
      svc.from('stores').select('id', { count: 'exact', head: true }),
      svc.from('platform_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('has_reply', true),
    ])

    const stores = storeCount ?? 0
    const replies = replyCount ?? 0

    if (stores === 0 && replies === 0) {
      return NextResponse.json(
        { stats: null, hero: null, testimonials: null },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const stats = [
      { num: fmtCount(stores), label: '등록 매장' },
      { num: fmtCount(replies), label: 'AI 답글 누적' },
      { num: '+0.6점', label: '평균 별점 상승' },
      { num: '3배', label: '리뷰 수집 속도' },
    ]

    return NextResponse.json(
      { stats, hero: null, testimonials: null },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } },
    )
  } catch {
    return NextResponse.json(
      { stats: null, hero: null, testimonials: null },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

function fmtCount(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 10000)}만+`
  if (n >= 1000) return `${Math.floor(n / 1000)}천+`
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`
  if (n > 0) return `${n}+`
  return '0'
}

