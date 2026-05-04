// worker/src/lib/threads-token.ts
// ============================================================
// Worker 전용 Threads 토큰 로드/갱신
//   · 단일 사용자 앱 — user_id 필터 없이 최신 행 조회
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret, encryptSecret } from './crypto'

type TokenRow = {
  id: string
  token_encrypted: string
  token_iv: string
  token_tag: string
  dek_encrypted: string
  dek_iv: string
  dek_tag: string
}

function decryptToken(row: TokenRow): string {
  return decryptSecret({
    ciphertext:     row.token_encrypted,
    iv:             row.token_iv,
    tag:            row.token_tag,
    dek_ciphertext: row.dek_encrypted,
    dek_iv:         row.dek_iv,
    dek_tag:        row.dek_tag,
  })
}

export async function loadThreadsToken(
  svc: SupabaseClient,
  _userId?: string,
): Promise<{ access_token: string; threads_user_id: string } | null> {
  const { data, error } = await svc
    .from('threads_accounts')
    .select('id, threads_user_id, token_encrypted, token_iv, token_tag, dek_encrypted, dek_iv, dek_tag')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  try {
    const access_token = decryptToken(data as TokenRow)
    return { access_token, threads_user_id: data.threads_user_id }
  } catch {
    return null
  }
}

export async function refreshThreadsTokenIfNeeded(
  svc: SupabaseClient,
  _userId?: string,
): Promise<void> {
  const { data } = await svc
    .from('threads_accounts')
    .select('id, expires_at, token_encrypted, token_iv, token_tag, dek_encrypted, dek_iv, dek_tag')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return

  const expiresAt = new Date(data.expires_at)
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (expiresAt > sevenDaysLater) return

  let currentToken: string
  try {
    currentToken = decryptToken(data as TokenRow)
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

    const p = encryptSecret(json.access_token)
    const newExpiresAt = new Date(Date.now() + (json.expires_in ?? 5184000) * 1000)

    await svc
      .from('threads_accounts')
      .update({
        token_encrypted: p.ciphertext,
        token_iv:        p.iv,
        token_tag:       p.tag,
        dek_encrypted:   p.dek_ciphertext,
        dek_iv:          p.dek_iv,
        dek_tag:         p.dek_tag,
        expires_at:   newExpiresAt.toISOString(),
        refreshed_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', data.id)
  } catch {
    // best-effort
  }
}
