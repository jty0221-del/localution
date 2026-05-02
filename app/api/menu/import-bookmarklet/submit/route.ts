// app/api/menu/import-bookmarklet/submit/route.ts
// ============================================================
// 북마클릿이 네이버 페이지에서 추출한 메뉴 데이터 받기
//   POST { token, items }
//   · 인증: token 으로 menu_imports row 매핑
//   · CORS: 모든 origin 허용 (naver 페이지에서 호출)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  let body: any = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: CORS })
  }

  const token = String(body?.token || '').trim()
  const items = Array.isArray(body?.items) ? body.items : []

  if (!token || token.length < 30) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400, headers: CORS })
  }
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_items', message: '메뉴를 1개 이상 추출해야 합니다.' }, { status: 400, headers: CORS })
  }

  const svc = createServiceClient()

  // 토큰으로 import_id 찾기 (만료 30분)
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: importRow } = await svc
    .from('menu_imports')
    .select('id, status, created_at')
    .eq('job_id', token)
    .gte('created_at', cutoff)
    .maybeSingle()

  if (!importRow) {
    return NextResponse.json({
      ok: false,
      error: 'token_invalid_or_expired',
      message: '토큰이 만료됐거나 잘못됐어요. 로컬루션에서 새로 생성해주세요.',
    }, { status: 404, headers: CORS })
  }

  if (importRow.status === 'success') {
    return NextResponse.json({ ok: false, error: 'already_used', message: '이미 사용된 토큰입니다.' }, { status: 409, headers: CORS })
  }

  // 데이터 정규화
  const normalized = items
    .filter((m: any) => m && m.name_ko)
    .map((m: any) => ({
      name_ko: String(m.name_ko || '').slice(0, 80),
      name_en: m.name_en ? String(m.name_en).slice(0, 80) : null,
      name_ja: m.name_ja ? String(m.name_ja).slice(0, 80) : null,
      name_zh: m.name_zh ? String(m.name_zh).slice(0, 80) : null,
      desc_ko: m.desc_ko ? String(m.desc_ko).slice(0, 200) : null,
      price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
      image_url: m.image_url ? String(m.image_url).slice(0, 500) : null,
      category: m.category ? String(m.category).slice(0, 40) : null,
      is_signature: !!m.is_signature,
    }))
    .filter((m: any) => m.name_ko)
    .slice(0, 200)

  if (normalized.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_valid_items' }, { status: 400, headers: CORS })
  }

  await svc.from('menu_imports').update({
    status: 'success',
    items: normalized,
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq('id', importRow.id)

  return NextResponse.json({
    ok: true,
    count: normalized.length,
    message: `${normalized.length}개 메뉴 전송 완료. 로컬루션 페이지로 돌아가세요.`,
  }, { headers: CORS })
}
