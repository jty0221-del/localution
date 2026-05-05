import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { rateLimit, getClientIp } from '@/app/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 43차-2:
// · in-memory store 제거 → Supabase public.inquiries 로 이관 (콜드스타트 유실 해결)
// · 비로그인 POST 는 IP 기준 레이트 리밋 (시간당 5회)
// · 본인 조회(?mine=true&ids=...)는 인증 없이 허용, id 명시 필수

type DbInquiry = {
 id: string
 name: string
 contact: string | null
 category: string
 message: string
 status: 'new' | 'replied' | 'completed'
 reply: string | null
 replied_at: string | null
 completed_at: string | null
 created_at: string
}

function shape(row: DbInquiry) {
 return {
 id: row.id,
 name: row.name,
 contact: row.contact ?? '',
 category: row.category,
 message: row.message,
 status: row.status,
 createdAt: row.created_at,
 reply: row.reply,
 repliedAt: row.replied_at,
 completedAt: row.completed_at,
 }
}

export async function POST(req: NextRequest) {
 try {
 // 비로그인 공개 엔드포인트 — IP 기반 spam 방지 (시간당 5회)
 const ip = getClientIp(req)
 const rl = await rateLimit({ bucket: 'inquiry', id: `ip:${ip}`, limit: 5, windowSec: 3600 })
 if (!rl.ok) {
 return NextResponse.json(
 { error: '문의가 너무 많습니다. 잠시 후 다시 시도해 주세요.', retryAfter: rl.retryAfter },
 { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
 )
 }

 const body = await req.json().catch(() => ({}))
 const { name, contact, category, message } = body as {
 name?: string; contact?: string; category?: string; message?: string
 }

 if (!name?.trim() || !message?.trim()) {
 return NextResponse.json({ error: '이름과 문의 내용은 필수입니다.' }, { status: 400 })
 }

 const svc = createServiceClient()
 const insert = {
 name: name.trim(),
 contact: contact?.trim() || '',
 category: category || '일반문의',
 message: message.trim(),
 }

 const { data, error } = await svc
 .from('inquiries')
 .insert(insert)
 .select('id, created_at')
 .single()

 if (error || !data) {
 console.error('[inquiry POST] db error:', error?.message)
 return NextResponse.json({ error: '저장 실패' }, { status: 500 })
 }

 // Notion 연동(선택) — 실패해도 본 요청은 성공 처리
 const notionKey = process.env.NOTION_API_KEY
 const notionDb = process.env.NOTION_INQUIRY_DB
 if (notionKey && notionDb) {
 try {
 await fetch('https://api.notion.com/v1/pages', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${notionKey}`,
 'Content-Type': 'application/json',
 'Notion-Version': '2022-06-28',
 },
 body: JSON.stringify({
 parent: { database_id: notionDb },
 properties: {
 '이름': { title: [{ text: { content: insert.name } }] },
 '연락처': { rich_text:[{ text: { content: insert.contact } }] },
 '분류': { select: { name: insert.category } },
 '상태': { select: { name: '신규' } },
 '접수일': { date: { start: data.created_at } },
 },
 children: [{
 object: 'block', type: 'paragraph',
 paragraph: { rich_text: [{ text: { content: insert.message } }] },
 }],
 }),
 })
 } catch (e) {
 console.error('[inquiry POST] Notion sync failed:', e)
 }
 }

 return NextResponse.json({ success: true, id: data.id })
 } catch (err) {
 console.error('[inquiry POST] exception:', err)
 return NextResponse.json({ error: '서버 오류' }, { status: 500 })
 }
}

// GET: 관리자 조회(전체) OR 본인 조회(?mine=true&ids=id1,id2,...)
export async function GET(req: NextRequest) {
 try {
 const { searchParams } = new URL(req.url)
 const mine = searchParams.get('mine') === 'true'
 const idsParam = searchParams.get('ids') || ''
 const svc = createServiceClient()

 if (mine) {
 const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
 if (ids.length === 0) return NextResponse.json({ inquiries: [] })

 const { data, error } = await svc
 .from('inquiries')
 .select('*')
 .in('id', ids)
 .order('created_at', { ascending: false })

 if (error) return NextResponse.json({ error: 'DB 조회 실패' }, { status: 500 })
 return NextResponse.json({ inquiries: (data as DbInquiry[]).map(shape) })
 }

 // 관리자 조회
 const admin = await requireAdmin()
 if (!admin.ok) {
 return NextResponse.json({ error: admin.message }, { status: admin.status })
 }

 const { data, error } = await svc
 .from('inquiries')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(500)

 if (error) return NextResponse.json({ error: 'DB 조회 실패' }, { status: 500 })

 const rows = (data as DbInquiry[]) || []
 const summary = {
 total: rows.length,
 new: rows.filter(i => i.status === 'new').length,
 replied: rows.filter(i => i.status === 'replied').length,
 completed: rows.filter(i => i.status === 'completed').length,
 }
 return NextResponse.json({ inquiries: rows.map(shape), summary })
 } catch (err) {
 console.error('[inquiry GET] exception:', err)
 return NextResponse.json({ error: '서버 오류' }, { status: 500 })
 }
}

// PATCH: 관리자 답변 작성 / 완료 처리
export async function PATCH(req: NextRequest) {
 try {
 const admin = await requireAdmin()
 if (!admin.ok) {
 return NextResponse.json({ error: admin.message }, { status: admin.status })
 }

 const { id, reply, status, markCompleted } = (await req.json()) as {
 id: string; reply?: string; status?: DbInquiry['status']; markCompleted?: boolean
 }
 if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

 const svc = createServiceClient()
 const { data: existing, error: selErr } = await svc
 .from('inquiries')
 .select('*')
 .eq('id', id)
 .maybeSingle()

 if (selErr || !existing) {
 return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 })
 }

 const patch: Partial<DbInquiry> = {}
 if (typeof reply === 'string' && reply.trim().length > 0) {
 patch.reply = reply.trim()
 patch.replied_at = new Date().toISOString()
 if (existing.status !== 'completed') patch.status = 'replied'
 }
 if (markCompleted === true) {
 patch.status = 'completed'
 patch.completed_at = new Date().toISOString()
 } else if (status && ['new', 'replied', 'completed'].includes(status)) {
 patch.status = status
 if (status === 'completed' && !existing.completed_at) {
 patch.completed_at = new Date().toISOString()
 }
 }

 if (Object.keys(patch).length === 0) {
 return NextResponse.json({ success: true, inquiry: shape(existing as DbInquiry) })
 }

 const { data: updated, error: updErr } = await svc
 .from('inquiries')
 .update(patch)
 .eq('id', id)
 .select('*')
 .single()

 if (updErr || !updated) {
 return NextResponse.json({ error: '저장 실패' }, { status: 500 })
 }
 return NextResponse.json({ success: true, inquiry: shape(updated as DbInquiry) })
 } catch (err) {
 console.error('[inquiry PATCH] exception:', err)
 return NextResponse.json({ error: '서버 오류' }, { status: 500 })
 }
}
