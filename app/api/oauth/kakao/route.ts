import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID
  const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.localution.co.kr'

  if (!clientId) {
    console.error('[Kakao OAuth] KAKAO_CLIENT_ID 환경변수 없음')
    return NextResponse.redirect(baseUrl + '/login?error=kakao_config')
  }

  const host        = req.headers.get('host') || 'www.localution.co.kr'
  const proto       = host.indexOf('localhost') >= 0 ? 'http' : 'https'
  const autoUri     = proto + '://' + host + '/api/oauth/kakao/callback'
  const redirectUri = process.env.KAKAO_REDIRECT_URI || autoUri

  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    state,
  })

  console.log('[Kakao OAuth] redirect_uri =', redirectUri)

  const authUrl = 'https://kauth.kakao.com/oauth/authorize?' + params.toString()
  const res = NextResponse.redirect(authUrl)
  res.cookies.set('kakao_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300, path: '/' })
  res.cookies.set('kakao_redirect_uri', redirectUri, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300, path: '/' })
  return res
}
