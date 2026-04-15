import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.localution.co.kr'

  // redirect_uri: 환경변수 우선, 없으면 현재 호스트 기반 자동 추론
  const host        = req.headers.get('host') || 'www.localution.co.kr'
  const proto       = host.includes('localhost') ? 'http' : 'https'
  const autoUri     = proto + '://' + host + '/api/oauth/google/callback'
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || autoUri

  if (!clientId) {
    console.error('[Google OAuth] GOOGLE_CLIENT_ID 환경변수 없음')
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

  console.log('[Google OAuth] redirect_uri =', redirectUri)

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString()
  const res = NextResponse.redirect(authUrl)
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   300,
    path:     '/',
  })
  res.cookies.set('google_redirect_uri', redirectUri, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   300,
    path:     '/',
  })
  return res
}
