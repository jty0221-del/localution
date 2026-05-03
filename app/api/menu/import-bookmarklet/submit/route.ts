// app/api/menu/import-bookmarklet/submit/route.ts
// ============================================================
// 북마클릿이 추출한 메뉴 데이터 받기 + 스마트 증분 동기화
//   POST { token, items, mode? }
//
//   mode (선택):
//     · 'preview' (기본) - menu_imports 에 저장 후 사장님 미리보기
//     · 'auto-sync' - 즉시 menu_items 에 증분 적용
//                     · 새 메뉴 → INSERT
//                     · 가격 변경된 메뉴 → UPDATE
//                     · 동일한 메뉴 → SKIP
//   반환: { ok, added, updated, skipped, total }
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
  const mode = body?.mode === 'auto-sync' ? 'auto-sync' : 'preview'

  if (!token || token.length < 30) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400, headers: CORS })
  }
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_items', message: '메뉴를 1개 이상 추출해야 합니다.' }, { status: 400, headers: CORS })
  }

  const svc = createServiceClient()

  // 토큰으로 import_id + user_id 조회 (만료 30분)
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: importRow } = await svc
    .from('menu_imports')
    .select('id, user_id, store_id, status, created_at')
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

  // 데이터 정규화
  const normalized = items
    .filter((m: any) => m && m.name_ko)
    .map((m: any) => ({
      name_ko: String(m.name_ko || '').slice(0, 80).trim(),
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

  // ─── auto-sync 모드: 즉시 menu_items 에 증분 적용 ─────────
  if (mode === 'auto-sync') {
    // 기존 메뉴 로드 (active=true)
    const { data: existing } = await svc
      .from('menu_items')
      .select('id, name_ko, price, image_url, desc_ko')
      .eq('user_id', importRow.user_id)
      .eq('active', true)

    const existingMap = new Map<string, any>()
    for (const ex of (existing || [])) {
      existingMap.set(ex.name_ko.trim(), ex)
    }

    let added = 0
    let updated = 0
    let skipped = 0
    const toInsert: any[] = []
    const toUpdate: { id: string; patch: any }[] = []

    for (const item of normalized) {
      const ex = existingMap.get(item.name_ko)
      if (!ex) {
        // 새 메뉴
        toInsert.push({
          user_id: importRow.user_id,
          store_id: importRow.store_id,
          name_ko: item.name_ko,
          desc_ko: item.desc_ko,
          price: item.price,
          image_url: item.image_url,
          category: item.category,
          is_signature: item.is_signature,
          active: true,
        })
        added++
      } else if (ex.price !== item.price || (item.image_url && ex.image_url !== item.image_url) || (item.desc_ko && ex.desc_ko !== item.desc_ko)) {
        // 변경 감지
        const patch: any = { updated_at: new Date().toISOString() }
        if (ex.price !== item.price) patch.price = item.price
        if (item.image_url && ex.image_url !== item.image_url) patch.image_url = item.image_url
        if (item.desc_ko && ex.desc_ko !== item.desc_ko) patch.desc_ko = item.desc_ko
        toUpdate.push({ id: ex.id, patch })
        updated++
      } else {
        skipped++
      }
    }

    // INSERT batch
    if (toInsert.length > 0) {
      await svc.from('menu_items').insert(toInsert)
    }

    // UPDATE one by one (Supabase doesn't support batch update via this API)
    for (const u of toUpdate) {
      await svc.from('menu_items').update(u.patch).eq('id', u.id)
    }

    // import row 업데이트 (성공 처리)
    await svc.from('menu_imports').update({
      status: 'success',
      items: normalized,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_code: null,
      error_message: `auto-sync: +${added}개 추가, ${updated}개 업데이트, ${skipped}개 동일`,
    }).eq('id', importRow.id)

    return NextResponse.json({
      ok: true,
      mode: 'auto-sync',
      added,
      updated,
      skipped,
      total: normalized.length,
      message: `${added}개 새 메뉴 추가 / ${updated}개 가격 변경 / ${skipped}개 동일`,
    }, { headers: CORS })
  }

  // ─── preview 모드 (기본) ──────────────────────────────
  await svc.from('menu_imports').update({
    status: 'success',
    items: normalized,
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq('id', importRow.id)

  return NextResponse.json({
    ok: true,
    mode: 'preview',
    count: normalized.length,
    message: `${normalized.length}개 메뉴 전송 완료. 로컬루션 페이지로 돌아가세요.`,
  }, { headers: CORS })
}
