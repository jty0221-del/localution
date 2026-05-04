// app/api/threads/admin/setup-token/route.ts
// 개발 모드 전용 — 토큰 직접 저장 (Meta 콘솔 사용자 토큰 생성기용)
// 배포 후 삭제하거나 ADMIN_SETUP_SECRET 으로 잠금
import { NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/app/lib/adminAuth'
import { saveThreadsToken } from '@/app/lib/threads-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const userId = auth.userId ?? auth.email
  const body = await request.json() as { access_token?: string }

  if (!body.access_token?.trim()) {
    return NextResponse.json({ error: 'access_token 필요' }, { status: 400 })
  }

  const token = body.access_token.trim()

  // Threads API로 유저 정보 조회
  const meUrl = new URL('https://graph.threads.net/v1.0/me')
  meUrl.searchParams.set('fields', 'id,username')
  meUrl.searchParams.set('access_token', token)

  const meRes = await fetch(meUrl.toString())
  const meData = await meRes.json() as { id?: string; username?: string; error?: { message: string } }

  if (!meData.id) {
    return NextResponse.json({ error: `토큰 검증 실패: ${meData.error?.message}` }, { status: 400 })
  }

  const svc = createServiceClient()
  await saveThreadsToken(svc, userId, {
    threads_user_id: meData.id,
    username: meData.username ?? '',
    access_token: token,
    expires_in: 5184000, // 60일
  })

  return NextResponse.json({
    ok: true,
    userId,
    threads_user_id: meData.id,
    username: meData.username,
  })
}
