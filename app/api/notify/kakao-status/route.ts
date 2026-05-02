// app/api/notify/kakao-status/route.ts
// 카카오 알림 연결 상태 확인 — kakao_tokens 에 사용자 row + talk_message scope 보유 여부
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data } = await svc
    .from('kakao_tokens')
    .select('scope, expires_at, refresh_expires_at')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ ok: true, connected: false, scope: null })
  }

  const scope = String(data.scope || '')
  const hasTalkMessage = scope.includes('talk_message')
  const refreshValid = data.refresh_expires_at
    ? new Date(data.refresh_expires_at).getTime() > Date.now()
    : true

  return NextResponse.json({
    ok: true,
    connected: hasTalkMessage && refreshValid,
    scope,
    has_talk_message: hasTalkMessage,
    refresh_valid: refreshValid,
  })
}
