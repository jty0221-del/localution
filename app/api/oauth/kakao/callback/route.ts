import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/login?error=kakao_denied')
  }

  try {
    const restApiKey = process.env.KAKAO_REST_API_KEY || ''
    const clientSecret = process.env.KAKAO_CLIENT_SECRET || ''
    const redirectUri = process.env.KAKAO_CALLBACK_URL || 'https://www.localution.co.kr/api/oauth/kakao/callback'

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
      return NextResponse.redirect('/login?error=token_failed')
    }

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    })

    const userData = await userRes.json()

    if (!userData.id) {
      return NextResponse.redirect('/login?error=token_failed')
    }

    const kakaoAccount = userData.kakao_account || {}
    const sessionData = {
      id: String(userData.id),
      name: kakaoAccount.profile ? kakaoAccount.profile.nickname : 'User',
      email: kakaoAccount.email || '',
      provider: 'kakao',
      profile_image: kakaoAccount.profile ? kakaoAccount.profile.profile_image_url : '',
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
    console.error('Kakao OAuth error:', error)
    return NextResponse.redirect('/login?error=token_failed')
  }
}
