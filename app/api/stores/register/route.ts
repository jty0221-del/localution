// app/api/stores/register/route.ts
// ============================================================
// 30차-10: /settings "저장하기" 에서 RLS policy violation 핫픽스
// 30차-11: description 컬럼명 통일
// 33차-1:  user_id 단독으로 기존 레코드 조회 (slug 변경 시 새 레코드 INSERT 방지)
//          undefined 필드는 payload 제외 (프로필 저장 시 키워드 덮어쓰기 방지)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function extractPlaceIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const s = String(url).trim()
  if (!s) return null
  // 순수 숫자 ID
  let allDigits = true
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 48 || s.charCodeAt(i) > 57) { allDigits = false; break }
  }
  if (allDigits && s.length >= 6) return s
  // m.place.naver.com/{cat}/{id}
  const p1 = 'm.place.naver.com/'
  const idx1 = s.toLowerCase().indexOf(p1)
  if (idx1 >= 0) {
    const after = s.slice(idx1 + p1.length)
    const parts = after.split('/')
    if (parts.length >= 2) { const id = parts[1].split('?')[0]; if (id && id.length >= 6) return id }
  }
  // map.naver.com/.../place/{id}
  const p2 = '/place/'
  const idx2 = s.toLowerCase().indexOf(p2)
  if (idx2 >= 0) {
    const after = s.slice(idx2 + p2.length)
    const id = after.split('/')[0].split('?')[0]
    if (id && id.length >= 6) return id
  }
  return null
}

function isDescriptionColumnMissing(msg: string): boolean {
  const m = String(msg || '').toLowerCase()
  if (!m) return false
  const mentionsDescription = m.includes('description') || m.includes('"desc"') || m.includes(' desc ')
  if (!mentionsDescription) return false
  return m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find') || m.includes('not found')
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
      desc,
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

    // ── 기존 레코드 조회: user_id 단독 조회 (slug 변경 시에도 기존 레코드 갱신)
    const { data: existing } = await svc
      .from('stores')
      .select('id, slug')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── payload: undefined 필드는 포함하지 않음 (키워드 등 미전송 필드 보존)
    const payload: Record<string, any> = { slug, name, user_id: userId }
    if (category  !== undefined) payload.category        = category  || null
    if (location  !== undefined) payload.location        = location  || null
    if (address   !== undefined) payload.address         = address   || null
    if (phone     !== undefined) payload.phone           = phone     || null
    if (naver_place_id !== undefined || naver_url !== undefined) payload.naver_place_id = placeId || null
    if (naver_url !== undefined) payload.naver_url       = naver_url || null
    if (main_keyword  !== undefined) payload.main_keyword  = main_keyword  || null
    if (sub_keywords  !== undefined) payload.sub_keywords  = Array.isArray(sub_keywords) ? sub_keywords : []
    if (reward_type   !== undefined) payload.reward_type   = reward_type   || null
    if (reward_value  !== undefined) payload.reward_value  = reward_value  || null
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
          .select('id, slug, name, updated_at')
          .single()
      }
      let { data, error } = await tryUpdate(true)
      if (error && isDescriptionColumnMissing(error.message)) {
        const retry = await tryUpdate(false)
        if (retry.error) {
          return NextResponse.json({
            ok: false, error: retry.error.message,
            hint: 'stores.description 컬럼이 없습니다.',
          }, { status: 500 })
        }
        data = retry.data
      } else if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      result = data
    } else {
      // INSERT: 미전송 필드에 기본값 설정
      const insertPayload = {
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
        ...payload,
      }
      const tryInsert = async (withDesc: boolean) => {
        const p = { ...insertPayload }
        if (!withDesc) delete p.description
        return svc
          .from('stores')
          .insert(p)
          .select('id, slug, name, updated_at')
          .single()
      }
      let { data, error } = await tryInsert(true)
      if (error && isDescriptionColumnMissing(error.message)) {
        const retry = await tryInsert(false)
        if (retry.error) {
          return NextResponse.json({
            ok: false, error: retry.error.message,
            hint: 'stores.description 컬럼이 없습니다.',
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
