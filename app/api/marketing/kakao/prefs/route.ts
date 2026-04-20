// app/api/marketing/kakao/prefs/route.ts
// ============================================================
// 알림 설정 업데이트 — 18차-5
//   · PATCH { alert_prefs: { band_change, entered, dropped, daily_digest } }
//   · 미연결(kakao_tokens 행 없음) 시 404 반환
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_KEYS = ['band_change', 'entered', 'dropped', 'daily_digest'] as const

export async function PATCH(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { alert_prefs?: Record<string, unknown> }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const incoming = body.alert_prefs ?? {}
  const clean: Record<string, boolean> = {}
  for (const k of ALLOWED_KEYS) {
    if (k in incoming) clean[k] = !!incoming[k]
  }
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ error: 'no valid prefs' }, { status: 400 })
  }

  const svc = createServiceClient()

  // 현재 prefs merge
  const { data: row, error: getErr } = await svc
    .from('kakao_tokens')
    .select('alert_prefs')
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 })
  if (!row)   return NextResponse.json({ error: 'not_connected' }, { status: 404 })

  const merged = { ...(row.alert_prefs ?? {}), ...clean }

  const { data: upd, error: updErr } = await svc
    .from('kakao_tokens')
    .update({ alert_prefs: merged, updated_at: new Date().toISOString() })
    .eq('user_id', auth.userId)
    .select('alert_prefs')
    .single()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, alert_prefs: upd.alert_prefs })
}
