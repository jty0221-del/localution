import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signCookie } from '@/app/lib/cookieSigning'
import { sessionCookieOpts } from '@/app/lib/session-cookies'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const baseUrl = new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=kakao_denied', baseUrl))
  }

  try {
    const restApiKey = process.env.KAKAO_REST_API_KEY || ''
    const clientSecret = process.env.KAKAO_CLIENT_SECRET || ''
    const redirectUri = process.env.KAKAO_CALLBACK_URL || (baseUrl + '/api/oauth/kakao/callback')

    const formData = new URLSearchParams()
    formData.append('grant_type', 'authorization_code')
    formData.append('client_id', restApiKey)
    formData.append('code', code)
    formData.append('redirect_uri', redirectUri)
    if (clientSecret) formData.append('client_secret', clientSecret)

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Kakao token error:', JSON.stringify(tokenData))
      return NextResponse.redirect(new URL('/login?error=token_failed', baseUrl))
    }

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    })

    const userData = await userRes.json()

    if (!userData.id) {
      return NextResponse.redirect(new URL('/login?error=profile_failed', baseUrl))
    }

    const kakaoAccount = userData.kakao_account || {}
    const profile = kakaoAccount.profile || {}

    const cookieStore = await cookies()
    const opts = sessionCookieOpts(request.url)

    cookieStore.set('localution_session', tokenData.access_token, { ...opts, httpOnly: true })

    const signed = signCookie({
      id: String(userData.id),
      name: profile.nickname || 'User',
      email: kakaoAccount.email || '',
      provider: 'kakao',
    })
    cookieStore.set('localution_user', signed, { ...opts, httpOnly: true })

    return NextResponse.redirect(new URL('/dashboard', baseUrl))
  } catch (error) {
    console.error('Kakao OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', baseUrl))
  }
}
