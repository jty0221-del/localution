import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signCookie } from '@/app/lib/cookieSigning'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const baseUrl = new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=google_denied', baseUrl))
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || (baseUrl + '/api/oauth/google/callback')

    const formData = new URLSearchParams()
    formData.append('client_id', clientId)
    formData.append('client_secret', clientSecret)
    formData.append('code', code)
    formData.append('grant_type', 'authorization_code')
    formData.append('redirect_uri', redirectUri)

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Google token error:', JSON.stringify(tokenData))
      return NextResponse.redirect(new URL('/login?error=token_failed', baseUrl))
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    })

    const userData = await userRes.json()

    if (!userData.id) {
      return NextResponse.redirect(new URL('/login?error=profile_failed', baseUrl))
    }

    const sessionData = {
      id: userData.id,
      name: userData.name || 'User',
      email: userData.email || '',
      provider: 'google',
      profile_image: userData.picture || '',
      access_token: tokenData.access_token
    }

    const cookieStore = await cookies()
    cookieStore.set('localution_session', tokenData.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    })
    // HMAC 서명된 cookie 발급 (위조 방지) — 클라가 직접 변조 불가
    const signed = signCookie({
      id: userData.id,
      name: userData.name || 'User',
      email: userData.email || '',
      provider: 'google',
    })
    cookieStore.set('localution_user', signed, {
      httpOnly: true,        // 클라 JS 접근 차단
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    })

    return NextResponse.redirect(new URL('/dashboard', baseUrl))
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', baseUrl))
  }
}
