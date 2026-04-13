import { createServerClient, CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Determine base URL for redirects
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${url.protocol}//${url.host}`;

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code', baseUrl)
    );
  }

  try {
    // Step 1: Exchange code for Naver access token
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || 'rejEL_xQza4IM6c6DsaY';
    const clientSecret = process.env.NAVER_CLIENT_SECRET || '';

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      state: state || '',
    });

    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/login?error=no_token', baseUrl)
      );
    }

    // Step 2: Get user profile from Naver API
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = await userRes.json();
    const naverUser = userData.response;

    if (!naverUser || !naverUser.id) {
      return NextResponse.redirect(
        new URL('/login?error=no_user', baseUrl)
      );
    }

    // Step 3: Create Supabase server client with cookie management
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Handle errors in Next.js middleware/API context
              console.error('Error setting cookies:', error);
            }
          },
        },
      }
    );

    // Step 4: Try to find existing user by Naver ID
    // We'll use email as the unique identifier in Supabase if available
    const userEmail = naverUser.email || `naver_${naverUser.id}@naver.example.com`;

    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserById(
      naverUser.id
    ).catch(() => ({ data: null, error: null }));

    // If user doesn't exist by Naver ID, check by email
    let user = existingUser;

    if (!user && naverUser.email) {
      const { data: userByEmail } = await supabase.auth.admin
        .listUsers()
        .then(({ data: users }) => ({
          data: users.users.find(u => u.email === naverUser.email),
        }))
        .catch(() => ({ data: null }));

      user = userByEmail;
    }

    // Step 5: Create user if doesn't exist, or update existing user
    if (!user) {
      // Create new user with Supabase Admin API
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: Math.random().toString(36).slice(-32), // Random password since this is OAuth
        email_confirm: true, // Auto-confirm since authenticated via Naver
        user_metadata: {
          naver_id: naverUser.id,
          name: naverUser.name || '사장님',
          profile_image: naverUser.profile_image || null,
        },
      });

      if (createError) {
        console.error('User creation error:', createError);
        return NextResponse.redirect(
          new URL('/login?error=user_creation_failed', baseUrl)
        );
      }

      user = newUser;
    } else {
      // Update user metadata with latest Naver info
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          naver_id: naverUser.id,
          name: naverUser.name || user.user_metadata?.name || '사장님',
          profile_image: naverUser.profile_image || user.user_metadata?.profile_image || null,
        },
      });
    }

    // Step 6: Create a session for the user
    if (user) {
      // We need to create a session. Since we're using the service role key (admin),
      // we can create a session directly. However, for a more standard OAuth flow,
      // we should create the user with the anon key and then redirect to a confirmation flow.
      // For now, we'll use a simplified approach by creating a session.

      const { data: session, error: sessionError } = await supabase.auth.admin.createSession({
        user_id: user.id,
      });

      if (sessionError || !session) {
        console.error('Session creation error:', sessionError);
        return NextResponse.redirect(
          new URL('/login?error=session_creation_failed', baseUrl)
        );
      }

      // Create response with redirect
      const response = NextResponse.redirect(new URL('/', baseUrl));

      // Set the Supabase auth cookies
      // The session contains access_token and refresh_token
      const setCookieOptions: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: session.expires_in || 3600,
      };

      // Set authentication cookies
      response.cookies.set(
        'sb-auth-token',
        session.access_token,
        {
          ...setCookieOptions,
          path: '/',
        }
      );

      if (session.refresh_token) {
        response.cookies.set(
          'sb-refresh-token',
          session.refresh_token,
          {
            ...setCookieOptions,
            path: '/',
            maxAge: 604800, // 7 days
          }
        );
      }

      return response;
    }

    return NextResponse.redirect(
      new URL('/login?error=user_not_found', baseUrl)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${new URL(request.url).protocol}//${new URL(request.url).host}`;
    return NextResponse.redirect(
      new URL('/login?error=exception', baseUrl)
    );
  }
}
