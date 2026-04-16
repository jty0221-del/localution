import { NextResponse } from 'next/server'

export async function GET() {
  const restApiKey = process.env.KAKAO_REST_API_KEY || ''
  const redirectUri = process.env.KAKAO_CALLBACK_URL || 'https://www.localution.co.kr/api/oauth/kakao/callback'
  const redirectUrl = 'https://kauth.kakao.com/oauth/authorize?client_id=' + restApiKey + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=code'
  return NextResponse.redirect(redirectUrl)
}
