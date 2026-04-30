// app/api/cron/baemin-auto-refresh/route.ts
// ============================================================
// 배민 자동 갱신 크론 (Vercel Cron — 2시간마다)
//
// 동작:
//   1. 배민 credentials 있는 전체 유저 조회
//   2. 쿠키 갱신 필요 여부 판단 (> 8시간 경과)
//   3. 필요 시 → 프록시 RSA 로그인 → 쿠키 갱신
//   4. 리뷰 수집 (직접 API)
//   5. 결과 로그
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { baeminProxyLogin } from '@/app/lib/baemin-login'
import { getProxy, testProxy } from '@/app/lib/proxy-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000   // 8시간

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const cipher = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  cipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([cipher.update(Buffer.from(enc, 'base64')), cipher.final()]).toString('utf8')
}

function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv  = randomBytes(12)
  const cipher = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

function isCookieStale(extra: any): boolean {
  if (!extra?.baemin_cookie_enc) return true
  if (!extra?.cookie_saved_at)   return true
  const saved = new Date(extra.cookie_saved_at).getTime()
  return Date.now() - saved > COOKIE_MAX_AGE_MS
}

async function collectBaeminReviews(cookieStr: string, shopNo: string): Promise<{ count: number; error?: string }> {
  try {
    const headers: Record<string, string> = {
      Cookie: cookieStr,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0',
      Referer: 'https://self.baemin.com/shops/' + shopNo + '/reviews',
      Origin:  'https://self.baemin.com',
      Accept:  'application/json',
    }
    const res = await fetch(BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=30', { headers, cache: 'no-store' })
    if (!res.ok) return { count: 0, error: 'API ' + res.status }
    const json = await res.json()
    const reviews = Array.isArray(json) ? json : (json.contents || json.data || json.reviews || json.list || [])
    return { count: reviews.length }
  } catch (e: any) {
    return { count: 0, error: e?.message }
  }
}

export async function GET(req: NextRequest) {
  const cronCheck = verifyCronAuth(req.headers.get('authorization'))
  if (!cronCheck.ok) return NextResponse.json({ ok: false, error: cronCheck.message }, { status: cronCheck.status })

  const svc = createServiceClient()
  const results: any[] = []
  const ts = new Date().toISOString()

  // 프록시 확인
  const proxy = await getProxy()
  const proxyOk = proxy ? (await testProxy(proxy)).ok : false

  if (!proxy || !proxyOk) {
    return NextResponse.json({
      ok: false,
      ts,
      error: '프록시 없음 또는 실패 — WEBSHARE_API_KEY 설정 필요',
      proxy_configured: !!proxy,
    })
  }

  // 배민 credentials 전체 조회
  const { data: creds } = await svc
    .from('platform_credentials')
    .select('user_id, account_id, platform_store_id, extra_data, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag, last_login_status')
    .eq('platform', 'baemin')
    .neq('last_login_status', 'disabled')

  if (!creds || creds.length === 0) {
    return NextResponse.json({ ok: true, ts, message: '배민 연결 계정 없음', results: [] })
  }

  for (const cred of creds) {
    const extra = (cred.extra_data as any) || {}
    const result: any = { userId: cred.user_id, refreshed: false, collected: false, error: null }

    try {
      // 쿠키 갱신 필요 여부
      if (isCookieStale(extra)) {
        result.reason = 'cookie_stale'

        // 비밀번호 복호화
        let pw = ''
        if (extra.baemin_pw_enc) {
          pw = decryptStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
        } else if (cred.password_encrypted && cred.dek_encrypted) {
          const kek = loadKek()
          const dekD = createDecipheriv(ALGO, kek, Buffer.from(cred.dek_iv!, 'base64'))
          dekD.setAuthTag(Buffer.from(cred.dek_tag!, 'base64'))
          const dek = Buffer.concat([dekD.update(Buffer.from(cred.dek_encrypted!, 'base64')), dekD.final()])
          const pwD = createDecipheriv(ALGO, dek, Buffer.from(cred.password_iv!, 'base64'))
          pwD.setAuthTag(Buffer.from(cred.password_tag!, 'base64'))
          pw = Buffer.concat([pwD.update(Buffer.from(cred.password_encrypted!, 'base64')), pwD.final()]).toString('utf8')
        }

        if (!pw) { result.error = 'no_password'; results.push(result); continue }

        const baeminId = cred.account_id || extra.baemin_id || ''
        if (!baeminId) { result.error = 'no_account_id'; results.push(result); continue }

        // RSA 로그인
        const cookieStr = await baeminProxyLogin(baeminId, pw)
        if (!cookieStr || cookieStr.length < 10) { result.error = 'login_failed'; results.push(result); continue }

        // 쿠키 저장
        const { enc, iv, tag } = encryptStr(cookieStr)
        await svc.from('platform_credentials').update({
          extra_data: { ...extra, baemin_cookie_enc: enc, baemin_cookie_iv: iv, baemin_cookie_tag: tag, cookie_saved_at: new Date().toISOString() },
          last_login_status: 'success',
          last_login_at: new Date().toISOString(),
        }).eq('user_id', cred.user_id).eq('platform', 'baemin')

        result.refreshed = true
        extra.baemin_cookie_enc = enc
        extra.baemin_cookie_iv  = iv
        extra.baemin_cookie_tag = tag

        // 잠시 대기 (연속 로그인 방지)
        await new Promise(r => setTimeout(r, 2000))
      } else {
        result.reason = 'cookie_fresh'
      }

      // 리뷰 수집
      if (extra.baemin_cookie_enc) {
        const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
        const shopNo = String(cred.platform_store_id || '14637452')
        const collectResult = await collectBaeminReviews(cookieStr, shopNo)
        result.collected = collectResult.count > 0
        result.reviewCount = collectResult.count
        if (collectResult.error) result.collectError = collectResult.error
      }
    } catch (e: any) {
      result.error = e?.message || String(e)
    }

    results.push(result)
    await new Promise(r => setTimeout(r, 1000)) // 유저 간 간격
  }

  const refreshed = results.filter(r => r.refreshed).length
  const failed    = results.filter(r => r.error).length

  return NextResponse.json({ ok: true, ts, proxy_ip: proxy.host, total: results.length, refreshed, failed, results })
}
