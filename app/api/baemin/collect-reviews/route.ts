// app/api/baemin/collect-reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

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

function extractPhotos(r: any): string[] {
  const urls: string[] = []
  for (const list of [r.images, r.imageList, r.photos, r.photoList, r.imageUrls, r.photoUrls]) {
    if (!Array.isArray(list) || list.length === 0) continue
    for (const item of list) {
      const url = typeof item === 'string' ? item : (item.url || item.imageUrl || item.src || item.thumbnailUrl || '')
      if (url && url.startsWith('http')) urls.push(url)
    }
    if (urls.length > 0) break
  }
  return urls
}

function extractAuthor(r: any): string {
  return r.writer?.nickname || r.writer?.name || r.memberNickname || r.nickname || r.authorName || r.author || '익명'
}

function maskName(name: string): string {
  if (!name || name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

function extractDate(r: any): string {
  const raw = r.createdAt || r.writtenAt || r.orderDate || r.date || ''
  if (raw) { try { return new Date(raw).toISOString() } catch { return new Date().toISOString() } }
  return new Date().toISOString()
}

function extractRating(r: any): number | null {
  const v = r.starScore ?? r.rating ?? r.starRating ?? r.star ?? null
  if (v === null) return null
  const n = Number(v)
  return (n >= 1 && n <= 5) ? n : null
}

function extractId(r: any): string {
  return String(r.reviewNo || r.reviewId || r.id || r.orderNo || Math.random().toString(36).slice(2))
}

async function saveRows(userId: string, shopNo: string, reviews: any[], svc: any) {
  const rows = reviews.map((r: any) => ({
    user_id: userId,
    platform: 'baemin',
    platform_review_id: 'baemin-real-' + extractId(r),
    platform_store_id: shopNo,
    author_name: extractAuthor(r),
    author_mask: maskName(extractAuthor(r)),
    content: r.content || r.reviewContent || r.text || r.comment || null,
    rating: extractRating(r),
    photos: extractPhotos(r),
    has_reply: !!(r.comments?.length || r.commentList?.length || r.hasComment || r.hasReply || r.ownerReply),
    posted_at: extractDate(r),
    collected_at: new Date().toISOString(),
  }))

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
    if (!extra.baemin_cookie_enc) {
      return NextResponse.json({
        ok: false,
        error: '저장된 쿠키 없음. 북마크릿 방법을 이용하거나 쿠키를 먼저 저장해주세요.',
      }, { status: 400, headers: ch })
    }

    const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
    const shopNo = String(body.shop_no || cred?.platform_store_id || '14637452')

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://self.baemin.com/shops/' + shopNo + '/reviews',
      'Origin': 'https://self.baemin.com',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'service-channel': 'SELF_SERVICE_PC',
      'X-Web-Version': 'v20260422143632',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    }
    if (xsrfToken) reqHeaders['X-XSRF-TOKEN'] = xsrfToken

    const path = '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=20'
    let baeminRes = await fetch(BAEMIN_API + path, { headers: reqHeaders, cache: 'no-store' })
    if (!baeminRes.ok && baeminRes.status !== 404) {
      const r2 = await fetch(BAEMIN_API2 + path, { headers: reqHeaders, cache: 'no-store' })
      if (r2.ok) baeminRes = r2
    }

    if (!baeminRes.ok) {
      const errText = await baeminRes.text().catch(() => '')
      return NextResponse.json({
        ok: false,
        error: 'Baemin API 오류 (HTTP ' + baeminRes.status + '). 북마크릿 방법을 이용해주세요.',
        debug: errText.slice(0, 500),
      }, { status: 502, headers: ch })
    }

    const json = await baeminRes.json()
    const reviews: any[] = Array.isArray(json) ? json : (json.contents || json.data || json.reviews || json.list || [])
    if (reviews.length === 0) return NextResponse.json({ ok: true, count: 0 }, { headers: ch })

    const count = await saveRows(userId, shopNo, reviews, svc)
    return NextResponse.json({ ok: true, count, source: 'server' }, { headers: ch })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: ch })
  }
}
