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
    // ✅ 1. 네이버 액세스 토큰 발급
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}`,
      {
        method: 'GET',
        headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID || '', 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET || '' },
      }
    );

    const tokenData = await tokenRes.json();
    console.log('Token Data:', tokenData);

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('토큰 발급 실패:', tokenData);
      return NextResponse.redirect(`${baseUrl}/login?error=no_token`);
    }

    // ✅ 2. 네이버 사용자 정보 조회
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID || '',
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET || '',
      },
    });

    const userData = await userRes.json();
    console.log('User Data:', userData);

    const naverUser = userData.response;

    if (!naverUser) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_user`);
    }

    // ✅ 3. 세션 쿠키에 사용자 정보 저장 (Supabase 없이 임시)
    const userInfo = encodeURIComponent(JSON.stringify({
      id: naverUser.id,
      name: naverUser.name || naverUser.nickname || '사장님',
      email: naverUser.email || '',
      profileImage: naverUser.profile_image || '',
    }));

    const response = NextResponse.redirect(`${baseUrl}/`);
    response.cookies.set('localution_user', userInfo, {
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
      httpOnly: false,
    });

    return response;

  } catch (err) {
    console.error('콜백 에러:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=server_error`);
  }
}
