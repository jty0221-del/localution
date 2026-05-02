// app/api/stamps/collect/route.ts
// ============================================================
// 손님 — 스탬프 적립 (인증 불필요, 공개)
//   POST { slug, phone, name? } → 스탬프 +1
//   - 같은 phone + slug 60분 내 중복 적립 차단
//   - 보상 임계치 도달 시 reward_pending = true 반환
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

function normalizePhone(p: string): string {
  return String(p || '').replace(/[^0-9]/g, '').slice(0, 11)
}

export async function POST(req: NextRequest) {
  let body: any = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: CORS })
  }

  const slug = String(body?.slug || '').trim()
  const phone = normalizePhone(body?.phone)
  const name = body?.name ? String(body.name).slice(0, 40) : null
  const consent = !!body?.consent_marketing

  if (!slug) return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS })
  if (phone.length < 10) return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400, headers: CORS })

  const svc = createServiceClient()

  // 1) 활성 스탬프 카드 조회
  const { data: card } = await svc
    .from('stamp_cards')
    .select('*')
    .eq('store_slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (!card) return NextResponse.json({ ok: false, error: 'no_active_card' }, { status: 404, headers: CORS })

  // 2) 적립 정보 조회
  const { data: existing } = await svc
    .from('stamp_collections')
    .select('*')
    .eq('stamp_card_id', card.id)
    .eq('customer_phone', phone)
    .maybeSingle()

  // 3) 60분 내 중복 적립 차단
  if (existing) {
    const lastVisit = new Date(existing.last_visit_at).getTime()
    const minutesAgo = (Date.now() - lastVisit) / 60_000
    if (minutesAgo < 60) {
      return NextResponse.json({
        ok: true, deduped: true,
        card,
        collection: existing,
        message: '한 시간 이내에 이미 적립하셨어요.',
      }, { headers: CORS })
    }
  }

  // 4) 적립 처리 — 보상 임계치 도달 시 자동 리셋 + reward_pending 반환
  const willCompleteReward = existing && (existing.current_stamps + 1) >= card.required_stamps
  const newStamps = willCompleteReward ? 0 : ((existing?.current_stamps || 0) + 1)
  const totalCollected = (existing?.total_collected || 0) + 1
  const rewardsClaimed = willCompleteReward ? (existing?.rewards_claimed || 0) + 1 : (existing?.rewards_claimed || 0)

  let collectionId = existing?.id

  if (existing) {
    const { error } = await svc
      .from('stamp_collections')
      .update({
        current_stamps: newStamps,
        total_collected: totalCollected,
        rewards_claimed: rewardsClaimed,
        last_visit_at: new Date().toISOString(),
        customer_name: name || existing.customer_name,
        consent_marketing: consent || existing.consent_marketing,
      })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ ok: false, error: 'update_failed', message: error.message }, { status: 500, headers: CORS })
  } else {
    const { data, error } = await svc
      .from('stamp_collections')
      .insert({
        stamp_card_id: card.id,
        store_slug: slug,
        customer_phone: phone,
        customer_name: name,
        current_stamps: 1,
        total_collected: 1,
        rewards_claimed: 0,
        last_visit_at: new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
        consent_marketing: consent,
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ ok: false, error: 'insert_failed', message: error.message }, { status: 500, headers: CORS })
    collectionId = data.id
  }

  // 5) 이벤트 로그
  try {
    await svc.from('stamp_events').insert({
      collection_id: collectionId,
      stamp_card_id: card.id,
      event_type: existing ? (willCompleteReward ? 'reward_claimed' : 'stamped') : 'enrolled',
      meta: { phone_masked: phone.slice(0, 3) + '****' + phone.slice(-2) },
    })
  } catch (_) {}

  // 6) /customers CRM 자동 동기화 — 사장님 user_id 매칭
  // · 신규 손님: customers insert (단골 태그)
  // · 기존 손님: visits_count 증분 + last_visit_at 갱신
  try {
    if (card.user_id && phone) {
      const { data: existingCustomer } = await svc
        .from('customers')
        .select('id, visits_count, tags')
        .eq('user_id', card.user_id)
        .eq('phone', phone)
        .maybeSingle()

      if (existingCustomer) {
        const tags = existingCustomer.tags || []
        if (!tags.includes('단골')) tags.push('단골')
        await svc.from('customers').update({
          visits_count: (existingCustomer.visits_count || 0) + 1,
          last_visit_at: new Date().toISOString(),
          tags,
          name: name || undefined,
        }).eq('id', existingCustomer.id)
      } else {
        await svc.from('customers').insert({
          user_id: card.user_id,
          name: name || ('손님 ' + phone.slice(-4)),
          phone,
          memo: '스탬프 카드 자동 등록',
          tags: ['단골'],
          visits_count: 1,
          last_visit_at: new Date().toISOString(),
        })
      }
    }
  } catch (_) {}

  // 6) 응답
  const { data: updated } = await svc
    .from('stamp_collections')
    .select('*')
    .eq('id', collectionId)
    .single()

  return NextResponse.json({
    ok: true,
    card,
    collection: updated,
    reward_pending: willCompleteReward,
    message: willCompleteReward
      ? `🎉 ${card.reward_text} 보상이 발급됐어요! 사장님께 보여주세요.`
      : `+1 스탬프 적립 완료! ${updated?.current_stamps}/${card.required_stamps}`,
  }, { headers: CORS })
}

// GET — 카드 정보 + 손님 적립 현황 조회 (전화번호 기반)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || ''
  const phone = normalizePhone(req.nextUrl.searchParams.get('phone') || '')

  if (!slug) return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS })

  const svc = createServiceClient()

  const { data: card } = await svc
    .from('stamp_cards')
    .select('*')
    .eq('store_slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (!card) return NextResponse.json({ ok: false, error: 'no_active_card' }, { status: 404, headers: CORS })

  let collection: any = null
  if (phone.length >= 10) {
    const { data } = await svc
      .from('stamp_collections')
      .select('*')
      .eq('stamp_card_id', card.id)
      .eq('customer_phone', phone)
      .maybeSingle()
    collection = data
  }

  return NextResponse.json({ ok: true, card, collection }, { headers: CORS })
}
