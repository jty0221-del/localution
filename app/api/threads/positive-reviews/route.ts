// app/api/threads/positive-reviews/route.ts
// 스레드 작성용 — 최근 긍정 리뷰 조회
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const userId = auth.userId

 // 4-5점 리뷰 조회 (네이버 키워드 리뷰는 rating=null 이므로 제외)
 const { data, error } = await svc
 .from('platform_reviews')
 .select('id, platform, rating, content, author_mask, posted_at')
 .eq('user_id', userId)
 .gte('rating', 4)
 .not('content', 'is', null)
 .neq('content', '')
 .order('posted_at', { ascending: false })
 .limit(30)

 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

 const reviews = (data ?? [])
 .filter(r => typeof r.content === 'string' && r.content.trim().length >= 15)
 .slice(0, 15)

 // 4점 이상 리뷰가 없으면 전체 리뷰에서 내용 있는 것만
 if (reviews.length === 0) {
 const { data: fallback } = await svc
 .from('platform_reviews')
 .select('id, platform, rating, content, author_mask, posted_at')
 .eq('user_id', userId)
 .not('content', 'is', null)
 .neq('content', '')
 .order('posted_at', { ascending: false })
 .limit(15)

 const fallbackReviews = (fallback ?? [])
 .filter(r => typeof r.content === 'string' && r.content.trim().length >= 15)
 .slice(0, 12)

 return NextResponse.json({ ok: true, reviews: fallbackReviews })
 }

 return NextResponse.json({ ok: true, reviews })
}
