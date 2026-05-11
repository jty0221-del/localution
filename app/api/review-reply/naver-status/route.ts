// app/api/review-reply/naver-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 네이버 잠금 패턴 감지 키워드
const LOCKOUT_PATTERNS = [
  '안전하지 않은 환경',
  '비정상적',
  '아이디를 보호',
  '회원님의 아이디',
  '로그인 차단',
]

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status })

 const { searchParams } = new URL(req.url)
 const checkLockout = searchParams.get('check_lockout') === '1'

 const svc = createServiceClient()

 // 잠금 검출 모드: 최근 24시간 failed 답글 중 lockout 패턴 검색
 if (checkLockout) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: failed } = await svc
   .from('platform_reviews')
   .select('id, platform_review_id, reply_error, reply_submitted_at')
   .eq('user_id', auth.userId)
   .eq('platform', 'naver_place')
   .eq('reply_status', 'failed')
   .gte('reply_submitted_at', since)
   .limit(20)

  const lockoutItems = (failed || []).filter(r => {
   const err = String(r.reply_error || '')
   return LOCKOUT_PATTERNS.some(p => err.includes(p))
  })

  return NextResponse.json({
   ok: true,
   has_lockout: lockoutItems.length > 0,
   failed_count: lockoutItems.length,
   sample_review_id: lockoutItems[0]?.platform_review_id || null,
  })
 }

 const { data, error } = await svc
 .from('platform_reviews')
 .select('id, platform_review_id, reply_status, reply_error, reply_queued_at, reply_submitted_at, has_reply, draft_reply')
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 .order('collected_at', { ascending: false })
 .limit(5)
 return NextResponse.json({ ok: true, userId: auth.userId, count: data?.length ?? 0, error: error?.message ?? null, reviews: data || [] })
}
