// app/api/qr/track/route.ts
// ============================================================
// QR 손님 활동 추적 — 인증 불필요 (공개)
// POST { slug, event, meta? }
//
// · 손님이 /review/[slug] 페이지에서 호출
// · slug → stores.id, user_id 매핑하여 사장님 통계용 row insert
// · 개인정보 보호: IP/UA 해시만 저장 (raw 저장 금지)
// · rate limit: 같은 visitor_hash + 같은 event 60초 내 중복 차단
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_EVENTS = new Set([
 'scan', 'receipt_uploaded', 'receipt_verified',
 'photo_uploaded', 'ai_generated',
 'submitted_naver', 'submitted_google', 'submitted_kakao',
])

const CORS_HEADERS = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'POST, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
 return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function deviceKind(ua: string): 'mobile' | 'tablet' | 'desktop' {
 if (/iPad|tablet/i.test(ua)) return 'tablet'
 if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile'
 return 'desktop'
}

export async function POST(req: NextRequest) {
 let body: any = {}
 try { body = await req.json() } catch {
 return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: CORS_HEADERS })
 }

 const slug = String(body?.slug || '').trim()
 const event = String(body?.event || '').trim()
 const meta = body?.meta && typeof body.meta === 'object' ? body.meta : null

 if (!slug) {
 return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS_HEADERS })
 }
 if (!VALID_EVENTS.has(event)) {
 return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400, headers: CORS_HEADERS })
 }

 const svc = createServiceClient()

 // slug → store_id, user_id 매핑 (보안: stores 테이블에 실제 존재해야 함)
 const { data: storeRow } = await svc
 .from('stores')
 .select('id, user_id')
 .eq('slug', slug)
 .maybeSingle()
 // store 가 없어도 추적은 진행 (legacy slug 호환), store_id/user_id 만 null

 // 개인정보 해시 (IP + UA + 일별 솔트 — 같은 일자 내 같은 손님 추적, 다음날 다른 ID)
 const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0].trim()
 const ua = req.headers.get('user-agent') || ''
 const dayKey = new Date().toISOString().slice(0, 10)
 const visitorHash = createHash('sha256')
 .update(ip + '|' + ua + '|' + dayKey + '|' + (process.env.QR_TRACK_SALT || 'localution'))
 .digest('hex')
 .slice(0, 32)

 // 60초 내 같은 visitor + 같은 event 중복 차단 (특히 scan 페이지 새로고침 등)
 try {
 const sixtySecAgo = new Date(Date.now() - 60_000).toISOString()
 const { data: dupes } = await svc
 .from('qr_review_logs')
 .select('id')
 .eq('store_slug', slug)
 .eq('event_type', event)
 .eq('visitor_hash', visitorHash)
 .gte('created_at', sixtySecAgo)
 .limit(1)
 if (dupes && dupes.length > 0) {
 return NextResponse.json({ ok: true, deduped: true }, { headers: CORS_HEADERS })
 }
 } catch (_) {}

 try {
 await svc.from('qr_review_logs').insert({
 store_slug: slug,
 store_id: storeRow?.id || null,
 user_id: storeRow?.user_id || null,
 event_type: event,
 meta,
 visitor_hash: visitorHash,
 device_kind: deviceKind(ua),
 })
 } catch (e: any) {
 return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500, headers: CORS_HEADERS })
 }

 return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
}
