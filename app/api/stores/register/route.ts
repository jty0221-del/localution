// app/api/stores/register/route.ts
// ============================================================
// 30차-10: /settings "저장하기" 에서 RLS policy violation 핫픽스
//   - 기존: @/utils/supabase/server 의 createClient() (anon 기반) + auth.getUser()
//     → localution_user 쿠키 기반 커스텀 auth 와 Supabase auth 연동 없음
//     → user_id=null 로 insert 시도 → stores RLS 차단
//   - 수정: requireUser() + createServiceClient() 로 통일
//     (/api/stores/me 와 동일한 인증 패턴)
// 30차-11: `desc` 컬럼명 → `description` 통일
//   - desc 는 SQL 예약어라 Supabase schema cache 반영 불안정
//   - description 컬럼 없는 DB 대비 graceful retry — 에러 패턴 확장
//     ("schema cache", "does not exist", "could not find" 전부 catch)
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

// description 컬럼 미존재 에러 패턴 — Supabase 는 상황에 따라 다음 4가지 중 하나로 반환
//   1) column "description" of relation "stores" does not exist   (실제 insert 시)
//   2) column stores.description does not exist                   (PostgREST)
//   3) Could not find the 'description' column of 'stores' in the schema cache   (캐시 미반영)
//   4) column "desc" ...                                          (legacy)
function isDescriptionColumnMissing(msg: string): boolean {
  const m = String(msg || '').toLowerCase()
  if (!m) return false
  const mentionsDescription = m.includes('description') || m.includes('"desc"') || m.includes(' desc ')
  if (!mentionsDescription) return false
  return m.includes('does not exist') ||
         m.includes('schema cache') ||
         m.includes('could not find') ||
         m.includes('not found')
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
      description,
      desc, // 구형 페이로드 호환
      reward_type,
      reward_value,
    } = body || {}

    if (!name) {
      return NextResponse.json({ ok: false, error: 'name 필수' }, { status: 400 })
    }

    const slug = (slugIn && typeof slugIn === 'string' ? slugIn : makeSlug(name)) || makeSlug(name)
    const placeId = naver_place_id || extractPlaceIdFromUrl(naver_url)
    const descText = (typeof description === 'string' && description.trim())
      ? description.trim()
      : (typeof desc === 'string' && desc.trim() ? desc.trim() : null)

    const svc = createServiceClient()

    // user_id + slug 기준 upsert — user_id 는 requireUser() 결과 신뢰
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
    if (descText) payload.description = descText

    let result: any
    if (existing?.id) {
      const tryUpdate = async (withDesc: boolean) => {
        const p = { ...payload }
        if (!withDesc) delete p.description
        return svc
          .from('stores')
          .update(p)
          .eq('id', existing.id)
          .eq('user_id', userId)
          .select('id, slug, name, description, updated_at')
          .single()
      }
      let { data, error } = await tryUpdate(true)
      if (error && isDescriptionColumnMissing(error.message)) {
        const retry = await tryUpdate(false)
        if (retry.error) {
          return NextResponse.json({
            ok: false,
            error: retry.error.message,
            hint: 'stores.description 컬럼이 없습니다. supabase/migrations/30cha11_stores_description.sql 을 Supabase SQL Editor 에서 실행하세요.',
          }, { status: 500 })
        }
        data = retry.data
      } else if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      result = data
    } else {
      const tryInsert = async (withDesc: boolean) => {
        const p = { ...payload }
        if (!withDesc) delete p.description
        return svc
          .from('stores')
          .insert(p)
          .select('id, slug, name, description, updated_at')
          .single()
      }
      let { data, error } = await tryInsert(true)
      if (error && isDescriptionColumnMissing(error.message)) {
        const retry = await tryInsert(false)
        if (retry.error) {
          return NextResponse.json({
            ok: false,
            error: retry.error.message,
            hint: 'stores.description 컬럼이 없습니다. supabase/migrations/30cha11_stores_description.sql 을 Supabase SQL Editor 에서 실행하세요.',
          }, { status: 500 })
        }
        data = retry.data
      } else if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({ ok: true, slug: result.slug, store: result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
