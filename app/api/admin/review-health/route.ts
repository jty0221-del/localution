// app/api/admin/review-health/route.ts
// ============================================================
// 어드민 전용 — 네이버 리뷰 수집 파이프라인 종합 진단
//
// GET → 전체 점검 리포트 반환
// 1) GraphQL 엔드포인트 실시간 테스트 (실제 place_id 사용)
// 2) DB 통계: 총/오늘/7일 리뷰 수, 미답변 비율
// 3) 수집 파이프라인: 연결 유저 수, 최근 수집 여부, 정체(stale) 유저
// 4) 크론 상태: 최근 6h/24h 수집 기록
// 5) 유저별 수집 현황 테이블
// 6) 미답변 리뷰 상위 5건
// ============================================================
import { NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const NAVER_GRAPHQL_URL = 'https://pcmap-api.place.naver.com/graphql'
const GRAPHQL_HEADERS = {
 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
 'Accept': '*/*',
 'Accept-Language': 'ko-KR,ko;q=0.9',
 'Content-Type': 'application/json',
 'Origin': 'https://m.place.naver.com',
 'Referer': 'https://m.place.naver.com/restaurant/1234/review/visitor',
}

type PipelineStatus = 'ok' | 'warn' | 'error'

interface UserStat {
 user_id: string
 place_id: string | null
 last_collected_at: string | null
 review_count_7d: number
 review_count_total: number
 unreplied: number
 status: PipelineStatus
 status_reason: string
}

interface GraphQLTestResult {
 ok: boolean
 place_id: string
 latency_ms: number
 review_count: number | null
 error: string | null
}

function fmtKST(iso: string | null): string {
 if (!iso) return '—'
 return new Date(iso).toLocaleString('ko-KR', {
 timeZone: 'Asia/Seoul',
 year: 'numeric', month: '2-digit', day: '2-digit',
 hour: '2-digit', minute: '2-digit',
 })
}

function hoursAgo(iso: string): number {
 return (Date.now() - new Date(iso).getTime()) / 3600000
}

// 네이버 플레이스 GraphQL 리뷰 수집 테스트
async function testGraphQL(placeId: string): Promise<GraphQLTestResult> {
 const t0 = Date.now()
 const body = JSON.stringify([{
 operationName: 'getVisitorReviews',
 variables: {
 input: {
 businessId: placeId,
 businessType: 'restaurant',
 item: '0', page: 1, size: 3,
 isPhotoUsed: false,
 includeContent: true,
 getReactions: false,
 },
 },
 query: `query getVisitorReviews($input: VisitorReviewsInput) {
 visitorReviews(input: $input) {
 total
 items { id body rating created }
 }
}`,
 }])

 try {
 const res = await fetch(NAVER_GRAPHQL_URL, {
 method: 'POST',
 headers: GRAPHQL_HEADERS,
 body,
 signal: AbortSignal.timeout(8000),
 cache: 'no-store',
 })
 const latency = Date.now() - t0
 if (!res.ok) {
 return { ok: false, place_id: placeId, latency_ms: latency, review_count: null, error: `HTTP ${res.status}` }
 }
 const j = await res.json()
 const d = j?.[0]?.data?.visitorReviews
 if (!d) {
 // 카테고리 미스매치 — 엔드포인트는 살아있음
 return { ok: true, place_id: placeId, latency_ms: latency, review_count: 0, error: null }
 }
 return { ok: true, place_id: placeId, latency_ms: latency, review_count: d.total ?? d.items?.length ?? 0, error: null }
 } catch (e) {
 return {
 ok: false, place_id: placeId,
 latency_ms: Date.now() - t0,
 review_count: null,
 error: e instanceof Error ? e.message : String(e),
 }
 }
}

export async function GET() {
 // ── 관리자 인증 (HMAC 쿠키 + 화이트리스트 통합 검증) ──
 const admin = await requireAdmin()
 if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

 const svc = createServiceClient()

 const now = new Date()
 const since6h = new Date(now.getTime() - 6 * 3600000).toISOString()
 const since24h = new Date(now.getTime() - 24 * 3600000).toISOString()
 const since7d = new Date(now.getTime() - 7 * 86400000).toISOString()
 const todayKST = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10)
 const todayStart = new Date(todayKST + 'T00:00:00+09:00').toISOString()

 // ── 1. DB 전체 통계 ────────────────────────────────────────
 const [totalRes, todayRes, week7Res, unrepliedRes] = await Promise.all([
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('platform', 'naver_place'),
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('platform', 'naver_place').gte('collected_at', todayStart),
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('platform', 'naver_place').gte('collected_at', since7d),
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('platform', 'naver_place').eq('has_reply', false),
 ])

 const totalReviews = totalRes.count ?? 0
 const todayReviews = todayRes.count ?? 0
 const week7Reviews = week7Res.count ?? 0
 const unrepliedTotal = unrepliedRes.count ?? 0
 const unrepliedPct = totalReviews > 0 ? Math.round((unrepliedTotal / totalReviews) * 100) : 0

 // ── 2. 크론 상태 ───────────────────────────────────────────
 const [cron6h, cron24h] = await Promise.all([
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('platform', 'naver_place').gte('collected_at', since6h),
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('platform', 'naver_place').gte('collected_at', since24h),
 ])
 const cronOk6h = (cron6h.count ?? 0) > 0
 const cronOk24h = (cron24h.count ?? 0) > 0

 // 마지막 수집 시각 (전체)
 const { data: lastRow } = await svc
 .from('platform_reviews')
 .select('collected_at')
 .eq('platform', 'naver_place')
 .order('collected_at', { ascending: false })
 .limit(1)
 .maybeSingle()
 const lastCollectedAt: string | null = lastRow?.collected_at ?? null
 const lastCollectedHoursAgo = lastCollectedAt ? hoursAgo(lastCollectedAt) : null

 // ── 3. 연결 유저 목록 ─────────────────────────────────────
 const { data: credRows } = await svc
 .from('platform_credentials')
 .select('user_id, platform_store_id, platform_store_name, updated_at')
 .eq('platform', 'naver_place')
 .limit(200)

 const connectedUsers = (credRows ?? []) as Array<{
 user_id: string
 platform_store_id: string | null
 platform_store_name: string | null
 updated_at: string
 }>

 // ── 4. 유저별 수집 현황 ────────────────────────────────────
 const userStats: UserStat[] = []

 for (const u of connectedUsers) {
 const uid = u.user_id
 const placeId = u.platform_store_id

 const [latestRow, count7dRow, unrepliedRow] = await Promise.all([
 svc.from('platform_reviews').select('collected_at').eq('user_id', uid).eq('platform', 'naver_place').order('collected_at', { ascending: false }).limit(1).maybeSingle(),
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('platform', 'naver_place').gte('collected_at', since7d),
 svc.from('platform_reviews').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('platform', 'naver_place').eq('has_reply', false),
 ])

 const lastAt = latestRow.data?.collected_at ?? null
 const count7d = count7dRow.count ?? 0
 const unrep = unrepliedRow.count ?? 0

 // 전체 수
 const { count: countTotal } = await svc
 .from('platform_reviews')
 .select('id', { count: 'exact', head: true })
 .eq('user_id', uid)
 .eq('platform', 'naver_place')

 let status: PipelineStatus = 'ok'
 let reason = '정상 수집 중'
 if (!lastAt) {
 status = 'error'; reason = '리뷰 미수집 — 연결은 됐으나 수집 기록 없음'
 } else {
 const h = hoursAgo(lastAt)
 if (h > 48) { status = 'error'; reason = `마지막 수집 ${Math.round(h/24)}일 전 (48시간 초과)` }
 else if (h > 24) { status = 'warn'; reason = `마지막 수집 ${Math.round(h)}시간 전 (24시간 초과)` }
 }

 userStats.push({
 user_id: uid.slice(0, 8) + '…',
 place_id: placeId,
 last_collected_at: lastAt,
 review_count_7d: count7d,
 review_count_total: countTotal ?? 0,
 unreplied: unrep,
 status,
 status_reason: reason,
 })
 }

 // ── 5. GraphQL 실시간 테스트 ──────────────────────────────
 // 테스트용 place_id: 환경변수 우선, 없으면 연결된 유저 첫 번째
 // (하드코딩 제거 — 특정 매장 의존성 차단)
 const testPlaceId = process.env.HEALTH_TEST_PLACE_ID
 ?? connectedUsers.find(u => u.platform_store_id)?.platform_store_id
 ?? null
 const graphqlTest = testPlaceId ? await testGraphQL(testPlaceId) : { ok: false, error_code: 'no_test_place_id', message: '테스트용 placeId 없음 — HEALTH_TEST_PLACE_ID 환경변수 또는 연결된 사용자 필요' }

 // ── 6. 미답변 리뷰 상위 5건 ──────────────────────────────
 const { data: unrepliedSample } = await svc
 .from('platform_reviews')
 .select('id, author_mask, content, posted_at, collected_at, user_id')
 .eq('platform', 'naver_place')
 .eq('has_reply', false)
 .order('posted_at', { ascending: false })
 .limit(5)

 // ── 7. 전체 종합 상태 결정 ────────────────────────────────
 let overall: PipelineStatus = 'ok'
 const issues: string[] = []

 if (!graphqlTest.ok) {
 overall = 'error'
 issues.push(`GraphQL 엔드포인트 오류: ${graphqlTest.error}`)
 }
 if (!cronOk24h) {
 if (overall !== 'error') overall = 'warn'
 issues.push('24시간 내 리뷰 수집 기록 없음 — 크론 중단 의심')
 } else if (!cronOk6h) {
 if (overall !== 'error') overall = 'warn'
 issues.push('6시간 내 수집 없음 (4시간 주기 크론 지연 가능성)')
 }
 if (userStats.some(u => u.status === 'error')) {
 if (overall !== 'error') overall = 'warn'
 issues.push(`수집 오류 유저 ${userStats.filter(u => u.status === 'error').length}명`)
 }
 if (lastCollectedHoursAgo !== null && lastCollectedHoursAgo > 24) {
 if (overall !== 'error') overall = 'error'
 issues.push(`전체 마지막 수집이 ${Math.round(lastCollectedHoursAgo)}시간 전`)
 }

 return NextResponse.json({
 ok: true,
 overall,
 issues,
 checked_at: now.toISOString(),

 stats: {
 total_reviews: totalReviews,
 today_reviews: todayReviews,
 week7_reviews: week7Reviews,
 unreplied_total: unrepliedTotal,
 unreplied_pct: unrepliedPct,
 connected_users: connectedUsers.length,
 stale_users: userStats.filter(u => u.status !== 'ok').length,
 last_collected_at: lastCollectedAt,
 last_collected_fmt: fmtKST(lastCollectedAt),
 last_collected_hours_ago: lastCollectedHoursAgo !== null ? Math.round(lastCollectedHoursAgo * 10) / 10 : null,
 },

 cron: {
 ok_6h: cronOk6h,
 ok_24h: cronOk24h,
 count_6h: cron6h.count ?? 0,
 count_24h: cron24h.count ?? 0,
 schedule_kst: 'KST 01:00 / 05:00 / 09:00 / 13:00 / 17:00 / 21:00',
 },

 graphql_test: graphqlTest,

 user_stats: userStats,

 unreplied_sample: (unrepliedSample ?? []).map(r => ({
 id: r.id,
 author: r.author_mask,
 content: (r.content ?? '').slice(0, 80),
 posted_at: fmtKST(r.posted_at),
 collected_at: fmtKST(r.collected_at),
 })),
 })
}
