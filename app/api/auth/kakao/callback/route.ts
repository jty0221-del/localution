// app/api/auth/kakao/callback/route.ts
// ============================================================
// 카카오 OAuth 콜백 — 18차-5
//   · ?code=... &state=<base64 {uid, returnTo}>
//   · code → token 교환 → /v2/user/me → kakao_tokens upsert
//   · 성공: returnTo?connected=kakao 로 302
//   · 실패: returnTo?connected=error&reason=... 로 302
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import {
  exchangeCodeForToken,
  fetchKakaoMe,
} from '@/app/lib/kakao-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function decodeState(state: string): { uid?: string; returnTo?: string } {
  try {
    const json = Buffer.from(state, 'base64url').toString('utf-8')
    return JSON.parse(json)
  } catch {
    return {}
  }
}

function errRedirect(req: NextRequest, returnTo: string, reason: string) {
  const url = new URL(returnTo, req.nextUrl.origin)
  url.searchParams.set('connected', 'error')
  url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')
  const state = req.nextUrl.searchParams.get('state') || ''

  const { uid, returnTo: rt } = decodeState(state)
  const returnTo = rt || '/marketing/blog-tracking'

  if (error) return errRedirect(req, returnTo, `kakao_${error}`)
  if (!code) return errRedirect(req, returnTo, 'missing_code')
  if (!uid)  return errRedirect(req, returnTo, 'missing_state')

  try {
    // (1) code → token 교환
    const tok = await exchangeCodeForToken(code)

    // (2) 카카오 프로필 조회 (nickname 저장용)
    let kakaoUserId: string | null = null
    let nickname:    string | null = null
    try {
      const me = await fetchKakaoMe(tok.access_token)
      kakaoUserId = String(me.id)
      nickname = me.kakao_account?.profile?.nickname
        || me.properties?.nickname
        || null
    } catch { /* 실패해도 토큰 저장은 진행 */ }

    // (3) kakao_tokens upsert
    const now = Date.now()
    const svc = createServiceClient()
    const { error: upErr } = await svc
      .from('kakao_tokens')
      .upsert({
        user_id:            uid,
        access_token:       tok.access_token,
        refresh_token:      tok.refresh_token,
        expires_at:         new Date(now + tok.expires_in * 1000).toISOString(),
        refresh_expires_at: tok.refresh_token_expires_in
          ? new Date(now + tok.refresh_token_expires_in * 1000).toISOString()
          : null,
        scope:              tok.scope || null,
        kakao_user_id:      kakaoUserId,
        nickname,
        updated_at:         new Date().toISOString(),
      }, { onConflict: 'user_id' })
    if (upErr) return errRedirect(req, returnTo, `persist_${encodeURIComponent(upErr.message)}`)

    // (4) 성공 리다이렉트
    const url = new URL(returnTo, req.nextUrl.origin)
    url.searchParams.set('connected', 'kakao')
    return NextResponse.redirect(url)
  } catch (e) {
    return errRedirect(req, returnTo,
      'exchange_' + encodeURIComponent(e instanceof Error ? e.message : 'unknown'))
  }
}
