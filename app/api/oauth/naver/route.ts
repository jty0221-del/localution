import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID || ''
  const callbackUrl = process.env.NAVER_CALLBACK_URL || 'https://www.localution.co.kr/api/oauth/naver/callback'
  const state = Math.random().toString(36).slice(2)
  const redirectUrl = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(callbackUrl) + '&state=' + state
  return NextResponse.redirect(redirectUrl)
}
