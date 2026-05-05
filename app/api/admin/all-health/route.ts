// app/api/admin/all-health/route.ts
// ============================================================
// 전 플랫폼 시스템 헬스체크
// GET /api/admin/all-health
// 프록시 + 2captcha + 각 플랫폼 쿠키/연결 상태
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { getProxy, testProxy } from '@/app/lib/proxy-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ALGO = 'aes-256-gcm'
const PLATFORMS = ['baemin', 'naver_place', 'yogiyo', 'coupangeats'] as const

function loadKek(): Buffer {
 const raw = process.env.ENCRYPTION_KEK_HEX || ''
 let hex = ''
 for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
 if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 없음')
 return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string) {
 const kek = loadKek()
 const d = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
 d.setAuthTag(Buffer.from(tag, 'base64'))
 return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8')
}

function cookieAge(extra: any): number | null {
 if (!extra?.cookie_saved_at && !extra?.baemin_cookie_enc) return null
 const savedAt = extra?.cookie_saved_at
 if (!savedAt) return null
 return Math.floor((Date.now() - new Date(savedAt).getTime()) / 3600000)
}

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 const userId = auth.userId!

 const result: Record<string, any> = {
 timestamp: new Date().toISOString(),
 infrastructure: {},
 platforms: {},
 }

 // ── 인프라 체크 ──────────────────────────────────────────
 // 프록시
 const proxy = await getProxy()
 if (!proxy) {
 result.infrastructure.proxy = {
 ok: false,
 source: 'none',
 error: '프록시 미설정',
 fix: 'IPROYAL_USER/PASS 또는 WEBSHARE_API_KEY 설정 필요',
 }
 } else {
 const test = await testProxy(proxy)
 result.infrastructure.proxy = {
 ok: test.ok,
 source: proxy.source,
 host: proxy.host,
 ip: test.ip,
 country: test.countryCode,
 is_kr: test.countryCode === 'KR',
 error: test.error,
 }
 }

 // 2captcha
 const tc = (process.env.TWOCAPTCHA_API_KEY || '').trim()
 result.infrastructure.twocaptcha = {
 ok: !!tc && !tc.includes('API키') && tc.length > 8,
 configured: !!tc && !tc.includes('API키'),
 }

 // Redis (Worker 큐)
 result.infrastructure.redis = {
 ok: !!process.env.REDIS_URL,
 configured: !!process.env.REDIS_URL,
 }

 // ── 플랫폼별 체크 ────────────────────────────────────────
 const svc = createServiceClient()
 for (const platform of PLATFORMS) {
 const { data: cred } = await svc
 .from('platform_credentials')
 .select('account_id, extra_data, platform_store_id, last_login_status, last_login_at')
 .eq('user_id', userId)
 .eq('platform', platform)
 .maybeSingle()

 if (!cred) {
 result.platforms[platform] = { ok: false, connected: false, error: '계정 미연결' }
 continue
 }

 const extra = (cred.extra_data as any) || {}
 const ageH = cookieAge(extra)
 const hasCookie = !!(extra.baemin_cookie_enc || extra.cookie_enc || extra.session_cookie)
 const cookieStale = ageH !== null && ageH > 8

 result.platforms[platform] = {
 ok: !cookieStale,
 connected: true,
 account_id: cred.account_id,
 store_id: cred.platform_store_id,
 last_login: cred.last_login_at,
 last_login_status: cred.last_login_status,
 cookie_age_hours: ageH,
 cookie_stale: cookieStale,
 has_cookie: hasCookie,
 }

 // 배민은 API 직접 테스트
 if (platform === 'baemin' && hasCookie && extra.baemin_cookie_enc) {
 try {
 const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
 const shopNo = String(cred.platform_store_id || '14637452')
 const apiRes = await fetch(
 'https://self-api.baemin.com/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=1',
 {
 headers: { Cookie: cookieStr, Accept: 'application/json', Referer: 'https://self.baemin.com/', Origin: 'https://self.baemin.com' },
 cache: 'no-store', signal: AbortSignal.timeout(6000),
 }
 )
 result.platforms[platform].api_status = apiRes.status
 result.platforms[platform].api_ok = apiRes.ok
 if (!apiRes.ok) result.platforms[platform].cookie_stale = true
 } catch (e: any) {
 result.platforms[platform].api_error = e?.message
 }
 }
 }

 const proxyOk = result.infrastructure.proxy.ok
 const anyPlatformConnected = Object.values(result.platforms).some((p: any) => p.connected)

 return NextResponse.json({
 ok: proxyOk && anyPlatformConnected,
 summary: {
 proxy: result.infrastructure.proxy.source + (result.infrastructure.proxy.is_kr ? ' 🇰🇷' : ' '),
 twocaptcha: result.infrastructure.twocaptcha.ok ? '' : ' 미설정',
 platforms_connected: Object.values(result.platforms).filter((p: any) => p.connected).length + '/4',
 },
 ...result,
 })
}
