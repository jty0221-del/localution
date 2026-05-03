// app/api/menu/translate-public/route.ts
// ============================================================
// 손님용 공개 메뉴 자동 번역 (디버그 강화 v2)
//   POST /api/menu/translate-public  body: { slug, lang }
//   · 인증 X — 공개 메뉴 페이지에서 호출
//   · Papago 호출 결과의 정확한 에러 정보 errors 배열에 누적
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60  // 14개 메뉴 순차 번역 위해 늘림

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

const PAPAGO_URL = 'https://openapi.naver.com/v1/papago/n2mt'
const SUPPORTED_LANGS = ['en', 'ja', 'zh'] as const
type SupportedLang = typeof SUPPORTED_LANGS[number]

// Papago target 코드 매핑 (zh → zh-CN)
const PAPAGO_TARGET: Record<SupportedLang, string> = {
  en: 'en',
  ja: 'ja',
  zh: 'zh-CN',
}

type PapagoResult =
  | { ok: true; translated: string }
  | { ok: false; reason: string; status?: number; body?: string }

async function translatePapago(text: string, target: string, clientId: string, clientSecret: string): Promise<PapagoResult> {
  if (!text.trim()) return { ok: false, reason: 'empty_text' }
  try {
    const params = new URLSearchParams({ source: 'ko', target, text: text.slice(0, 500) })
    const res = await fetch(PAPAGO_URL, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, reason: `http_${res.status}`, status: res.status, body: body.slice(0, 300) }
    }
    const json: any = await res.json()
    const translated = json?.message?.result?.translatedText
    if (!translated) {
      return { ok: false, reason: 'no_translation', body: JSON.stringify(json).slice(0, 300) }
    }
    return { ok: true, translated }
  } catch (e: any) {
    return { ok: false, reason: 'exception', body: String(e?.message || e).slice(0, 300) }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const slug = String(body?.slug || '').trim()
  const lang = String(body?.lang || '').trim() as SupportedLang

  if (!slug) return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS })
  if (!SUPPORTED_LANGS.includes(lang)) {
    return NextResponse.json({ ok: false, error: 'unsupported_lang', supported: SUPPORTED_LANGS }, { status: 400, headers: CORS })
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({
      ok: false,
      error: 'no_credentials',
      message: 'NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수 없음 — Vercel에 추가 필요',
      has_id: !!clientId,
      has_secret: !!clientSecret,
    }, { status: 500, headers: CORS })
  }

  const svc = createServiceClient()

  // 매장 확인
  const { data: store, error: storeError } = await svc
    .from('stores')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle()
  if (storeError) {
    return NextResponse.json({ ok: false, error: 'store_lookup_failed', message: storeError.message }, { status: 500, headers: CORS })
  }
  if (!store) return NextResponse.json({ ok: false, error: 'store_not_found' }, { status: 404, headers: CORS })

  const nameField = `name_${lang}`
  const descField = `desc_${lang}`

  // 해당 lang 필드(name_<lang>)가 비어있는 메뉴 조회 (최대 50개)
  // Supabase or 필터 syntax: 'col.is.null,col.eq.""' (빈 문자열은 따옴표 필요할 수도)
  const { data: items, error: itemsError } = await svc
    .from('menu_items')
    .select(`id, name_ko, desc_ko, ${nameField}, ${descField}`)
    .eq('store_id', store.id)
    .eq('active', true)
    .limit(50)

  if (itemsError) {
    return NextResponse.json({ ok: false, error: 'items_lookup_failed', message: itemsError.message }, { status: 500, headers: CORS })
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, translated_count: 0, message: '메뉴 없음' }, { headers: CORS })
  }

  // 클라이언트 측에서 비어있는 것만 필터 (Supabase or 필터가 까다로워서)
  const toTranslate = (items as any[]).filter(it => !it[nameField] || it[nameField] === '')

  if (toTranslate.length === 0) {
    return NextResponse.json({ ok: true, translated_count: 0, message: '이미 번역됨' }, { headers: CORS })
  }

  const target = PAPAGO_TARGET[lang]
  let translatedCount = 0
  const errors: any[] = []
  const successes: any[] = []

  // 순차 번역 (Papago rate limit 고려)
  for (const item of toTranslate) {
    const ko = item.name_ko
    const koDesc = item.desc_ko
    if (!ko) {
      errors.push({ id: item.id, reason: 'no_name_ko' })
      continue
    }

    const nameResult = await translatePapago(ko, target, clientId, clientSecret)
    let descResult: PapagoResult | null = null
    if (koDesc) {
      descResult = await translatePapago(koDesc, target, clientId, clientSecret)
    }

    if (nameResult.ok) {
      const update: any = { [nameField]: nameResult.translated, updated_at: new Date().toISOString() }
      if (descResult?.ok) update[descField] = descResult.translated
      const { error: updateError } = await svc.from('menu_items').update(update).eq('id', item.id)
      if (updateError) {
        errors.push({ id: item.id, reason: 'db_update_failed', message: updateError.message.slice(0, 200) })
      } else {
        translatedCount++
        successes.push({ id: item.id, ko: ko.slice(0, 30), translated: nameResult.translated.slice(0, 50) })
      }
    } else {
      errors.push({ id: item.id, ko: ko.slice(0, 30), papago: nameResult })
    }
  }

  return NextResponse.json({
    ok: true,
    translated_count: translatedCount,
    total_to_translate: toTranslate.length,
    successes: successes.slice(0, 3),
    errors: errors.slice(0, 5),
    debug: {
      slug,
      lang,
      target,
      store_id: store.id,
      items_total: items.length,
    },
  }, { headers: CORS })
}
