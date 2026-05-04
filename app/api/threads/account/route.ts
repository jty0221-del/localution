// app/api/threads/account/route.ts
// Threads 계정 연결 상태 조회 / 연결 해제
import { NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const userId = auth.userId ?? auth.email
  const svc = createServiceClient()

  const { data } = await svc
    .from('threads_accounts')
    .select('threads_user_id, username, expires_at, refreshed_at, created_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ ok: true, connected: false })
  }

  const expiresAt = new Date(data.expires_at)
  const expiresInDays = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 86400000))

  return NextResponse.json({
    ok: true,
    connected: true,
    threads_user_id: data.threads_user_id,
    username: data.username,
    expires_at: data.expires_at,
    expires_in_days: expiresInDays,
    refreshed_at: data.refreshed_at,
    connected_at: data.created_at,
  })
}

export async function DELETE() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const userId = auth.userId ?? auth.email
  const svc = createServiceClient()

  await svc.from('threads_accounts').delete().eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
