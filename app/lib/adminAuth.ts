import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

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

// ----------------------------------------------------------------
// access_token 추출 — Authorization 헤더 또는 Supabase 쿠키
// ----------------------------------------------------------------
async function extractAccessToken(): Promise<string | null> {
  // 1) Authorization: Bearer <token>  (권장 — 클라이언트에서 명시적으로 전달)
  try {
    const hdrs = await headers()
    const auth = hdrs.get('authorization') ?? hdrs.get('Authorization')
    if (auth && /^Bearer\s+/i.test(auth)) {
      return auth.replace(/^Bearer\s+/i, '').trim()
    }
  } catch {}

  // 2) Supabase 쿠키 (supabase-js 가 자동 저장) — 포맷 여러 개 대응
  try {
    const cookieStore = await cookies()
    const all = cookieStore.getAll()
    const authCookie = all.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    if (!authCookie) return null

    let raw = authCookie.value
    // 'base64-' prefix 제거
    if (raw.startsWith('base64-')) {
      try { raw = Buffer.from(raw.slice(7), 'base64').toString('utf-8') } catch { /* ignore */ }
    } else {
      try { raw = decodeURIComponent(raw) } catch {}
    }

    // 배열 ["access_token", "refresh_token", ...] 포맷 또는 객체 포맷
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return null }

    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return parsed[0]
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (typeof obj.access_token === 'string') return obj.access_token
      if (typeof obj.currentSession === 'object' && obj.currentSession) {
        const cs = obj.currentSession as Record<string, unknown>
        if (typeof cs.access_token === 'string') return cs.access_token
      }
    }
    return null
  } catch {
    return null
  }
}

// 관리자 권한 확인 — API 루트 상단에서 먼저 호출
export async function requireAdmin(): Promise<
  | { ok: true; email: string; userId: string }
  | { ok: false; status: number; message: string }
> {
  const token = await extractAccessToken()
  if (!token) return { ok: false, status: 401, message: 'not authenticated' }

  try {
    const svc = createServiceClient()
    const { data, error } = await svc.auth.getUser(token)
    if (error || !data?.user?.email) {
      return { ok: false, status: 401, message: 'token verification failed' }
    }
    const email = data.user.email.toLowerCase()
    if (!ADMIN_EMAILS.includes(email)) {
      return { ok: false, status: 403, message: 'not an admin' }
    }
    return { ok: true, email, userId: data.user.id }
  } catch (e) {
    return { ok: false, status: 500, message: e instanceof Error ? e.message : 'admin check failed' }
  }
}
