// app/api/stamps/export/route.ts
// ============================================================
// 사장님 — 적립 손님 목록 CSV 내보내기 (Excel 호환)
// GET /api/stamps/export?format=csv
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()

 const { data: card } = await svc
 .from('stamp_cards')
 .select('id, title, required_stamps, reward_text')
 .eq('user_id', auth.userId)
 .eq('active', true)
 .maybeSingle()

 if (!card) return NextResponse.json({ ok: false, error: 'no_card' }, { status: 404 })

 const { data: customers } = await svc
 .from('stamp_collections')
 .select('customer_phone, customer_name, current_stamps, total_collected, rewards_claimed, last_visit_at, enrolled_at, consent_marketing')
 .eq('stamp_card_id', card.id)
 .order('last_visit_at', { ascending: false })

 const rows = customers || []

 // CSV 생성 — UTF-8 BOM 포함 (Excel 한글 깨짐 방지)
 const header = ['이름', '전화번호', '현재 도장', '필요 도장', '누적 방문', '받은 보상', '마지막 방문', '등록일', '마케팅 동의']
 const csvRows = [header.join(',')]

 for (const c of rows) {
 const row = [
 escapeCsv(c.customer_name || '-'),
 escapeCsv(c.customer_phone || ''),
 String(c.current_stamps || 0),
 String(card.required_stamps),
 String(c.total_collected || 0),
 String(c.rewards_claimed || 0),
 c.last_visit_at ? new Date(c.last_visit_at).toLocaleString('ko-KR') : '-',
 c.enrolled_at ? new Date(c.enrolled_at).toLocaleDateString('ko-KR') : '-',
 c.consent_marketing ? 'Y' : 'N',
 ]
 csvRows.push(row.join(','))
 }

 const csv = '﻿' + csvRows.join('\n')
 const filename = `stamps_${new Date().toISOString().slice(0, 10)}.csv`

 return new NextResponse(csv, {
 headers: {
 'Content-Type': 'text/csv; charset=utf-8',
 'Content-Disposition': `attachment; filename="${filename}"`,
 },
 })
}

function escapeCsv(v: string): string {
 if (v.includes(',') || v.includes('"') || v.includes('\n')) {
 return '"' + v.replace(/"/g, '""') + '"'
 }
 return v
}
