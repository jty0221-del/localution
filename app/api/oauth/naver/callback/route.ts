import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect('/login?error=naver_denied')
  }

  try {
    const clientId = process.env.NAVER_CLIENT_ID || ''
    const clientSecret = process.env.NAVER_CLIENT_SECRET || ''
    const callbackUrl = process.env.NAVER_CALLBACK_URL || 'https://www.localution.co.kr/api/oauth/naver/callback'

    const tokenUrl = 'https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=' + clientId + '&client_secret=' + clientSecret + '&code=' + code + '&state=' + state

    const tokenRes = await fetch(tokenUrl, { method: 'POST' })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect('/login?error=token_failed')
    }

    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': 'Bearer ' + tokenData.access_token
      }
    })

    const userData = await userRes.json()
    const userInfo = userData.response

    if (!userInfo || !userInfo.id) {
      return NextResponse.redirect('/login?error=token_failed')
    }

    const sessionData = {
      id: userInfo.id,
      name: userInfo.name || 'User',
      email: userInfo.email || '',
      provider: 'naver',
      profile_image: userInfo.profile_image || '',
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
    console.error('Naver OAuth error:', error)
    return NextResponse.redirect('/login?error=token_failed')
  }
}
