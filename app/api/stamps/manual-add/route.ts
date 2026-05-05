// app/api/stamps/manual-add/route.ts
// ============================================================
// 사장님 — 손님 수동 추가 (스마트폰 없는 손님 / 오프라인)
// POST { phone, name?, initial_stamps? }
// · 사장님 인증 필요
// · customers + stamp_collections 양쪽 동기화
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizePhone(p: string): string {
 return String(p || '').replace(/[^0-9]/g, '').slice(0, 11)
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const phone = normalizePhone(body?.phone)
 const name = body?.name ? String(body.name).slice(0, 40) : null
 const initialStamps = Math.max(0, Math.min(30, parseInt(String(body?.initial_stamps || '1'), 10)))

 if (phone.length < 10) return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400 })

 const svc = createServiceClient()

 const { data: card } = await svc
 .from('stamp_cards')
 .select('*')
 .eq('user_id', auth.userId)
 .eq('active', true)
 .maybeSingle()

 if (!card) return NextResponse.json({ ok: false, error: 'no_active_card' }, { status: 404 })

 // 기존 적립 정보 확인
 const { data: existing } = await svc
 .from('stamp_collections')
 .select('id, current_stamps, total_collected')
 .eq('stamp_card_id', card.id)
 .eq('customer_phone', phone)
 .maybeSingle()

 if (existing) {
 return NextResponse.json({ ok: false, error: 'already_enrolled', message: '이미 등록된 손님입니다' }, { status: 409 })
 }

 // stamp_collections 등록
 const { error } = await svc.from('stamp_collections').insert({
 stamp_card_id: card.id,
 store_slug: card.store_slug,
 customer_phone: phone,
 customer_name: name,
 current_stamps: initialStamps,
 total_collected: initialStamps,
 rewards_claimed: 0,
 last_visit_at: new Date().toISOString(),
 enrolled_at: new Date().toISOString(),
 consent_marketing: false,
 })

 if (error) return NextResponse.json({ ok: false, error: 'insert_failed', message: error.message }, { status: 500 })

 // customers 동기화
 try {
 const { data: existingC } = await svc
 .from('customers')
 .select('id, visits_count, tags')
 .eq('user_id', auth.userId)
 .eq('phone', phone)
 .maybeSingle()

 if (existingC) {
 const tags = existingC.tags || []
 if (!tags.includes('단골')) tags.push('단골')
 await svc.from('customers').update({
 visits_count: (existingC.visits_count || 0) + initialStamps,
 last_visit_at: new Date().toISOString(),
 tags,
 name: name || undefined,
 }).eq('id', existingC.id)
 } else {
 await svc.from('customers').insert({
 user_id: auth.userId,
 name: name || ('손님 ' + phone.slice(-4)),
 phone,
 memo: '스탬프 카드 수동 등록',
 tags: ['단골'],
 visits_count: initialStamps,
 last_visit_at: new Date().toISOString(),
 })
 }
 } catch (_) {}

 return NextResponse.json({ ok: true })
}
