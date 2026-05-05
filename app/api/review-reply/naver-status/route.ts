// app/api/review-reply/naver-status/route.ts
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status })
 const svc = createServiceClient()
 const { data, error } = await svc
 .from('platform_reviews')
 .select('id, platform_review_id, reply_status, reply_error, reply_queued_at, reply_submitted_at, has_reply, draft_reply')
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 .order('collected_at', { ascending: false })
 .limit(5)
 return NextResponse.json({ ok: true, userId: auth.userId, count: data?.length ?? 0, error: error?.message ?? null, reviews: data || [] })
}
