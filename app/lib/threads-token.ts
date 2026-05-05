// app/lib/threads-token.ts
// ============================================================
// Threads 액세스 토큰 저장/로드/갱신
//   · platform_credentials 테이블 사용 (platform = 'threads')
//   · 이미 존재하는 테이블 + encryptSecret 재활용 → 새 테이블 불필요
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { encryptSecret, decryptSecret } from './crypto-utils'

const THREADS_PLATFORM = 'threads'

// ─────────────────────────────────────────────
// 토큰 로드
// ─────────────────────────────────────────────
export async function loadThreadsToken(
  svc: SupabaseClient,
  _userId?: string,
): Promise<{ access_token: string; threads_user_id: string; username: string | null } | null> {
  const { data, error } = await svc
    .from('platform_credentials')
    .select('account_id, platform_store_name, extra_data, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag')
    .eq('platform', THREADS_PLATFORM)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  try {
    const access_token = decryptSecret({
      ciphertext:     data.password_encrypted,
      iv:             data.password_iv,
      tag:            data.password_tag,
      dek_ciphertext: data.dek_encrypted,
      dek_iv:         data.dek_iv,
      dek_tag:        data.dek_tag,
    })
    return {
      access_token,
      threads_user_id: data.account_id,
      username: data.platform_store_name ?? null,
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────
// 토큰 저장
// ─────────────────────────────────────────────
export async function saveThreadsToken(
  svc: SupabaseClient,
  userId: string,
  opts: {
    threads_user_id: string
    username: string
    access_token: string
    expires_in: number
  },
): Promise<void> {
  const enc = encryptSecret(opts.access_token)
  const expiresAt = new Date(Date.now() + opts.expires_in * 1000)

  const { error } = await svc
    .from('platform_credentials')
    .upsert({
      user_id:            userId,
      platform:           THREADS_PLATFORM,
      account_id:         opts.threads_user_id,
      password_encrypted: enc.ciphertext,
      password_iv:        enc.iv,
      password_tag:       enc.tag,
      dek_encrypted:      enc.dek_ciphertext,
      dek_iv:             enc.dek_iv,
      dek_tag:            enc.dek_tag,
      platform_store_name: opts.username,
      extra_data: {
        threads_user_id: opts.threads_user_id,
        expires_at:      expiresAt.toISOString(),
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

  if (error) {
    throw new Error(`platform_credentials(threads) 저장 실패: ${error.message}`)
  }
}

// ─────────────────────────────────────────────
// 만료 7일 전이면 갱신
// ─────────────────────────────────────────────
export async function refreshThreadsTokenIfNeeded(
  svc: SupabaseClient,
  _userId?: string,
): Promise<void> {
  const { data } = await svc
    .from('platform_credentials')
    .select('id, extra_data, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag')
    .eq('platform', THREADS_PLATFORM)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return

  const expiresAt = data.extra_data?.expires_at ? new Date(data.extra_data.expires_at) : null
  if (!expiresAt) return

  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (expiresAt > sevenDaysLater) return

  let currentToken: string
  try {
    currentToken = decryptSecret({
      ciphertext:     data.password_encrypted,
      iv:             data.password_iv,
      tag:            data.password_tag,
      dek_ciphertext: data.dek_encrypted,
      dek_iv:         data.dek_iv,
      dek_tag:        data.dek_tag,
    })
  } catch {
    return
  }

  try {
    const url = new URL('https://graph.threads.net/refresh_access_token')
    url.searchParams.set('grant_type', 'th_refresh_token')
    url.searchParams.set('access_token', currentToken)

    const res = await fetch(url.toString())
    if (!res.ok) return

    const json = await res.json() as { access_token?: string; expires_in?: number }
    if (!json.access_token) return

    const enc = encryptSecret(json.access_token)
    const newExpiresAt = new Date(Date.now() + (json.expires_in ?? 5184000) * 1000)

    await svc
      .from('platform_credentials')
      .update({
        password_encrypted: enc.ciphertext,
        password_iv:        enc.iv,
        password_tag:       enc.tag,
        dek_encrypted:      enc.dek_ciphertext,
        dek_iv:             enc.dek_iv,
        dek_tag:            enc.dek_tag,
        extra_data: { ...(data.extra_data ?? {}), expires_at: newExpiresAt.toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
  } catch {
    // best-effort
  }
}
