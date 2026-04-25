// worker/src/lib/credentials.ts
// ============================================================
// 32차-1 · platform_credentials 조회 + 복호화
// 43차   · loadCookieData 추가 (naver_session_cookies 테이블)
// ============================================================
import { createDecipheriv } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from './crypto'
import type { Platform } from '../jobs'

export type PlainCredentials = {
  account_id: string
  password: string
  platform_store_id: string | null
  platform_store_name: string | null
}

export async function loadPlainCredentials(
  svc: SupabaseClient,
  userId: string,
  platform: Platform,
): Promise<PlainCredentials> {
  const { data, error } = await svc
    .from('platform_credentials')
    .select(
      'account_id, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag, platform_store_id, platform_store_name'
    )
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle()

  if (error) throw new Error(`credentials query: ${error.message}`)
  if (!data) throw new Error(`credentials not_connected (userId=${userId}, platform=${platform})`)

  const password = decryptSecret({
    ciphertext: data.password_encrypted,
    iv: data.password_iv,
    tag: data.password_tag,
    dek_ciphertext: data.dek_encrypted,
    dek_iv: data.dek_iv,
    dek_tag: data.dek_tag,
  })

  return {
    account_id: data.account_id,
    password,
    platform_store_id: data.platform_store_id ?? null,
    platform_store_name: data.platform_store_name ?? null,
  }
}

export async function loadCookieData(
  svc: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await svc
      .from('naver_session_cookies')
      .select('cookie_enc, cookie_iv, cookie_tag')
      .eq('user_id', userId)
      .maybeSingle()

    if (!data?.cookie_enc) return null

    const raw = process.env.ENCRYPTION_KEK_HEX || ''
    const hex = raw.replace(/\s+/g, '')
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null
    const kek = Buffer.from(hex, 'hex')

    const decipher = createDecipheriv('aes-256-gcm', kek, Buffer.from(data.cookie_iv, 'base64'))
    decipher.setAuthTag(Buffer.from(data.cookie_tag, 'base64'))
    const dec = Buffer.concat([
      decipher.update(Buffer.from(data.cookie_enc, 'base64')),
      decipher.final(),
    ])
    return dec.toString('utf-8')
  } catch {
    return null
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
