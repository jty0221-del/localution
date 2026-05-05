// app/api/oauth/threads/callback/route.ts
// Threads OAuth 콜백 — 코드 교환 → 장기 토큰 → DB 저장
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/app/lib/adminAuth'
import { saveThreadsToken } from '@/app/lib/threads-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_EMAIL = 'jty0221@gmail.com'

// threads_accounts 테이블이 없거나 컬럼이 다를 경우 자동 보정
async function ensureThreadsAccountsTable(svc: ReturnType<typeof createServiceClient>) {
  // SELECT 1 row — 실패하면 테이블 없거나 컬럼 불일치
  const { error } = await svc
    .from('threads_accounts')
    .select('id, token_encrypted, dek_encrypted')
    .limit(1)

  if (!error) return  // 테이블 + 컬럼 정상

  // Supabase management API로 SQL 실행 (service_role 필요)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const projectRef  = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1]

  if (!projectRef) return

  const sql = `
    CREATE TABLE IF NOT EXISTS public.threads_accounts (
      id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id          TEXT NOT NULL,
      threads_user_id  TEXT NOT NULL,
      username         TEXT,
      token_encrypted  TEXT NOT NULL,
      token_iv         TEXT NOT NULL,
      token_tag        TEXT NOT NULL,
      dek_encrypted    TEXT NOT NULL,
      dek_iv           TEXT NOT NULL,
      dek_tag          TEXT NOT NULL,
      expires_at       TIMESTAMPTZ NOT NULL,
      refreshed_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      UNIQUE(user_id)
    );
    ALTER TABLE public.threads_accounts ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      CREATE POLICY "service_full_threads_accounts" ON public.threads_accounts
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `

  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  }).catch(() => {})
}

async function getOwnerUserId(svc: ReturnType<typeof createServiceClient>): Promise<string> {
  const { data } = await svc
    .from('stores')
    .select('user_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.user_id || OWNER_EMAIL
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/marketing/threads?error=denied', origin))
  }

  // CSRF 검증
  const cookieStore = await cookies()
  const storedState = cookieStore.get('threads_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/marketing/threads?error=csrf', origin))
  }
  cookieStore.delete('threads_oauth_state')

  const appId = process.env.THREADS_APP_ID!
  const appSecret = process.env.THREADS_APP_SECRET!
  const callbackUrl = process.env.THREADS_CALLBACK_URL!

  try {
    const svc = createServiceClient()
    const userId = await getOwnerUserId(svc)

    // 1) 단기 토큰 교환
    const tokenForm = new URLSearchParams()
    tokenForm.set('client_id', appId)
    tokenForm.set('client_secret', appSecret)
    tokenForm.set('grant_type', 'authorization_code')
    tokenForm.set('redirect_uri', callbackUrl)
    tokenForm.set('code', code)

    const shortRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenForm.toString(),
    })
    const shortData = await shortRes.json() as { access_token?: string; error_message?: string }
    if (!shortData.access_token) {
      console.error('[threads-callback] short token error:', shortData)
      return NextResponse.redirect(new URL('/marketing/threads?error=token_failed', origin))
    }

    // 2) 장기 토큰 교환 (60일)
    const longUrl = new URL('https://graph.threads.net/access_token')
    longUrl.searchParams.set('grant_type', 'th_exchange_token')
    longUrl.searchParams.set('client_secret', appSecret)
    longUrl.searchParams.set('access_token', shortData.access_token)

    const longRes = await fetch(longUrl.toString())
    const longData = await longRes.json() as { access_token?: string; expires_in?: number }
    if (!longData.access_token) {
      console.error('[threads-callback] long token error:', longData)
      return NextResponse.redirect(new URL('/marketing/threads?error=longtoken_failed', origin))
    }

    // 3) 유저 정보 조회
    const meUrl = new URL('https://graph.threads.net/v1.0/me')
    meUrl.searchParams.set('fields', 'id,username')
    meUrl.searchParams.set('access_token', longData.access_token)

    const meRes = await fetch(meUrl.toString())
    const meData = await meRes.json() as { id?: string; username?: string }
    if (!meData.id) {
      console.error('[threads-callback] me error:', meData)
      return NextResponse.redirect(new URL('/marketing/threads?error=profile_failed', origin))
    }

    // 4) 테이블 없으면 자동 생성 시도
    await ensureThreadsAccountsTable(svc)

    // 5) 토큰 암호화 저장
    await saveThreadsToken(svc, userId, {
      threads_user_id: meData.id,
      username: meData.username ?? '',
      access_token: longData.access_token,
      expires_in: longData.expires_in ?? 5184000,
    })

    return NextResponse.redirect(new URL('/marketing/threads?connected=1', origin))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[threads-callback] error:', msg)
    const url = new URL('/marketing/threads', origin)
    url.searchParams.set('error', 'server_error')
    url.searchParams.set('detail', msg.slice(0, 200))
    return NextResponse.redirect(url.toString())
  }
}
