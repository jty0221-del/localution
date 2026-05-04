// app/api/baemin/collect-reviews/route.ts
// ============================================================
// 배민 리뷰 수집 API (BAEMIN v1 — 쿠팡 v76 패턴 적용)
//   · 페이지네이션 루프 (DAYS_BACK 14일치)
//   · raw_snapshot 저장 (post-reply pre-check 용)
//   · has_reply 우선 dedupe (쿠팡 68차)
//   · 401 → auto-login 자동 재발급 후 재시도
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'
import { baeminProxyLogin } from '@/app/lib/baemin-login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'
const BAEMIN_API2 = 'https://ceo-api.baemin.com'
const PAGE_SIZE = 50
const MAX_PAGES = 20         // 최대 1000개 (50 * 20)
const DAYS_BACK_DEFAULT = 14
const PAGE_DELAY_MS = 800    // sliding window delay (Akamai-like rate limit 회피)

function corsHeaders(origin: string) {
  const allow = origin.endsWith('.baemin.com') || origin.includes('localution')
  if (!allow) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
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

function maskAuthor(name: string | null): string | null {
  if (!name) return null
  const s = String(name).trim()
  if (s.length <= 1) return s + '*'
  if (s.length === 2) return s[0] + '*'
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

// ── 리뷰 정규화 ─────────────────────────────────────────────
function extractPhotos(r: any): string[] {
  const urls: string[] = []
  for (const list of [r.images, r.imageList, r.photos, r.photoList, r.imageUrls, r.photoUrls, r.reviewImages]) {
    if (!Array.isArray(list) || list.length === 0) continue
    for (const item of list) {
      const url = typeof item === 'string' ? item : (item.url || item.imageUrl || item.src || item.thumbnailUrl || item.reviewImageUrl || '')
      if (url && (url.startsWith('http') || url.startsWith('//'))) {
        urls.push(url.startsWith('//') ? 'https:' + url : url)
      }
    }
    if (urls.length > 0) break
  }
  return urls
}

function extractAuthor(r: any): string {
  return r.writer?.nickname || r.writer?.name || r.memberNickname || r.nickname || r.authorName || r.author || r.writerNickname || '익명'
}

function extractDate(r: any): string {
  const raw = r.createdAt || r.writtenAt || r.orderDate || r.date || r.registeredAt || r.regDate || ''
  if (raw) { try { return new Date(raw).toISOString() } catch { return new Date().toISOString() } }
  return new Date().toISOString()
}

function extractRating(r: any): number | null {
  const v = r.starScore ?? r.rating ?? r.score ?? r.star ?? null
  if (typeof v === 'number') return Math.min(5, Math.max(1, v))
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isNaN(n) ? null : Math.min(5, Math.max(1, n))
  }
  return null
}

function extractReplyContent(r: any): string | null {
  const rc = r.ownerReply?.content || r.ownerReply || r.reply?.content || r.reply
    || r.ownerComment || r.replyContent || r.ceoComment || null
  return typeof rc === 'string' ? rc.trim() || null : null
}

// 68차 패턴: hasReply 다중 신호 + raw_snapshot 보존
function normalizeReviews(reviews: any[], shopNo: string, userId: string): any[] {
  const now = new Date().toISOString()
  return reviews.map((r: any, i: number) => {
    const id = r.reviewId ?? r.reviewNo ?? r.id ?? r.seq ?? ('baemin-' + shopNo + '-' + i)
    const replyContent = extractReplyContent(r)
    const hasReply = !!(r.ownerReply || r.reply || r.ownerComment || r.replyContent || r.hasComment || r.hasReply || replyContent)
    const author = extractAuthor(r)
    return {
      user_id: userId,
      platform: 'baemin' as const,
      platform_review_id: 'baemin-real-' + String(id),
      platform_store_id: shopNo,
      author_name: author,
      author_mask: maskAuthor(author),
      rating: extractRating(r),
      content: (r.reviewContent || r.content || r.comment || r.body || '').trim() || null,
      photos: extractPhotos(r),
      has_reply: hasReply,
      reply_content: replyContent,
      posted_at: extractDate(r),
      collected_at: now,
      raw_snapshot: r,
    }
  })
}

// ── upsert (쿠팡 68차 dedupe + 62차-2 schema fallback) ─────
async function upsertBaeminReviews(svc: any, rows: any[]): Promise<number> {
  if (rows.length === 0) return 0

  const dedupeMap = new Map<string, any>()
  for (const row of rows) {
    const key = row.user_id + '::baemin::' + row.platform_review_id
    const existing = dedupeMap.get(key)
    if (!existing) { dedupeMap.set(key, row); continue }
    if (row.has_reply && !existing.has_reply) dedupeMap.set(key, row)
    else if (row.has_reply === existing.has_reply) {
      if (!!row.reply_content && !existing.reply_content) dedupeMap.set(key, row)
    }
  }
  const fullRows = Array.from(dedupeMap.values())

  const { data, error } = await svc
    .from('platform_reviews')
    .upsert(fullRows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
    .select('id')
  if (!error) return data?.length ?? fullRows.length

  // schema cache miss → reply_content/raw_snapshot 제거 후 retry
  const errMsg = String(error.message || '')
  if (errMsg.includes('column') || errMsg.includes('schema cache')) {
    const slim = fullRows.map((r: any) => {
      const o = { ...r }
      delete o.reply_content
      delete o.raw_snapshot
      return o
    })
    const { data: d2, error: e2 } = await svc
      .from('platform_reviews')
      .upsert(slim, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
      .select('id')
    if (!e2) return d2?.length ?? slim.length
    throw new Error(e2.message)
  }
  throw new Error(error.message)
}

// ── 페이지네이션 fetch (DAYS_BACK 까지) ──────────────────────
async function fetchAllReviews(
  cookieStr: string, shopNo: string, daysBack: number, log: (s: string) => void
): Promise<{ reviews: any[]; status: number; oldestDate: string | null }> {
  const cutoffMs = Date.now() - daysBack * 86400_000
  const all: any[] = []
  let lastStatus = 200
  let oldestDate: string | null = null

  let xsrfToken = ''
  for (const part of cookieStr.split(';')) {
    const kv = part.trim()
    const eq = kv.indexOf('=')
    if (eq === -1) continue
    const name = kv.slice(0, eq).trim().toLowerCase()
    if (name === 'xsrf-token' || name === '_xsrf' || name === 'csrf_token') {
      xsrfToken = kv.slice(eq + 1).trim()
      break
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

  for (let page = 1; page <= MAX_PAGES; page++) {
    // 두 가지 query 패턴 시도
    const candidates = [
      BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=' + page + '&pageSize=' + PAGE_SIZE,
      BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews?page=' + page + '&size=' + PAGE_SIZE,
      BAEMIN_API2 + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=' + page + '&pageSize=' + PAGE_SIZE,
    ]
    let pageReviews: any[] = []
    let pageStatus = 0
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(15000) })
        pageStatus = res.status
        if (res.status === 401 || res.status === 403) {
          lastStatus = res.status
          return { reviews: all, status: res.status, oldestDate }
        }
        if (!res.ok) continue
        const json: any = await res.json().catch(() => null)
        if (!json) continue
        const arr: any[] = Array.isArray(json) ? json
          : (json.contents || json.data?.contents || json.data || json.reviews || json.list || json.reviewList || [])
        if (Array.isArray(arr)) { pageReviews = arr; break }
      } catch { /* try next */ }
    }
    lastStatus = pageStatus || lastStatus
    if (pageReviews.length === 0) {
      log('page ' + page + ': empty → stop')
      break
    }
    all.push(...pageReviews)
    log('page ' + page + ': ' + pageReviews.length + ' reviews (total ' + all.length + ')')

    // cutoff 도달 검사 (가장 오래된 리뷰)
    let pageOldestMs = Number.POSITIVE_INFINITY
    for (const r of pageReviews) {
      const d = r.createdAt || r.writtenAt || r.orderDate || r.date
      if (d) {
        const t = new Date(d).getTime()
        if (!isNaN(t) && t < pageOldestMs) pageOldestMs = t
      }
    }
    if (pageOldestMs !== Number.POSITIVE_INFINITY) {
      oldestDate = new Date(pageOldestMs).toISOString()
      if (pageOldestMs < cutoffMs) {
        log('cutoff reached at page ' + page + ' (oldest=' + oldestDate + ')')
        break
      }
    }

    // 페이지가 가득 차지 않으면 마지막 페이지
    if (pageReviews.length < PAGE_SIZE) {
      log('partial page → stop')
      break
    }

    await new Promise(r => setTimeout(r, PAGE_DELAY_MS))
  }
  return { reviews: all, status: lastStatus, oldestDate }
}

// ── 쿠키 자동 재발급 ────────────────────────────────────────
async function refreshCookieFromCreds(svc: any, userId: string, cred: any): Promise<string | null> {
  const extra = (cred?.extra_data as any) || {}
  let pw = ''
  try {
    if (extra.baemin_pw_enc && extra.baemin_pw_iv && extra.baemin_pw_tag) {
      pw = decryptStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
    } else if (cred.password_encrypted && cred.dek_encrypted) {
      const kek = loadKek()
      const dekD = createDecipheriv(ALGO, kek, Buffer.from(cred.dek_iv, 'base64'))
      dekD.setAuthTag(Buffer.from(cred.dek_tag, 'base64'))
      const dek = Buffer.concat([dekD.update(Buffer.from(cred.dek_encrypted, 'base64')), dekD.final()])
      const pwD = createDecipheriv(ALGO, dek, Buffer.from(cred.password_iv, 'base64'))
      pwD.setAuthTag(Buffer.from(cred.password_tag, 'base64'))
      pw = Buffer.concat([pwD.update(Buffer.from(cred.password_encrypted, 'base64')), pwD.final()]).toString('utf8')
    }
  } catch { return null }
  if (!pw) return null
  const id = cred.account_id || extra.baemin_id || ''
  if (!id) return null
  try {
    const cookieStr = await baeminProxyLogin(id, pw)
    if (cookieStr && cookieStr.length > 10) {
      const enc = encryptStr(cookieStr)
      await svc.from('platform_credentials').update({
        extra_data: { ...extra, baemin_cookie_enc: enc.enc, baemin_cookie_iv: enc.iv, baemin_cookie_tag: enc.tag, cookie_saved_at: new Date().toISOString() },
        last_login_status: 'success',
        last_login_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('platform', 'baemin')
      return cookieStr
    }
  } catch { /* ignore */ }
  return null
}

// ── 메인 핸들러 ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const ch = corsHeaders(origin)

  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status, headers: ch })

  const userId = auth.userId!
  const svc = createServiceClient()
  const logs: string[] = []
  const log = (s: string) => { logs.push(s); console.log('[baemin-collect]', s) }

  try {
    const body = await req.json().catch(() => ({}))
    const daysBack = typeof body.days_back === 'number' && body.days_back > 0
      ? Math.min(body.days_back, 365) : DAYS_BACK_DEFAULT

    // 경로 A: 북마크릿 직접 전송
    if (Array.isArray(body.reviews) && body.reviews.length > 0) {
      const shopNo = String(body.shop_no || '14637452')
      const rows = normalizeReviews(body.reviews, shopNo, userId)
      const count = await upsertBaeminReviews(svc, rows)
      return NextResponse.json({ ok: true, count, total: count, source: 'bookmarklet' }, { headers: ch })
    }

    // 경로 B: 저장된 쿠키로 직접 fetch
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('account_id, extra_data, platform_store_id, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag')
      .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()

    let extra = (cred?.extra_data as any) || {}
    const shopNo = String(body.shop_no || cred?.platform_store_id || '14637452')

    if (extra.baemin_cookie_enc) {
      let cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
      let result = await fetchAllReviews(cookieStr, shopNo, daysBack, log)

      // 401 → 자동 재로그인 후 재시도
      if (result.status === 401 || result.status === 403) {
        log('cookie expired (' + result.status + ') → auto refresh')
        const newCookie = await refreshCookieFromCreds(svc, userId, cred)
        if (newCookie) {
          cookieStr = newCookie
          log('cookie refreshed → retry')
          result = await fetchAllReviews(cookieStr, shopNo, daysBack, log)
        }
      }

      if (result.reviews.length > 0) {
        const rows = normalizeReviews(result.reviews, shopNo, userId)
        const count = await upsertBaeminReviews(svc, rows)
        return NextResponse.json({
          ok: true, count, total: result.reviews.length, source: 'server', shopNo,
          oldestDate: result.oldestDate, daysBack, logs,
        }, { headers: ch })
      }

      log('server fetch returned 0 reviews (status=' + result.status + ')')
    }

    // 경로 C: Worker 큐 폴백
    const redisAvailable = !!process.env.REDIS_URL
    if (redisAvailable && cred) {
      const jobResult = await enqueuePlatformJob({
        platform: 'baemin', action: 'fetch_reviews',
        userId, storeId: shopNo,
        payload: { shop_no: shopNo, days_back: daysBack },
      })
      if (jobResult.ok) {
        return NextResponse.json({
          ok: true, queued: true, source: 'worker', jobId: jobResult.jobId,
          note: '리뷰 수집을 시작했어요! 잠시 후 자동으로 표시돼요.',
          logs,
        }, { headers: ch })
      }
    }

    if (!extra.baemin_cookie_enc) {
      return NextResponse.json({
        ok: false, error: '배민 세션이 없어요. 배민 계정을 먼저 연결해주세요.',
        cookie_page: '/my/platforms/baemin/session', logs,
      }, { status: 400, headers: ch })
    }

    return NextResponse.json({
      ok: false, error: '배민 API 연결 실패. 쿠키를 다시 저장해주세요.',
      cookie_page: '/my/platforms/baemin/session', logs,
    }, { status: 502, headers: ch })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown', logs }, { status: 500, headers: ch })
  }
}
