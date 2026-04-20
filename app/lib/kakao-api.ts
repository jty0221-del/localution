// app/lib/kakao-api.ts
// ============================================================
// 카카오 REST API 래퍼 (18차-5)
//   · OAuth: code → access_token / refresh_token 교환
//   · 나에게 보내기: /v2/api/talk/memo/default/send
//   · 자동 refresh: access_token 만료 5분 전부터 refresh_token 으로 재발급
//   · kakao_tokens 테이블 로드/저장/갱신 헬퍼 포함
// ============================================================
import { createServiceClient } from './adminAuth'
import type { SupabaseClient } from '@supabase/supabase-js'

const KAKAO_OAUTH   = 'https://kauth.kakao.com'
const KAKAO_API     = 'https://kapi.kakao.com'
const REFRESH_WINDOW_MS = 5 * 60 * 1000  // 만료 5분 전부터 refresh

export interface KakaoTokenRow {
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string   // ISO
  refresh_expires_at: string | null
  scope: string | null
  kakao_user_id: string | null
  nickname: string | null
  alert_prefs: {
    band_change?: boolean
    entered?: boolean
    dropped?: boolean
    daily_digest?: boolean
  }
  created_at: string
  updated_at: string
}

export interface KakaoOAuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number           // seconds
  refresh_token_expires_in?: number
  token_type: string
  scope?: string
}

export interface KakaoUserMe {
  id: number
  kakao_account?: {
    profile?: { nickname?: string }
    email?: string
  }
  properties?: { nickname?: string }
}

// ------------------------------------------------------------
// 환경변수 검증
// ------------------------------------------------------------
function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} 환경변수 미설정 (Vercel Dashboard)`)
  return v
}

export function kakaoConfig() {
  return {
    restKey:      env('KAKAO_REST_API_KEY'),
    clientSecret: process.env.KAKAO_CLIENT_SECRET || '',  // 선택
    redirectUri:  env('KAKAO_REDIRECT_URI'),
  }
}

// ------------------------------------------------------------
// OAuth: 로그인 URL 생성
// ------------------------------------------------------------
export function buildAuthorizeUrl(state: string, scope = 'talk_message'): string {
  const { restKey, redirectUri } = kakaoConfig()
  const qs = new URLSearchParams({
    response_type: 'code',
    client_id:     restKey,
    redirect_uri:  redirectUri,
    scope,
    state,
  })
  return `${KAKAO_OAUTH}/oauth/authorize?${qs.toString()}`
}

// ------------------------------------------------------------
// OAuth: code → token 교환
// ------------------------------------------------------------
export async function exchangeCodeForToken(code: string): Promise<KakaoOAuthResponse> {
  const { restKey, clientSecret, redirectUri } = kakaoConfig()
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     restKey,
    redirect_uri:  redirectUri,
    code,
  })
  if (clientSecret) body.set('client_secret', clientSecret)

  const res = await fetch(`${KAKAO_OAUTH}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body:    body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`kakao token exchange failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return json as KakaoOAuthResponse
}

// ------------------------------------------------------------
// OAuth: refresh_token → 새 access_token
// ------------------------------------------------------------
export async function refreshAccessToken(refreshToken: string): Promise<KakaoOAuthResponse> {
  const { restKey, clientSecret } = kakaoConfig()
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     restKey,
    refresh_token: refreshToken,
  })
  if (clientSecret) body.set('client_secret', clientSecret)

  const res = await fetch(`${KAKAO_OAUTH}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body:    body.toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`kakao refresh failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return json as KakaoOAuthResponse
}

// ------------------------------------------------------------
// /v1/user/me — 카카오 프로필 조회 (최초 연결 시 저장)
// ------------------------------------------------------------
export async function fetchKakaoMe(accessToken: string): Promise<KakaoUserMe> {
  const res = await fetch(`${KAKAO_API}/v2/user/me`, {
    method:  'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`kakao user/me failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return json as KakaoUserMe
}

// ------------------------------------------------------------
// 토큰 조회 + (필요 시) 자동 refresh
// ------------------------------------------------------------
export async function loadFreshToken(
  svc: SupabaseClient,
  userId: string,
): Promise<{ row: KakaoTokenRow } | { error: string }> {
  const { data, error } = await svc
    .from('kakao_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data)  return { error: 'not_connected' }

  const row = data as KakaoTokenRow
  const expiresAt = new Date(row.expires_at).getTime()
  const now = Date.now()
  if (now < expiresAt - REFRESH_WINDOW_MS) {
    return { row }  // 아직 유효
  }

  // refresh 필요
  try {
    const refreshed = await refreshAccessToken(row.refresh_token)
    const newExpiresAt = new Date(now + refreshed.expires_in * 1000).toISOString()
    const newRefresh = refreshed.refresh_token || row.refresh_token  // 카카오는 때때로만 rotate
    const newRefreshExp = refreshed.refresh_token_expires_in
      ? new Date(now + refreshed.refresh_token_expires_in * 1000).toISOString()
      : row.refresh_expires_at

    const { data: upd, error: updErr } = await svc
      .from('kakao_tokens')
      .update({
        access_token:        refreshed.access_token,
        refresh_token:       newRefresh,
        expires_at:          newExpiresAt,
        refresh_expires_at:  newRefreshExp,
        scope:               refreshed.scope || row.scope,
        updated_at:          new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single()
    if (updErr) return { error: `refresh persist failed: ${updErr.message}` }
    return { row: upd as KakaoTokenRow }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'refresh failed' }
  }
}

// ------------------------------------------------------------
// 나에게 보내기 (memo/default/send) — text 템플릿
// ------------------------------------------------------------
export async function sendMemoText(
  accessToken: string,
  opts: {
    text: string
    linkWebUrl?: string
    linkMobileUrl?: string
    buttonTitle?: string
  },
): Promise<void> {
  const template = {
    object_type: 'text',
    text:        opts.text.slice(0, 200),  // 카카오 제한
    link: {
      web_url:        opts.linkWebUrl    || 'https://www.localution.co.kr/marketing/blog-tracking',
      mobile_web_url: opts.linkMobileUrl || 'https://www.localution.co.kr/marketing/blog-tracking',
    },
    button_title: opts.buttonTitle || '순위 확인하기',
  }
  const body = new URLSearchParams({ template_object: JSON.stringify(template) })

  const res = await fetch(`${KAKAO_API}/v2/api/talk/memo/default/send`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: body.toString(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`kakao send failed: ${res.status} ${JSON.stringify(err)}`)
  }
}

// ------------------------------------------------------------
// 통합 헬퍼: user_id 로 바로 send (refresh 포함)
// ------------------------------------------------------------
export async function sendMemoForUser(
  userId: string,
  text: string,
  extras?: { linkWebUrl?: string; linkMobileUrl?: string; buttonTitle?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const svc = createServiceClient()
  const loaded = await loadFreshToken(svc, userId)
  if ('error' in loaded) return { ok: false, error: loaded.error }
  try {
    await sendMemoText(loaded.row.access_token, { text, ...extras })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' }
  }
}
