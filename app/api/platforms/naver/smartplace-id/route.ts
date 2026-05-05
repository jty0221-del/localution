// app/api/platforms/naver/smartplace-id/route.ts
// SmartPlace 사업자 ID 조회 및 저장
// GET → extra_data.smartplace_biz_id 반환
// GET ?set=10441797 → bizId 바로 저장 (브라우저 주소창으로 등록 가능)
// POST → { biz_id: string } → extra_data 에 저장
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status })
 const svc = createServiceClient()

 // ?set=BIZID 파라미터로 바로 저장
 const setBizId = req.nextUrl.searchParams.get('set')
 if (setBizId) {
 if (!/^\d+$/.test(setBizId.trim())) {
 return NextResponse.json({ ok: false, error: 'biz_id 가 숫자여야 해요' }, { status: 400 })
 }
 const { data: cur } = await svc
 .from('platform_credentials')
 .select('extra_data')
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 .maybeSingle()
 const prevExtra = (cur?.extra_data as any) ?? {}
 const { error } = await svc
 .from('platform_credentials')
 .update({ extra_data: { ...prevExtra, smartplace_biz_id: setBizId.trim() } })
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, biz_id: setBizId.trim(), message: 'SmartPlace bizId 저장 완료!' })
 }

 const { data } = await svc
 .from('platform_credentials')
 .select('extra_data, platform_store_id')
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 .maybeSingle()
 const bizId = (data?.extra_data as any)?.smartplace_biz_id || null
 return NextResponse.json({ ok: true, biz_id: bizId, place_id: data?.platform_store_id || null })
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status })
 let body: any = {}
 try { body = await req.json() } catch {}
 const bizId = String(body?.biz_id || '').trim()
 if (!bizId || !/^\d+$/.test(bizId)) {
 return NextResponse.json({ ok: false, error: 'biz_id 가 숫자여야 해요' }, { status: 400 })
 }
 const svc = createServiceClient()
 const { data: cur } = await svc
 .from('platform_credentials')
 .select('extra_data')
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 .maybeSingle()
 const prevExtra = (cur?.extra_data as any) ?? {}
 const { error } = await svc
 .from('platform_credentials')
 .update({ extra_data: { ...prevExtra, smartplace_biz_id: bizId } })
 .eq('user_id', auth.userId)
 .eq('platform', 'naver_place')
 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, biz_id: bizId })
}
