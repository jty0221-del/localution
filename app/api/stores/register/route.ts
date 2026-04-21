// app/api/stores/register/route.ts
// ============================================================
// 30차-10: /settings "저장하기" 에서 RLS policy violation 핫픽스
//   - 기존: @/utils/supabase/server 의 createClient() (anon 기반) + auth.getUser()
//     → localution_user 쿠키 기반 커스텀 auth 와 Supabase auth 연동 없음
//     → user_id=null 로 insert 시도 → stores RLS 차단
//   - 수정: requireUser() + createServiceClient() 로 통일
//     (/api/stores/me 와 동일한 인증 패턴)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
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

// placeId 추출 (URL 이면 URL 에서, 숫자만이면 그대로)
function extractPlaceIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const s = String(url).trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return s
  const m1 = s.match(/m\.place\.naver\.com\/[a-z]+\/(\d+)/i)
  if (m1) return m1[1]
  const m2 = s.match(/map\.naver\.com\/[^\s]*place\/(\d+)/i)
  if (m2) return m2[1]
  const m3 = s.match(/place\.naver\.com\/[a-z]+\/(\d+)/i)
  if (m3) return m3[1]
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId

  try {
    const body = await req.json()
    const {
      slug: slugIn,
      name,
      category,
      location,
      address,
      phone,
      naver_place_id,
      naver_url,
      main_keyword,
      sub_keywords,
      desc,
      reward_type,
      reward_value,
    } = body || {}

    if (!name) {
      return NextResponse.json({ ok: false, error: 'name 필수' }, { status: 400 })
    }

    const slug = (slugIn && typeof slugIn === 'string' ? slugIn : makeSlug(name)) || makeSlug(name)
    const placeId = naver_place_id || extractPlaceIdFromUrl(naver_url)

    const svc = createServiceClient()

    // user_id + slug 기준 upsert — user_id 는 requireUser() 결과 신뢰
    // 기존 onConflict:'slug' 는 다른 사용자의 동일 slug 를 덮어쓸 수 있어 위험
    // user_id 와 함께 복합 match 로 기존 레코드 조회 후 update/insert 분기
    const { data: existing } = await svc
      .from('stores')
      .select('id, slug')
      .eq('user_id', userId)
      .eq('slug', slug)
      .maybeSingle()

    const payload: Record<string, any> = {
      slug,
      name,
      category: category || null,
      location: location || null,
      address: address || null,
      phone: phone || null,
      naver_place_id: placeId || null,
      naver_url: naver_url || null,
      main_keyword: main_keyword || null,
      sub_keywords: Array.isArray(sub_keywords) ? sub_keywords : [],
      reward_type: reward_type || null,
      reward_value: reward_value || null,
      user_id: userId,
    }
    if (desc) payload.desc = desc

    let result: any
    if (existing?.id) {
      const { data, error } = await svc
        .from('stores')
        .update(payload)
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select('id, slug, name, updated_at')
        .single()
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      result = data
    } else {
      const { data, error } = await svc
        .from('stores')
        .insert(payload)
        .select('id, slug, name, updated_at')
        .single()
      if (error) {
        // desc 컬럼 없는 스키마 대비 — desc 제거 후 재시도
        if (/column\s+"?desc"?\s+does\s+not\s+exist/i.test(error.message)) {
          delete payload.desc
          const retry = await svc
            .from('stores')
            .insert(payload)
            .select('id, slug, name, updated_at')
            .single()
          if (retry.error) {
            return NextResponse.json({ ok: false, error: retry.error.message }, { status: 500 })
          }
          result = retry.data
        } else {
          return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }
      } else {
        result = data
      }
    }

    return NextResponse.json({ ok: true, slug: result.slug, store: result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
