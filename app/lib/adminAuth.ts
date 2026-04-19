import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 관리자 허용 이메일
export const ADMIN_EMAILS = ['jty0221@gmail.com']

// 서비스 롤 클라이언트 (RLS 우회 — 절대 클라이언트 번들에 노출 금지)
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// 현재 요청자가 관리자인지 확인 — Supabase 의 auth 쿠키에서 토큰 추출 후 서비스 롤로 검증
export async function requireAdmin(): Promise<{ ok: true; email: string } | { ok: false; status: number; message: string }> {
  try {
    const cookieStore = await cookies()
    // Supabase 는 sb-<project-ref>-auth-token 이름으로 쿠키를 저장
    const cookieList = cookieStore.getAll()
    const authCookie = cookieList.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    if (!authCookie) return { ok: false, status: 401, message: 'not authenticated' }

    // base64 로 감싸진 JSON — 파싱해서 access_token 추출
    let accessToken: string | null = null
    try {
      const raw = authCookie.value.startsWith('base64-')
        ? Buffer.from(authCookie.value.slice(7), 'base64').toString('utf-8')
        : decodeURIComponent(authCookie.value)
      const parsed = JSON.parse(raw)
      accessToken = parsed?.access_token ?? parsed?.[0] ?? null
    } catch {
      accessToken = null
    }
    if (!accessToken) return { ok: false, status: 401, message: 'invalid auth cookie' }

    const svc = createServiceClient()
    const { data, error } = await svc.auth.getUser(accessToken)
    if (error || !data?.user?.email) return { ok: false, status: 401, message: 'token verification failed' }

    const email = data.user.email.toLowerCase()
    if (!ADMIN_EMAILS.includes(email)) return { ok: false, status: 403, message: 'not an admin' }

    return { ok: true, email }
  } catch (e) {
    return { ok: false, status: 500, message: e instanceof Error ? e.message : 'admin check failed' }
  }
}
