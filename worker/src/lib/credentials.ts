// worker/src/lib/credentials.ts
// ============================================================
// 32차-1 · platform_credentials 조회 + 복호화
// 43차   · loadCookieData 추가 (naver_session_cookies 테이블)
// 44차   · session_cookies 타입 필드 추가 (naver.ts 호환)
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
  session_cookies?: unknown[] | null
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
    session_cookies: null,
  }
}

export async function loadCookieData(
  svc: SupabaseClient,
  userId: string,
): Promise<string | null> {
  // ── 1순위: platform_credentials.extra_data.naver_session_cookie ──
  // Worker가 확실히 접근 가능한 테이블 (platform_reviews 업데이트 성공으로 확인)
  try {
    const { data: cred, error: credErr } = await svc
      .from('platform_credentials')
      .select('extra_data')
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .maybeSingle()

    const cookieJson = (cred?.extra_data as any)?.naver_session_cookie
    console.log('[loadCookieData] platform_credentials check', {
      userId: userId.slice(0, 12),
      hasCred: !!cred,
      hasCookieInExtra: !!cookieJson,
      credErr: credErr?.message,
    })

    if (cookieJson && typeof cookieJson === 'string') {
      console.log('[loadCookieData] using cookie from platform_credentials.extra_data')
      return cookieJson
    }
  } catch (e: any) {
    console.warn('[loadCookieData] platform_credentials check failed:', e?.message)
  }

  // ── 2순위: naver_session_cookies 테이블 (구버전 호환) ──
  try {
    const supabaseUrl = (process.env.SUPABASE_URL || '').slice(0, 40)
    const { data, error } = await svc
      .from('naver_session_cookies')
      .select('cookie_enc, cookie_iv, cookie_tag')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('[loadCookieData] naver_session_cookies check', {
      supabaseUrl, userId: userId.slice(0, 12), hasData: !!data, error: error?.message,
    })

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
