// app/api/cron/baemin-auto-refresh/route.ts
// ============================================================
// 전 플랫폼 자동 쿠키 갱신 + 상태 점검 크론 (2시간마다)
// - 배민: RSA 로그인 → 쿠키 갱신 → 리뷰 수집
// - 나머지(네이버/쿠팡이츠/요기요): Worker 상태만 확인
// - 프록시 자동 선택: IP Royal > Webshare > 정적
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { baeminProxyLogin } from '@/app/lib/baemin-login'
import { getProxy, testProxy, buildProxyUrl } from '@/app/lib/proxy-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000

function loadKek(): Buffer {
 const raw = process.env.ENCRYPTION_KEK_HEX || ''
 let hex = ''
 for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
 if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 없음')
 return Buffer.from(hex, 'hex')
}
function decryptStr(enc: string, iv: string, tag: string) {
 const kek = loadKek()
 const d = createDecipheriv(ALGO, kek, Buffer.from(iv,'base64'))
 d.setAuthTag(Buffer.from(tag,'base64'))
 return Buffer.concat([d.update(Buffer.from(enc,'base64')), d.final()]).toString('utf8')
}
function encryptStr(plain: string) {
 const kek = loadKek(); const iv = randomBytes(12)
 const c = createCipheriv(ALGO, kek, iv)
 const enc = Buffer.concat([c.update(plain,'utf8'), c.final()])
 return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64') }
}
function isCookieStale(extra: any) {
 if (!extra?.baemin_cookie_enc) return true
 if (!extra?.cookie_saved_at) return true
 return Date.now() - new Date(extra.cookie_saved_at).getTime() > COOKIE_MAX_AGE_MS
}

export async function GET(req: NextRequest) {
 const cronCheck = verifyCronAuth(req.headers.get('authorization'))
 if (!cronCheck.ok) return NextResponse.json({ ok: false, error: cronCheck.message }, { status: cronCheck.status })

 const ts = new Date().toISOString()
 const svc = createServiceClient()

 // 프록시 확인
 const proxy = await getProxy()
 const proxyTest = proxy ? await testProxy(proxy) : null

 const infra = {
 proxy_source: proxy?.source || 'none',
 proxy_host: proxy?.host,
 proxy_ok: proxyTest?.ok || false,
 proxy_country: proxyTest?.countryCode,
 proxy_ip: proxyTest?.ip,
 twocaptcha: !!(process.env.TWOCAPTCHA_API_KEY && !process.env.TWOCAPTCHA_API_KEY.includes('API키')),
 }

 // 배민 쿠키 갱신
 const baeminResults: any[] = []
 if (proxy && proxyTest?.ok) {
 const { data: creds } = await svc
 .from('platform_credentials')
 .select('user_id, account_id, platform_store_id, extra_data, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag, last_login_status')
 .eq('platform', 'baemin')
 .neq('last_login_status', 'disabled')

 for (const cred of (creds || [])) {
 const extra = (cred.extra_data as any) || {}
 const entry: any = { userId: cred.user_id, refreshed: false, collected: false }
 try {
 if (isCookieStale(extra)) {
 let pw = ''
 if (extra.baemin_pw_enc) {
 pw = decryptStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
 } else if (cred.password_encrypted && cred.dek_encrypted) {
 const kek = loadKek()
 const dekD = createDecipheriv(ALGO, kek, Buffer.from(cred.dek_iv!,'base64'))
 dekD.setAuthTag(Buffer.from(cred.dek_tag!,'base64'))
 const dek = Buffer.concat([dekD.update(Buffer.from(cred.dek_encrypted!,'base64')), dekD.final()])
 const pwD = createDecipheriv(ALGO, dek, Buffer.from(cred.password_iv!,'base64'))
 pwD.setAuthTag(Buffer.from(cred.password_tag!,'base64'))
 pw = Buffer.concat([pwD.update(Buffer.from(cred.password_encrypted!,'base64')), pwD.final()]).toString('utf8')
 }
 if (pw) {
 const cookieStr = await baeminProxyLogin(cred.account_id || extra.baemin_id || '', pw)
 if (cookieStr) {
 const { enc, iv, tag } = encryptStr(cookieStr)
 await svc.from('platform_credentials').update({
 extra_data: { ...extra, baemin_cookie_enc: enc, baemin_cookie_iv: iv, baemin_cookie_tag: tag, cookie_saved_at: new Date().toISOString() },
 last_login_status: 'success', last_login_at: new Date().toISOString(),
 }).eq('user_id', cred.user_id).eq('platform', 'baemin')
 entry.refreshed = true
 extra.baemin_cookie_enc = enc; extra.baemin_cookie_iv = iv; extra.baemin_cookie_tag = tag
 await new Promise(r => setTimeout(r, 2000))
 }
 }
 }
 if (extra.baemin_cookie_enc) {
 const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
 const shopNo = String(cred.platform_store_id || '14637452')
 const res = await fetch(BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=30', {
 headers: { Cookie: cookieStr, 'User-Agent': 'Mozilla/5.0', Referer: 'https://self.baemin.com/', Origin: 'https://self.baemin.com', Accept: 'application/json' },
 cache: 'no-store', signal: AbortSignal.timeout(12000),
 })
 entry.collected = res.ok
 entry.api_status = res.status
 }
 } catch (e: any) { entry.error = e?.message }
 baeminResults.push(entry)
 await new Promise(r => setTimeout(r, 800))
 }
 }

 return NextResponse.json({
 ok: true, ts, infra,
 baemin: { total: baeminResults.length, refreshed: baeminResults.filter(r=>r.refreshed).length, collected: baeminResults.filter(r=>r.collected).length, results: baeminResults },
 message: !proxy?.source || proxy.source === 'none' ? 'IPROYAL_USER 또는 WEBSHARE_API_KEY 설정 후 자동 갱신 시작됩니다' : '정상 동작 중',
 })
}
