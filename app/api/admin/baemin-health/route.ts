// app/api/admin/baemin-health/route.ts
// ============================================================
// 배민 시스템 헬스체크
//   GET /api/admin/baemin-health
//   전체 체인 점검: 프록시 → 로그인 → API → 쿠키 상태
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { getProxy, testProxy, buildProxyUrl } from '@/app/lib/proxy-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\\t' && c !== '\\n' && c !== '\\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const cipher = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  cipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([cipher.update(Buffer.from(enc, 'base64')), cipher.final()]).toString('utf8')
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const status: Record<string, any> = {
    timestamp: new Date().toISOString(),
    proxy:   { ok: false },
    creds:   { ok: false },
    cookie:  { ok: false },
    api:     { ok: false },
  }

  try {
    // ── 1. 프록시 확인 ──────────────────────────────────────
    const proxy = await getProxy()
    if (!proxy) {
      status.proxy = {
        ok: false,
        error: '프록시 미설정',
        fix: 'Webshare 무료 가입 후 WEBSHARE_API_KEY 설정: https://proxy.webshare.io',
      }
    } else {
      const proxyTest = await testProxy(proxy)
      status.proxy = {
        ok: proxyTest.ok,
        host: proxy.host,
        ip:   proxyTest.ip,
        country: proxyTest.countryCode,
        is_kr: proxyTest.countryCode === 'KR',
        error: proxyTest.error,
      }
    }

    // ── 2. 자격증명 확인 ─────────────────────────────────────
    const svc = createServiceClient()
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('account_id, extra_data, platform_store_id, last_login_status, last_login_at')
      .eq('user_id', userId)
      .eq('platform', 'baemin')
      .maybeSingle()

    if (!cred) {
      status.creds = { ok: false, error: '배민 계정 미연결', fix: '/my/platforms/baemin/connect' }
    } else {
      const extra = (cred.extra_data as any) || {}
      const hasPw = !!(extra.baemin_pw_enc || cred.extra_data)
      status.creds = {
        ok: true,
        account_id: cred.account_id,
        store_id: cred.platform_store_id,
        last_login: cred.last_login_at,
        last_login_status: cred.last_login_status,
        has_password: hasPw,
      }

      // ── 3. 쿠키 상태 확인 ────────────────────────────────
      if (extra.baemin_cookie_enc) {
        const savedAt  = extra.cookie_saved_at ? new Date(extra.cookie_saved_at) : null
        const ageMs    = savedAt ? Date.now() - savedAt.getTime() : Infinity
        const ageHours = Math.floor(ageMs / 3600000)
        const isStale  = ageMs > 8 * 3600000
        status.cookie = {
          ok:        !isStale,
          saved_at:  extra.cookie_saved_at,
          age_hours: ageHours,
          stale:     isStale,
          fix:       isStale ? '/api/baemin/auto-login (POST) 호출로 갱신' : null,
        }

        // ── 4. API 응답 확인 ──────────────────────────────
        try {
          const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
          const shopNo = String(cred.platform_store_id || '14637452')
          const apiRes = await fetch(
            'https://self-api.baemin.com/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=1',
            {
              headers: {
                Cookie: cookieStr,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0',
                Referer: 'https://self.baemin.com/',
                Origin:  'https://self.baemin.com',
                Accept:  'application/json',
              },
              cache: 'no-store',
              signal: AbortSignal.timeout(8000),
            }
          )
          if (apiRes.ok) {
            const json = await apiRes.json()
            const reviews = Array.isArray(json) ? json : (json.contents || json.data || [])
            status.api = {
              ok:           true,
              status_code:  apiRes.status,
              review_count: reviews.length,
              message:      '배민 API 정상 응답',
            }
          } else {
            status.api = {
              ok:          false,
              status_code: apiRes.status,
              error:       apiRes.status === 401 ? '쿠키 만료 — 재로그인 필요' : 'API 오류 ' + apiRes.status,
              fix:         apiRes.status === 401 ? '/api/baemin/auto-login POST' : '/my/platforms/baemin/session',
            }
          }
        } catch (e: any) {
          status.api = { ok: false, error: e?.message || 'timeout', fix: '네트워크 오류 확인' }
        }
      } else {
        status.cookie = { ok: false, error: '저장된 쿠키 없음', fix: '/my/platforms/baemin/session' }
      }
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message, status }, { status: 500 })
  }

  const allOk = status.proxy.ok && status.creds.ok && status.cookie.ok && status.api.ok
  return NextResponse.json({ ok: allOk, status })
}
