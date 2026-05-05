// app/api/marketing/kakao/test/route.ts
// ============================================================
// 카카오 연결 테스트 발송 — 18차-5
// · POST /api/marketing/kakao/test (본문 없음)
// · 사용자 토큰으로 "나에게 보내기" API 호출
// · 결과는 blog_tracking_alerts 에도 기록 (event_type='daily_digest' 로 분류 — 테스트 구분자 포함)
// ============================================================
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'
import { sendMemoForUser } from '@/app/lib/kakao-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const message = ' 로컬루션 테스트 메시지 — 블로그 순위 변동이 감지되면 이곳으로 알림이 옵니다.'

 const result = await sendMemoForUser(auth.userId, message, {
 buttonTitle: '대시보드 열기',
 })

 // 발송 로그 기록 (실패해도 메인 응답은 유지)
 const svc = createServiceClient()
 try {
 await svc.from('blog_tracking_alerts').insert({
 user_id: auth.userId,
 event_type: 'daily_digest',
 message,
 payload: { kind: 'test_send' },
 sent_status: result.ok ? 'sent' : 'failed',
 sent_error: result.ok ? null : result.error,
 sent_at: result.ok ? new Date().toISOString() : null,
 })
 } catch { /* 로그 실패 무시 */ }

 if (!result.ok) {
 return NextResponse.json({ error: result.error }, { status: 400 })
 }
 return NextResponse.json({ ok: true })
}
