// app/api/platform-accounts/coupangeats-cookie/route.ts
// 쿠팡이츠 세션 쿠키 저장/조회
//   GET  → has_cookie 여부 반환
//   POST { cookie_json: "[{name,value,domain,...}]" } → extra_data.session_cookies 에 저장
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })

  const svc = createServiceClient()
  const { data } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', user.id)
    .eq('platform', 'coupangeats')
    .maybeSingle()

  const cookies = (data?.extra_data as any)?.session_cookies
  const hasCookie = Array.isArray(cookies) && cookies.length > 0
  return NextResponse.json({ ok: true, has_cookie: hasCookie, cookie_count: hasCookie ? cookies.length : 0 })
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 })

  // cookie_json: JSON 문자열 또는 배열 직접
  let cookies: any[]
  try {
    if (typeof body.cookie_json === 'string') {
      cookies = JSON.parse(body.cookie_json)
    } else if (Array.isArray(body.cookie_json)) {
      cookies = body.cookie_json
    } else if (Array.isArray(body.cookies)) {
      cookies = body.cookies
    } else {
      return NextResponse.json({ ok: false, error: 'cookie_json 필드가 필요합니다 (JSON 배열)' }, { status: 400 })
    }
    if (!Array.isArray(cookies) || cookies.length === 0) {
      return NextResponse.json({ ok: false, error: '유효한 쿠키 배열이 필요합니다' }, { status: 400 })
    }
    // 최소 유효성: 각 쿠키에 name, value 있는지
    const valid = cookies.every((c: any) => typeof c === 'object' && c.name && c.value !== undefined)
    if (!valid) return NextResponse.json({ ok: false, error: '각 쿠키에 name, value 필드가 필요합니다' }, { status: 400 })
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON 파싱 실패 — 올바른 JSON 배열인지 확인해주세요' }, { status: 400 })
  }

  const svc = createServiceClient()

  // 기존 extra_data 조회
  const { data: existing } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', user.id)
    .eq('platform', 'coupangeats')
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ ok: false, error: '쿠팡이츠 계정이 연결되어 있지 않습니다. 먼저 ID/PW를 등록해주세요.' }, { status: 404 })
  }

  const extraData = { ...(existing.extra_data as any || {}), session_cookies: cookies }

  const { error } = await svc
    .from('platform_credentials')
    .update({ extra_data: extraData, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('platform', 'coupangeats')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, saved: cookies.length })
}
