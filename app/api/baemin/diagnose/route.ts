// app/api/baemin/diagnose/route.ts
// ============================================================
// 배민 API 진단 endpoint — DB 미저장, 여러 endpoint 시도하여 raw 응답 반환
//   GET /api/baemin/diagnose?shop_no=14637452
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { proxyFetch } from '@/app/lib/proxy-fetch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 필요')
  return Buffer.from(hex, 'hex')
}
function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const d = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8')
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const u = new URL(req.url)
  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('extra_data, platform_store_id')
    .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()

  const extra = (cred?.extra_data as any) || {}
  const shopNo = String(u.searchParams.get('shop_no') || cred?.platform_store_id || '14637452')

  if (!extra.baemin_cookie_enc) {
    return NextResponse.json({ ok: false, error: '배민 쿠키 없음', shopNo }, { status: 400 })
  }

  const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)

  // v1.3: 모든 쿠키 이름 덤프 — XSRF 매칭 실패 원인 파악용
  const cookieNames: string[] = []
  let xsrfToken = ''
  let xsrfCookieKey = ''
  for (const part of cookieStr.split(';')) {
    const kv = part.trim()
    const eq = kv.indexOf('=')
    if (eq === -1) continue
    const name = kv.slice(0, eq).trim()
    cookieNames.push(name)
    const lname = name.toLowerCase()
    if (!xsrfToken && (lname === 'xsrf-token' || lname === '_xsrf' || lname === 'csrf_token' || lname.includes('xsrf') || lname.includes('csrf'))) {
      xsrfToken = kv.slice(eq + 1).trim()
      xsrfCookieKey = name
    }
  }

  const headers: Record<string, string> = {
    'Cookie': cookieStr,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Referer': 'https://self.baemin.com/shops/' + shopNo + '/reviews',
    'Origin': 'https://self.baemin.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'service-channel': 'SELF_SERVICE_PC',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
  }
  if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken

  // 다양한 endpoint 시도 — 어떤 게 진짜인지 자동 탐색
  const candidates = [
    'https://self-api.baemin.com/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=10',
    'https://self-api.baemin.com/v2/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=10',
    'https://self-api.baemin.com/v1/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=10',
    'https://self-api.baemin.com/v3/shops/' + shopNo + '/reviews?page=1&size=10',
    'https://ceo-api.baemin.com/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=10',
    'https://ceo-api.baemin.com/v1/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=10',
    'https://self-api.baemin.com/api/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=10',
  ]

  const results: any[] = []
  for (const url of candidates) {
    try {
      // v1.3: proxyFetch 로 한국 IP 경유 — Vercel 직접 IP (US) 는 Akamai 가 즉시 403
      const res = await proxyFetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) } as RequestInit)
      const status = res.status
      const ct = res.headers.get('content-type') || ''
      let preview: any = null
      let bodyShape: any = null
      if (ct.includes('json')) {
        const json: any = await res.json().catch(() => null)
        if (json) {
          // 본문 구조 분석
          bodyShape = analyzeShape(json)
          // 첫 번째 review 객체 추출
          const arr = findFirstArray(json)
          if (arr && arr.length > 0) {
            preview = {
              arrayPath: arr.path,
              arrayLength: arr.array.length,
              firstReviewKeys: Object.keys(arr.array[0] || {}),
              firstReviewSample: sanitizeSample(arr.array[0]),
            }
          } else {
            preview = { topLevelKeys: Object.keys(json).slice(0, 30) }
          }
        }
      } else {
        const text = await res.text().catch(() => '')
        preview = { contentType: ct, bodyPreview: text.slice(0, 200) }
      }
      results.push({ url, status, ok: res.ok, bodyShape, preview })
    } catch (e: any) {
      results.push({ url, error: e?.message || 'fetch failed' })
    }
  }

  // v1.4: 이미 DB 에 저장된 baemin 리뷰의 raw_snapshot 을 함께 반환
  // → Worker (Playwright) 가 이미 캡처한 실제 API 응답 구조 확인 가능
  // 직접 fetch 가 모두 403 으로 실패하더라도 Worker 가 잡은 데이터로 진짜 필드명 파악
  const { data: dbRows } = await svc
    .from('platform_reviews')
    .select('platform_review_id, content, rating, author_name, posted_at, photos, raw_snapshot, has_reply, reply_content, collected_at')
    .eq('user_id', userId)
    .eq('platform', 'baemin')
    .order('collected_at', { ascending: false })
    .limit(3)

  const idPrefixes: Record<string, number> = {}
  if (dbRows) {
    for (const r of dbRows) {
      const prefix = String(r.platform_review_id || '').split(/[-:]/)[0] + ':'
      idPrefixes[prefix] = (idPrefixes[prefix] || 0) + 1
    }
  }

  // 첫 raw_snapshot 의 key 목록 추출 (실제 배민 API 가 쓰는 필드명)
  let firstRawKeys: string[] = []
  let firstRawSample: any = null
  if (dbRows && dbRows[0]?.raw_snapshot) {
    const snap = dbRows[0].raw_snapshot as any
    firstRawKeys = Object.keys(snap).slice(0, 30)
    firstRawSample = sanitizeSample(snap)
  }

  return NextResponse.json({
    ok: true,
    shopNo,
    cookieLength: cookieStr.length,
    hasXsrf: !!xsrfToken,
    xsrfCookieKey,
    cookieNames,
    proxy: {
      configured: !!process.env.PROXY_HOST,
      host: process.env.PROXY_HOST ? (process.env.PROXY_HOST.slice(0, 6) + '***') : 'NOT_SET',
    },
    directFetchResults: results,
    // v1.4: Worker 가 캡처한 실제 데이터 (진짜 필드명 확인용)
    dbDiagnostic: {
      totalRowsSampled: dbRows?.length || 0,
      idPrefixes,                             // baemin:xxx vs baemin-real-xxx 비율
      firstRawKeys,                           // 실제 raw 필드명 → 파서가 매칭해야 할 정확한 이름
      firstRawSample,                         // 첫 raw_snapshot 샘플
      firstRowParsed: dbRows?.[0] ? {
        platform_review_id: dbRows[0].platform_review_id,
        content: dbRows[0].content?.slice(0, 100),
        rating: dbRows[0].rating,
        author_name: dbRows[0].author_name,
        posted_at: dbRows[0].posted_at,
        photos_count: (dbRows[0].photos as string[] | null)?.length || 0,
        photos_sample: (dbRows[0].photos as string[] | null)?.slice(0, 2),
      } : null,
    },
    hint: 'directFetchResults 가 모두 403 이면 baemin 인증이 Bearer 토큰 방식으로 변경된 것. ' +
          'dbDiagnostic.firstRawKeys 가 Worker 가 잡은 진짜 필드명 → 이걸로 파서 정확히 맞추세요.',
  })
}

// 응답 구조 분석 (재귀적으로 array 찾기)
function analyzeShape(obj: any, depth = 0, path = '$'): any {
  if (depth > 4 || obj === null || obj === undefined) return typeof obj
  if (Array.isArray(obj)) return { array: obj.length, samplePath: path }
  if (typeof obj === 'object') {
    const out: any = {}
    for (const k of Object.keys(obj).slice(0, 20)) {
      out[k] = analyzeShape(obj[k], depth + 1, path + '.' + k)
    }
    return out
  }
  return typeof obj
}

function findFirstArray(obj: any, depth = 0, path = '$'): { path: string; array: any[] } | null {
  if (depth > 4 || !obj) return null
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') return { path, array: obj }
  if (typeof obj === 'object') {
    // review-like keys 우선
    const reviewKeys = ['reviews', 'reviewList', 'contents', 'data', 'items', 'list', 'result']
    for (const k of reviewKeys) {
      if (obj[k]) {
        const f = findFirstArray(obj[k], depth + 1, path + '.' + k)
        if (f) return f
      }
    }
    // 일반 키 탐색
    for (const k of Object.keys(obj)) {
      const f = findFirstArray(obj[k], depth + 1, path + '.' + k)
      if (f) return f
    }
  }
  return null
}

// 샘플 데이터 — 200자 이상 string 절단
function sanitizeSample(obj: any): any {
  if (typeof obj === 'string') return obj.length > 200 ? obj.slice(0, 200) + '...' : obj
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.slice(0, 5).map(sanitizeSample)
  const out: any = {}
  for (const k of Object.keys(obj).slice(0, 30)) {
    out[k] = sanitizeSample(obj[k])
  }
  return out
}
