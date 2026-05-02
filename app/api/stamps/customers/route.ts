// app/api/stamps/customers/route.ts
// ============================================================
// 사장님 — 본인 매장 스탬프 적립 손님 목록
//   GET /api/stamps/customers
//   · 마케팅 동의자 + 비동의자 분리
//   · 마지막 방문일 기준 정렬
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()

  const { data: card } = await svc
    .from('stamp_cards')
    .select('id, required_stamps, reward_text')
    .eq('user_id', auth.userId)
    .eq('active', true)
    .maybeSingle()

  if (!card) return NextResponse.json({ ok: true, customers: [], total: 0 })

  const { data: customers } = await svc
    .from('stamp_collections')
    .select('id, customer_phone, customer_name, current_stamps, total_collected, rewards_claimed, last_visit_at, enrolled_at, consent_marketing')
    .eq('stamp_card_id', card.id)
    .order('last_visit_at', { ascending: false })
    .limit(500)

  // 전화번호 마스킹 (UI 에서만 마스킹 해제 옵션)
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
  })
}
