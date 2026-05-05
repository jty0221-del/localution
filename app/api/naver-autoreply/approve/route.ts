// app/api/naver-autoreply/approve/route.ts
// ============================================================
// POST { review_id, reply_text? }
// · 답글 초안 승인 (수정본 있으면 수정본 사용)
// · platform_reviews.reply_status → 'queued'
// · BullMQ에 post_reply 잡 투입
//
// DELETE { review_id }
// · 초안 무시 (draft_reply 클리어, reply_status → null)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({})) as Record<string, unknown>
 const reviewId = String(body?.review_id || '').trim()
 if (!reviewId) return NextResponse.json({ error: 'review_id 필요' }, { status: 400 })

 const svc = createServiceClient()

 // 리뷰 검증
 const { data: rev, error: revErr } = await svc
 .from('platform_reviews')
 .select('id, platform_review_id, draft_reply, reply_status, user_id')
 .eq('id', reviewId)
 .eq('user_id', auth.userId)
 .maybeSingle()

 if (revErr || !rev) return NextResponse.json({ error: '리뷰를 찾을 수 없습니다.' }, { status: 404 })
 if (rev.reply_status === 'submitted')
 return NextResponse.json({ error: '이미 게시된 답글입니다.' }, { status: 409 })
 if (rev.reply_status === 'queued')
 return NextResponse.json({ error: '이미 처리 대기 중입니다.' }, { status: 409 })

 // 승인할 텍스트 — body.reply_text 있으면 수정본, 없으면 기존 draft
 const replyText: string =
 typeof body.reply_text === 'string' && body.reply_text.trim()
 ? body.reply_text.trim()
 : String(rev.draft_reply || '').trim()

 if (!replyText) return NextResponse.json({ error: '답글 내용이 없습니다.' }, { status: 400 })

 // 자격 증명에서 biz_id 조회
 const { data: credRow } = await svc
 .from('platform_credentials')
 .select('extra_data, platform_store_id')
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 .maybeSingle()

 const extra = (credRow?.extra_data as Record<string, unknown>) || {}
 const bizId: string | null =
 String(extra.smartplace_biz_id || credRow?.platform_store_id || '') || null

 // store.id 조회
 const { data: storeRow } = await svc
 .from('stores')
 .select('id')
 .eq('user_id', auth.userId)
 .limit(1)
 .maybeSingle()
 const storeId: string = storeRow?.id || auth.userId

 // DB 업데이트 (queued)
 await svc
 .from('platform_reviews')
 .update({
 draft_reply: replyText,
 reply_status: 'queued',
 reply_queued_at: new Date().toISOString(),
 })
 .eq('id', reviewId)

 // BullMQ 투입
 const enqResult = await enqueuePlatformJob({
 platform: 'naver_place',
 action: 'post_reply',
 userId: auth.userId,
 storeId,
 payload: {
 platform_review_id: rev.platform_review_id || reviewId,
 reply_text: replyText,
 ...(bizId ? { biz_id: bizId } : {}),
 },
 })

 if (!enqResult.ok) {
 // 롤백
 await svc
 .from('platform_reviews')
 .update({ reply_status: 'pending', reply_queued_at: null })
 .eq('id', reviewId)
 return NextResponse.json({ error: `큐 투입 실패: ${enqResult.error}` }, { status: 500 })
 }

 return NextResponse.json({ ok: true, job_id: enqResult.jobId, reply_text: replyText })
}

// 초안 무시 (거절)
export async function DELETE(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({})) as Record<string, unknown>
 const reviewId = String(body?.review_id || '').trim()
 if (!reviewId) return NextResponse.json({ error: 'review_id 필요' }, { status: 400 })

 const svc = createServiceClient()

 const { error } = await svc
 .from('platform_reviews')
 .update({ draft_reply: null, reply_status: 'rejected', reply_queued_at: null })
 .eq('id', reviewId)
 .eq('user_id', auth.userId)

 if (error) return NextResponse.json({ error: '처리 실패' }, { status: 500 })
 return NextResponse.json({ ok: true })
}
