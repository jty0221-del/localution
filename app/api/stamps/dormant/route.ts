// app/api/stamps/dormant/route.ts
// ============================================================
// 사장님 — 휴면 (오래 안 온) 적립 손님 조회
//   GET /api/stamps/dormant?days=14
//   · last_visit_at 기준 N일 이상 경과
//   · consent_marketing = true 인 손님 우선 (마케팅 동의자)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const days = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get('days') || '14', 10)))

  const svc = createServiceClient()
  const { data: card } = await svc
    .from('stamp_cards')
    .select('id, title, reward_text, required_stamps')
    .eq('user_id', auth.userId)
    .eq('active', true)
    .maybeSingle()

  if (!card) return NextResponse.json({ ok: true, customers: [], card: null })

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: customers } = await svc
    .from('stamp_collections')
    .select('id, customer_phone, customer_name, current_stamps, total_collected, last_visit_at, consent_marketing')
    .eq('stamp_card_id', card.id)
    .lt('last_visit_at', cutoff)
    .order('last_visit_at', { ascending: false })
    .limit(200)

  const list = (customers || []).map(c => ({
    ...c,
    customer_phone_masked: c.customer_phone ? c.customer_phone.slice(0, 3) + '-****-' + c.customer_phone.slice(-2) : null,
    days_since_last_visit: c.last_visit_at
      ? Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }))

  return NextResponse.json({
    ok: true,
    card,
    customers: list,
    total: list.length,
    consented: list.filter(c => c.consent_marketing).length,
    days,
  })
}
