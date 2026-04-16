import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/login?error=google_denied')
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'https://www.localution.co.kr/api/oauth/google/callback'

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
      return NextResponse.redirect('/login?error=token_failed')
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    })

    const userData = await userRes.json()

    if (!userData.id) {
      return NextResponse.redirect('/login?error=token_failed')
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
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    })
    cookieStore.set('localution_user', JSON.stringify(sessionData), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    })

    return NextResponse.redirect('/dashboard')
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect('/login?error=token_failed')
  }
}
