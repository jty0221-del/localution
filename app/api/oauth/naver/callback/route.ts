import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface NaverTokenResponse {
  access_token:  string
  refresh_token: string
  token_type:    string
  expires_in:    string
  error?:        string
  error_description?: string
}

interface NaverProfile {
  resultcode: string
  message: string
  response: {
    id:            string
    nickname?:     string
    name?:         string
    email?:        string
    profile_image?: string
    mobile?:       string
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localution.vercel.app'

  if (error) return NextResponse.redirect(`${baseUrl}/login?error=naver_denied`)
  if (!code || !state) return NextResponse.redirect(`${baseUrl}/login?error=missing_params`)

  const savedState = req.cookies.get('naver_oauth_state')?.value
  if (savedState && savedState !== state) {
    return NextResponse.redirect(`${baseUrl}/login?error=state_mismatch`)
  }

  const clientId     = process.env.NAVER_CLIENT_ID     || ''
  const clientSecret = process.env.NAVER_CLIENT_SECRET || ''
  const redirectUri  = process.env.NAVER_REDIRECT_URI  ||
    'https://localution.vercel.app/api/oauth/naver/callback'

  try {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, code, state,
    })
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?${tokenParams.toString()}`,
      { method: 'GET', cache: 'no-store' }
    )
    const tokenData: NaverTokenResponse = await tokenRes.json()
    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}/login?error=token_failed`)
    }

    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: 'no-store',
    })
    const profileData: NaverProfile = await profileRes.json()
    if (profileData.resultcode !== '00') {
      return NextResponse.redirect(`${baseUrl}/login?error=profile_failed`)
    }

    const profile = profileData.response
    const user = {
      id: profile.id,
      name: profile.name || profile.nickname || '사용자',
      email: profile.email || '',
      avatar: profile.profile_image || '',
      provider: 'naver',
    }

    const userB64 = Buffer.from(JSON.stringify(user)).toString('base64')
    // ★ /dashboard 로 리다이렉트 (기존 / 에서 변경)
    const redirectRes = NextResponse.redirect(`${baseUrl}/dashboard`)
    redirectRes.cookies.set('localution_session', userB64, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    redirectRes.cookies.delete('naver_oauth_state')
    return redirectRes
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${baseUrl}/login?error=server_error`)
  }
}
