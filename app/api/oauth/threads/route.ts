// app/api/oauth/threads/route.ts
// Threads OAuth 2.0 인증 시작 — Meta 인증 페이지로 리다이렉트
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const appId = process.env.THREADS_APP_ID
  const callbackUrl = process.env.THREADS_CALLBACK_URL

  if (!appId || !callbackUrl) {
    return NextResponse.json({ error: 'THREADS_APP_ID 또는 THREADS_CALLBACK_URL 환경변수 미설정' }, { status: 500 })
  }

  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('threads_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10분
    path: '/',
  })

  const url = new URL('https://www.threads.net/oauth/authorize')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('scope', 'threads_basic,threads_content_publish')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
