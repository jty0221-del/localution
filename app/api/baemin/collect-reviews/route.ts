// app/api/baemin/collect-reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'
const BAEMIN_API2 = 'https://ceo-api.baemin.com'

// CORS: self.baemin.com 에서 북마크릿 POST 허용
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
  for (const c of raw) { if (c !== ' ' && c !== '\\t' && c !== '\\n' && c !== '\\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const decipher = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8')
}

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

function normalizeReviews(reviews: any[], shopNo: string): any[] {
  return reviews.map((r: any, i: number) => {
    const id = r.reviewId ?? r.reviewNo ?? r.id ?? r.seq ?? ('baemin-' + shopNo + '-' + i)
    return {
      platform: 'baemin',
      platform_review_id: 'baemin-real-' + String(id),
      platform_store_id: shopNo,
      author_name: extractAuthor(r),
      rating: extractRating(r),
      content: (r.reviewContent || r.content || r.comment || r.body || '').trim() || null,
      photos: extractPhotos(r),
      has_reply: !!(r.ownerReply || r.reply || r.ownerComment || r.replyContent || r.hasComment || r.hasReply),
      reply_content: extractReplyContent(r),
      posted_at: extractDate(r),
      collected_at: new Date().toISOString(),
    }
  })
}

async function saveRows(userId: string, shopNo: string, reviews: any[], svc: any): Promise<number> {
  const rows = normalizeReviews(reviews, shopNo).map(r => ({ ...r, user_id: userId }))
  if (rows.length === 0) return 0
  const { data: saved, error } = await svc
    .from('platform_reviews')
    .upsert(rows, { onConflict: 'platform,platform_review_id' })
    .select('id')
  if (error) throw new Error(error.message)
  return saved?.length ?? rows.length
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const ch = corsHeaders(origin)

  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status, headers: ch })

  const userId = auth.userId!
  const svc = createServiceClient()

  try {
    const body = await req.json().catch(() => ({}))

    // ── 경로 A: 북마크릿이 리뷰 배열을 직접 전송한 경우 ──
    if (Array.isArray(body.reviews) && body.reviews.length > 0) {
      const shopNo = String(body.shop_no || '14637452')
      const count = await saveRows(userId, shopNo, body.reviews, svc)
      return NextResponse.json({ ok: true, count, source: 'bookmarklet' }, { headers: ch })
    }

    // ── 경로 B: 저장된 쿠키로 서버 직접 호출 ──
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('extra_data, platform_store_id')
      .eq('user_id', userId)
      .eq('platform', 'baemin')
      .maybeSingle()

    const extra = (cred?.extra_data as any) || {}
    const shopNo = String(body.shop_no || cred?.platform_store_id || '14637452')

    if (extra.baemin_cookie_enc) {
      const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)

      let xsrfToken = ''
      for (const part of cookieStr.split(';')) {
        const kv = part.trim()
        const eqIdx = kv.indexOf('=')
        if (eqIdx === -1) continue
        const name = kv.slice(0, eqIdx).trim().toLowerCase()
        if (name === 'xsrf-token' || name === '_xsrf' || name === 'csrf_token') {
          xsrfToken = kv.slice(eqIdx + 1).trim()
          break
        }
      }

      const reqHeaders: Record<string, string> = {
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        'Referer': 'https://self.baemin.com/shops/' + shopNo + '/reviews',
        'Origin': 'https://self.baemin.com',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      }
      if (xsrfToken) reqHeaders['X-XSRF-TOKEN'] = xsrfToken

      // 여러 API 엔드포인트 시도
      const endpoints = [
        BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=30',
        BAEMIN_API2 + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=30',
        BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews?page=1&size=30',
      ]

      for (const endpoint of endpoints) {
        try {
          const baeminRes = await fetch(endpoint, { headers: reqHeaders, cache: 'no-store' })

          if (baeminRes.status === 401 || baeminRes.status === 403) {
            // 쿠키 만료 → Worker 폴백
            break
          }

          if (!baeminRes.ok) continue

          const json = await baeminRes.json()
          const reviews: any[] = Array.isArray(json) ? json
            : (json.contents || json.data?.contents || json.data || json.reviews || json.list || json.reviewList || [])

          if (reviews.length === 0) continue

          const count = await saveRows(userId, shopNo, reviews, svc)
          return NextResponse.json({ ok: true, count, source: 'server', shopNo }, { headers: ch })
        } catch {}
      }
    }

    // ── 경로 C: Worker 큐 폴백 ──────────────────────────────────────
    const redisAvailable = !!process.env.REDIS_URL
    if (redisAvailable && cred) {
      const jobResult = await enqueuePlatformJob({
        platform: 'baemin',
        action: 'fetch_reviews',
        userId,
        storeId: shopNo,
        payload: { shop_no: shopNo },
      })
      if (jobResult.ok) {
        return NextResponse.json({
          ok: true,
          queued: true,
          source: 'worker',
          jobId: jobResult.jobId,
          note: '리뷰 수집을 시작했어요! 잠시 후 자동으로 표시돼요.',
        }, { headers: ch })
      }
    }

    // 쿠키 없음 안내
    if (!extra.baemin_cookie_enc) {
      return NextResponse.json({
        ok: false,
        error: '배민 세션이 없어요. 배민 리뷰 페이지에서 "쿠키 저장" 또는 북마크릿으로 가져와주세요.',
        cookie_page: '/my/platforms/baemin/session',
      }, { status: 400, headers: ch })
    }

    return NextResponse.json({
      ok: false,
      error: '배민 API 연결 실패. 북마크릿으로 직접 가져오거나 쿠키를 다시 저장해주세요.',
      cookie_page: '/my/platforms/baemin/session',
    }, { status: 502, headers: ch })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: ch })
  }
}
