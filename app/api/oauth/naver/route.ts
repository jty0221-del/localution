import { NextResponse } from 'next/server'

// Naver OAuth start
//   기본: 기존 로그인 세션 자동 사용
//   ?reset=1: auth_type=reprompt 로 네이버에 다른 계정으로 로그인 강제 (계정 선택 화면)
export async function GET(request: Request) {
  const url = new URL(request.url)
  const baseUrl = url.origin
  const clientId = process.env.NAVER_CLIENT_ID || ''
  const callbackUrl = process.env.NAVER_CALLBACK_URL || (baseUrl + '/api/oauth/naver/callback')
  const state = Math.random().toString(36).slice(2)

  // ?reset=1 → 다른 계정으로 로그인 강제 (auth_type=reprompt)
  // ?reset=reauth → 같은 계정 재인증 (auth_type=reauthenticate)
  const reset = url.searchParams.get('reset')
  let extra = ''
  if (reset === '1') extra = '&auth_type=reprompt'
  else if (reset === 'reauth') extra = '&auth_type=reauthenticate'

  const redirectUrl =
    'https://nid.naver.com/oauth2.0/authorize?response_type=code'
    + '&client_id=' + clientId
    + '&redirect_uri=' + encodeURIComponent(callbackUrl)
    + '&state=' + state
    + extra

  return NextResponse.redirect(redirectUrl)
}
