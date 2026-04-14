import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/baemin-reply
 * 배달의민족 리뷰에 사장님 답글 등록
 */
export async function POST(req: NextRequest) {
  const { storeId, token, reviewId, reply } = await req.json()

  if (!storeId || !reviewId || !reply) {
    return NextResponse.json({ ok: false, error: 'storeId, reviewId, reply 필수' }, { status: 400 })
  }

  let bearerToken = token
  const clientId  = process.env.BAEMIN_CLIENT_ID || ''
  const clientSec = process.env.BAEMIN_CLIENT_SECRET || ''

  // 토큰 없으면 환경변수로 OAuth 취득
  if (!bearerToken && clientId && clientSec) {
    try {
      const r = await fetch('https://auth.baemin.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSec,
          scope: 'review',
        }),
      })
      const d = await r.json()
      if (!d.access_token) throw new Error('토큰 취득 실패')
      bearerToken = d.access_token
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 502 })
    }
  }

  // API 키 없으면 데모 응답
  if (!bearerToken) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: '데모 모드 — 실제 배민 API Key가 있어야 등록됩니다'
    })
  }

  try {
    const res = await fetch(
      `https://api.baemin.com/api/v1/stores/${storeId}/reviews/${reviewId}/reply`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ ok: false, error: `배민 API 오류 (${res.status}): ${err}` }, { status: res.status })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
