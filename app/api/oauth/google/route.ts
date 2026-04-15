import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId    = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
    'https://localution.vercel.app/api/oauth/google/callback'
  const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL || 'https://localution.vercel.app'

  if (!clientId) {
    return NextResponse.redirect(baseUrl + '/login?error=google_config')
  }

  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    state,
    access_type:   'online',
    prompt:        'select_account',
  })

  const res = NextResponse.redirect(
    'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString()
  )
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })
  return res
}
