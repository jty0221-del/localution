// app/api/notify/vapid-public/route.ts
// VAPID public key 노출 (브라우저가 PushManager.subscribe 시 사용)
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json({ ok: false, error: 'vapid_not_configured' }, { status: 503 })
  }
  return NextResponse.json({ ok: true, publicKey })
}
