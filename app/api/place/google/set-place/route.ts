// app/api/place/google/set-place/route.ts
// ============================================================
// 구글 매장 ID(Place ID) 변경 — 사장님이 직접 매장 변경
// POST /api/place/google/set-place
// body: { place_id: "ChIJ..." } 또는 { url: "https://www.google.com/maps/place/..." }
//
// Google 의 Place ID 추출 패턴:
//  · 직접 입력: 'ChIJ...' (보통 27자), 또는 'GhIJ...' 등 lat/lng-encoded
//  · /maps/place/{name}/@.../data=...!1s{0x...:0x...}!... → CID (hex pair)
//  · maps.app.goo.gl 단축 URL 은 redirect 후 풀리는 본 URL 에서 추출 필요 (별도 처리)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function extractGooglePlaceId(input: string): { placeId: string | null; cid: string | null; rawUrl: string | null } {
  const s = String(input || '').trim()
  if (!s) return { placeId: null, cid: null, rawUrl: null }

  // 1) ChIJ... / GhIJ... — Google Place ID (직접 입력)
  const directIdMatch = s.match(/^([CGE]hIJ[A-Za-z0-9_-]{20,})$/)
  if (directIdMatch) return { placeId: directIdMatch[1], cid: null, rawUrl: null }

  // 2) URL 안에 ?ftid= 또는 ?cid= 또는 !1s 패턴
  // 2-a) data=...!1s0x...:0x... (CID hex pair)
  const cidHex = s.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)
  if (cidHex) {
    return { placeId: null, cid: cidHex[1], rawUrl: s }
  }

  // 2-b) ftid=0x...:0x...
  const ftidMatch = s.match(/[?&]ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i)
  if (ftidMatch) {
    return { placeId: null, cid: ftidMatch[1], rawUrl: s }
  }

  // 2-c) cid=숫자 (Customer ID 10진수)
  const cidDecimal = s.match(/[?&]cid=(\d+)/)
  if (cidDecimal) {
    return { placeId: null, cid: cidDecimal[1], rawUrl: s }
  }

  // 3) URL 형태인데 패턴 매칭 안되면 URL 자체만 저장
  if (/^https?:\/\/(www\.)?(google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(s)) {
    return { placeId: null, cid: null, rawUrl: s }
  }

  // 4) 마지막으로 ChIJ로 시작하지 않더라도 영숫자 27자 내외는 Place ID 후보
  const fallbackId = s.match(/^[A-Za-z0-9_-]{20,40}$/)
  if (fallbackId) return { placeId: fallbackId[0], cid: null, rawUrl: null }

  return { placeId: null, cid: null, rawUrl: null }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const body = await req.json().catch(() => ({}))
  const input = String(body.place_id || body.url || body.query || '').trim()
  const { placeId, cid, rawUrl } = extractGooglePlaceId(input)

  if (!placeId && !cid && !rawUrl) {
    return NextResponse.json({
      ok: false,
      error: '구글 Place ID 또는 Google Maps URL 을 입력해주세요. 예: ChIJN1t_tDeuEmsRUsoyG83frY4 또는 https://www.google.com/maps/place/...'
    }, { status: 400 })
  }

  // platform_store_id 우선순위: placeId > cid > rawUrl
  const storeIdToSave = placeId || cid || rawUrl || ''
  const svc = createServiceClient()

  // 1) platform_credentials 업데이트 (있으면) — 없으면 placeholder 생성
  let updatedCred = false
  try {
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('id, extra_data')
      .eq('user_id', userId).eq('platform', 'google').maybeSingle()
    if (cred) {
      const prev = ((cred as any).extra_data || {}) as Record<string, any>
      await svc.from('platform_credentials').update({
        platform_store_id: storeIdToSave,
        extra_data: { ...prev, google_place_id: placeId, google_cid: cid, google_url: rawUrl },
      }).eq('id', (cred as any).id)
      updatedCred = true
    } else {
      // 신규 row insert (account_id_enc 등 없이 placeholder — google 은 OAuth 미구현 단계)
      await svc.from('platform_credentials').insert({
        user_id: userId,
        platform: 'google',
        platform_store_id: storeIdToSave,
        extra_data: { google_place_id: placeId, google_cid: cid, google_url: rawUrl, connected_via: 'manual_url' },
      })
      updatedCred = true
    }
  } catch (e) {
    console.error('google set-place credentials error', e)
  }

  // 2) stores.google_place_id 업데이트 (스키마에 있으면)
  let updatedStore = false
  try {
    const { data: stores } = await svc
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (Array.isArray(stores) && stores[0]?.id) {
      // graceful — 컬럼 없으면 silent fail
      const { error } = await svc.from('stores')
        .update({ google_place_id: storeIdToSave })
        .eq('id', (stores[0] as any).id)
      if (!error) updatedStore = true
    }
  } catch (_) {}

  // 3) place_targets 업데이트 / insert
  let updatedTarget = false
  try {
    const { data: target } = await svc
      .from('place_targets')
      .select('id')
      .eq('user_id', userId).eq('platform', 'google').maybeSingle()
    if (target) {
      await svc.from('place_targets')
        .update({ external_id: storeIdToSave })
        .eq('id', (target as any).id)
      updatedTarget = true
    } else {
      await svc.from('place_targets').insert({
        user_id: userId, platform: 'google', external_id: storeIdToSave,
      })
      updatedTarget = true
    }
  } catch (_) {}

  return NextResponse.json({
    ok: true,
    place_id: placeId,
    cid,
    url: rawUrl,
    saved_id: storeIdToSave,
    updated: { credentials: updatedCred, stores: updatedStore, place_targets: updatedTarget },
    message: placeId
      ? `구글 Place ID ${placeId} 로 연결 완료.`
      : cid
        ? `구글 Maps CID ${cid} 로 연결 완료.`
        : `구글 Maps URL 저장 완료. 다음 동기화에서 Place ID 자동 추출됩니다.`,
    next_url: rawUrl || (placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null),
  })
}
