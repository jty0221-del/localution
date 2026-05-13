// app/api/cron/naver-reply-generate/route.ts
// ============================================================
// Vercel 크론 — 네이버 리뷰 AI 자동답글 초안 생성
// · 하루 4회 실행 (vercel.json: 0 2,8,14,20 * * *)
// · autoreply_enabled=true 유저의 미답변 리뷰에 AI 초안 생성
// · auto_approve=true 이면 BullMQ에 바로 투입
// ============================================================
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { loadStoreInfo, generateNaverReply } from '@/app/lib/generate-naver-reply'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isCronAuthorized(req: Request): boolean {
 const secret = process.env.CRON_SECRET
 if (!secret) return true
 const auth = req.headers.get('authorization') || ''
 return auth === `Bearer ${secret}`
}

interface UserStat {
 userId: string
 drafted: number
 queued: number
 skipped: number
 errors: string[]
}

export async function GET(req: Request) {
 if (!isCronAuthorized(req)) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const startTime = Date.now()
 const svc = createServiceClient()

 // 1. autoreply 활성화 유저 목록
 const { data: credRows, error: credErr } = await svc
 .from('platform_credentials')
 .select('user_id, extra_data')
 .eq('platform', 'naver_place')

 if (credErr || !credRows) {
 console.error('[naver-reply-generate] platform_credentials 조회 실패:', credErr?.message)
 return NextResponse.json({ ok: false, error: 'DB 조회 실패' }, { status: 500 })
 }

 // v38: 일정 제어 — skip_weekends / skip_holidays / business_hours_only 체크
 const { shouldRunAutoReply } = await import('@/app/lib/autoreply-schedule')

 const enabledUsers = credRows.filter(row => {
 const extra = (row.extra_data as Record<string, unknown>) || {}
 if (extra.autoreply_enabled !== true) return false
 const sched = {
 skip_weekends: extra.autoreply_skip_weekends === true,
 skip_holidays: extra.autoreply_skip_holidays === true,
 business_hours_only: extra.autoreply_business_hours_only === true,
 }
 const check = shouldRunAutoReply(sched)
 if (!check.allowed) {
 console.log('[naver-reply-generate] skip user', String(row.user_id || '').slice(0, 8), check.reason)
 return false
 }
 return true
 })

 if (enabledUsers.length === 0) {
 return NextResponse.json({ ok: true, message: '자동답글 활성화 유저 없음', processed: 0, elapsed_ms: Date.now() - startTime })
 }

 const summary: UserStat[] = []

 for (const cred of enabledUsers) {
 const userId: string = cred.user_id
 const extra = (cred.extra_data as Record<string, unknown>) || {}
 const tone: string = String(extra.autoreply_tone || 'friendly')
 const autoApprove: boolean = extra.autoreply_auto_approve === true
 const maxPerRun: number = Math.min(20, Math.max(1, Number(extra.autoreply_max_per_run) || 5))
 const bizId: string | null = String(extra.smartplace_biz_id || '') || null

 const stat: UserStat = { userId: userId.slice(0, 8) + '…', drafted: 0, queued: 0, skipped: 0, errors: [] }

 try {
 // 2. 이 유저의 미답변 + draft 없는 리뷰
 const { data: reviews, error: revErr } = await svc
 .from('platform_reviews')
 .select('id, content, rating, photos, platform_review_id')
 .eq('user_id', userId)
 .eq('platform', 'naver_place')
 .eq('has_reply', false)
 .is('draft_reply', null)
 .not('reply_status', 'in', '("submitted","queued","rejected")')
 .order('posted_at', { ascending: false })
 .limit(maxPerRun)

 if (revErr) {
 stat.errors.push(`리뷰 조회 실패: ${revErr.message}`)
 summary.push(stat)
 continue
 }

 if (!reviews || reviews.length === 0) {
 summary.push(stat)
 continue
 }

 // 3. 매장 정보 1회 로드
 const storeInfo = await loadStoreInfo(userId)

 // stores.id 1회 조회 (BullMQ payload용)
 const { data: storeRow } = await svc
 .from('stores')
 .select('id')
 .eq('user_id', userId)
 .limit(1)
 .maybeSingle()
 const storeId: string = storeRow?.id || userId

 for (const rev of reviews) {
 const reviewInfo = {
 content: String(rev.content || ''),
 rating: typeof rev.rating === 'number' ? rev.rating : null,
 photos: Array.isArray(rev.photos) ? (rev.photos as string[]) : [],
 }

 // 4. AI 생성
 const result = await generateNaverReply(storeInfo, reviewInfo, tone)

 if (!result.ok) {
 stat.errors.push(`review ${rev.id}: ${result.error}`)
 stat.skipped++
 continue
 }

 const newStatus = autoApprove ? 'queued' : 'pending'
 const nowIso = new Date().toISOString()

 // 5. draft 저장
 const { error: updateErr } = await svc
 .from('platform_reviews')
 .update({
 draft_reply: result.reply,
 reply_status: newStatus,
 reply_tone: tone,
 reply_queued_at: autoApprove ? nowIso : null,
 })
 .eq('id', rev.id)

 if (updateErr) {
 stat.errors.push(`DB update 실패 (${rev.id}): ${updateErr.message}`)
 stat.skipped++
 continue
 }

 stat.drafted++

 // 6. auto_approve 이면 BullMQ 투입
 if (autoApprove) {
 const enqResult = await enqueuePlatformJob({
 platform: 'naver_place',
 action: 'post_reply',
 userId,
 storeId,
 payload: {
 platform_review_id: rev.platform_review_id || rev.id,
 reply_text: result.reply,
 ...(bizId ? { biz_id: bizId } : {}),
 },
 })

 if (enqResult.ok) {
 stat.queued++
 } else {
 stat.errors.push(`enqueue 실패 (${rev.id}): ${enqResult.error}`)
 // 큐 투입 실패 → pending으로 롤백
 await svc
 .from('platform_reviews')
 .update({ reply_status: 'pending', reply_queued_at: null })
 .eq('id', rev.id)
 }
 }
 }
 } catch (e: unknown) {
 stat.errors.push(`처리 오류: ${e instanceof Error ? e.message : String(e)}`)
 }

 summary.push(stat)
 }

 const totalDrafted = summary.reduce((s, u) => s + u.drafted, 0)
 const totalQueued = summary.reduce((s, u) => s + u.queued, 0)
 const elapsed = Date.now() - startTime

 console.log(`[naver-reply-generate] users=${enabledUsers.length} drafted=${totalDrafted} queued=${totalQueued} elapsed=${elapsed}ms`)

 return NextResponse.json({
 ok: true,
 elapsed_ms: elapsed,
 users_processed: summary.length,
 total_drafted: totalDrafted,
 total_queued: totalQueued,
 summary,
 })
}
