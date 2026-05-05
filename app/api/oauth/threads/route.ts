// app/api/oauth/threads/route.ts
// Threads OAuth 2.0 인증 시작 — Meta 인증 페이지로 리다이렉트
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const appId = process.env.THREADS_APP_ID
  const callbackUrl = process.env.THREADS_CALLBACK_URL

  if (!appId || !callbackUrl) {
    return NextResponse.json({ error: 'THREADS_APP_ID 또는 THREADS_CALLBACK_URL 환경변수 미설정' }, { status: 500 })
  }

  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL || 'https://localution.vercel.app'))
  }

  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('threads_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  // 어떤 Localution 사용자가 연결하는지 저장 (콜백에서 사용)
  cookieStore.set('threads_oauth_uid', auth.userId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
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
