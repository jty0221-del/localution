export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const baseUrl = 'https://localution-6sv7.vercel.app';

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { Location: baseUrl + '/login?error=no_code' }
    });
  }

  try {
    const clientId = 'rejEL_xQza4IM6c6DsaY';
    const clientSecret = process.env.NAVER_CLIENT_SECRET || '';

    const body = 'grant_type=authorization_code' +
      '&client_id=' + clientId +
      '&client_secret=' + clientSecret +
      '&code=' + code +
      '&state=' + (state || '');

    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response(null, {
        status: 302,
        headers: { Location: baseUrl + '/login?error=no_token' }
      });
    }

    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });

    const userData = await userRes.json();
    const naverUser = userData.response;

    if (!naverUser) {
      return new Response(null, {
        status: 302,
        headers: { Location: baseUrl + '/login?error=no_user' }
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
        Location: baseUrl + '/',
        'Set-Cookie': 'localution_user=' + userInfo + '; Path=/; Max-Age=604800; SameSite=Lax; Secure'
      }
    });

  } catch (err) {
    return new Response(null, {
      status: 302,
      headers: { Location: baseUrl + '/login?error=exception' }
    });
  }
}
