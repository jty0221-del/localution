// app/api/admin/set-platform-store-id/route.ts
// ============================================================
// v38: 관리자가 특정 사용자의 platform_store_id 수동 입력 / 자동 검색
//   POST { user_id, platform, naver_place_url }  → URL 에서 place_id 추출 + 저장
//   POST { user_id, platform, store_id }         → 직접 ID 저장
//   POST { user_id, platform, search }           → naver search 자동 lookup
//
// platform_credentials + stores 둘 다 자동 갱신
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { lookupPlace } from '@/app/lib/naver-place'
import { lookupKakaoPlace } from '@/app/lib/kakao-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function extractNaverPlaceId(input: string): string | null {
  if (!input) return null
  const s = String(input).trim()
  // URL 패턴 1: https://map.naver.com/p/entry/place/1463314293
  // URL 패턴 2: https://m.place.naver.com/restaurant/1463314293/...
  // URL 패턴 3: https://pcmap.place.naver.com/restaurant/1463314293
  // 또는 그냥 숫자 ID
  if (/^\d+$/.test(s)) return s
  const m = s.match(/(?:place|entry\/place|restaurant|cafe|hospital|hairshop|hairshopplus)\/(\d+)/)
  if (m) return m[1]
  const m2 = s.match(/place\.naver\.com\/[^/]+\/(\d+)/)
  if (m2) return m2[1]
  return null
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  let body: any = {}
  try { body = await req.json() } catch {}

  const userId = String(body?.user_id || '').trim()
  const platform = String(body?.platform || 'naver_place').trim()
  const directId = String(body?.store_id || '').trim()
  const naverUrl = String(body?.naver_place_url || body?.url || '').trim()
  const search = String(body?.search || '').trim()
  const setName = String(body?.store_name || '').trim() || undefined

  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })
  if (!['naver_place', 'kakao_map', 'baemin', 'yogiyo', 'coupangeats'].includes(platform)) {
    return NextResponse.json({ ok: false, error: 'platform 유효하지 않음' }, { status: 400 })
  }

  let placeId: string | null = null
  let placeName: string | undefined = setName
  let placeAddress: string | undefined
  let source: string = ''

  if (directId) {
    placeId = directId
    source = 'direct_input'
  } else if (naverUrl && platform === 'naver_place') {
    placeId = extractNaverPlaceId(naverUrl)
    source = 'url_extract'
    if (placeId) {
      try {
        const info = await lookupPlace(placeId).catch(() => null)
        if (info?.name) placeName = placeName || info.name
        if (info?.address) placeAddress = info.address
      } catch (_) {}
    }
  } else if (search && platform === 'kakao_map') {
    try {
      const result = await lookupKakaoPlace(search)
      if (result?.placeId) {
        placeId = result.placeId
        placeName = placeName || result.name || undefined
        placeAddress = result.address || undefined
        source = 'kakao_search'
      }
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: 'kakao search 실패: ' + e?.message }, { status: 500 })
    }
  }

  if (!placeId) {
    return NextResponse.json({
      ok: false,
      error: '매장 ID 결정 못 함. naver_place_url 또는 store_id 입력 필요',
      hint: '예: { "user_id": "...", "platform": "naver_place", "naver_place_url": "https://map.naver.com/p/entry/place/1234567890" } 또는 { "user_id": "...", "platform": "naver_place", "store_id": "1234567890" }',
    }, { status: 400 })
  }

  if (!/^\d+$/.test(placeId)) {
    return NextResponse.json({ ok: false, error: 'place_id 가 숫자여야 함: ' + placeId }, { status: 400 })
  }

  const svc = createServiceClient()
  const updates: any = {}

  // 1) platform_credentials 갱신
  const { data: existingCred } = await svc
    .from('platform_credentials')
    .select('id')
    .eq('user_id', userId).eq('platform', platform).maybeSingle()

  if (existingCred?.id) {
    const upd: any = {
      platform_store_id: placeId,
      updated_at: new Date().toISOString(),
    }
    if (placeName) upd.platform_store_name = placeName
    const { error: ce } = await svc.from('platform_credentials').update(upd).eq('id', existingCred.id)
    updates.platform_credentials = ce ? { error: ce.message } : { updated: true, placeId, placeName }
  } else {
    updates.platform_credentials = { skipped: '연결된 자격증명 없음 — 사용자가 먼저 connect 페이지에서 ID/PW 저장 필요' }
  }

  // 2) stores 테이블 갱신 (naver_place 만)
  if (platform === 'naver_place') {
    const { data: existingStore } = await svc
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const storeData: any = {
      user_id: userId,
      naver_place_id: placeId,
      naver_url: naverUrl || `https://map.naver.com/p/entry/place/${placeId}`,
      updated_at: new Date().toISOString(),
    }
    if (placeName) storeData.name = placeName
    if (placeAddress) storeData.address = placeAddress

    if (existingStore?.id) {
      const { error: se } = await svc.from('stores').update(storeData).eq('id', existingStore.id)
      updates.stores = se ? { error: se.message } : { updated: true }
    } else {
      storeData.name = placeName || '내 매장'
      const { error: ie } = await svc.from('stores').insert(storeData)
      updates.stores = ie ? { error: ie.message } : { inserted: true }
    }
  }

  return NextResponse.json({
    ok: true,
    user_id: userId,
    platform,
    place_id_set: placeId,
    place_name: placeName,
    place_address: placeAddress,
    source,
    updates,
    triggered_by: admin.email,
    message: `${userId.slice(0, 12)}... ${platform} place_id=${placeId} 설정 완료. 다음 cron 사이클부터 리뷰 수집 + 답글 발행 가능.`,
  })
}
