// app/api/cron/delivery-reviews-fetch/route.ts
// ============================================================
// 배달 플랫폼(배민/요기요/쿠팡이츠) 리뷰 자동 수집 크론
// - 매 15분마다 Vercel Cron 이 호출 (네이버와 동일 cadence)
// - 각 플랫폼에 credentials 연결된 유저 조회
// - Railway Worker 에 fetch_reviews job enqueue
// - 15분 cron payload: days_back=1 (최근 24h 만 — 트래픽 절감)
// - 큐 dedupe: 15분 bucket (같은 user + 같은 quarter-hour 면 1번만)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PLATFORMS: Platform[] = ['baemin', 'yogiyo', 'coupangeats']
const GAP_MS = 800

export async function GET(req: NextRequest) {
 const cronCheck = verifyCronAuth(req.headers.get('authorization'))
 if (!cronCheck.ok) {
 return NextResponse.json({ ok: false, error: cronCheck.message }, { status: cronCheck.status })
 }

 const svc = createServiceClient()
 const results: Record<string, { queued: number; failed: number; errors: string[] }> = {}

 for (const platform of PLATFORMS) {
 results[platform] = { queued: 0, failed: 0, errors: [] }

 // 해당 플랫폼 연결된 유저 목록
 const { data: creds, error } = await svc
 .from('platform_credentials')
 .select('user_id, platform_store_id, last_login_status')
 .eq('platform', platform)
 .or('last_login_status.neq.disabled,last_login_status.is.null')

 if (error) {
 results[platform].errors.push('DB 조회 실패: ' + error.message)
 continue
 }
 if (!creds || creds.length === 0) continue

 for (const cred of creds) {
 // 72차: last_login_status 가 'failed' / 'credentials_invalid' / 'account_locked' / 'captcha' 면 skip
 // 매번 실패하는 매장에 cron 이 enqueue 해서 큐 적체 발생 방지
 const status = String(cred.last_login_status || '')
 if (
 status.startsWith('failed') ||
 status.startsWith('credentials_invalid') ||
 status.startsWith('account_locked') ||
 status.startsWith('captcha')
 ) {
 results[platform].errors.push(cred.user_id + ': skip (status=' + status.slice(0, 40) + ')')
 continue
 }

 try {
 // 15분 단위 dedupe — 동일 사용자가 같은 15분 윈도우에 중복 enqueue 안 됨
 const quarterBucket = Math.floor(Date.now() / 900_000)
 const jobId = `cron_${platform}_${cred.user_id}_${quarterBucket}`
 // v1.6k: 'unknown' string sentinel 제거 — 빈 string 이면 Worker 가 auto-detect
 const validShopId = cred.platform_store_id && /^\d+$/.test(String(cred.platform_store_id))
 ? String(cred.platform_store_id) : ''
 // 15분 cron 은 days_back=1 (최근 24h 만) — 트래픽 절감 + 신규 리뷰 빠른 반영
 // 사장님이 처음 수동 트리거 시 (collect API) 180일치 fetch 따로 진행됨
 const jobResult = await enqueuePlatformJob({
 platform,
 action: 'fetch_reviews',
 userId: cred.user_id,
 storeId: validShopId || 'auto-detect',
 payload: validShopId
 ? { shop_no: validShopId, days_back: 1, triggered_by: 'cron_15min' }
 : { days_back: 1, triggered_by: 'cron_15min' },
 }, { jobId })

 if (jobResult.ok) {
 results[platform].queued++
 } else {
 results[platform].failed++
 results[platform].errors.push(cred.user_id + ': ' + jobResult.error)
 }

 // 연속 enqueue 간격
 await new Promise(r => setTimeout(r, GAP_MS))
 } catch (e: any) {
 results[platform].failed++
 results[platform].errors.push(cred.user_id + ': ' + (e?.message || String(e)))
 }
 }
 }

 const totalQueued = Object.values(results).reduce((s, r) => s + r.queued, 0)
 const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0)

 return NextResponse.json({
 ok: true,
 ts: new Date().toISOString(),
 totalQueued,
 totalFailed,
 results,
 })
}
