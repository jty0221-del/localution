// app/api/place/reviews/fetch/route.ts
// ============================================================
// 30차-15-B · 네이버 방문자 리뷰 수집 엔드포인트 (로그인 불필요 공개 경로)
//
// POST /api/place/reviews/fetch
// body(optional): { place_id?: string, category?: string }
// · place_id 미지정시 /api/stores/me 로직 따라 현재 유저의 naver_place
// 연결 매장 place_id 자동 탐색 (platform_credentials → place_targets → stores)
// · m.place.naver.com HTML 파싱 → platform_reviews UPSERT(platform, platform_review_id)
// · 응답: { ok, place_id, inserted, updated, total, reviews[] }
//
// 주의:
// · 로그인 기반 비공개 리뷰 수집은 23차-4 NaverPlaceAdapter(Railway Worker) 전담.
// · 이 엔드포인트는 공개 SSR HTML 만 긁어 즉시 보여주는 "지금 수집" 용도.
// · 30차-15-D 에서 cron 으로 4시간마다 전 유저 루프 돌림.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { fetchVisitorReviews } from '@/app/lib/naver-place'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UpsertRow = {
 user_id: string
 platform: 'naver_place'
 platform_store_id: string
 platform_review_id: string
 author_name: string | null
 author_mask: string | null
 rating: number | null
 content: string | null
 photos: string[] | null
 posted_at: string | null
 collected_at: string
 has_reply: boolean
 // 사장님 답글 본문은 raw_snapshot.ownerReplyBody 에 저장됨 (DB에 reply_content 컬럼 없음)
 raw_snapshot: unknown
}

function maskAuthor(name: string | null | undefined): string | null {
 if (!name) return null
 const s = String(name).trim()
 if (s.length <= 1) return s + '*'
 if (s.length === 2) return s[0] + '*'
 return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

function parseDateSafely(raw: string | null | undefined): string | null {
 if (!raw) return null
 const s = String(raw).trim()
 // YYYY-MM-DD / YYYY.MM.DD / YYYY-MM-DDTHH:mm:ss(.xxx)(Z|+09:00)
 const isoOk = /^\d{4}-\d{2}-\d{2}/.test(s)
 const dotted = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
 try {
 if (dotted) {
 const iso = `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}T00:00:00+09:00`
 const d = new Date(iso)
 return Number.isNaN(d.getTime()) ? null : d.toISOString()
 }
 if (isoOk) {
 const d = new Date(s.length === 10 ? s + 'T00:00:00+09:00' : s)
 return Number.isNaN(d.getTime()) ? null : d.toISOString()
 }
 } catch {
 return null
 }
 return null
}

// GET: 디버그용 — ?debug=1(GraphQL 직접) / ?debug=2(함수 호출만) / ?debug=3(실제 수집+DB저장)
export async function GET(req: NextRequest) {
 const dbg = req.nextUrl.searchParams.get('debug')
 if (!['1','2','3','4','5','6'].includes(dbg || '')) {
 return NextResponse.json({ ok: false, error: 'POST only (GET은 ?debug=1~6 만 허용)' }, { status: 405 })
 }
 return POST(req)
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) {
 return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 }
 const userId = auth.userId
 const svc = createServiceClient()

 // 1) place_id 결정: body 우선, 없으면 자동 탐색
 let placeId: string | null = null
 let hint: string | null = null
 try {
 const body = await req.json().catch(() => ({}))
 if (body?.place_id && /^\d+$/.test(String(body.place_id))) placeId = String(body.place_id)
 if (body?.category) hint = String(body.category)
 } catch {
 // body 없음 — 자동 탐색 경로
 }

 if (!placeId) {
 // (a) platform_credentials.platform_store_id
 try {
 const { data } = await svc
 .from('platform_credentials')
 .select('platform_store_id')
 .eq('user_id', userId)
 .eq('platform', 'naver_place')
 .maybeSingle()
 if (data?.platform_store_id && /^\d+$/.test(String(data.platform_store_id))) {
 placeId = String(data.platform_store_id)
 }
 } catch (_) {}
 }

 if (!placeId) {
 // (b) place_targets (순위 추적 등록)
 try {
 const { data } = await svc
 .from('place_targets')
 .select('place_id, category')
 .eq('user_id', userId)
 .order('created_at', { ascending: false })
 .limit(1)
 if (Array.isArray(data) && data[0]?.place_id) {
 placeId = String(data[0].place_id)
 hint = data[0].category ?? hint
 }
 } catch (_) {}
 }

 if (!placeId) {
 // (c) stores.naver_place_id
 try {
 const { data } = await svc
 .from('stores')
 .select('naver_place_id')
 .eq('user_id', userId)
 .order('updated_at', { ascending: false })
 .limit(1)
 if (Array.isArray(data) && data[0]?.naver_place_id) {
 placeId = String(data[0].naver_place_id)
 }
 } catch (_) {}
 }

 if (!placeId) {
 return NextResponse.json(
 { ok: false, error: '연결된 네이버 플레이스가 없어요. 먼저 /my/platforms 에서 연결해 주세요.' },
 { status: 400 },
 )
 }

 // 디버그 모드 6: ?debug=6 → 새 reviewId 1건씩 INSERT 시도, 처음 5건 결과 반환
 if (req.nextUrl.searchParams.get('debug') === '6') {
 let reviews: any[] = []
 try { reviews = await fetchVisitorReviews(placeId, hint) } catch (_) {}
 // 기존 DB에 있는 reviewId들
 const reviewIds = reviews.map((r) => r.reviewId)
 const { data: existing } = await svc.from('platform_reviews')
 .select('platform_review_id').eq('user_id', userId).eq('platform', 'naver_place')
 .in('platform_review_id', reviewIds.slice(0, 500))
 const existingIds = new Set((existing ?? []).map((x: any) => x.platform_review_id))
 const newReviews = reviews.filter((r) => !existingIds.has(r.reviewId)).slice(0, 5)
 const results: any[] = []
 const now = new Date().toISOString()
 for (const r of newReviews) {
 const row = {
 user_id: userId, platform: 'naver_place' as const, platform_store_id: placeId!,
 platform_review_id: r.reviewId, author_name: r.authorName ?? null,
 author_mask: maskAuthor(r.authorName),
 rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
 content: r.body, photos: r.photos.length > 0 ? r.photos : null,
 posted_at: parseDateSafely(r.postedAt) || parseDateSafely(r.visitedAt),
 collected_at: now, has_reply: false, raw_snapshot: r,
 }
 const { error } = await svc.from('platform_reviews').insert(row)
 results.push({
 id: r.reviewId,
 author: r.authorName,
 contentLen: (r.body || '').length,
 photoCount: r.photos.length,
 posted: row.posted_at,
 error: error?.message || null,
 errorCode: (error as any)?.code || null,
 })
 }
 return NextResponse.json({
 ok: true,
 debug6: {
 placeId, fetched: reviews.length, existingForUser: existingIds.size,
 triedNew: newReviews.length, results,
 },
 })
 }

 // 디버그 모드 5: ?debug=5 → 청크 upsert + DB 실제 row count 반환 (새 코드 검증용)
 if (req.nextUrl.searchParams.get('debug') === '5') {
 const t0 = Date.now()
 let reviews: any[] = []
 try { reviews = await fetchVisitorReviews(placeId, hint) } catch (_) {}
 let upsertErr: string | null = null
 if (reviews.length > 0) {
 const reviewIds = reviews.map((r) => r.reviewId)
 const existingHasReply = new Map<string, boolean>()
 const existingReplyStatus = new Map<string, string | null>()
 try {
 const { data: existing } = await svc.from('platform_reviews')
 .select('platform_review_id, has_reply, reply_status')
 .eq('user_id', userId).eq('platform', 'naver_place')
 .in('platform_review_id', reviewIds.slice(0, 500))
 for (const row of existing ?? []) {
 existingHasReply.set(row.platform_review_id, row.has_reply ?? false)
 existingReplyStatus.set(row.platform_review_id, row.reply_status ?? null)
 }
 } catch (_) {}
 const now = new Date().toISOString()
 const seen = new Map<string, any>()
 for (const r of reviews) {
 seen.set(r.reviewId, {
 user_id: userId, platform: 'naver_place' as const, platform_store_id: placeId!,
 platform_review_id: r.reviewId, author_name: r.authorName ?? null,
 author_mask: maskAuthor(r.authorName),
 rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
 content: r.body, photos: r.photos.length > 0 ? r.photos : null,
 posted_at: parseDateSafely(r.postedAt) || parseDateSafely(r.visitedAt),
 collected_at: now,
 has_reply: existingHasReply.get(r.reviewId) === true || existingReplyStatus.get(r.reviewId) === 'submitted',
 raw_snapshot: r,
 })
 }
 const rows = Array.from(seen.values())
 const CHUNK = 200
 for (let i = 0; i < rows.length && !upsertErr; i += CHUNK) {
 const { error } = await svc.from('platform_reviews').upsert(rows.slice(i, i + CHUNK), {
 onConflict: 'platform,platform_review_id', ignoreDuplicates: false,
 })
 if (error) upsertErr = 'chunk ' + i + ': ' + error.message
 }
 }
 const { count } = await svc.from('platform_reviews')
 .select('*', { count: 'exact', head: true })
 .eq('user_id', userId).eq('platform', 'naver_place')
 return NextResponse.json({
 ok: true,
 debug5: {
 placeId, fetched: reviews.length, upsert_error: upsertErr,
 db_total_for_user: count, elapsed_ms: Date.now() - t0,
 },
 })
 }

 // 디버그 모드 4: ?debug=4 → fetch + upsert 후 카운트/에러만 반환 (응답 작게)
 if (req.nextUrl.searchParams.get('debug') === '4') {
 const t0 = Date.now()
 let reviews: any[] = []
 let fetchErr: string | null = null
 try { reviews = await fetchVisitorReviews(placeId, hint) } catch (e: any) { fetchErr = e?.message || String(e) }
 const fetchedCount = reviews.length
 let upsertErr: string | null = null
 let upsertedCount = 0
 if (reviews.length > 0) {
 const reviewIds = reviews.map((r) => r.reviewId)
 const existingHasReply = new Map<string, boolean>()
 const existingReplyStatus = new Map<string, string | null>()
 try {
 const { data: existing } = await svc
 .from('platform_reviews')
 .select('platform_review_id, has_reply, reply_status')
 .eq('user_id', userId)
 .eq('platform', 'naver_place')
 .in('platform_review_id', reviewIds.slice(0, 500))
 for (const row of existing ?? []) {
 existingHasReply.set(row.platform_review_id, row.has_reply ?? false)
 existingReplyStatus.set(row.platform_review_id, row.reply_status ?? null)
 }
 } catch (_) {}

 const now = new Date().toISOString()
 const seen = new Map<string, any>()
 for (const r of reviews) {
 seen.set(r.reviewId, {
 user_id: userId,
 platform: 'naver_place' as const,
 platform_store_id: placeId!,
 platform_review_id: r.reviewId,
 author_name: r.authorName ?? null,
 author_mask: maskAuthor(r.authorName),
 rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
 content: r.body,
 photos: r.photos.length > 0 ? r.photos : null,
 posted_at: parseDateSafely(r.postedAt) || parseDateSafely(r.visitedAt),
 collected_at: now,
 has_reply: existingHasReply.get(r.reviewId) === true || existingReplyStatus.get(r.reviewId) === 'submitted',
 raw_snapshot: r,
 })
 }
 const rows = Array.from(seen.values())
 try {
 const { data, error } = await svc
 .from('platform_reviews')
 .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
 .select('platform_review_id')
 if (error) upsertErr = error.message
 upsertedCount = Array.isArray(data) ? data.length : 0
 } catch (e: any) {
 upsertErr = e?.message || String(e)
 }
 }
 return NextResponse.json({
 ok: true,
 debug4: {
 placeId, hint,
 elapsed_ms: Date.now() - t0,
 fetched: fetchedCount,
 fetch_error: fetchErr,
 upserted: upsertedCount,
 upsert_error: upsertErr,
 },
 })
 }

 // 디버그 모드 2: ?debug=2 → fetchVisitorReviews() 직접 호출 결과 반환
 if (req.nextUrl.searchParams.get('debug') === '2') {
 const t0 = Date.now()
 let reviews: any[] = []
 let err: string | null = null
 try {
 reviews = await fetchVisitorReviews(placeId, hint)
 } catch (e: any) {
 err = e?.message || String(e)
 }
 return NextResponse.json({
 ok: true,
 debug2: {
 placeId,
 hint,
 elapsed_ms: Date.now() - t0,
 count: reviews.length,
 error: err,
 first: reviews[0] ? { id: reviews[0].reviewId, body: (reviews[0].body || '').slice(0, 80) } : null,
 vercel_region: process.env.VERCEL_REGION || 'unknown',
 },
 })
 }

 // 디버그 모드 1: ?debug=1 로 호출하면 GraphQL 직접 응답을 반환 (Vercel 환경 차단 진단용)
 const debugMode = req.nextUrl.searchParams.get('debug') === '1'
 if (debugMode) {
 const debugInfo: any = { placeId, hint, vercel_region: process.env.VERCEL_REGION || 'unknown' }
 try {
 const t0 = Date.now()
 const debugRes = await fetch('https://pcmap-api.place.naver.com/graphql', {
 method: 'POST',
 headers: {
 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
 'Accept': '*/*',
 'Content-Type': 'application/json',
 'Origin': 'https://m.place.naver.com',
 'Referer': 'https://m.place.naver.com/restaurant/' + placeId + '/review/visitor',
 },
 body: JSON.stringify([{
 operationName: 'getVisitorReviews',
 variables: { input: { businessId: placeId, businessType: hint || 'restaurant', item: '0', page: 1, size: 3, isPhotoUsed: false, includeContent: true, getReactions: true } },
 query: 'query getVisitorReviews($input: VisitorReviewsInput) { visitorReviews(input: $input) { total items { id body created } } }',
 }]),
 signal: AbortSignal.timeout(10000),
 cache: 'no-store',
 })
 debugInfo.elapsed_ms = Date.now() - t0
 debugInfo.status = debugRes.status
 const txt = await debugRes.text()
 debugInfo.body_length = txt.length
 debugInfo.body_preview = txt.slice(0, 500)
 } catch (e: any) {
 debugInfo.error = e?.message || String(e)
 }
 return NextResponse.json({ ok: true, debug: debugInfo })
 }

 // 2) 공개 리뷰 수집
 const reviews = await fetchVisitorReviews(placeId, hint)
 if (reviews.length === 0) {
 return NextResponse.json({
 ok: true,
 place_id: placeId,
 inserted: 0,
 updated: 0,
 total: 0,
 reviews: [],
 note: 'SSR HTML 에서 리뷰를 찾지 못함. 리뷰가 0건이거나 파싱 패턴 변경 가능성.',
 })
 }

 // 3) platform_reviews UPSERT (platform + platform_review_id 유니크)
 const now = new Date().toISOString()
 const reviewIds = reviews.map((r) => r.reviewId)

 // 기존 has_reply / reply_status 보존 — upsert 시 덮어쓰기 방지
 const existingHasReply = new Map<string, boolean>()
 const existingReplyStatus = new Map<string, string | null>()
 try {
 const { data: existing } = await svc
 .from('platform_reviews')
 .select('platform_review_id, has_reply, reply_status')
 .eq('user_id', userId)
 .eq('platform', 'naver_place')
 .in('platform_review_id', reviewIds.slice(0, 500))
 for (const row of existing ?? []) {
 existingHasReply.set(row.platform_review_id, row.has_reply ?? false)
 existingReplyStatus.set(row.platform_review_id, row.reply_status ?? null)
 }
 } catch (_) {
 // 조회 실패해도 upsert는 진행 (has_reply는 false로 폴백)
 }

 const rowsRaw: UpsertRow[] = reviews.map((r) => ({
 user_id: userId,
 platform: 'naver_place' as const,
 platform_store_id: placeId!,
 platform_review_id: r.reviewId,
 author_name: r.authorName ?? null,
 author_mask: maskAuthor(r.authorName),
 rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
 content: r.body,
 photos: r.photos.length > 0 ? r.photos : null,
 posted_at: parseDateSafely(r.postedAt) || parseDateSafely(r.visitedAt),
 collected_at: now,
 // 사장님 답글 여부: GraphQL 실제 결과만 신뢰 (false positive 방지)
 // worker는 등록 후 GraphQL verifyReply를 통과해야만 'submitted' 마킹 → 그래도 GraphQL이 정답
 has_reply: r.hasOwnerReply === true,
 raw_snapshot: r,
 }))
 // 중복 reviewId가 있으면 PostgreSQL upsert 오류 발생 → 마지막 항목만 유지
 const seen = new Map<string, UpsertRow>()
 for (const row of rowsRaw) seen.set(row.platform_review_id, row)
 const rows = Array.from(seen.values())

 let inserted = 0
 let updated = 0
 try {
 // 37차-11: PostgREST default limit이 .select() return을 50건으로 잘라서
 // upserted 50으로 보이던 버그 수정 → .select() 제거하면 upsert는 전체 처리됨
 // 단, 500건 한 번에 너무 큰 페이로드는 청크로 분할 (안전)
 const CHUNK_SIZE = 200
 for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
 const chunk = rows.slice(i, i + CHUNK_SIZE)
 const { error } = await svc
 .from('platform_reviews')
 .upsert(chunk, {
 onConflict: 'platform,platform_review_id',
 ignoreDuplicates: false,
 })
 if (error) {
 return NextResponse.json(
 { ok: false, error: 'DB 저장 실패 (chunk ' + i + '): ' + error.message },
 { status: 500 },
 )
 }
 }
 inserted = rows.length // upsert 성공 시 전체 카운트
 } catch (e: any) {
 return NextResponse.json(
 { ok: false, error: 'upsert 예외: ' + (e?.message ?? String(e)) },
 { status: 500 },
 )
 }

 return NextResponse.json({
 ok: true,
 place_id: placeId,
 inserted,
 updated,
 total: reviews.length,
 reviews: reviews.map((r) => ({
 id: r.reviewId,
 author: r.authorName,
 rating: r.rating,
 body: r.body.slice(0, 200),
 visited_at: r.visitedAt,
 posted_at: r.postedAt,
 photos: r.photos.length,
 })),
 })
}
