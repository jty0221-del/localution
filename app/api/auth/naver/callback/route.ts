export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { Location: 'https://localution-6sv7.vercel.app/login?error=no_code' }
    });
  }

  try {
    const clientId = 'rejEL_xQza4IM6c6DsaY';
    const clientSecret = process.env.NAVER_CLIENT_SECRET ?? '';

    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${encodeURIComponent(clientSecret)}&code=${code}&state=${state ?? ''}`,
      { method: 'GET' }
    );

    const tokenData = await tokenRes.json() as Record<string, string>;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      const msg = encodeURIComponent(tokenData.error_description || tokenData.error || 'no_token');
      return new Response(null, {
        status: 302,
        headers: { Location: `https://localution-6sv7.vercel.app/login?error=no_token&msg=${msg}` }
      });
    }

    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = await userRes.json() as { response?: Record<string, string> };
    const naverUser = userData.response;

    if (!naverUser) {
      return new Response(null, {
        status: 302,
        headers: { Location: 'https://localution-6sv7.vercel.app/login?error=no_user' }
      });
    }

    const userInfo = encodeURIComponent(JSON.stringify({
      id: naverUser.id,
      name: naverUser.name || '사장님',
      email: naverUser.email || '',
    }));

    return new Response(null, {
      status: 302,
      headers: {
        Location: 'https://localution-6sv7.vercel.app/',
        'Set-Cookie': `localution_user=${userInfo}; Path=/; Max-Age=604800; SameSite=Lax; Secure`
      }
    });

  } catch (err: unknown) {
    const msg = encodeURIComponent(String(err).slice(0, 100));
    return new Response(null, {
      status: 302,
      headers: { Location: `https://localution-6sv7.vercel.app/login?error=exception&msg=${msg}` }
    });
  }
}
