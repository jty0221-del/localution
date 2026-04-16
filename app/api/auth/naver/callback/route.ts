import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = request.nextUrl.origin

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=cancelled', baseUrl))
  }

  try {
    // 1. 액세스 토큰 교환
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.NAVER_CLIENT_ID || '',
      client_secret: process.env.NAVER_CLIENT_SECRET || '',
      code: code,
      state: state || '',
    })

    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Naver token error:', tokenData)
      return NextResponse.redirect(new URL('/login?error=token_failed', baseUrl))
    }

    // 2. 사용자 정보 조회
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': 'Bearer ' + tokenData.access_token,
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID || '',
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET || '',
      },
    })

    const userData = await userRes.json()

    if (userData.resultcode !== '00') {
      console.error('Naver user info error:', userData)
      return NextResponse.redirect(new URL('/login?error=user_failed', baseUrl))
    }

    const naverUser = userData.response

    // 3. 세션 쿠키 생성
    const sessionData = {
      id: naverUser.id,
      name: naverUser.name || naverUser.nickname || '사용자',
      email: naverUser.email || '',
      profile: naverUser.profile_image || '',
      provider: 'naver',
      loggedIn: true,
      loginAt: Date.now(),
    }

    const response = NextResponse.redirect(new URL('/dashboard', baseUrl))

    response.cookies.set('localution_user', JSON.stringify(sessionData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    })

    response.cookies.set('localution_session', 'naver_' + naverUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    })

    return response

  } catch (err) {
    console.error('Naver callback error:', err)
    return NextResponse.redirect(new URL('/login?error=server_error', baseUrl))
  }
}
