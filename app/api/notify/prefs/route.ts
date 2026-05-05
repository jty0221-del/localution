// app/api/notify/prefs/route.ts
// ============================================================
// 사용자 알림 설정 조회/저장 API
// GET /api/notify/prefs → 본인 설정 (없으면 default)
// POST /api/notify/prefs { ... } → upsert (부분 업데이트)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT = {
 review_alerts_enabled: true,
 customer_alerts_enabled: true,
 report_alerts_enabled: false,
 low_rating_force_alert: true,
 low_rating_threshold: 3,
 channel_web_push: true,
 channel_kakao_talk: false,
 channel_email: false,
}

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 const { data } = await svc
 .from('user_notification_prefs')
 .select('*')
 .eq('user_id', auth.userId)
 .maybeSingle()

 if (!data) {
 return NextResponse.json({
 ok: true,
 prefs: { ...DEFAULT, user_id: auth.userId, has_web_push_sub: false, has_kakao_token: false },
 })
 }

 // 민감 토큰은 클라이언트로 보내지 않음 (있는지 여부만)
 const safe = {
 ...data,
 web_push_subscription: undefined,
 kakao_access_token: undefined,
 kakao_refresh_token: undefined,
 has_web_push_sub: !!data.web_push_subscription,
 has_kakao_token: !!data.kakao_access_token,
 }
 return NextResponse.json({ ok: true, prefs: safe })
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 let body: any = {}
 try { body = await req.json() } catch {
 return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
 }

 // 화이트리스트 필드만 허용 (민감 토큰은 별도 endpoint 에서)
 const allowed: Record<string, any> = {}
 const fields = [
 'review_alerts_enabled', 'customer_alerts_enabled', 'report_alerts_enabled',
 'low_rating_force_alert', 'low_rating_threshold',
 'channel_web_push', 'channel_kakao_talk', 'channel_email',
 ]
 for (const f of fields) {
 if (f in body) allowed[f] = body[f]
 }
 if (allowed.low_rating_threshold !== undefined) {
 const t = parseInt(allowed.low_rating_threshold, 10)
 if (isNaN(t) || t < 0 || t > 5) return NextResponse.json({ ok: false, error: 'invalid_threshold' }, { status: 400 })
 allowed.low_rating_threshold = t
 }

 const svc = createServiceClient()
 const { error } = await svc
 .from('user_notification_prefs')
 .upsert({ user_id: auth.userId, ...allowed, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
 return NextResponse.json({ ok: true })
}
