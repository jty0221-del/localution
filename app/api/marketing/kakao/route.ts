// app/api/marketing/kakao/route.ts
// ============================================================
// 카카오 알림 연결 관리 — 18차-5
// · GET : 연결 상태 조회 (nickname / expires_at / alert_prefs / 최근 발송 5건)
// · DELETE : 연결 해제 (kakao_tokens 행 삭제)
// ============================================================
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const { data, error } = await svc
 .from('kakao_tokens')
 .select('user_id, nickname, kakao_user_id, expires_at, scope, alert_prefs, created_at, updated_at')
 .eq('user_id', auth.userId)
 .maybeSingle()
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })

 let recentAlerts: unknown[] = []
 try {
 const { data: alerts } = await svc
 .from('blog_tracking_alerts')
 .select('id, event_type, message, sent_status, sent_error, sent_at, created_at')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 .limit(5)
 recentAlerts = alerts ?? []
 } catch { /* 부차 쿼리 — 실패해도 메인 응답 유지 */ }

 return NextResponse.json({
 connected: !!data,
 token: data ?? null,
 recent: recentAlerts,
 })
}

export async function DELETE() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const { error, count } = await svc
 .from('kakao_tokens')
 .delete({ count: 'exact' })
 .eq('user_id', auth.userId)
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, deleted: count ?? 0 })
}
