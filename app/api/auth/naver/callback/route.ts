import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = 'https://localution-6sv7.vercel.app';

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
  }

  try {
    const clientId = process.env.NAVER_CLIENT_ID ?? '';
    const clientSecret = process.env.NAVER_CLIENT_SECRET ?? '';

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_env`);
    }

    // ✅ 네이버 토큰 발급
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('code', code);
    tokenParams.append('state', state ?? '');

    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenParams,
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${baseUrl}/login?error=token_http_${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      const errMsg = encodeURIComponent(tokenData.error_description || tokenData.error || 'unknown');
      return NextResponse.redirect(`${baseUrl}/login?error=no_token&msg=${errMsg}`);
    }

    // ✅ 사용자 정보 조회
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${baseUrl}/login?error=user_http_${userRes.status}`);
    }

    const userData = await userRes.json();
    const naverUser = userData.response;

    if (!naverUser) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_user`);
    }

    // ✅ 쿠키 저장 후 메인으로
    const userInfo = encodeURIComponent(JSON.stringify({
      id: naverUser.id,
      name: naverUser.name || naverUser.nickname || '사장님',
      email: naverUser.email || '',
    }));

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.cookies.set('localution_user', userInfo, {
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: true,
    });

    return response;

  } catch (err: unknown) {
    const msg = encodeURIComponent(String(err).slice(0, 150));
    return NextResponse.redirect(`${baseUrl}/login?error=exception&msg=${msg}`);
  }
}
