import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = 'https://localution-6sv7.vercel.app';

  console.log('콜백 도착! code:', code, 'state:', state);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
  }

  try {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    console.log('Client ID 확인:', clientId?.slice(0, 4));

    // 네이버 토큰 발급
    const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    console.log('토큰 응답:', JSON.stringify(tokenData));

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_token&detail=${tokenData.error}`);
    }

    // 네이버 사용자 정보
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = await userRes.json();
    console.log('유저 데이터:', JSON.stringify(userData));

    const naverUser = userData.response;

    if (!naverUser) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_user`);
    }

    // 쿠키에 사용자 정보 저장
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
    });

    console.log('로그인 성공! 리다이렉트...');
    return response;

  } catch (err) {
    console.error('에러:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=server_error`);
  }
}
