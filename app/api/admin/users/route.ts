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

    // 최대 200명 (페이지네이션은 Phase 2)
    const { data: usersData, error: uErr } = await svc.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })
    if (uErr) throw uErr

    const users = usersData?.users ?? []

    // 각 유저의 구독/고객 개수 집계
    const { data: subs } = await svc.from('subscriptions').select('user_id')
    const { data: custs } = await svc.from('customers').select('user_id')

    const subCount = new Map<string, number>()
    ;(subs ?? []).forEach(s => subCount.set(s.user_id, (subCount.get(s.user_id) ?? 0) + 1))

    const custCount = new Map<string, number>()
    ;(custs ?? []).forEach(c => custCount.set(c.user_id, (custCount.get(c.user_id) ?? 0) + 1))

    const rows = users.map(u => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      customers_count: custCount.get(u.id) ?? 0,
      subscriptions_count: subCount.get(u.id) ?? 0,
    }))

    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'users query failed' },
      { status: 500 },
    )
  }
}
