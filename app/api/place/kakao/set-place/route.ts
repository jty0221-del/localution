// app/api/place/kakao/set-place/route.ts
// ============================================================
// 카카오맵 매장 ID 변경 — 사장님이 직접 매장 변경
//   POST /api/place/kakao/set-place  body: { place_id: "1822975351" } 또는 { url: "https://place.map.kakao.com/1822975351" }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function extractPlaceId(input: string): string | null {
  const s = String(input || '').trim()
  // 직접 숫자
  if (/^\d+$/.test(s)) return s
  // URL 에서 추출 (place.map.kakao.com/1822975351)
  const m = s.match(/(?:place\.map\.kakao\.com\/|map\.kakao\.com\/.*\/|map\/)(\d+)/)
  if (m) return m[1]
  // 일반 숫자 추출 fallback
  const digitMatch = s.match(/(\d{6,})/)
  if (digitMatch) return digitMatch[1]
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const body = await req.json().catch(() => ({}))
  const placeId = extractPlaceId(body.place_id || body.url || '')
  if (!placeId) {
    return NextResponse.json({
      ok: false,
      error: '카카오맵 place ID 또는 URL 을 입력해주세요. 예: 1822975351 또는 https://place.map.kakao.com/1822975351'
    }, { status: 400 })
  }

  const svc = createServiceClient()

  // 1) platform_credentials.platform_store_id 업데이트 (있으면)
  let updatedCred = false
  try {
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('id')
      .eq('user_id', userId).eq('platform', 'kakao_map').maybeSingle()
    if (cred) {
      await svc.from('platform_credentials')
        .update({ platform_store_id: placeId })
        .eq('id', (cred as any).id)
      updatedCred = true
    }
  } catch (_) {}

  // 2) stores.kakao_place_id 업데이트
  let updatedStore = false
  try {
    const { data: store } = await svc
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (Array.isArray(store) && store[0]?.id) {
      await svc.from('stores')
        .update({ kakao_place_id: placeId })
        .eq('id', (store[0] as any).id)
      updatedStore = true
    }
  } catch (_) {}

  // 3) place_targets.external_id 업데이트
  let updatedTarget = false
  try {
    const { data: target } = await svc
      .from('place_targets')
      .select('id')
      .eq('user_id', userId).eq('platform', 'kakao_map').maybeSingle()
    if (target) {
      await svc.from('place_targets')
        .update({ external_id: placeId })
        .eq('id', (target as any).id)
      updatedTarget = true
    } else {
      // 없으면 insert
      await svc.from('place_targets').insert({
        user_id: userId, platform: 'kakao_map', external_id: placeId,
      })
      updatedTarget = true
    }
  } catch (_) {}

  // 4) 잘못된 platform_reviews wipe (소금정원 등 다른 매장 데이터 제거)
  let deletedReviews = 0
  try {
    const { data, error } = await svc
      .from('platform_reviews')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'kakao_map')
      .select('id')
    if (!error && data) deletedReviews = data.length
  } catch (_) {}

  return NextResponse.json({
    ok: true,
    place_id: placeId,
    updated: { credentials: updatedCred, stores: updatedStore, place_targets: updatedTarget },
    deleted_old_reviews: deletedReviews,
    next_url: 'https://place.map.kakao.com/' + placeId,
    message: '카카오맵 매장 ' + placeId + ' 로 변경 완료. 잘못된 옛 리뷰 ' + deletedReviews + '건 삭제. 다음 수집 사이클부터 새 매장 리뷰가 들어와요.',
  })
}
