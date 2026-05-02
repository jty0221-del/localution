// app/api/notify/web-push-subscribe/route.ts
// ============================================================
// Web Push 구독 등록/해제
//   POST   { subscription: PushSubscriptionJSON }  → 저장
//   DELETE                                          → 해제
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: any = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const subscription = body?.subscription
  if (!subscription || typeof subscription !== 'object' || !subscription.endpoint) {
    return NextResponse.json({ ok: false, error: 'invalid_subscription' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { error } = await svc
    .from('user_notification_prefs')
    .upsert({
      user_id: auth.userId,
      web_push_subscription: subscription,
      channel_web_push: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { error } = await svc
    .from('user_notification_prefs')
    .upsert({
      user_id: auth.userId,
      web_push_subscription: null,
      channel_web_push: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
