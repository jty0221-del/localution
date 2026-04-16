import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const baseUrl = new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=naver_denied', baseUrl))
  }

  try {
    const clientId = process.env.NAVER_CLIENT_ID || ''
    const clientSecret = process.env.NAVER_CLIENT_SECRET || ''
    const callbackUrl = process.env.NAVER_CALLBACK_URL || (baseUrl + '/api/oauth/naver/callback')

    const tokenUrl = 'https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=' + clientId + '&client_secret=' + clientSecret + '&code=' + code + '&state=' + (state || '')

    const tokenRes = await fetch(tokenUrl, { method: 'POST' })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Naver token error:', JSON.stringify(tokenData))
      return NextResponse.redirect(new URL('/login?error=token_failed', baseUrl))
    }

    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': 'Bearer ' + tokenData.access_token
      }
    })

    const userData = await userRes.json()
    const userInfo = userData.response

    if (!userInfo || !userInfo.id) {
      return NextResponse.redirect(new URL('/login?error=profile_failed', baseUrl))
    }

    const sessionData = {
      id: userInfo.id,
      name: userInfo.name || userInfo.nickname || 'User',
      email: userInfo.email || '',
      provider: 'naver',
      profile_image: userInfo.profile_image || '',
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
    cookieStore.set('localution_user', JSON.stringify(sessionData), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    })

    return NextResponse.redirect(new URL('/dashboard', baseUrl))
  } catch (error) {
    console.error('Naver OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', baseUrl))
  }
}
