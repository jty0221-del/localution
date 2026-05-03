// app/api/menu/theme/route.ts
// ============================================================
// 메뉴판 테마 조회/저장
//   GET  /api/menu/theme         → 본인 매장 테마
//   POST /api/menu/theme         → 테마 저장 { preset, custom? }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { getEffectiveTheme, THEME_PRESETS } from '@/app/lib/menu-themes'
import { MENU_TEMPLATES } from '@/app/lib/menu-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data: store } = await svc
    .from('stores')
    .select('id, slug, name, menu_theme')
    .eq('user_id', auth.userId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    menu_theme: store?.menu_theme || null,
    effective: getEffectiveTheme(store?.menu_theme),
    template_id: (store?.menu_theme as any)?.template_id || 'list-default',
    store: store ? { id: store.id, slug: store.slug, name: store.name } : null,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const presetId = String(body?.preset || '').trim()
  const valid = THEME_PRESETS.some(p => p.id === presetId)
  if (!valid) return NextResponse.json({ ok: false, error: 'invalid_preset' }, { status: 400 })

  // template_id 검증 (있으면)
  let templateId: string | null = null
  if (body?.template_id) {
    const tid = String(body.template_id).trim()
    if (MENU_TEMPLATES.some(t => t.id === tid)) {
      templateId = tid
    }
  }

  // custom 검증 — 허용된 키만
  let custom: any = null
  if (body?.custom && typeof body.custom === 'object') {
    const allowed = ['primary_color', 'accent_color', 'bg_color', 'surface_color', 'text_color',
      'text_muted', 'border_color', 'font_family', 'card_style', 'category_layout',
      'header_style', 'header_image_url', 'badge_style']
    custom = {}
    for (const k of allowed) {
      if (body.custom[k] !== undefined && body.custom[k] !== null) {
        custom[k] = String(body.custom[k]).slice(0, 200)
      }
    }
    if (Object.keys(custom).length === 0) custom = null
  }

  const svc = createServiceClient()
  const { error } = await svc
    .from('stores')
    .update({ menu_theme: { preset: presetId, custom, template_id: templateId } })
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
