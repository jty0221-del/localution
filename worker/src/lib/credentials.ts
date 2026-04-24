// worker/src/lib/credentials.ts
// ============================================================
// 32차-1 · platform_credentials 조회 + 복호화
// 41차-15 · extra_data(session_cookies) 포함
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from './crypto'
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

  return {
    account_id: data.account_id ?? '',
    password,
    platform_store_id: data.platform_store_id ?? null,
    platform_store_name: data.platform_store_name ?? null,
    session_cookies: (data.extra_data as any)?.session_cookies ?? null,
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
