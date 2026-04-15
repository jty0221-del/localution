import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.localution.co.kr'

  if (error) {
    console.error('[Google OAuth] 사용자 거부 또는 오류:', error)
    return NextResponse.redirect(baseUrl + '/login?error=google_denied')
  }
  if (!code || !state) {
    return NextResponse.redirect(baseUrl + '/login?error=missing_params')
  }

  // state 검증
  const savedState = req.cookies.get('google_oauth_state')?.value
  if (savedState && savedState !== state) {
    return NextResponse.redirect(baseUrl + '/login?error=state_mismatch')
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID     || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''

  // 시작 라우트에서 저장한 redirect_uri 그대로 재사용 (불일치 방지)
  const host        = req.headers.get('host') || 'www.localution.co.kr'
  const proto       = host.includes('localhost') ? 'http' : 'https'
  const autoUri     = proto + '://' + host + '/api/oauth/google/callback'
  const redirectUri = req.cookies.get('google_redirect_uri')?.value
    || process.env.GOOGLE_REDIRECT_URI
    || autoUri

  if (!clientId || !clientSecret) {
    console.error('[Google OAuth] 환경변수 누락 - CLIENT_ID:', !!clientId, 'SECRET:', !!clientSecret)
    return NextResponse.redirect(baseUrl + '/login?error=google_config')
  }

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
      console.error('[Google OAuth] 토큰 교환 실패:', JSON.stringify(tokenData))
      return NextResponse.redirect(baseUrl + '/login?error=token_failed')
    }

    // 2) 프로필 조회
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
      cache: 'no-store',
    })
    const profile = await profileRes.json()

    if (!profile.id) {
      console.error('[Google OAuth] 프로필 조회 실패:', JSON.stringify(profile))
      return NextResponse.redirect(baseUrl + '/login?error=profile_failed')
    }

    // 3) 세션 쿠키 발급 + 대시보드로 이동
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
    redirectRes.cookies.delete('google_redirect_uri')
    return redirectRes

  } catch (err) {
    console.error('[Google OAuth] 예외:', err)
    return NextResponse.redirect(baseUrl + '/login?error=server_error')
  }
}
