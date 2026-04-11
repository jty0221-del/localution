export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const baseUrl = 'https://localution-6sv7.vercel.app';

  if (!code) {
    return Response.redirect(`${baseUrl}/login?error=no_code`);
  }

  try {
    const clientId = process.env.NAVER_CLIENT_ID ?? '';
    const clientSecret = process.env.NAVER_CLIENT_SECRET ?? '';

    const body = `grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state ?? ''}`;

    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const tokenData = await tokenRes.json() as Record<string, string>;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      const e = encodeURIComponent(tokenData.error_description || tokenData.error || 'unknown');
      return Response.redirect(`${baseUrl}/login?error=no_token&msg=${e}`);
    }

    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userJson = await userRes.json() as { response?: Record<string, string> };
    const naverUser = userJson.response;

    if (!naverUser) {
      return Response.redirect(`${baseUrl}/login?error=no_user`);
    }

    const userInfo = encodeURIComponent(JSON.stringify({
      id: naverUser.id,
      name: naverUser.name || naverUser.nickname || '사장님',
      email: naverUser.email || '',
    }));

    const headers = new Headers();
    headers.set('Location', `${baseUrl}/`);
    headers.set('Set-Cookie', `localution_user=${userInfo}; Path=/; Max-Age=604800; SameSite=Lax; Secure`);

    return new Response(null, { status: 302, headers });

  } catch (err: unknown) {
    const msg = encodeURIComponent(String(err).slice(0, 100));
    return Response.redirect(`${baseUrl}/login?error=exception&msg=${msg}`);
  }
}
