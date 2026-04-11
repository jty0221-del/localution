import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = 'https://localution-6sv7.vercel.app';

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
  }

  try {
    const clientId = process.env.NAVER_CLIENT_ID || '';
    const clientSecret = process.env.NAVER_CLIENT_SECRET || '';

    // 네이버 토큰 발급
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`
    );
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_token`);
    }

    // 네이버 사용자 정보
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    const naverUser = userData.response;

    if (!naverUser) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_user`);
    }

    const userInfo = encodeURIComponent(JSON.stringify({
      id: naverUser.id,
      name: naverUser.name || '사장님',
      email: naverUser.email || '',
    }));

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.cookies.set('localution_user', userInfo, {
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });

    return response;

  } catch {
    return NextResponse.redirect(`${baseUrl}/login?error=server_error`);
  }
}
