// app/api/auth/kakao/start/route.ts
// ============================================================
// 카카오 OAuth 시작 — 18차-5
//   · /api/auth/kakao/start?redirect=/marketing/blog-tracking
//   · state 에 user_id + returnTo 를 base64 JSON 으로 동봉 (콜백에서 검증)
//   · 302 리다이렉트로 kauth.kakao.com 으로 이동
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { buildAuthorizeUrl } from '@/app/lib/kakao-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const returnTo = req.nextUrl.searchParams.get('redirect') || '/marketing/blog-tracking'
  const statePayload = { uid: auth.userId, returnTo, nonce: crypto.randomUUID() }
  const state = Buffer.from(JSON.stringify(statePayload), 'utf-8').toString('base64url')

  try {
    const url = buildAuthorizeUrl(state, 'talk_message')
    return NextResponse.redirect(url)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'kakao config error' },
      { status: 500 },
    )
  }
}
