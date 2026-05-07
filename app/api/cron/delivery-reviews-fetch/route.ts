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

 // 해당 플랫폼 연결된 유저 목록 (extra_data 도 가져와서 다중 매장 지원)
 const { data: creds, error } = await svc
 .from('platform_credentials')
 .select('user_id, platform_store_id, last_login_status, extra_data')
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

 // 다중 매장 지원: extra_data.store_ids 배열이 있으면 각 매장별로 enqueue
 // 없으면 platform_store_id 1개만 (기존 동작)
 const extraData = (cred.extra_data as Record<string, unknown>) || {}
 const rawStoreIds = Array.isArray(extraData.store_ids) ? extraData.store_ids as any[] : []
 const validIdsFromArray = rawStoreIds.map(s => String(s).trim()).filter(s => /^\d+$/.test(s))
 const fallbackId = cred.platform_store_id && /^\d+$/.test(String(cred.platform_store_id))
 ? String(cred.platform_store_id) : ''
 const storeIdsToFetch: string[] = validIdsFromArray.length > 0
 ? validIdsFromArray
 : (fallbackId ? [fallbackId] : [''])

 for (const shopNo of storeIdsToFetch) {
 try {
 // 15분 단위 dedupe — 매장별로 separate jobId
 const quarterBucket = Math.floor(Date.now() / 900_000)
 const storeKey = shopNo || 'auto-detect'
 const jobId = `cron_${platform}_${cred.user_id}_${storeKey}_${quarterBucket}`
 const jobResult = await enqueuePlatformJob({
 platform,
 action: 'fetch_reviews',
 userId: cred.user_id,
 storeId: shopNo || 'auto-detect',
 payload: shopNo
 ? { shop_no: shopNo, days_back: 1, triggered_by: 'cron_15min' }
 : { days_back: 1, triggered_by: 'cron_15min' },
 }, { jobId })

 if (jobResult.ok) {
 results[platform].queued++
 } else {
 results[platform].failed++
 results[platform].errors.push(cred.user_id + '/' + storeKey + ': ' + jobResult.error)
 }

 await new Promise(r => setTimeout(r, GAP_MS))
 } catch (e: any) {
 results[platform].failed++
 results[platform].errors.push(cred.user_id + '/' + shopNo + ': ' + (e?.message || String(e)))
 }
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
