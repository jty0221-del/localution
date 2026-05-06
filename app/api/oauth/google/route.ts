import { NextResponse } from 'next/server'

// Google OAuth start
//   기본: 처음 가입 시 prompt=consent (refresh token 발급)
//   ?reset=1 → prompt=select_account (계정 선택 화면)
export async function GET(request: Request) {
  const url = new URL(request.url)
  const baseUrl = url.origin
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || (baseUrl + '/api/oauth/google/callback')
  const scopes = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')

  const reset = url.searchParams.get('reset')
  // 기본 prompt: consent (refresh token 보장)
  // reset=1 일 때만 select_account (계정 선택)
  const prompt = reset === '1' ? 'select_account' : 'consent'

  const redirectUrl =
    'https://accounts.google.com/o/oauth2/v2/auth'
    + '?client_id=' + clientId
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&response_type=code'
    + '&scope=' + scopes
    + '&access_type=offline'
    + '&prompt=' + prompt

  return NextResponse.redirect(redirectUrl)
}
