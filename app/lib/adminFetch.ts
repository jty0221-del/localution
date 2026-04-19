'use client'

import { supabase } from './supabase'

// 관리자 API fetch — 현재 세션의 access_token 을 Authorization 헤더로 전달
// 서버 측 requireAdmin() 이 이 헤더를 1순위로 파싱
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers, cache: 'no-store' })
}
