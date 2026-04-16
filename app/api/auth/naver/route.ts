import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID
  const callbackUrl = process.env.NAVER_CALLBACK_URL

  if (!clientId || !callbackUrl) {
    return NextResponse.json({ error: 'Naver OAuth not configured' }, { status: 500 })
  }

  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    state: state,
  })

  const naverAuthUrl = 'https://nid.naver.com/oauth2.0/authorize?' + params.toString()

  const response = NextResponse.redirect(naverAuthUrl)
  response.cookies.set('naver_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  })

  return response
}
