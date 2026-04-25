// worker/src/lib/credentials.ts
// ============================================================
// 32차-1 · platform_credentials 조회 + 복호화
// 41차-15 · extra_data(session_cookies) 포함
// 43차-1 · session_cookies 도 KEK 암호화 (extra_data.session_cookies_encrypted)
//          구 평문 포맷(extra_data.session_cookies)도 fallback 으로 읽음
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret, type EncryptedPayload } from './crypto'
import type { Platform } from '../jobs'

export type PlainCredentials = {
  account_id: string
  password: string
  platform_store_id: string | null
  platform_store_name: string | null
  session_cookies: any[] | null   // 쿠키 주입용 (naver_place)
}

export async function loadPlainCredentials(
  svc: SupabaseClient,
  userId: string,
  platform: Platform,
): Promise<PlainCredentials> {
  const { data, error } = await svc
    .from('platform_credentials')
    .select(
      'account_id, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag, platform_store_id, platform_store_name, extra_data'
    )
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle()

  if (error) throw new Error(`credentials query: ${error.message}`)
  if (!data) throw new Error(`credentials not_connected (userId=${userId}, platform=${platform})`)

  // 쿠키 전용 계정은 password_encrypted 없을 수 있음 — 복호화 생략
  let password = ''
  if (data.password_encrypted) {
    try {
      password = decryptSecret({
        ciphertext: data.password_encrypted,
        iv: data.password_iv,
        tag: data.password_tag,
        dek_ciphertext: data.dek_encrypted,
        dek_iv: data.dek_iv,
        dek_tag: data.dek_tag,
      })
    } catch {
      // session_cookies 있으면 비밀번호 없어도 진행
    }
  }

  const extra = (data.extra_data as any) ?? {}
  let session_cookies: any[] | null = null
  const encCookies = extra.session_cookies_encrypted as EncryptedPayload | undefined
  if (encCookies && encCookies.ciphertext && encCookies.dek_ciphertext) {
    try {
      const json = decryptSecret(encCookies)
      const parsed = JSON.parse(json)
      if (Array.isArray(parsed)) session_cookies = parsed
    } catch {
      // 복호화 실패 → 쿠키 없는 것으로 처리 (호출부가 폼 로그인으로 fallback)
    }
  } else if (Array.isArray(extra.session_cookies)) {
    // 구 평문 포맷 — 다음 저장 시 자동으로 암호화 포맷으로 마이그레이션됨
    session_cookies = extra.session_cookies
  }

  return {
    account_id: data.account_id ?? '',
    password,
    platform_store_id: data.platform_store_id ?? null,
    platform_store_name: data.platform_store_name ?? null,
    session_cookies,
  }
}

export async function markLoginStatus(
  svc: SupabaseClient,
  userId: string,
  platform: Platform,
  status: 'success' | 'failed' | 'captcha',
  note?: string,
): Promise<void> {
  try {
    await svc
      .from('platform_credentials')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_status: status + (note ? `:${note.slice(0, 80)}` : ''),
      })
      .eq('user_id', userId)
      .eq('platform', platform)
  } catch {
    // best-effort
  }
}
