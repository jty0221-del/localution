// app/api/review-reply/bulk-draft/route.ts
// ============================================================
// 30차-22-A · 미답변 리뷰 초안 일괄 생성 — 대상 ID 목록만 반환
//
// POST /api/review-reply/bulk-draft
// body: { platform: 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map' }
//
// 동작:
// · 해당 플랫폼의 본인 platform_reviews 에서
// has_reply=false AND reply_status IN ('none','draft','failed') 인 리뷰 ID 를 최대 50개 반환
// · 실제 AI 호출은 클라이언트가 순차 호출 (서버 타임아웃 회피)
//
// 응답:
// { ok: true, platform, candidates: [{ id, has_draft }] }
// { ok: false, error }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PLATFORMS = ['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'kakao_map'] as const

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 }
 const userId = auth.userId

 let body: any
 try { body = await req.json() } catch {
 return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
 }
 const platform = String(body?.platform || '').trim()

 if (!platform || !VALID_PLATFORMS.includes(platform as any)) {
 return NextResponse.json(
 { ok: false, error: 'platform 값 필요 (naver_place|baemin|yogiyo|coupangeats|kakao_map)' },
 { status: 400 },
 )
 }

 try {
 const svc = createServiceClient()
 // 미답변 + (null/none/draft/failed) 상태인 리뷰만 후보
 // 주의: reply_status 가 DB에서 NULL 일 때 .in() 은 매칭 안 되므로 .or() 로 처리
 const { data, error } = await svc
 .from('platform_reviews')
 .select('id, draft_reply, reply_status, has_reply, posted_at, collected_at')
 .eq('user_id', userId)
 .eq('platform', platform)
 .eq('has_reply', false)
 .or('reply_status.is.null,reply_status.in.(none,draft,failed)')
 .order('posted_at', { ascending: false, nullsFirst: false })
 .limit(50)

 if (error) {
 return NextResponse.json(
 { ok: false, error: '후보 조회 실패: ' + error.message },
 { status: 500 },
 )
 }

 const candidates = (data || []).map((r) => ({
 id: String(r.id),
 has_draft: !!(r.draft_reply && String(r.draft_reply).trim().length > 0),
 reply_status: r.reply_status || 'none',
 }))

 return NextResponse.json({
 ok: true,
 platform,
 total: candidates.length,
 candidates,
 })
 } catch (e: any) {
 return NextResponse.json(
 { ok: false, error: '예외: ' + (e?.message ?? String(e)) },
 { status: 500 },
 )
 }
}
