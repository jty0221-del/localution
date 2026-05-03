// app/api/menu/translate-public/route.ts
// ============================================================
// 손님용 공개 메뉴 자동 번역
//   POST /api/menu/translate-public  body: { slug, lang }
//   · 인증 X — 공개 메뉴 페이지에서 호출
//   · 매장의 메뉴 중 해당 언어 필드(name_<lang>)가 비어있는 것만 Papago 번역 후 DB 저장
//   · 한 번 번역되면 캐싱됨 → 다음 손님부터 즉시 표시
//   · 비용 제한: 최대 50개 메뉴까지만 번역
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30  // Vercel function timeout (초)

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

async function translatePapago(text: string, target: string, clientId: string, clientSecret: string): Promise<string | null> {
  if (!text.trim()) return null
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
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const json: any = await res.json()
    return json?.message?.result?.translatedText || null
  } catch {
    return null
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
      message: 'NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수 없음 — 사장님이 Vercel에 추가 필요',
    }, { status: 500, headers: CORS })
  }

  const svc = createServiceClient()

  // 매장 확인
  const { data: store } = await svc
    .from('stores')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle()
  if (!store) return NextResponse.json({ ok: false, error: 'store_not_found' }, { status: 404, headers: CORS })

  // 해당 lang 필드(name_<lang>)가 비어있는 메뉴 조회 (최대 50개)
  const nameField = `name_${lang}`
  const descField = `desc_${lang}`
  const { data: items } = await svc
    .from('menu_items')
    .select(`id, name_ko, desc_ko, ${nameField}, ${descField}`)
    .eq('store_id', store.id)
    .eq('active', true)
    .or(`${nameField}.is.null,${nameField}.eq.`)
    .limit(50)

  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, translated_count: 0, message: '번역할 메뉴 없음 (이미 번역됨)' }, { headers: CORS })
  }

  const target = PAPAGO_TARGET[lang]
  let translatedCount = 0
  const errors: string[] = []

  // 순차 번역 (Papago rate limit 고려)
  for (const item of items as any[]) {
    const ko = item.name_ko
    const koDesc = item.desc_ko
    if (!ko) continue

    const translatedName = await translatePapago(ko, target, clientId, clientSecret)
    let translatedDesc: string | null = null
    if (koDesc) {
      translatedDesc = await translatePapago(koDesc, target, clientId, clientSecret)
    }

    if (translatedName) {
      const update: any = { [nameField]: translatedName, updated_at: new Date().toISOString() }
      if (translatedDesc) update[descField] = translatedDesc
      const { error } = await svc.from('menu_items').update(update).eq('id', item.id)
      if (error) {
        errors.push(`item ${item.id}: ${error.message}`)
      } else {
        translatedCount++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    translated_count: translatedCount,
    total_to_translate: items.length,
    errors: errors.slice(0, 5),
  }, { headers: CORS })
}
