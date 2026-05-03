// app/api/menu/public/route.ts
// ============================================================
// 손님용 공개 메뉴 조회 (인증 불필요)
//   GET /api/menu/public?slug=xxxx
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { getEffectiveTheme } from '@/app/lib/menu-themes'

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
  const slug = req.nextUrl.searchParams.get('slug') || ''
  if (!slug) return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS })

  const svc = createServiceClient()

  const { data: store } = await svc
    .from('stores')
    .select('id, slug, name, address, phone, menu_theme')
    .eq('slug', slug)
    .maybeSingle()

  if (!store) return NextResponse.json({ ok: false, error: 'store_not_found' }, { status: 404, headers: CORS })

  const { data: items } = await svc
    .from('menu_items')
    .select('id, category, name_ko, name_en, name_ja, name_zh, desc_ko, desc_en, desc_ja, desc_zh, price, image_url, is_signature, is_new, is_soldout, display_order')
    .eq('store_slug', slug)
    .eq('active', true)
    .order('category')
    .order('display_order')

  const theme = getEffectiveTheme(store.menu_theme)

  return NextResponse.json({ ok: true, store, items: items || [], theme }, { headers: CORS })
}
