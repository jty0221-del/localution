// app/api/threads/account/route.ts
// Threads 계정 연결 상태 조회 / 연결 해제
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_EMAIL = 'jty0221@gmail.com'

async function getOwnerUserId(svc: ReturnType<typeof createServiceClient>): Promise<string> {
  const { data } = await svc
    .from('stores')
    .select('user_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.user_id || OWNER_EMAIL
}

export async function GET() {
  const svc = createServiceClient()
  const userId = await getOwnerUserId(svc)

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
  const svc = createServiceClient()
  const userId = await getOwnerUserId(svc)
  await svc.from('threads_accounts').delete().eq('user_id', userId)
  return NextResponse.json({ ok: true })
}
