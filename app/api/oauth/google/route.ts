import { NextResponse } from 'next/server'

export async function GET(request: Request) {
 const baseUrl = new URL(request.url).origin
 const clientId = process.env.GOOGLE_CLIENT_ID || ''
 const redirectUri = process.env.GOOGLE_CALLBACK_URL || (baseUrl + '/api/oauth/google/callback')
 const scopes = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')
 const redirectUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=code&scope=' + scopes + '&access_type=offline&prompt=consent'
 return NextResponse.redirect(redirectUrl)
}
