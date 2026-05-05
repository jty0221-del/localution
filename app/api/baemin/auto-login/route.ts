// app/api/baemin/auto-login/route.ts
// ============================================================
// 배민 자동 로그인 (한국 프록시 경유 RSA 로그인)
// POST /api/baemin/auto-login
// — 저장된 계정 정보로 자동 로그인 → 새 쿠키 DB 저장
// — 크론 / UI 버튼 양쪽에서 호출
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { baeminProxyLogin } from '@/app/lib/baemin-login'
import { getProxy, testProxy } from '@/app/lib/proxy-manager'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
 const raw = process.env.ENCRYPTION_KEK_HEX || ''
 let hex = ''
 for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
 if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
 return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string {
 const kek = loadKek()
 const decipher = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
 decipher.setAuthTag(Buffer.from(tag, 'base64'))
 return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8')
}

function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
 const kek = loadKek()
 const iv = randomBytes(12)
 const cipher = createCipheriv(ALGO, kek, iv)
 const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
 return {
 enc: encrypted.toString('base64'),
 iv: iv.toString('base64'),
 tag: cipher.getAuthTag().toString('base64'),
 }
}

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 const userId = auth.userId!

 try {
 const svc = createServiceClient()

 // 1) 저장된 자격증명 로드
 const { data: cred } = await svc
 .from('platform_credentials')
 .select('account_id, extra_data, platform_store_id, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag')
 .eq('user_id', userId)
 .eq('platform', 'baemin')
 .maybeSingle()

 if (!cred) {
 return NextResponse.json({ ok: false, error: '배민 계정이 연결되지 않았어요. 먼저 계정을 연결해주세요.', code: 'NO_CREDS' }, { status: 400 })
 }

 const extra = (cred.extra_data as any) || {}

 // 비밀번호 복호화 (1-layer KEK 방식)
 let pw = ''
 if (extra.baemin_pw_enc && extra.baemin_pw_iv && extra.baemin_pw_tag) {
 pw = decryptStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
 } else if (cred.password_encrypted && cred.dek_encrypted) {
 // 2-layer DEK 방식 (Worker 호환)
 const kek = loadKek()
 const dekDecipher = createDecipheriv(ALGO, kek, Buffer.from(cred.dek_iv!, 'base64'))
 dekDecipher.setAuthTag(Buffer.from(cred.dek_tag!, 'base64'))
 const dek = Buffer.concat([dekDecipher.update(Buffer.from(cred.dek_encrypted!, 'base64')), dekDecipher.final()])
 const pwDecipher = createDecipheriv(ALGO, dek, Buffer.from(cred.password_iv!, 'base64'))
 pwDecipher.setAuthTag(Buffer.from(cred.password_tag!, 'base64'))
 pw = Buffer.concat([pwDecipher.update(Buffer.from(cred.password_encrypted!, 'base64')), pwDecipher.final()]).toString('utf8')
 } else {
 return NextResponse.json({ ok: false, error: '저장된 비밀번호가 없어요. 계정을 다시 연결해주세요.', code: 'NO_PW' }, { status: 400 })
 }

 // 2) 프록시 확인
 const proxy = await getProxy()
 if (!proxy) {
 return NextResponse.json({
 ok: false,
 error: '한국 프록시가 설정되지 않았어요. WEBSHARE_API_KEY 또는 PROXY_HOST를 설정해주세요.',
 code: 'NO_PROXY',
 setup_guide: 'https://proxy.webshare.io — 무료 가입 후 API 키를 WEBSHARE_API_KEY 환경변수에 설정',
 }, { status: 400 })
 }

 // 3) 프록시 동작 확인
 const proxyTest = await testProxy(proxy)
 if (!proxyTest.ok) {
 return NextResponse.json({
 ok: false,
 error: '프록시 연결 실패: ' + (proxyTest.error || 'timeout'),
 code: 'PROXY_FAIL',
 proxy_host: proxy.host,
 }, { status: 503 })
 }

 // 4) 배민 RSA 로그인 (Akamai 차단 시 Worker fallback)
 const baeminId = cred.account_id || extra.baemin_id || ''
 if (!baeminId) return NextResponse.json({ ok: false, error: '배민 아이디 없음' }, { status: 400 })

 let cookieStr = ''
 let proxyLoginError: string | null = null
 try {
 cookieStr = await baeminProxyLogin(baeminId, pw)
 } catch (loginErr: any) {
 proxyLoginError = loginErr?.message || 'unknown'
 console.warn('[baemin-auto-login] RSA login failed:', proxyLoginError)
 }

 if (cookieStr && cookieStr.length >= 10) {
 // 정상 경로: 쿠키 저장
 const { enc, iv, tag } = encryptStr(cookieStr)
 await svc
 .from('platform_credentials')
 .update({
 extra_data: {
 ...extra,
 baemin_cookie_enc: enc,
 baemin_cookie_iv: iv,
 baemin_cookie_tag: tag,
 cookie_saved_at: new Date().toISOString(),
 },
 last_login_status: 'success',
 last_login_at: new Date().toISOString(),
 })
 .eq('user_id', userId)
 .eq('platform', 'baemin')

 return NextResponse.json({
 ok: true,
 message: '배민 로그인 성공! 쿠키가 갱신됐어요.',
 proxy_ip: proxyTest.ip,
 proxy_country: proxyTest.countryCode,
 })
 }

 // v1.6: RSA 로그인 실패 → Worker 에 fresh login 위임
 // Worker 가 Playwright 로 직접 로그인 + cookies 저장 후 fetch_reviews 실행
 if (process.env.REDIS_URL) {
 try {
 // v1.6b: 'unknown' string sentinel 제거 — Worker 가 allShopIds 감지하도록
 const validShopNo = cred.platform_store_id && /^\d+$/.test(String(cred.platform_store_id))
 ? String(cred.platform_store_id) : ''
 const jr = await enqueuePlatformJob({
 platform: 'baemin', action: 'fetch_reviews',
 userId, storeId: validShopNo || 'auto-detect',
 payload: validShopNo
 ? { shop_no: validShopNo, days_back: 30, source: 'auto-login-fallback' }
 : { days_back: 30, source: 'auto-login-fallback' },
 })
 await svc.from('platform_credentials').update({
 last_login_status: 'pending_worker_login',
 last_login_at: new Date().toISOString(),
 }).eq('user_id', userId).eq('platform', 'baemin')

 return NextResponse.json({
 ok: true,
 fallback: 'worker',
 jobId: jr.ok ? jr.jobId : undefined,
 message: 'Vercel 직접 로그인은 Akamai 가 차단했어요. Worker 가 1-2분 안에 자동 로그인 + 리뷰 수집 처리해요.',
 proxy_login_error: proxyLoginError,
 })
 } catch (qErr: any) {
 return NextResponse.json({
 ok: false,
 error: '로그인 + 큐 둘 다 실패: ' + (proxyLoginError || '') + ' / ' + (qErr?.message || ''),
 code: 'LOGIN_FAIL',
 }, { status: 500 })
 }
 }

 return NextResponse.json({
 ok: false,
 error: '로그인 실패: ' + (proxyLoginError || '쿠키 미수신') + ' (REDIS_URL 미설정으로 Worker fallback 불가)',
 code: 'LOGIN_FAIL',
 }, { status: 401 })
 } catch (e: any) {
 const msg = e?.message || String(e)
 if (msg.includes('아이디') || msg.includes('비밀번호') || msg.includes('login')) {
 return NextResponse.json({ ok: false, error: '로그인 실패: ' + msg, code: 'LOGIN_FAIL' }, { status: 401 })
 }
 return NextResponse.json({ ok: false, error: msg }, { status: 500 })
 }
}
