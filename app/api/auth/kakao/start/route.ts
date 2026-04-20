// app/api/auth/kakao/start/route.ts
// ============================================================
// 카카오 OAuth 시작 — 18차-5 (Hotfix 2026-04-21 + Hotfix-6 디버그 로깅)
//   · /api/auth/kakao/start?redirect=/marketing/blog-tracking
//   · state 에 user_id + returnTo 를 base64 JSON 으로 동봉
//   · 302 리다이렉트로 kauth.kakao.com 으로 이동
//
// Hotfix: 비로그인 시 JSON 대신 /login 으로 302 리다이렉트
// Hotfix-6: 만들어내는 authorize URL + redirect_uri 를 DB 로깅
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { buildAuthorizeUrl, kakaoConfig } from '@/app/lib/kakao-api'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function logStep(
  userId: string,
  step: string,
  payload: Record<string, unknown>,
) {
  try {
    const svc = createServiceClient()
    await svc.from('blog_tracking_alerts').insert({
      user_id:     userId,
      event_type:  'daily_digest',
      message:     `[debug-start] ${step}`,
      payload:     { debug: step, ...payload },
      sent_status: 'skipped',
      sent_error:  null,
    })
  } catch { /* ignore */ }
}

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('redirect') || '/marketing/blog-tracking'

  const auth = await requireUser()
  if (!auth.ok) {
    await logStep('unauthenticated', 'requireUser_failed', {
      status: auth.status,
      message: auth.message,
      return_to: returnTo,
    })
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('redirect', returnTo)
    loginUrl.searchParams.set('connect_hint', 'kakao')
    return NextResponse.redirect(loginUrl)
  }

  const statePayload = { uid: auth.userId, returnTo, nonce: crypto.randomUUID() }
  const state = Buffer.from(JSON.stringify(statePayload), 'utf-8').toString('base64url')

  try {
    // 환경변수에서 redirect_uri 직접 읽어서 로깅
    let configRedirectUri = ''
    try {
      configRedirectUri = kakaoConfig().redirectUri
    } catch (cfgErr) {
      configRedirectUri = `__error__: ${cfgErr instanceof Error ? cfgErr.message : 'unknown'}`
    }

    const url = buildAuthorizeUrl(state, 'talk_message')

    // URL 에서 redirect_uri 파라미터 추출
    let urlRedirectUri = ''
    try {
      const u = new URL(url)
      urlRedirectUri = u.searchParams.get('redirect_uri') || ''
    } catch {}

    await logStep(auth.userId, 'authorize_url_built', {
      auth_source:           auth.source,
      env_KAKAO_REDIRECT_URI: configRedirectUri,
      url_redirect_uri_param: urlRedirectUri,
      authorize_url_first_300: url.slice(0, 300),
      return_to:             returnTo,
    })

    return NextResponse.redirect(url)
  } catch (e) {
    await logStep(auth.userId, 'build_authorize_url_failed', {
      msg: e instanceof Error ? e.message : 'unknown',
    })
    const errUrl = new URL(returnTo, req.nextUrl.origin)
    errUrl.searchParams.set('connected', 'error')
    errUrl.searchParams.set('reason',
      'config_' + encodeURIComponent(e instanceof Error ? e.message : 'unknown'))
    return NextResponse.redirect(errUrl)
  }
}
