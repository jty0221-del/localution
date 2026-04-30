// app/api/cron/delivery-reviews-fetch/route.ts
// ============================================================
// 배달 플랫폼(배민/요기요/쿠팡이츠) 리뷰 자동 수집 크론
//   - 매 6시간마다 Vercel Cron 이 호출
//   - 배민: 직접 API 우선 (저장 쿠키) → 만료 시 프록시 재로그인 → Worker 폴백
//   - 요기요/쿠팡이츠: Railway Worker enqueue
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'
import { baeminProxyLogin } from '@/app/lib/baemin-login'
import { getProxy } from '@/app/lib/proxy-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'
const BAEMIN_API2 = 'https://ceo-api.baemin.com'
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\\t' && c !== '\\n' && c !== '\\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const d = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8')
}

function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(12)
  const c = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64') }
}

function isCookieStale(extra: any): boolean {
  if (!extra?.baemin_cookie_enc) return true
  if (!extra?.cookie_saved_at)   return true
  return Date.now() - new Date(extra.cookie_saved_at).getTime() > COOKIE_MAX_AGE_MS
}

async function tryBaeminDirectCollect(cred: any): Promise<{ ok: boolean; count?: number; refreshed?: boolean }> {
  const extra = (cred.extra_data as any) || {}
  let cookieStr = ''
  let refreshed = false

  // 쿠키 만료 → 프록시 재로그인 시도
  if (isCookieStale(extra)) {
    try {
      const proxy = await getProxy()
      if (!proxy) return { ok: false }

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
      if (!pw) return { ok: false }

      cookieStr = await baeminProxyLogin(cred.account_id || extra.baemin_id || '', pw)
      if (!cookieStr) return { ok: false }

      const { enc, iv, tag } = encryptStr(cookieStr)
      const svc2 = createServiceClient()
      await svc2.from('platform_credentials').update({
        extra_data: { ...extra, baemin_cookie_enc: enc, baemin_cookie_iv: iv, baemin_cookie_tag: tag, cookie_saved_at: new Date().toISOString() },
        last_login_status: 'success', last_login_at: new Date().toISOString(),
      }).eq('user_id', cred.user_id).eq('platform', 'baemin')
      refreshed = true
    } catch { return { ok: false } }
  } else {
    cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
  }

  if (!cookieStr) return { ok: false }

  const shopNo = String(cred.platform_store_id || '14637452')
  const headers: Record<string, string> = {
    Cookie: cookieStr,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0',
    Referer: 'https://self.baemin.com/shops/' + shopNo + '/reviews',
    Origin: 'https://self.baemin.com',
    Accept: 'application/json',
  }

  for (const endpoint of [BAEMIN_API, BAEMIN_API2]) {
    try {
      const res = await fetch(endpoint + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=30', { headers, cache: 'no-store', signal: AbortSignal.timeout(12000) })
      if (res.ok) {
        const json = await res.json()
        const reviews = Array.isArray(json) ? json : (json.contents || json.data || json.reviews || json.list || [])
        return { ok: true, count: reviews.length, refreshed }
      }
    } catch {}
  }
  return { ok: false }
}

export async function GET(req: NextRequest) {
  const cronCheck = verifyCronAuth(req.headers.get('authorization'))
  if (!cronCheck.ok) return NextResponse.json({ ok: false, error: cronCheck.message }, { status: cronCheck.status })

  const svc = createServiceClient()
  const results: Record<string, any> = {}
  const GAP_MS = 800

  // ── 배민: 직접 API 우선 ──────────────────────────────────────
  results['baemin'] = { direct: 0, worker: 0, failed: 0, errors: [] }
  const { data: baeminCreds } = await svc
    .from('platform_credentials')
    .select('user_id, account_id, platform_store_id, extra_data, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag, last_login_status')
    .eq('platform', 'baemin')
    .neq('last_login_status', 'disabled')

  for (const cred of (baeminCreds || [])) {
    try {
      const directResult = await tryBaeminDirectCollect(cred)
      if (directResult.ok) {
        results['baemin'].direct++
        if (directResult.refreshed) results['baemin'].refreshed = (results['baemin'].refreshed || 0) + 1
      } else {
        // Worker 폴백
        const jobResult = await enqueuePlatformJob({ platform: 'baemin', action: 'fetch_reviews', userId: cred.user_id, storeId: cred.platform_store_id || 'unknown' })
        if (jobResult.ok) results['baemin'].worker++
        else { results['baemin'].failed++; results['baemin'].errors.push(cred.user_id + ': ' + jobResult.error) }
      }
      await new Promise(r => setTimeout(r, GAP_MS))
    } catch (e: any) { results['baemin'].failed++; results['baemin'].errors.push(cred.user_id + ': ' + e?.message) }
  }

  // ── 요기요/쿠팡이츠: Worker 큐 ───────────────────────────────
  for (const platform of ['yogiyo', 'coupangeats'] as Platform[]) {
    results[platform] = { queued: 0, failed: 0, errors: [] }
    const { data: creds } = await svc.from('platform_credentials').select('user_id, platform_store_id, last_login_status').eq('platform', platform).neq('last_login_status', 'disabled')
    for (const cred of (creds || [])) {
      try {
        const jobResult = await enqueuePlatformJob({ platform, action: 'fetch_reviews', userId: cred.user_id, storeId: cred.platform_store_id || 'unknown' })
        if (jobResult.ok) results[platform].queued++
        else { results[platform].failed++; results[platform].errors.push(cred.user_id + ': ' + jobResult.error) }
        await new Promise(r => setTimeout(r, GAP_MS))
      } catch (e: any) { results[platform].failed++; results[platform].errors.push(cred.user_id + ': ' + e?.message) }
    }
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString(), results })
}
