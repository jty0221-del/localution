// app/api/threads/admin/whoami/route.ts — 로그인 userId 확인용 (임시)
import { NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
 const auth = await requireAdmin()
 const svc = createServiceClient()

 const { data: store } = await svc
 .from('stores')
 .select('user_id')
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 const { data: account } = await svc
 .from('threads_accounts')
 .select('user_id, username, threads_user_id')
 .maybeSingle()

 return NextResponse.json({
 auth: auth.ok ? { userId: auth.userId, email: auth.email, source: auth.source } : { error: auth.message },
 stores_user_id: store?.user_id,
 threads_account: account,
 })
}
