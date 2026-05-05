import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Supabase Email Confirmation Callback Handler
 *
 * This route handles the email confirmation flow from Supabase Auth.
 * When a user clicks the confirmation link in their email, they are redirected here
 * with a 'code' parameter that needs to be exchanged for a session.
 */
export async function GET(request: NextRequest) {
 const url = new URL(request.url);
 const code = url.searchParams.get('code');

 // Determine base URL for redirects
 const baseUrl =
 process.env.NEXT_PUBLIC_BASE_URL ||
 `${url.protocol}//${url.host}`;

 // Redirect to error page if no code is provided
 if (!code) {
 return NextResponse.redirect(
 new URL('/login?error=invalid_callback', baseUrl)
 );
 }

 try {
 // Create Supabase server client
 const cookieStore = await cookies();

 const supabase = createServerClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

 // Exchange the code for a session
 const { data, error } = await supabase.auth.exchangeCodeForSession(code);

 if (error || !data.session) {
 console.error('Session exchange error:', error);
 return NextResponse.redirect(
 new URL('/login?error=session_exchange_failed', baseUrl)
 );
 }

 // Create the response with redirect to home page
 const response = NextResponse.redirect(new URL('/', baseUrl));

 // The cookies should be automatically set by the Supabase client
 // through the setAll callback, but we can ensure they're set properly here if needed

 return response;
 } catch (error) {
 console.error('Email callback error:', error);
 const baseUrl =
 process.env.NEXT_PUBLIC_BASE_URL ||
 `${new URL(request.url).protocol}//${new URL(request.url).host}`;
 return NextResponse.redirect(
 new URL('/login?error=exception', baseUrl)
 );
 }
}
