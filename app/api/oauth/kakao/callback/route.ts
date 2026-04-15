import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localution.vercel.app'

  if (error) return NextResponse.redirect(baseUrl + '/login?error=kakao_denied')
  if (!code) return NextResponse.redirect(baseUrl + '/login?error=missing_params')

  const savedState = req.cookies.get('kakao_oauth_state')?.value
  if (state && savedState && savedState !== state) {
    return NextResponse.redirect(baseUrl + '/login?error=state_mismatch')
  }

  const clientId    = process.env.KAKAO_CLIENT_ID    || ''
  const redirectUri = process.env.KAKAO_REDIRECT_URI ||
    'https://localution.vercel.app/api/oauth/kakao/callback'

  try {
    // 1) 토큰 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        client_id:    clientId,
        redirect_uri: redirectUri,
        code,
      }).toString(),
      cache: 'no-store',
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Kakao token error:', tokenData)
      return NextResponse.redirect(baseUrl + '/login?error=token_failed')
    }

    // 2) 사용자 프로필 조회
    const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization:  'Bearer ' + tokenData.access_token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      cache: 'no-store',
    })
    const profile = await profileRes.json()

    if (!profile.id) {
      return NextResponse.redirect(baseUrl + '/login?error=profile_failed')
    }

    const kakaoAccount  = profile.kakao_account  || {}
    const kakaoProfile  = kakaoAccount.profile   || {}

    // 3) 세션 쿠키 설정
    const user = {
      id:       String(profile.id),
      name:     kakaoProfile.nickname || '사용자',
      email:    kakaoAccount.email    || '',
      avatar:   kakaoProfile.profile_image_url || '',
      provider: 'kakao',
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
    redirectRes.cookies.delete('kakao_oauth_state')
    return redirectRes

  } catch (err) {
    console.error('Kakao OAuth callback error:', err)
    return NextResponse.redirect(baseUrl + '/login?error=server_error')
  }
}
