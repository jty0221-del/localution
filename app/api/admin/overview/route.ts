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

 // 구독 전체
 const { data: subs, error: sErr } = await svc
 .from('subscriptions')
 .select('status, price_krw')
 if (sErr) throw sErr

 const subscriptions = {
 active: (subs ?? []).filter(s => s.status === 'active').length,
 past_due: (subs ?? []).filter(s => s.status === 'past_due').length,
 cancelled: (subs ?? []).filter(s => s.status === 'cancelled').length,
 total: (subs ?? []).length,
 }
 const mrr_krw = (subs ?? [])
 .filter(s => s.status === 'active' || s.status === 'past_due')
 .reduce((sum, s) => sum + (s.price_krw ?? 0), 0)

 // 고객 합계
 const { count: customers_total } = await svc
 .from('customers')
 .select('id', { count: 'exact', head: true })

 // 사용자 수 (listUsers 는 total 필드가 없을 수 있어 users 배열 length 사용)
 const { data: usersData } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
 const users_total = (usersData?.users ?? []).length

 return NextResponse.json({
 subscriptions,
 mrr_krw,
 users_total,
 customers_total: customers_total ?? 0,
 })
 } catch (e) {
 return NextResponse.json(
 { error: e instanceof Error ? e.message : 'overview failed' },
 { status: 500 },
 )
 }
}
