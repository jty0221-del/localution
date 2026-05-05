// app/api/place/google/auto-connect/route.ts
// ============================================================
// 구글 Places 자동 검색 + 매장 등록
// POST /api/place/google/auto-connect  body: { query?: '매장 이름' }
//   · query 비어있으면 stores.name + address 사용
//   · Google Places API (textsearch) 호출
//   · 결과 1개면 자동 등록, 여러개면 후보 반환, 없으면 빈 list
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SearchItem = {
  placeId: string
  name: string
  address: string
  rating: number | null
  totalRatings: number
  url: string
}

async function searchGoogle(query: string): Promise<{ items: SearchItem[]; error?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return { items: [], error: 'GOOGLE_PLACES_API_KEY 미설정 — 자동 검색 불가, URL 직접 입력 필요' }
  }
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
      + '?query=' + encodeURIComponent(query)
      + '&language=ko'
      + '&region=kr'
      + '&key=' + apiKey
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { items: [], error: '구글 Places API 응답 실패: ' + res.status }
    const data = await res.json()
    if (data.status === 'REQUEST_DENIED') {
      return { items: [], error: 'API 키 권한 오류 (Places API enable 확인 필요)' }
    }
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return { items: [], error: '구글 응답 ' + data.status }
    }
    const items: SearchItem[] = (data.results || []).slice(0, 10).map((r: any) => ({
      placeId: String(r.place_id),
      name: r.name,
      address: r.formatted_address || '',
      rating: typeof r.rating === 'number' ? r.rating : null,
      totalRatings: r.user_ratings_total || 0,
      url: 'https://www.google.com/maps/place/?q=place_id:' + r.place_id,
    }))
    return { items }
  } catch (e: any) {
    return { items: [], error: e?.message || '검색 오류' }
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const body = await req.json().catch(() => ({}))
  let query = String(body.query || '').trim()
  let storeRow: any = null

  // query 미입력 시 stores 에서 채움
  if (!query) {
    const svc = createServiceClient()
    const { data } = await svc
      .from('stores')
      .select('name, address')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (Array.isArray(data) && data[0]) {
      storeRow = data[0]
      query = String(data[0].name || '') + ' ' + String(data[0].address || '')
      query = query.trim()
    }
  }

  if (!query) {
    return NextResponse.json({
      ok: false,
      error: '매장 이름을 입력하거나 매장 정보를 먼저 등록해주세요.',
    }, { status: 400 })
  }

  const { items, error } = await searchGoogle(query)
  if (error) {
    return NextResponse.json({
      ok: false,
      error,
      manualEntryHint: 'Google Maps 에서 매장 페이지를 열고 URL 을 복사해 직접 등록해주세요.',
    }, { status: 200 })
  }

  // 결과 1개 → 자동 등록
  if (items.length === 1) {
    const item = items[0]
    const svc = createServiceClient()
    try {
      const { data: cred } = await svc
        .from('platform_credentials')
        .select('id, extra_data')
        .eq('user_id', userId).eq('platform', 'google').maybeSingle()
      if (cred) {
        const prev = ((cred as any).extra_data || {}) as Record<string, any>
        await svc.from('platform_credentials').update({
          platform_store_id: item.placeId,
          extra_data: {
            ...prev,
            google_place_id: item.placeId,
            google_url: item.url,
            connected_via: 'auto_search',
          },
        }).eq('id', (cred as any).id)
      } else {
        await svc.from('platform_credentials').insert({
          user_id: userId,
          platform: 'google',
          platform_store_id: item.placeId,
          extra_data: {
            google_place_id: item.placeId,
            google_url: item.url,
            connected_via: 'auto_search',
          },
        })
      }
    } catch (e) { /* graceful degrade */ }

    return NextResponse.json({
      ok: true,
      auto: true,
      saved: item,
      message: `매장 자동 등록 완료: ${item.name}`,
    })
  }

  // 여러 개 → 후보 반환
  return NextResponse.json({
    ok: true,
    auto: false,
    candidates: items,
    query,
    message: items.length === 0 ? '검색 결과 없음 — URL 직접 입력 필요' : `${items.length}개 후보 중 선택`,
  })
}
