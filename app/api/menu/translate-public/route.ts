// app/api/menu/translate-public/route.ts
// ============================================================
// 손님용 공개 메뉴 자동 번역 (Claude 기반 v3)
//   POST /api/menu/translate-public  body: { slug, lang }
//   · 인증 X — 공개 메뉴 페이지에서 호출
//   · Anthropic Claude API 사용 (음식 메뉴 번역 품질 우수)
//   · 모든 메뉴를 한 번의 API 호출로 일괄 번역 (비용/속도 효율)
//   · 환경변수: ANTHROPIC_API_KEY (이미 다른 기능에서 사용 중)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

const SUPPORTED_LANGS = ['en', 'ja', 'zh'] as const
type SupportedLang = typeof SUPPORTED_LANGS[number]

const LANG_NAMES: Record<SupportedLang, string> = {
  en: 'English',
  ja: 'Japanese (日本語)',
  zh: 'Simplified Chinese (简体中文)',
}

// Claude로 메뉴 일괄 번역 — 모든 메뉴를 한 번의 호출로
async function translateMenusWithClaude(
  items: { id: string; name_ko: string; desc_ko: string | null }[],
  targetLang: SupportedLang,
  apiKey: string,
): Promise<{ ok: boolean; translations?: { id: string; name: string; desc: string | null }[]; error?: string; raw?: string }> {

  // 입력을 JSON 배열로 정리 (Claude가 안전하게 파싱)
  const input = items.map(it => ({
    id: it.id,
    name: it.name_ko,
    desc: it.desc_ko || '',
  }))

  const systemPrompt = `You are a professional menu translator specializing in Korean restaurant menus. Translate Korean menu items to ${LANG_NAMES[targetLang]}. Keep the translations natural, appetizing, and concise. For Korean dish names that are well-known internationally (e.g., kimchi, bibimbap), use the standard romanization. For descriptions, keep them brief but vivid.

Return ONLY a valid JSON array (no markdown, no extra text) with this exact structure:
[{"id": "<id>", "name": "<translated name>", "desc": "<translated description or empty string>"}]`

  const userPrompt = `Translate these ${items.length} Korean menu items to ${LANG_NAMES[targetLang]}:\n\n${JSON.stringify(input, null, 2)}\n\nReturn the JSON array only.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',  // 빠르고 저렴, 번역 품질 충분 (다른 곳에서도 사용 중)
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `claude_http_${res.status}`, raw: body.slice(0, 500) }
    }

    const data = await res.json()
    const text = data?.content?.[0]?.text
    if (!text) {
      return { ok: false, error: 'no_text_response', raw: JSON.stringify(data).slice(0, 500) }
    }

    // JSON 추출 (Claude가 마크다운 블록으로 감쌀 수도)
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    }
    // [ ... ] 부분만 추출 (혹시 앞뒤 텍스트가 있으면)
    const arrayStart = jsonText.indexOf('[')
    const arrayEnd = jsonText.lastIndexOf(']')
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      jsonText = jsonText.slice(arrayStart, arrayEnd + 1)
    }

    const parsed = JSON.parse(jsonText)
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'not_array', raw: jsonText.slice(0, 500) }
    }

    const translations = parsed
      .filter((x: any) => x && typeof x.id === 'string' && typeof x.name === 'string')
      .map((x: any) => ({
        id: x.id,
        name: String(x.name).slice(0, 200),
        desc: x.desc ? String(x.desc).slice(0, 500) : null,
      }))

    return { ok: true, translations }
  } catch (e: any) {
    return { ok: false, error: 'exception', raw: String(e?.message || e).slice(0, 500) }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const slug = String(body?.slug || '').trim()
  const lang = String(body?.lang || '').trim() as SupportedLang

  if (!slug) return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400, headers: CORS })

  // Rate limit: IP+slug 단위 분당 3회 (Claude 비용 폭주 방지)
  const rl = rateLimitByIp(req, `menu-translate:${slug}`, 3, 60)
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` },
      { status: 429, headers: CORS }
    )
  }
  if (!SUPPORTED_LANGS.includes(lang)) {
    return NextResponse.json({ ok: false, error: 'unsupported_lang', supported: SUPPORTED_LANGS }, { status: 400, headers: CORS })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_credentials',
      message: 'ANTHROPIC_API_KEY 환경변수 없음',
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

  // 메뉴 조회 (모두) — 클라 측에서 비어있는 것 필터
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

  // 비어있는 것만 필터
  const toTranslate = (items as any[])
    .filter(it => !it[nameField] || it[nameField] === '')
    .filter(it => it.name_ko)
    .map(it => ({ id: it.id, name_ko: it.name_ko, desc_ko: it.desc_ko }))

  if (toTranslate.length === 0) {
    return NextResponse.json({ ok: true, translated_count: 0, message: '이미 번역됨' }, { headers: CORS })
  }

  // Claude 일괄 번역
  const result = await translateMenusWithClaude(toTranslate, lang, apiKey)
  if (!result.ok || !result.translations) {
    return NextResponse.json({
      ok: false,
      error: result.error || 'translate_failed',
      raw: result.raw,
      total_to_translate: toTranslate.length,
    }, { status: 502, headers: CORS })
  }

  // DB 일괄 업데이트
  let translatedCount = 0
  const errors: any[] = []
  const successes: any[] = []
  const idMap = new Map(toTranslate.map(it => [it.id, it]))

  for (const tr of result.translations) {
    const original = idMap.get(tr.id)
    if (!original) continue
    const update: any = {
      [nameField]: tr.name,
      updated_at: new Date().toISOString(),
    }
    if (tr.desc) update[descField] = tr.desc
    const { error: updateError } = await svc.from('menu_items').update(update).eq('id', tr.id)
    if (updateError) {
      errors.push({ id: tr.id, message: updateError.message.slice(0, 200) })
    } else {
      translatedCount++
      successes.push({ ko: original.name_ko.slice(0, 30), translated: tr.name.slice(0, 50) })
    }
  }

  return NextResponse.json({
    ok: true,
    translated_count: translatedCount,
    total_to_translate: toTranslate.length,
    successes: successes.slice(0, 3),
    errors: errors.slice(0, 5),
    debug: { slug, lang, model: 'claude-haiku-4-5', store_id: store.id },
  }, { headers: CORS })
}
