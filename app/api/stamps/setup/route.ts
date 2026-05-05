// app/api/stamps/setup/route.ts
// ============================================================
// 사장님 — 스탬프 카드 설정 조회/저장
// GET /api/stamps/setup → 본인 매장 active 카드 + store info
// POST /api/stamps/setup → 카드 생성/수정 (1매장 = 1active)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()

 const { data: store } = await svc
 .from('stores')
 .select('id, slug, name')
 .eq('user_id', auth.userId)
 .maybeSingle()

 const { data: card } = await svc
 .from('stamp_cards')
 .select('*')
 .eq('user_id', auth.userId)
 .eq('active', true)
 .maybeSingle()

 let stats: any = { customers: 0, total_stamps: 0, rewards_claimed: 0 }
 if (card) {
 const { data: cols } = await svc
 .from('stamp_collections')
 .select('current_stamps, total_collected, rewards_claimed')
 .eq('stamp_card_id', card.id)
 if (cols) {
 stats = {
 customers: cols.length,
 total_stamps: cols.reduce((s: number, c: any) => s + (c.total_collected || 0), 0),
 rewards_claimed: cols.reduce((s: number, c: any) => s + (c.rewards_claimed || 0), 0),
 }
 }
 }

 return NextResponse.json({ ok: true, card, store, stats })
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json().catch(() => ({}))
 const svc = createServiceClient()

 const { data: store } = await svc
 .from('stores')
 .select('id, slug')
 .eq('user_id', auth.userId)
 .maybeSingle()

 const themeColor = (body.theme_color || '').match(/^#[0-9A-Fa-f]{6}$/) ? body.theme_color : '#3182F6'

 // 단계별 보상 (milestones) — 5회 = 군만두, 10회 = 탕수육 같은 패턴
 let milestones: Array<{ at: number; reward: string }> = []
 if (Array.isArray(body.milestones)) {
 milestones = body.milestones
 .filter((m: any) => m && m.reward && m.at)
 .map((m: any) => ({
 at: Math.max(1, Math.min(30, parseInt(String(m.at), 10))),
 reward: String(m.reward).slice(0, 100),
 }))
 .sort((a: any, b: any) => a.at - b.at)
 .slice(0, 5)
 }

 const payload: any = {
 user_id: auth.userId,
 store_id: store?.id || null,
 store_slug: store?.slug || body.slug || null,
 title: String(body.title || '단골 도장 카드').slice(0, 80),
 description: body.description ? String(body.description).slice(0, 200) : null,
 owner_name: body.owner_name ? String(body.owner_name).slice(0, 40) : null,
 owner_phone: body.owner_phone ? String(body.owner_phone).slice(0, 20) : null,
 required_stamps: Math.max(3, Math.min(30, parseInt(String(body.required_stamps || '10'), 10))),
 reward_text: String(body.reward_text || '음료 1잔 무료').slice(0, 100),
 theme_color: themeColor,
 bg_pattern: 'solid',
 icon_emoji: '·',
 milestones,
 active: true,
 updated_at: new Date().toISOString(),
 }

 const { data: existing } = await svc
 .from('stamp_cards')
 .select('id')
 .eq('user_id', auth.userId)
 .eq('active', true)
 .maybeSingle()

 if (existing) {
 const { error } = await svc.from('stamp_cards').update(payload).eq('id', existing.id)
 if (error) return NextResponse.json({ ok: false, error: 'update_failed', message: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, id: existing.id, updated: true })
 } else {
 const { data, error } = await svc.from('stamp_cards').insert(payload).select('id').single()
 if (error) return NextResponse.json({ ok: false, error: 'insert_failed', message: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, id: data.id, created: true })
 }
}
