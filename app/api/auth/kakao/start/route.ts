// app/api/auth/kakao/start/route.ts
// ============================================================
// 카카오 OAuth 시작 — 18차-5 (Hotfix 2026-04-21)
//   · /api/auth/kakao/start?redirect=/marketing/blog-tracking
//   · state 에 user_id + returnTo 를 base64 JSON 으로 동봉
//   · 302 리다이렉트로 kauth.kakao.com 으로 이동
//
// Hotfix: 비로그인 시 JSON 대신 /login 으로 302 리다이렉트
//   · 기존: 401 JSON → 사용자가 재로그인 우회하면서 /dashboard 로 튕김
//   · 수정: /login?redirect=<원래경로> 로 보내서 로그인 후 배너 재클릭 가능
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
    // 비로그인 → /login 으로 보내고 로그인 후 원래 페이지 복귀 힌트
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
    // env 누락/설정 에러 → 사용자에게 에러 토스트 표시 가능한 페이지로 돌려보냄
    const errUrl = new URL(returnTo, req.nextUrl.origin)
    errUrl.searchParams.set('connected', 'error')
    errUrl.searchParams.set('reason',
      'config_' + encodeURIComponent(e instanceof Error ? e.message : 'unknown'))
    return NextResponse.redirect(errUrl)
  }
}
