import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localution.vercel.app'

  if (error) return NextResponse.redirect(baseUrl + '/login?error=google_denied')
  if (!code || !state) return NextResponse.redirect(baseUrl + '/login?error=missing_params')

  const savedState = req.cookies.get('google_oauth_state')?.value
  if (savedState && savedState !== state) {
    return NextResponse.redirect(baseUrl + '/login?error=state_mismatch')
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID     || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI  ||
    'https://localution.vercel.app/api/oauth/google/callback'

  try {
    // 1) 토큰 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }).toString(),
      cache: 'no-store',
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Google token error:', tokenData)
      return NextResponse.redirect(baseUrl + '/login?error=token_failed')
    }

    // 2) 사용자 프로필 조회
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
      cache: 'no-store',
    })
    const profile = await profileRes.json()

    if (!profile.id) {
      return NextResponse.redirect(baseUrl + '/login?error=profile_failed')
    }

    // 3) 세션 쿠키 설정
    const user = {
      id:       profile.id,
      name:     profile.name || profile.given_name || '사용자',
      email:    profile.email || '',
      avatar:   profile.picture || '',
      provider: 'google',
    }
    const userB64 = Buffer.from(JSON.stringify(user)).toString('base64')

    const redirectRes = NextResponse.redirect(baseUrl + '/')
    redirectRes.cookies.set('localution_session', userB64, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })
    redirectRes.cookies.delete('google_oauth_state')
    return redirectRes

  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(baseUrl + '/login?error=server_error')
  }
}
