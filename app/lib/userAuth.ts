// app/lib/userAuth.ts
// ============================================================
// 일반 로그인 사용자 인증 (관리자 전용이 아닌 사용자별 리소스용)
//   · localution_user (OAuth) 쿠키 우선
//   · Authorization: Bearer <token> 또는 sb-*-auth-token 쿠키 폴백
//   · adminAuth.ts 와 쿠키/토큰 해석 로직 공유 (사실상 same pattern)
// ============================================================
import { cookies, headers } from 'next/headers'
import { createServiceClient } from './adminAuth'

export type UserResult =
  | { ok: true; userId: string; email: string | null; source: 'localution' | 'supabase' }
  | { ok: false; status: number; message: string }

type LocalutionUser = {
  id?: string
  email?: string
  provider?: string
}

async function readLocalutionUser(): Promise<LocalutionUser | null> {
  try {
    const store = await cookies()
    const raw = store.get('localution_user')?.value
    if (!raw) return null
    let decoded = raw
    try { decoded = decodeURIComponent(raw) } catch {}
    return JSON.parse(decoded) as LocalutionUser
  } catch {
    return null
  }
}

async function extractAccessToken(): Promise<string | null> {
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

/**
 * 현재 로그인된 사용자의 Supabase user_id 를 반환한다.
 * 관리자 화이트리스트 검사는 하지 않음 (사용자별 리소스 접근에 사용).
 */
export async function requireUser(): Promise<UserResult> {
  // 1) localution_user (OAuth) 우선
  const lu = await readLocalutionUser()
  if (lu?.id) {
    return {
      ok: true,
      userId: lu.id,
      email: lu.email?.toLowerCase() ?? null,
      source: 'localution',
    }
  }

  // 2) Supabase 토큰
  const token = await extractAccessToken()
  if (!token) return { ok: false, status: 401, message: '로그인이 필요합니다.' }

  try {
    const svc = createServiceClient()
    const { data, error } = await svc.auth.getUser(token)
    if (error || !data?.user?.id) {
      return { ok: false, status: 401, message: '토큰 검증 실패' }
    }
    return {
      ok: true,
      userId: data.user.id,
      email: data.user.email?.toLowerCase() ?? null,
      source: 'supabase',
    }
  } catch (e) {
    return {
      ok: false,
      status: 500,
      message: e instanceof Error ? e.message : 'auth check failed',
    }
  }
}
