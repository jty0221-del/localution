import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

// slug 생성 (한글/영문/숫자만 남기고 나머지는 '-')
function makeSlug(name: string): string {
  if (!name) return ''
  let result = ''
  const lower = name.toLowerCase()
  for (let i = 0; i < lower.length; i++) {
    const c = lower.charCodeAt(i)
    const isAlpha = (c >= 97 && c <= 122)
    const isDigit = (c >= 48 && c <= 57)
    const isKorean = (c >= 0xAC00 && c <= 0xD7A3)
    result += (isAlpha || isDigit || isKorean) ? lower[i] : '-'
  }
  while (result.includes('--')) result = result.split('--').join('-')
  if (result.startsWith('-')) result = result.slice(1)
  if (result.endsWith('-')) result = result.slice(0, -1)
  return result || 'store-' + Date.now()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      slug: slugIn,
      name,
      category,
      location,
      address,
      naver_place_id,
      naver_url,
      main_keyword,
      sub_keywords,
      reward_type,
      reward_value,
    } = body || {}

    if (!name) {
      return NextResponse.json({ ok: false, error: 'name 필수' }, { status: 400 })
    }

    const slug = (slugIn && typeof slugIn === 'string' ? slugIn : makeSlug(name)) || makeSlug(name)

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || null

    const payload: any = {
      slug,
      name,
      category: category || null,
      location: location || null,
      address: address || null,
      naver_place_id: naver_place_id || null,
      naver_url: naver_url || null,
      main_keyword: main_keyword || null,
      sub_keywords: Array.isArray(sub_keywords) ? sub_keywords : [],
      reward_type: reward_type || null,
      reward_value: reward_value || null,
      user_id: userId,
    }

    // upsert by slug
    const { data, error } = await supabase
      .from('stores')
      .upsert(payload, { onConflict: 'slug' })
      .select('slug, name, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, slug: data.slug, store: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
