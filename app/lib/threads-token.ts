// app/lib/threads-token.ts
// ============================================================
// Threads 액세스 토큰 저장/로드/갱신 유틸리티
//   · AES-256-GCM 2단 암호화 (encryptSecret / decryptSecret 재사용)
//   · Vercel 측 API 라우트 + OAuth 콜백에서 사용
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { encryptSecret, decryptSecret } from '@/app/lib/crypto-utils'

type TokenRow = {
  token_encrypted: string
  token_iv: string
  token_tag: string
  dek_encrypted: string
  dek_iv: string
  dek_tag: string
}

function encryptToken(token: string): TokenRow {
  const p = encryptSecret(token)
  return {
    token_encrypted: p.ciphertext,
    token_iv:        p.iv,
    token_tag:       p.tag,
    dek_encrypted:   p.dek_ciphertext,
    dek_iv:          p.dek_iv,
    dek_tag:         p.dek_tag,
  }
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

// ─────────────────────────────────────────────
// 토큰 로드
// ─────────────────────────────────────────────
export async function loadThreadsToken(
  svc: SupabaseClient,
  _userId?: string,
): Promise<{ access_token: string; threads_user_id: string; username: string | null } | null> {
  // 단일 사용자 앱 — user_id 필터 없이 첫 번째 행 조회 (user_id 불일치 방지)
  const { data, error } = await svc
    .from('threads_accounts')
    .select('threads_user_id, username, token_encrypted, token_iv, token_tag, dek_encrypted, dek_iv, dek_tag')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  try {
    const access_token = decryptToken(data as TokenRow)
    return { access_token, threads_user_id: data.threads_user_id, username: data.username ?? null }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────
// 토큰 저장 (신규 연결 or 갱신)
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
  const row = encryptToken(opts.access_token)
  const expiresAt = new Date(Date.now() + opts.expires_in * 1000)

  // 기존 행 확인 (단일 사용자 앱 — 첫 번째 행이 있으면 UPDATE, 없으면 INSERT)
  const { data: existing } = await svc
    .from('threads_accounts')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const payload = {
    user_id: userId,
    threads_user_id: opts.threads_user_id,
    username: opts.username,
    ...row,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  }

  let result
  if (existing?.id) {
    result = await svc
      .from('threads_accounts')
      .update(payload)
      .eq('id', existing.id)
  } else {
    result = await svc
      .from('threads_accounts')
      .insert(payload)
  }

  if (result.error) {
    throw new Error(`threads_accounts 저장 실패: ${result.error.message}`)
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

    const row = encryptToken(json.access_token)
    const newExpiresAt = new Date(Date.now() + (json.expires_in ?? 5184000) * 1000)

    await svc
      .from('threads_accounts')
      .update({
        ...row,
        expires_at: newExpiresAt.toISOString(),
        refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
  } catch {
    // best-effort: 실패해도 현재 토큰으로 계속 시도
  }
}
