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
  status: 'success' | 'failed' | 'captcha' | 'credentials_invalid' | 'account_locked',
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

// stores 테이블의 naver_url 에서 외부 placeId (m.place.naver.com 의 ID) 추출
// 내부 SmartPlace placeId 와 외부 placeId 가 다른 매장이 있음 (예: 일산닭칼국수 = 내부 10441797 / 외부 1137287126)
// createReply mutation 은 **외부 placeId** 를 input 으로 요구
export async function loadExternalPlaceId(
  svc: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await svc
      .from('stores')
      .select('naver_url, naver_place_url')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return null
    const candidates = [data.naver_url, data.naver_place_url].filter(Boolean) as string[]
    for (const url of candidates) {
      // map.naver.com/p/entry/place/{id} | m.place.naver.com/place/{id} | place.map.naver.com/{id}
      const patterns = [
        /m\.place\.naver\.com\/(?:[a-z]+\/)?(\d{5,})/,
        /map\.naver\.com\/[^\/]*\/[^\/]*\/place\/(\d{5,})/,
        /place\/(\d{5,})/,
      ]
      for (const p of patterns) {
        const m = url.match(p)
        if (m && m[1]) return m[1]
      }
    }
    return null
  } catch {
    return null
  }
}

// 로그인 실패 메시지를 분류 — UI 에 명확한 안내 가능
export function classifyLoginFailure(bodyText: string): {
  kind: 'credentials_invalid' | 'account_locked' | 'captcha_required' | 'unknown'
  hint: string
} {
  const t = String(bodyText || '').replace(/\s+/g, ' ')
  if (
    t.includes('비밀번호가 잘못') || t.includes('아이디 또는 비밀번호') ||
    t.includes('일치하지') || t.includes('잘못된 아이디') ||
    t.toLowerCase().includes('incorrect') || t.toLowerCase().includes('invalid password')
  ) {
    return {
      kind: 'credentials_invalid',
      hint: '비밀번호가 변경되었거나 잘못된 정보입니다. 매장 연결 페이지에서 새 비밀번호로 다시 등록해주세요.',
    }
  }
  if (
    t.includes('보안조치') || t.includes('로그인이 제한') || t.includes('차단') ||
    t.includes('이용 제한') || t.includes('해외에서 로그인') || t.includes('비밀번호를 변경')
  ) {
    return {
      kind: 'account_locked',
      hint: '네이버가 보안 잠금 — 본인 인증 또는 24시간 대기 후 재시도. 비번 변경 강제 시 새 비번으로 재등록.',
    }
  }
  if (t.includes('자동입력 방지') || t.includes('CAPTCHA') || t.includes('captcha')) {
    return { kind: 'captcha_required', hint: 'CAPTCHA 풀이 실패 — 잠시 후 자동 재시도됩니다.' }
  }
  return { kind: 'unknown', hint: '로그인 실패 — 자동 재시도 또는 매장 연결 재등록이 필요할 수 있습니다.' }
}
