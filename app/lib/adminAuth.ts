// app/lib/adminAuth.ts
// ============================================================
// 관리자 인증 — 듀얼모드
//   1순위: localution_user 쿠키 (NextAuth OAuth — 네이버/카카오/구글)
//   2순위: Authorization: Bearer <token> (Supabase)
//   3순위: sb-*-auth-token 쿠키 (Supabase 브라우저 세션)
// ============================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

// 관리자 이메일 화이트리스트
//   · OAuth provider(네이버/카카오/구글) 마다 다른 email 을 내려주므로 여러 개 등록
//   · 배포 후 /whoami 에서 실제로 내려오는 email 을 확인하고 갱신
//   · 프로덕션은 env ADMIN_EMAILS (쉼표 구분) 로도 추가 가능
const STATIC_ADMIN_EMAILS = [
  'jty0221@gmail.com',
  'jty0221@naver.com',
  'halang@localution.co.kr',
  'admin@localution.co.kr',
]
const envList = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)
export const ADMIN_EMAILS = Array.from(new Set([...STATIC_ADMIN_EMAILS, ...envList]))

// ------------------------------------------------------------
// Service role client (RLS 우회 — Node runtime 전용)
// ------------------------------------------------------------
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ------------------------------------------------------------
// localution_user 쿠키 파싱 (NextAuth OAuth payload)
// ------------------------------------------------------------
type LocalutionUser = {
  id?: string
  name?: string
  email?: string
  provider?: string
  profile_image?: string
  access_token?: string
}

async function readLocalutionUser(): Promise<LocalutionUser | null> {
  try {
    const store = await cookies()
    const raw = store.get('localution_user')?.value
    if (!raw) return null
    let decoded = raw
    try { decoded = decodeURIComponent(raw) } catch {}
    const parsed = JSON.parse(decoded) as LocalutionUser
    return parsed ?? null
  } catch {
    return null
  }
}

// ------------------------------------------------------------
// Supabase access_token 추출 — Authorization 헤더 또는 쿠키
// ------------------------------------------------------------
async function extractSupabaseAccessToken(): Promise<string | null> {
  try {
    const hdrs = await headers()
    const auth = hdrs.get('authorization') ?? hdrs.get('Authorization')
    if (auth && /^Bearer\s+/i.test(auth)) {
      return auth.replace(/^Bearer\s+/i, '').trim()
    }
  } catch {}

  try {
    const cookieStore = await cookies()
    const all = cookieStore.getAll()
    const authCookie = all.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    if (!authCookie) return null

    let raw = authCookie.value
    if (raw.startsWith('base64-')) {
      try { raw = Buffer.from(raw.slice(7), 'base64').toString('utf-8') } catch {}
    } else {
      try { raw = decodeURIComponent(raw) } catch {}
    }

    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return null }

    if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0]
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

// ------------------------------------------------------------
// requireAdmin
// ------------------------------------------------------------
export type AdminResult =
  | { ok: true;  email: string; userId: string | null; source: 'localution' | 'supabase' }
  | { ok: false; status: number; message: string }

export async function requireAdmin(): Promise<AdminResult> {
  // 1) localution_user (OAuth) 우선
  const lu = await readLocalutionUser()
  const luEmail = (lu?.email || '').toLowerCase().trim()
  if (luEmail) {
    if (ADMIN_EMAILS.includes(luEmail)) {
      return { ok: true, email: luEmail, userId: lu?.id ?? null, source: 'localution' }
    }
    // OAuth 로 로그인했으나 관리자 화이트리스트 아님 → 거부 (Supabase 로 폴백하지 않음)
    return { ok: false, status: 403, message: '관리자 권한이 없습니다.' }
  }

  // 2) Supabase
  const token = await extractSupabaseAccessToken()
  if (!token) return { ok: false, status: 401, message: '로그인이 필요합니다.' }

  try {
    const svc = createServiceClient()
    const { data, error } = await svc.auth.getUser(token)
    if (error || !data?.user?.email) {
      return { ok: false, status: 401, message: '토큰 검증 실패' }
    }
    const email = data.user.email.toLowerCase()
    if (!ADMIN_EMAILS.includes(email)) {
      return { ok: false, status: 403, message: '관리자 권한이 없습니다.' }
    }
    return { ok: true, email, userId: data.user.id, source: 'supabase' }
  } catch (e) {
    return { ok: false, status: 500, message: e instanceof Error ? e.message : 'admin check failed' }
  }
}
