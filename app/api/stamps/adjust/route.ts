// app/api/stamps/adjust/route.ts
// ============================================================
// 사장님 — 적립 손님의 도장 수동 조정 (+1 적립 / -1 취소)
//   POST /api/stamps/adjust
//   body: { collection_id: string, delta: -1 | 1 }
//   · 본인 매장 데이터만 조정 가능 (user_id 검증)
//   · current_stamps는 0 ~ required_stamps 범위 내
//   · total_collected는 +1 적립 시에만 증가 (취소는 차감하지 않음 — 누적 이력 보존)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const collectionId = String(body?.collection_id || '').trim()
  const delta = parseInt(String(body?.delta), 10)
  if (!collectionId) return NextResponse.json({ ok: false, error: 'missing_collection_id' }, { status: 400 })
  if (delta !== 1 && delta !== -1) return NextResponse.json({ ok: false, error: 'invalid_delta' }, { status: 400 })

  const svc = createServiceClient()

  // 본인 매장 + 카드 + 컬렉션 검증
  const { data: card } = await svc
    .from('stamp_cards')
    .select('id, required_stamps, reward_text')
    .eq('user_id', auth.userId)
    .eq('active', true)
    .maybeSingle()
  if (!card) return NextResponse.json({ ok: false, error: 'no_active_card' }, { status: 404 })

  const { data: col } = await svc
    .from('stamp_collections')
    .select('id, current_stamps, total_collected, rewards_claimed, last_visit_at')
    .eq('id', collectionId)
    .eq('stamp_card_id', card.id)
    .maybeSingle()
  if (!col) return NextResponse.json({ ok: false, error: 'collection_not_found' }, { status: 404 })

  let newCurrent = (col.current_stamps || 0) + delta
  // 0 미만 방지
  if (newCurrent < 0) newCurrent = 0
  // required_stamps 도달하면 자동 보상 — 일단 단순 cap
  if (newCurrent > card.required_stamps) newCurrent = card.required_stamps

  const update: any = {
    current_stamps: newCurrent,
    updated_at: new Date().toISOString(),
  }
  // +1 적립 시: total_collected 증가 + last_visit_at 갱신
  if (delta === 1) {
    update.total_collected = (col.total_collected || 0) + 1
    update.last_visit_at = new Date().toISOString()
  }
  // -1 취소 시: total_collected는 보존 (이력), current만 감소

  const { error } = await svc
    .from('stamp_collections')
    .update(update)
    .eq('id', collectionId)
    .eq('stamp_card_id', card.id)

  if (error) return NextResponse.json({ ok: false, error: 'update_failed', message: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    collection_id: collectionId,
    current_stamps: newCurrent,
    delta,
  })
}
