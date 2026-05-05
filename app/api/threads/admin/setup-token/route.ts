// app/api/threads/admin/setup-token/route.ts
// 개발 모드 전용 — Meta 콘솔 토큰 직접 저장 (관리자 전용)
import { NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/app/lib/adminAuth'
import { saveThreadsToken } from '@/app/lib/threads-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_EMAIL = 'jty0221@gmail.com'

export async function POST(request: Request) {
 const auth = await requireAdmin()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await request.json() as { access_token?: string; user_id?: string }
 if (!body.access_token?.trim()) {
 return NextResponse.json({ error: 'access_token 필요' }, { status: 400 })
 }

 const token = body.access_token.trim()
 const svc = createServiceClient()

 let userId = body.user_id?.trim() || ''
 if (!userId) {
 const { data: store } = await svc
 .from('stores')
 .select('user_id')
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()
 userId = store?.user_id || OWNER_EMAIL
 }

 const meUrl = new URL('https://graph.threads.net/v1.0/me')
 meUrl.searchParams.set('fields', 'id,username')
 meUrl.searchParams.set('access_token', token)

 const meRes = await fetch(meUrl.toString())
 const meData = await meRes.json() as { id?: string; username?: string; error?: { message: string } }

 if (!meData.id) {
 return NextResponse.json({ error: `토큰 검증 실패: ${meData.error?.message}` }, { status: 400 })
 }

 await saveThreadsToken(svc, userId, {
 threads_user_id: meData.id,
 username: meData.username ?? '',
 access_token: token,
 expires_in: 5184000,
 })

 return NextResponse.json({ ok: true, userId, threads_user_id: meData.id, username: meData.username })
}
