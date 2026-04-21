// app/api/auth/kakao/start/route.ts
// ============================================================
// 카카오 OAuth 시작 — 20차-1c (디버그 로깅 제거, 2026-04-21)
//   · /api/auth/kakao/start?redirect=/marketing/blog-tracking
//   · state 에 user_id + returnTo 를 base64 JSON 으로 동봉
//   · 302 리다이렉트로 kauth.kakao.com 으로 이동
//
// 비로그인 시: JSON 대신 /login 으로 302 리다이렉트
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { buildAuthorizeUrl } from '@/app/lib/kakao-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('redirect') || '/marketing/blog-tracking'

  const auth = await requireUser()
  if (!auth.ok) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('redirect', returnTo)
    loginUrl.searchParams.set('connect_hint', 'kakao')
    return NextResponse.redirect(loginUrl)
  }

  const statePayload = { uid: auth.userId, returnTo, nonce: crypto.randomUUID() }
  const state = Buffer.from(JSON.stringify(statePayload), 'utf-8').toString('base64url')

  try {
    const url = buildAuthorizeUrl(state, 'talk_message')
    return NextResponse.redirect(url)
  } catch (e) {
    const errUrl = new URL(returnTo, req.nextUrl.origin)
    errUrl.searchParams.set('connected', 'error')
    errUrl.searchParams.set('reason',
      'config_' + encodeURIComponent(e instanceof Error ? e.message : 'unknown'))
    return NextResponse.redirect(errUrl)
  }
}
