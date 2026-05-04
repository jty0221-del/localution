// worker/src/lib/threads-token.ts
// ============================================================
// Worker 전용 Threads 토큰 로드/갱신
//   · SUPABASE_SERVICE_ROLE_KEY 파생 키 사용 (ENCRYPTION_KEK_HEX 불필요)
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

function getKek(): Buffer {
  const src = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!src) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createHash('sha256').update(src + ':localution:threads:kek:v1').digest()
}

type StoredRow = {
  id: string
  token_encrypted: string
  token_iv: string
  token_tag: string
  dek_encrypted: string
  dek_iv: string
  dek_tag: string
}

function decryptToken(row: StoredRow): string {
  const key = getKek()
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(row.token_iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(row.token_tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(row.token_encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

function encryptToken(plaintext: string): Omit<StoredRow, 'id'> {
  const key = getKek()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    token_encrypted: ciphertext.toString('base64'),
    token_iv:        iv.toString('base64'),
    token_tag:       tag.toString('base64'),
    dek_encrypted:   'v2:supabase_key',
    dek_iv:          'v2',
    dek_tag:         'v2',
  }
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
    const access_token = decryptToken(data as StoredRow)
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
    currentToken = decryptToken(data as StoredRow)
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

    const newRow = encryptToken(json.access_token)
    const newExpiresAt = new Date(Date.now() + (json.expires_in ?? 5184000) * 1000)

    await svc.from('threads_accounts').update({
      ...newRow,
      expires_at:   newExpiresAt.toISOString(),
      refreshed_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq('id', data.id)
  } catch {
    // best-effort
  }
}
