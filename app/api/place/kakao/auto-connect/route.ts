// app/api/place/kakao/auto-connect/route.ts
// ============================================================
// 카카오맵 자동 검색 + 매장 ID 등록
// POST /api/place/kakao/auto-connect
// body: { query?: '매장 이름' }
// · query 비어있으면 stores.store_name 사용
// · 검색 결과가 1개면 자동 등록 → kakao_place_id 저장
// · 여러 개면 후보 list 반환 → 사용자가 picker 에서 선택
// · 없으면 빈 list 반환 (사용자가 URL 직접 입력)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SearchItem = {
 kakaoId: string
 name: string
 address: string
 phone: string
 category: string
 url: string
}

async function searchKakao(query: string): Promise<{ items: SearchItem[]; error?: string }> {
 const apiKey = process.env.KAKAO_REST_API_KEY
 if (!apiKey) {
 return { items: [], error: 'KAKAO_REST_API_KEY 미설정 — 자동 검색 불가, URL 직접 입력 필요' }
 }
 try {
 const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`
 const res = await fetch(url, {
 headers: { Authorization: `KakaoAK ${apiKey}` },
 cache: 'no-store',
 })
 if (!res.ok) return { items: [], error: '카카오 API 응답 실패: ' + res.status }
 const data = await res.json()
 const items = (data.documents || []).map((d: any) => ({
 kakaoId: String(d.id),
 name: d.place_name,
 address: d.road_address_name || d.address_name,
 phone: d.phone || '',
 category: d.category_name || '',
 url: d.place_url || `https://place.map.kakao.com/${d.id}`,
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
 const explicitChoice = String(body.kakaoId || '').trim()
 const svc = createServiceClient()

 // explicit choice — 사용자가 후보 list 에서 선택한 경우
 if (explicitChoice && /^\d+$/.test(explicitChoice)) {
 return await applyPlaceId(svc, userId, explicitChoice)
 }

 // query 비어있으면 stores 에서 가져옴
 if (!query) {
 try {
 const { data } = await svc
 .from('stores')
 .select('store_name, address, business_name')
 .eq('user_id', userId)
 .order('updated_at', { ascending: false })
 .limit(1)
 if (Array.isArray(data) && data[0]) {
 query = String(data[0].store_name || data[0].business_name || '').trim()
 }
 } catch (_) {}
 }

 if (!query) {
 return NextResponse.json({
 ok: false,
 error: '매장 이름이 필요해요. 먼저 매장 정보를 등록해주세요.',
 }, { status: 400 })
 }

 // 검색 실행
 const result = await searchKakao(query)

 if (result.error && result.items.length === 0) {
 return NextResponse.json({
 ok: false,
 error: result.error,
 query,
 need_manual: true,
 }, { status: 503 })
 }

 if (result.items.length === 0) {
 return NextResponse.json({
 ok: false,
 error: '"' + query + '" 검색 결과 없음. 매장 이름을 다시 확인하거나 URL 직접 입력하세요.',
 query,
 items: [],
 need_manual: true,
 }, { status: 404 })
 }

 // 1개만 매칭 — 자동 등록
 if (result.items.length === 1) {
 return await applyPlaceId(svc, userId, result.items[0].kakaoId, result.items[0].name)
 }

 // 여러 개 — picker 반환
 return NextResponse.json({
 ok: true,
 multiple: true,
 query,
 items: result.items,
 message: result.items.length + '개 매장 발견. 정확한 매장을 선택해주세요.',
 })
}

async function applyPlaceId(svc: any, userId: string, placeId: string, name?: string) {
 // 3개 테이블 모두 업데이트
 let updated = { credentials: false, stores: false, place_targets: false }
 try {
 const { data: cred } = await svc
 .from('platform_credentials')
 .select('id').eq('user_id', userId).eq('platform', 'kakao_map').maybeSingle()
 if (cred) {
 await svc.from('platform_credentials')
 .update({ platform_store_id: placeId }).eq('id', (cred as any).id)
 updated.credentials = true
 } else {
 // insert (카카오는 로그인 필요 X — 빈 자격증명만 추가)
 await svc.from('platform_credentials').insert({
 user_id: userId, platform: 'kakao_map',
 platform_store_id: placeId, account_id: 'kakao_public',
 last_login_status: 'success',
 })
 updated.credentials = true
 }
 } catch (_) {}

 try {
 const { data: store } = await svc
 .from('stores').select('id').eq('user_id', userId)
 .order('updated_at', { ascending: false }).limit(1)
 if (Array.isArray(store) && store[0]?.id) {
 await svc.from('stores')
 .update({ kakao_place_id: placeId }).eq('id', (store[0] as any).id)
 updated.stores = true
 }
 } catch (_) {}

 try {
 const { data: target } = await svc
 .from('place_targets').select('id')
 .eq('user_id', userId).eq('platform', 'kakao_map').maybeSingle()
 if (target) {
 await svc.from('place_targets')
 .update({ external_id: placeId }).eq('id', (target as any).id)
 } else {
 await svc.from('place_targets').insert({
 user_id: userId, platform: 'kakao_map', external_id: placeId,
 })
 }
 updated.place_targets = true
 } catch (_) {}

 // 옛 잘못된 카카오 리뷰 제거
 let deletedReviews = 0
 try {
 const { data, error } = await svc
 .from('platform_reviews').delete()
 .eq('user_id', userId).eq('platform', 'kakao_map')
 .select('id')
 if (!error && data) deletedReviews = data.length
 } catch (_) {}

 return NextResponse.json({
 ok: true,
 auto: true,
 place_id: placeId,
 name: name || null,
 url: 'https://place.map.kakao.com/' + placeId,
 updated, deleted_old_reviews: deletedReviews,
 message: '카카오맵 매장 ' + placeId + (name ? ' (' + name + ')' : '') + ' 자동 등록 완료',
 })
}
