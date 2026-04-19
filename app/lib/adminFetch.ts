'use client'

import { supabase } from './supabase'

// ------------------------------------------------------------
// adminFetch — 관리자 API 호출 전용 fetch 래퍼
//   - localution_session / localution_user 쿠키는 브라우저가 자동 포함 (same-origin)
//   - Supabase access_token 이 있으면 Authorization 헤더로도 추가 (듀얼모드 백업)
//   - cache: no-store 로 항상 최신 데이터
// ------------------------------------------------------------
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token: string | undefined
  try {
    const { data } = await supabase.auth.getSession()
    token = data?.session?.access_token
  } catch { /* NextAuth 단독 모드 */ }

  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  })
}
