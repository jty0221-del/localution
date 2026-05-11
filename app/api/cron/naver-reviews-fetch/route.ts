// app/api/cron/naver-reviews-fetch/route.ts
// ============================================================
// v37+: 네이버 공개 리뷰 자동 수집 크론 (15분마다 — 사용자 요청)
// · 매 15분 → KST 거의 실시간 리뷰 수집
// · 새 리뷰 감지 시 알림 발송 trigger (Phase 1: 발송 큐 적재만)
// · 별점 ≤ low_rating_threshold 면 사용자 알림 끄도 강제 발송
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { fetchVisitorReviews } from '@/app/lib/naver-place'
import { triggerReviewNotifications } from '@/app/lib/notifications-trigger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Vercel Pro: up to 300s (cron plugin) — 50 유저 × 2~3초 충분
export const maxDuration = 300

const MAX_USERS_PER_RUN = 80
const GAP_MS = 500

type Target = {
 user_id: string
 place_id: string
 source: 'platform_credentials' | 'place_targets'
 category?: string | null
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

export async function GET(req: NextRequest) {
 const a = verifyCronAuth(req.headers.get('authorization'))
 if (!a.ok) return NextResponse.json({ error: a.message }, { status: a.status })

 const startedAt = Date.now()
 const svc = createServiceClient()

 // 1) 대상 수집: platform_credentials.naver_place + place_targets 합집합
 // (user_id, place_id) 유니크 기준
 const targetMap = new Map<string, Target>()

 try {
 const { data, error } = await svc
 .from('platform_credentials')
 .select('user_id, platform_store_id, updated_at')
 .eq('platform', 'naver_place')
 .not('platform_store_id', 'is', null)
 .order('updated_at', { ascending: true })
 .limit(MAX_USERS_PER_RUN * 2)
 if (!error && Array.isArray(data)) {
 for (const r of data as Array<{ user_id: string; platform_store_id: string | null }>) {
 if (!r.platform_store_id || !/^\d+$/.test(String(r.platform_store_id))) continue
 const k = `${r.user_id}|${r.platform_store_id}`
 if (!targetMap.has(k)) {
 targetMap.set(k, {
 user_id: r.user_id,
 place_id: String(r.platform_store_id),
 source: 'platform_credentials',
 })
 }
 }
 }
 } catch (_) {}

 try {
 const { data, error } = await svc
 .from('place_targets')
 .select('user_id, place_id, category, updated_at')
 .eq('enabled', true)
 .order('updated_at', { ascending: true })
 .limit(MAX_USERS_PER_RUN * 2)
 if (!error && Array.isArray(data)) {
 for (const r of data as Array<{ user_id: string; place_id: string | null; category: string | null }>) {
 if (!r.place_id || !/^\d+$/.test(String(r.place_id))) continue
 const k = `${r.user_id}|${r.place_id}`
 if (!targetMap.has(k)) {
 targetMap.set(k, {
 user_id: r.user_id,
 place_id: String(r.place_id),
 source: 'place_targets',
 category: r.category,
 })
 }
 }
 }
 } catch (_) {}

 const targets = Array.from(targetMap.values()).slice(0, MAX_USERS_PER_RUN)
 if (targets.length === 0) {
 return NextResponse.json({
 ok: true,
 mode: 'cron_naver_reviews_fetch',
 count: 0,
 message: '대상 유저 없음 — 종료',
 duration_ms: Date.now() - startedAt,
 })
 }

 let okUsers = 0
 let failUsers = 0
 let totalCollected = 0
 let totalUpserted = 0
 const results: Array<{
 user_id: string
 place_id: string
 source: string
 collected: number
 upserted: number
 error?: string
 }> = []

 for (let i = 0; i < targets.length; i++) {
 const t = targets[i]
 const now = new Date().toISOString()
 try {
 // 트래픽 + UX 절감: DB 의 기존 reviewId 들을 조회해서 incremental fetch
 //   첫 페이지 50건이 모두 기존이면 추가 페이지 안 부름 → 500건 → 50건 (90% 절감)
 //   신규 리뷰만 fetch → "마지막 수집" 시간이 매번 안 바뀜 (사장님 UX ↑)
 // eslint-disable-next-line no-await-in-loop
 const { data: existing } = await svc
 .from('platform_reviews')
 .select('platform_review_id')
 .eq('user_id', t.user_id)
 .eq('platform', 'naver_place')
 .order('posted_at', { ascending: false })
 .limit(500)
 const knownReviewIds = new Set((existing || []).map((r: any) => String(r.platform_review_id)))

 // eslint-disable-next-line no-await-in-loop
 const reviews = await fetchVisitorReviews(t.place_id, t.category ?? null, {
 quickMode: true,
 knownReviewIds,
 })

 // 신규 리뷰 없으면 DB 업데이트 skip (collected_at, has_reply 보존 — UI 깜빡임 방지)
 const onlyKnown = reviews.length > 0 && reviews.every(r => knownReviewIds.has(r.reviewId))
 if (onlyKnown) {
 results.push({
 user_id: t.user_id,
 place_id: t.place_id,
 source: t.source,
 collected: reviews.length,
 upserted: 0,
 })
 await new Promise(r => setTimeout(r, GAP_MS))
 continue
 }
 if (!reviews || reviews.length === 0) {
 results.push({
 user_id: t.user_id,
 place_id: t.place_id,
 source: t.source,
 collected: 0,
 upserted: 0,
 })
 } else {
 const rows = reviews.map((r) => ({
 user_id: t.user_id,
 platform: 'naver_place' as const,
 platform_store_id: t.place_id,
 platform_review_id: r.reviewId,
 author_name: r.authorName ?? null,
 author_mask: maskAuthor(r.authorName),
 rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
 content: r.body,
 photos: r.photos.length > 0 ? r.photos : null,
 posted_at: parseDateSafely(r.postedAt) || parseDateSafely(r.visitedAt),
 collected_at: now,
 has_reply: false,
 raw_snapshot: r,
 }))
 // eslint-disable-next-line no-await-in-loop
 const { data: upData, error: upErr } = await svc
 .from('platform_reviews')
 .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
 .select('platform_review_id')
 if (upErr) {
 failUsers += 1
 results.push({
 user_id: t.user_id,
 place_id: t.place_id,
 source: t.source,
 collected: reviews.length,
 upserted: 0,
 error: upErr.message,
 })
 } else {
 okUsers += 1
 totalCollected += reviews.length
 const upsertedCount = Array.isArray(upData) ? upData.length : 0
 totalUpserted += upsertedCount
 results.push({
 user_id: t.user_id,
 place_id: t.place_id,
 source: t.source,
 collected: reviews.length,
 upserted: upsertedCount,
 })

 // ⭐ 알림 trigger — 새로 upsert 된 리뷰가 있으면 사용자 알림 설정 확인 후 발송
 // upserted_id 가 있는 리뷰만 (DB 에 처음 들어왔거나 변경된) 알림 후보
 if (Array.isArray(upData) && upData.length > 0) {
 try {
 const newReviewIds = new Set(upData.map(r => r.platform_review_id).filter(Boolean))
 const newReviews = rows.filter(r => newReviewIds.has(r.platform_review_id))
 // eslint-disable-next-line no-await-in-loop
 await triggerReviewNotifications(svc, t.user_id, newReviews).catch((e) => {
 console.warn('[notify-trigger] failed user=' + t.user_id, e?.message)
 })
 } catch (_) {}
 }
 }
 }
 } catch (e: any) {
 failUsers += 1
 results.push({
 user_id: t.user_id,
 place_id: t.place_id,
 source: t.source,
 collected: 0,
 upserted: 0,
 error: e?.message || 'fetch_error',
 })
 }

 if (i < targets.length - 1) {
 // eslint-disable-next-line no-await-in-loop
 await new Promise((res) => setTimeout(res, GAP_MS))
 }
 }

 return NextResponse.json({
 ok: true,
 mode: 'cron_naver_reviews_fetch',
 count: targets.length,
 ok_users: okUsers,
 fail_users: failUsers,
 total_collected: totalCollected,
 total_upserted: totalUpserted,
 duration_ms: Date.now() - startedAt,
 results,
 })
}
