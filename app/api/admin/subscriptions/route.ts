import { NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/app/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
 const admin = await requireAdmin()
 if (!admin.ok) {
 return NextResponse.json({ error: admin.message }, { status: admin.status })
 }

 try {
 const svc = createServiceClient()
 const { data: subs, error } = await svc
 .from('subscriptions')
 .select('id, user_id, module_id, status, current_period_end, price_krw, created_at')
 .order('created_at', { ascending: false })
 .limit(500)
 if (error) throw error

 // 사용자 이메일 조인 (auth.users 는 일반 join 불가 — admin API 로 수동 매핑)
 const userIds = Array.from(new Set((subs ?? []).map(s => s.user_id)))
 const emailMap = new Map<string, string>()
 for (const uid of userIds) {
 try {
 const { data } = await svc.auth.admin.getUserById(uid)
 if (data?.user?.email) emailMap.set(uid, data.user.email)
 } catch {}
 }

 const rows = (subs ?? []).map(s => ({
 ...s,
 user_email: emailMap.get(s.user_id) ?? null,
 }))

 return NextResponse.json({ rows })
 } catch (e) {
 return NextResponse.json(
 { error: e instanceof Error ? e.message : 'subscriptions query failed' },
 { status: 500 },
 )
 }
}
