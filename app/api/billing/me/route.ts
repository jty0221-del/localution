// app/api/billing/me/route.ts
// ============================================================
// 본인 결제 수단 조회/저장/삭제
//   GET    /api/billing/me   → 카드 표시명·마지막4자리·customer_key (billing_key 절대 반환 X)
//   POST   /api/billing/me   → { card_name, card_last4, card_company, billing_key }
//   DELETE /api/billing/me   → 결제 수단 삭제
//   · billing_key 는 서버에서만 사용 (정기결제 호출 시)
//   · customer_key 는 user_id 기반 deterministic 생성 (없으면 자동 생성)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// user_id 기반 deterministic customer_key 생성
function generateCustomerKey(userId: string): string {
  return 'cust_' + userId.replace(/-/g, '').slice(0, 16)
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data: row } = await svc
    .from('billing_methods')
    .select('customer_key, card_name, card_last4, card_company, registered_at, created_at')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (!row) {
    // 결제수단 미등록 — customer_key만 deterministic 생성하여 반환
    return NextResponse.json({
      ok: true,
      registered: false,
      customer_key: generateCustomerKey(auth.userId),
      payment_method: null,
    })
  }

  return NextResponse.json({
    ok: true,
    registered: true,
    customer_key: row.customer_key,
    payment_method: {
      card_name:    row.card_name,
      card_last4:   row.card_last4,
      card_company: row.card_company,
      registered_at: row.registered_at,
    },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const cardName    = body?.card_name    ? String(body.card_name).slice(0, 60)    : null
  const cardLast4   = body?.card_last4   ? String(body.card_last4).slice(0, 8)    : null
  const cardCompany = body?.card_company ? String(body.card_company).slice(0, 30) : null
  const billingKey  = body?.billing_key  ? String(body.billing_key).slice(0, 200) : null

  const customerKey = generateCustomerKey(auth.userId)

  const svc = createServiceClient()
  const { error } = await svc
    .from('billing_methods')
    .upsert({
      user_id: auth.userId,
      customer_key: customerKey,
      billing_key: billingKey,
      card_name: cardName,
      card_last4: cardLast4,
      card_company: cardCompany,
      registered_at: billingKey ? new Date().toISOString() : null,
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ ok: false, error: 'save_failed', message: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, customer_key: customerKey })
}

export async function DELETE() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { error } = await svc
    .from('billing_methods')
    .delete()
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ ok: false, error: 'delete_failed', message: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
