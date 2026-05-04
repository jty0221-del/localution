// app/api/oauth/threads/callback/route.ts
// Threads OAuth 콜백 — 코드 교환 → 장기 토큰 → DB 저장
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/app/lib/adminAuth'
import { saveThreadsToken } from '@/app/lib/threads-token'

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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/marketing/threads?error=denied', origin))
  }

  // CSRF 검증
  const cookieStore = await cookies()
  const storedState = cookieStore.get('threads_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/marketing/threads?error=csrf', origin))
  }
  cookieStore.delete('threads_oauth_state')

  const appId = process.env.THREADS_APP_ID!
  const appSecret = process.env.THREADS_APP_SECRET!
  const callbackUrl = process.env.THREADS_CALLBACK_URL!

  try {
    const svc = createServiceClient()
    const userId = await getOwnerUserId(svc)

    // 1) 단기 토큰 교환
    const tokenForm = new URLSearchParams()
    tokenForm.set('client_id', appId)
    tokenForm.set('client_secret', appSecret)
    tokenForm.set('grant_type', 'authorization_code')
    tokenForm.set('redirect_uri', callbackUrl)
    tokenForm.set('code', code)

    const shortRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenForm.toString(),
    })
    const shortData = await shortRes.json() as { access_token?: string; error_message?: string }
    if (!shortData.access_token) {
      console.error('[threads-callback] short token error:', shortData)
      return NextResponse.redirect(new URL('/marketing/threads?error=token_failed', origin))
    }

    // 2) 장기 토큰 교환 (60일)
    const longUrl = new URL('https://graph.threads.net/access_token')
    longUrl.searchParams.set('grant_type', 'th_exchange_token')
    longUrl.searchParams.set('client_secret', appSecret)
    longUrl.searchParams.set('access_token', shortData.access_token)

    const longRes = await fetch(longUrl.toString())
    const longData = await longRes.json() as { access_token?: string; expires_in?: number }
    if (!longData.access_token) {
      console.error('[threads-callback] long token error:', longData)
      return NextResponse.redirect(new URL('/marketing/threads?error=longtoken_failed', origin))
    }

    // 3) 유저 정보 조회
    const meUrl = new URL('https://graph.threads.net/v1.0/me')
    meUrl.searchParams.set('fields', 'id,username')
    meUrl.searchParams.set('access_token', longData.access_token)

    const meRes = await fetch(meUrl.toString())
    const meData = await meRes.json() as { id?: string; username?: string }
    if (!meData.id) {
      console.error('[threads-callback] me error:', meData)
      return NextResponse.redirect(new URL('/marketing/threads?error=profile_failed', origin))
    }

    // 4) 토큰 암호화 저장 — 실패 시 에러 리다이렉트
    await saveThreadsToken(svc, userId, {
      threads_user_id: meData.id,
      username: meData.username ?? '',
      access_token: longData.access_token,
      expires_in: longData.expires_in ?? 5184000,
    })
    // saveThreadsToken이 오류 없이 완료된 경우에만 성공 리다이렉트
    return NextResponse.redirect(new URL('/marketing/threads?connected=1', origin))
  } catch (e) {
    console.error('[threads-callback] error:', e)
    return NextResponse.redirect(new URL('/marketing/threads?error=server_error', origin))
  }
}
