// app/api/threads/account/route.ts
// Threads 계정 연결 상태 조회 / 연결 해제
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const THREADS_PLATFORM = 'threads'

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()

 const { data } = await svc
 .from('platform_credentials')
 .select('account_id, platform_store_name, extra_data, updated_at, created_at')
 .eq('platform', THREADS_PLATFORM)
 .eq('user_id', auth.userId)
 .order('updated_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (!data) {
 return NextResponse.json({ ok: true, connected: false })
 }

 const expiresAt = data.extra_data?.expires_at ? new Date(data.extra_data.expires_at) : null
 const expiresInDays = expiresAt
 ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 86400000))
 : null

 return NextResponse.json({
 ok: true,
 connected: true,
 threads_user_id: data.account_id,
 username: data.platform_store_name ?? null,
 expires_at: expiresAt?.toISOString() ?? null,
 expires_in_days: expiresInDays,
 connected_at: data.created_at,
 })
}

export async function DELETE() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 await svc
 .from('platform_credentials')
 .delete()
 .eq('platform', THREADS_PLATFORM)
 .eq('user_id', auth.userId)

 return NextResponse.json({ ok: true })
}
