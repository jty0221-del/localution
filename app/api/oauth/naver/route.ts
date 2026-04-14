import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId     = process.env.NAVER_CLIENT_ID
  const redirectUri  = process.env.NAVER_REDIRECT_URI ||
    'https://localution.vercel.app/api/oauth/naver/callback'

  if (!clientId) {
    return NextResponse.json(
      { error: 'NAVER_CLIENT_ID 환경변수가 없습니다' },
      { status: 500 }
    )
  }

  // CSRF 방지용 state 생성
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri,
    state,
    // 요청 범위: 이름, 이메일, 프로필사진, 닉네임
  })

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`

  // state를 쿠키에 저장 (콜백에서 검증)
  const res = NextResponse.redirect(naverAuthUrl)
  res.cookies.set('naver_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5분
    path: '/',
  })
  return res
}
