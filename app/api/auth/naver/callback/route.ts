import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
  }

  try {
    // ✅ 1. 네이버 액세스 토큰 발급
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        state: state || '',
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_token`);
    }

    // ✅ 2. 네이버 사용자 정보 조회
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = await userRes.json();
    const naverUser = userData.response;

    if (!naverUser) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_user`);
    }

    // ✅ 3. Supabase에 사용자 저장/로그인
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const email = naverUser.email || `naver_${naverUser.id}@localution.kr`;
    const password = `naver_${naverUser.id}_${process.env.NAVER_CLIENT_SECRET?.slice(0, 8)}`;

    // 기존 유저 로그인 시도
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // 없으면 회원가입
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            naver_id: naverUser.id,
            name: naverUser.name,
            nickname: naverUser.nickname,
            profile_image: naverUser.profile_image,
            naver_email: naverUser.email,
          }
        }
      });

      if (signUpError) {
        return NextResponse.redirect(`${baseUrl}/login?error=signup_failed`);
      }
    }

    // ✅ 4. stores 테이블에 매장 없으면 자동 생성
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('naver_id', naverUser.id)
      .maybeSingle();

    if (!existingStore) {
      await supabase.from('stores').insert({
        name: naverUser.name ? `${naverUser.name}의 매장` : '내 매장',
        naver_id: naverUser.id,
        main_keyword: '',
        sub_keywords: [],
        tone: 'friendly',
        reward_enabled: true,
        reward_text: '로컬루션 포인트 2,000P',
        cover_color: 'from-orange-400 via-pink-400 to-violet-500',
      });
    }

    return NextResponse.redirect(`${baseUrl}/`);

  } catch (err) {
    console.error('네이버 로그인 에러:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=server_error`);
  }
}
