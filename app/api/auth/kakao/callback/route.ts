// app/api/auth/kakao/callback/route.ts
// ============================================================
// 카카오 OAuth 콜백 — 18차-5 (Hotfix 2026-04-21: DB 단계 로깅)
//   · ?code=... &state=<base64 {uid, returnTo}>
//   · code → token 교환 → /v2/user/me → kakao_tokens upsert
//   · 성공: returnTo?connected=kakao 로 302
//   · 실패: returnTo?connected=error&reason=... 로 302
//
// Hotfix 2026-04-21:
//   · 각 분기에서 blog_tracking_alerts 테이블에 sent_status='skipped' 인 디버그 row 인서트
//   · event_type 은 'daily_digest' 로 고정 (CHECK 제약), payload.debug 에 단계명 저장
//   · user_id 가 없는 단계(missing_state, decodeState 실패)는 'unknown' 으로 기록
//   · 이렇게 하면 사용자가 다시 시도한 후 어디까지 실행됐는지 Supabase 에서 확인 가능
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

async function logStep(
  userId: string,
  step: string,
  payload: Record<string, unknown>,
) {
  try {
    const svc = createServiceClient()
    await svc.from('blog_tracking_alerts').insert({
      user_id:     userId,
      event_type:  'daily_digest',  // CHECK 제약 회피
      message:     `[debug] ${step}`,
      payload:     { debug: step, ...payload },
      sent_status: 'skipped',
      sent_error:  null,
    })
  } catch { /* 로그 실패는 무시 */ }
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
  const debugUid = uid || 'unknown'

  // (0) 진입 로그
  await logStep(debugUid, 'callback_enter', {
    has_code:   !!code,
    has_error:  !!error,
    has_state:  !!state,
    has_uid:    !!uid,
    return_to:  returnTo,
  })

  if (error) {
    await logStep(debugUid, 'kakao_returned_error', { error })
    return errRedirect(req, returnTo, `kakao_${error}`)
  }
  if (!code) {
    await logStep(debugUid, 'missing_code', {})
    return errRedirect(req, returnTo, 'missing_code')
  }
  if (!uid) {
    await logStep(debugUid, 'missing_state_uid', { raw_state_length: state.length })
    return errRedirect(req, returnTo, 'missing_state')
  }

  try {
    // (1) code → token 교환
    const tok = await exchangeCodeForToken(code)
    await logStep(uid, 'token_exchange_ok', {
      has_access:  !!tok.access_token,
      has_refresh: !!tok.refresh_token,
      expires_in:  tok.expires_in,
    })

    // (2) 카카오 프로필 조회 (nickname 저장용)
    let kakaoUserId: string | null = null
    let nickname:    string | null = null
    try {
      const me = await fetchKakaoMe(tok.access_token)
      kakaoUserId = String(me.id)
      nickname = me.kakao_account?.profile?.nickname
        || me.properties?.nickname
        || null
      await logStep(uid, 'kakao_me_ok', { kakao_user_id: kakaoUserId, nickname })
    } catch (meErr) {
      await logStep(uid, 'kakao_me_failed', {
        msg: meErr instanceof Error ? meErr.message : 'unknown',
      })
    }

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
    if (upErr) {
      await logStep(uid, 'upsert_failed', { msg: upErr.message })
      return errRedirect(req, returnTo, `persist_${encodeURIComponent(upErr.message)}`)
    }
    await logStep(uid, 'upsert_ok', {})

    // (4) 성공 리다이렉트
    const url = new URL(returnTo, req.nextUrl.origin)
    url.searchParams.set('connected', 'kakao')
    await logStep(uid, 'redirect_success', { final_url: url.toString() })
    return NextResponse.redirect(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await logStep(uid, 'top_catch', { msg })
    return errRedirect(req, returnTo,
      'exchange_' + encodeURIComponent(msg))
  }
}
