// app/lib/platform-credentials.ts
// ============================================================
// 23차-8b: 플랫폼 자격증명 저장/조회 헬퍼 (2026-04-21)
//
//   · 평문 비밀번호는 메모리에만 존재, DB 에는 암호화해서 저장
//   · encryptSecret() / decryptSecret() 은 crypto-utils 의 AES-256-GCM 2단 구조
//   · 본 헬퍼는 Supabase service client 를 받아 호출자 측에서 auth 를 책임짐
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { encryptSecret, decryptSecret, encouragePlaintextCleanup } from './crypto-utils'

export type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'

export const VALID_PLATFORMS: readonly PlatformSlug[] = [
  'naver_place',
  'baemin',
  'yogiyo',
  'coupangeats',
  'kakao_map',
] as const

export const PLATFORM_LABELS: Record<PlatformSlug, string> = {
  naver_place: '네이버 플레이스',
  baemin: '배달의민족',
  yogiyo: '요기요',
  coupangeats: '쿠팡이츠',
  kakao_map: '카카오맵',
}

// ─────────────────────────────────────────────
// 저장 (신규/교체)
// ─────────────────────────────────────────────
export type SaveCredentialsInput = {
  user_id: string
  platform: PlatformSlug
  account_id: string
  password: string             // 평문 — 저장 직후 레퍼런스 폐기
  platform_store_id?: string | null
  platform_store_name?: string | null
  consent_version?: string
  consent_ip?: string | null
  consent_user_agent?: string | null
}

export async function savePlatformCredentials(
  svc: SupabaseClient,
  input: SaveCredentialsInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  let password: string | undefined = input.password
  try {
    // 평문 비밀번호를 암호화
    const enc = encryptSecret(password)

    // user_id + platform UNIQUE — upsert 로 동일 계정 덮어쓰기
    const { data, error } = await svc
      .from('platform_credentials')
      .upsert(
        {
          user_id: input.user_id,
          platform: input.platform,
          account_id: input.account_id,
          password_encrypted: enc.ciphertext,
          password_iv: enc.iv,
          password_tag: enc.tag,
          dek_encrypted: enc.dek_ciphertext,
          dek_iv: enc.dek_iv,
          dek_tag: enc.dek_tag,
          platform_store_id: input.platform_store_id ?? null,
          platform_store_name: input.platform_store_name ?? null,
          consent_version: input.consent_version ?? 'v1.0',
          consent_signed_at: new Date().toISOString(),
          consent_ip: input.consent_ip ?? null,
          consent_user_agent: input.consent_user_agent ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      )
      .select('id')
      .single()

    if (error || !data) {
      return { ok: false, error: error?.message ?? 'upsert failed' }
    }
    return { ok: true, id: data.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  } finally {
    // 평문 비밀번호 레퍼런스 폐기
    password = undefined
    encouragePlaintextCleanup([password])
  }
}

// ─────────────────────────────────────────────
// 라벨만 조회 (UI 에서 '연결됨' 표시용 — 비밀번호 복호화 안 함)
// ─────────────────────────────────────────────
export type CredentialLabel = {
  platform: PlatformSlug
  platform_label: string
  account_id: string
  platform_store_name: string | null
  connected_at: string
  last_login_at: string | null
  last_login_status: string | null
}

export async function listPlatformCredentialLabels(
  svc: SupabaseClient,
  userId: string
): Promise<CredentialLabel[]> {
  const { data, error } = await svc
    .from('platform_credentials')
    .select(
      'platform, account_id, platform_store_name, connected_at, last_login_at, last_login_status'
    )
    .eq('user_id', userId)

  if (error || !data) return []

  return data.map((r) => ({
    platform: r.platform as PlatformSlug,
    platform_label: PLATFORM_LABELS[r.platform as PlatformSlug] ?? r.platform,
    account_id: r.account_id,
    platform_store_name: r.platform_store_name ?? null,
    connected_at: r.connected_at,
    last_login_at: r.last_login_at ?? null,
    last_login_status: r.last_login_status ?? null,
  }))
}

// ─────────────────────────────────────────────
// 삭제 (연결 해제)
// ─────────────────────────────────────────────
export async function removePlatformCredentials(
  svc: SupabaseClient,
  userId: string,
  platform: PlatformSlug
): Promise<{ ok: true; removed: number } | { ok: false; error: string }> {
  const { data, error } = await svc
    .from('platform_credentials')
    .delete()
    .eq('user_id', userId)
    .eq('platform', platform)
    .select('id')

  if (error) return { ok: false, error: error.message }
  return { ok: true, removed: data?.length ?? 0 }
}

// ─────────────────────────────────────────────
// Worker 전용: 평문 복호화 (서버사이드에서만 호출)
// ─────────────────────────────────────────────
export async function loadPlainCredentials(
  svc: SupabaseClient,
  userId: string,
  platform: PlatformSlug
): Promise<
  | {
      ok: true
      account_id: string
      password: string
      platform_store_id: string | null
      platform_store_name: string | null
    }
  | { ok: false; error: string }
> {
  const { data, error } = await svc
    .from('platform_credentials')
    .select(
      'account_id, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag, platform_store_id, platform_store_name'
    )
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'not_connected' }

  try {
    const password = decryptSecret({
      ciphertext: data.password_encrypted,
      iv: data.password_iv,
      tag: data.password_tag,
      dek_ciphertext: data.dek_encrypted,
      dek_iv: data.dek_iv,
      dek_tag: data.dek_tag,
      kek_version: 'v1', // TODO: kek_version 필드 생기면 DB 값 사용
    })

    return {
      ok: true,
      account_id: data.account_id,
      password,
      platform_store_id: data.platform_store_id ?? null,
      platform_store_name: data.platform_store_name ?? null,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: 'decrypt_failed: ' + msg }
  }
}
