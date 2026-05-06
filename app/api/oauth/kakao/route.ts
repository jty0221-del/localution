import { NextResponse } from 'next/server'

// Kakao OAuth start
//   ?reset=1 → prompt=login (다시 로그인 화면)
//   ?reset=select → prompt=select_account (계정 선택)
export async function GET(request: Request) {
  const url = new URL(request.url)
  const baseUrl = url.origin
  const restApiKey = process.env.KAKAO_REST_API_KEY || ''
  const redirectUri = process.env.KAKAO_CALLBACK_URL || (baseUrl + '/api/oauth/kakao/callback')

  const reset = url.searchParams.get('reset')
  let extra = ''
  if (reset === '1') extra = '&prompt=login'
  else if (reset === 'select') extra = '&prompt=select_account'

  const redirectUrl =
    'https://kauth.kakao.com/oauth/authorize'
    + '?client_id=' + restApiKey
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&response_type=code'
    + extra

  return NextResponse.redirect(redirectUrl)
}
