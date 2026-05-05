// app/api/stamps/my/route.ts
// ============================================================
// 손님 — 본인의 모든 매장 스탬프 카드 조회
// GET /api/stamps/my?phone=01012345678
// · 인증 불필요 (전화번호로 조회)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'GET, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
 return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
 // Rate limit: IP당 분당 5회 (phone enumerate 공격 1차 방어)
 const rl = rateLimitByIp(req, 'stamps-my', 5, 60)
 if (!rl.ok) {
 return NextResponse.json(
 { ok: false, error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` },
 { status: 429, headers: CORS }
 )
 }

 const phone = String(req.nextUrl.searchParams.get('phone') || '').replace(/[^0-9]/g, '').slice(0, 11)
 // 한국 휴대전화 형식 검증 (010/011/016~019)
 if (!/^01[016-9][0-9]{7,8}$/.test(phone)) {
 return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400, headers: CORS })
 }

 const svc = createServiceClient()

 const { data: collections } = await svc
 .from('stamp_collections')
 .select('id, current_stamps, total_collected, rewards_claimed, last_visit_at, enrolled_at, stamp_card_id')
 .eq('customer_phone', phone)
 .order('last_visit_at', { ascending: false })

 if (!collections || collections.length === 0) {
 return NextResponse.json({ ok: true, cards: [] }, { headers: CORS })
 }

 const cardIds = collections.map(c => c.stamp_card_id)
 const { data: cards } = await svc
 .from('stamp_cards')
 .select('id, store_slug, title, description, required_stamps, reward_text, theme_color, bg_pattern, icon_emoji, store_id')
 .in('id', cardIds)
 .eq('active', true)

 // 매장명 join
 const storeIds = (cards || []).map(c => c.store_id).filter(Boolean)
 let storeMap: Record<string, string> = {}
 if (storeIds.length > 0) {
 const { data: stores } = await svc
 .from('stores')
 .select('id, name')
 .in('id', storeIds)
 if (stores) {
 storeMap = Object.fromEntries(stores.map((s: any) => [s.id, s.name]))
 }
 }

 const cardMap: Record<string, any> = Object.fromEntries((cards || []).map((c: any) => [c.id, c]))

 const result = collections
 .map(col => {
 const card = cardMap[col.stamp_card_id]
 if (!card) return null
 return {
 collection_id: col.id,
 store_name: storeMap[card.store_id] || card.title,
 store_slug: card.store_slug,
 title: card.title,
 description: card.description,
 required_stamps: card.required_stamps,
 reward_text: card.reward_text,
 theme_color: card.theme_color,
 bg_pattern: card.bg_pattern,
 icon_emoji: card.icon_emoji,
 current_stamps: col.current_stamps,
 total_collected: col.total_collected,
 rewards_claimed: col.rewards_claimed,
 last_visit_at: col.last_visit_at,
 enrolled_at: col.enrolled_at,
 }
 })
 .filter(Boolean)

 return NextResponse.json({ ok: true, cards: result }, { headers: CORS })
}
