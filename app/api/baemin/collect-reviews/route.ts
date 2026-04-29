// app/api/baemin/collect-reviews/route.ts
// 한국 프록시 → 직접 배민 API 호출 → 실시간 리뷰 수집
// 쿠키 만료 시 자동 재로그인, Worker fallback 유지
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { proxyFetch } from '@/app/lib/proxy-fetch'
import { baeminProxyLogin } from '@/app/lib/baemin-login'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'

function corsHeaders(origin: string) {
  const allow = origin.endsWith('.baemin.com') || origin.includes('localution')
  if (!allow) return {}
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(origin), 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
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

function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

function baeminHeaders(cookieStr: string, shopNo: string): Record<string, string> {
  return {
    Cookie: cookieStr,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://self.baemin.com/shops/' + shopNo + '/reviews',
    Origin: 'https://self.baemin.com',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'service-channel': 'SELF_SERVICE_PC',
    'X-Web-Version': 'v20260422143632',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
  }
}

function extractPhotos(r: any): string[] {
  const urls: string[] = []
  for (const list of [r.photos, r.images, r.imageList, r.imageUrls, r.reviewImages]) {
    if (!Array.isArray(list) || list.length === 0) continue
    for (const item of list) {
      const url = typeof item === 'string' ? item : (item.url || item.imageUrl || item.src || '')
      if (url && url.startsWith('http')) urls.push(url)
    }
    if (urls.length > 0) break
  }
  return urls
}

function extractAuthor(r: any): string {
  return r.writer?.nickname || r.writer?.name || r.memberNickname || r.nickname || r.author || '익명'
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
  return String(r.reviewNo || r.reviewId || r.id || r.seq || Math.random().toString(36).slice(2))
}

async function saveRows(userId: string, shopNo: string, reviews: any[], svc: any) {
  const rows = reviews.map((r: any) => ({
    user_id:            userId,
    platform:           'baemin',
    platform_review_id: 'baemin-real-' + extractId(r),
    platform_store_id:  shopNo,
    author_name:        extractAuthor(r),
    author_mask:        maskName(extractAuthor(r)),
    content:            r.content || r.reviewContent || r.text || r.comment || null,
    rating:             extractRating(r),
    photos:             extractPhotos(r),
    has_reply:          !!(r.comments?.length || r.commentList?.length || r.ownerReply || r.ownerComment),
    posted_at:          extractDate(r),
    collected_at:       new Date().toISOString(),
  }))
  const { data: saved, error } = await svc
    .from('platform_reviews')
    .upsert(rows, { onConflict: 'platform,platform_review_id' })
    .select('id')
  if (error) throw new Error(error.message)
  return saved?.length ?? rows.length
}

async function fetchReviewsViaProxy(cookieStr: string, shopNo: string): Promise<any[] | null> {
  const hdrs = baeminHeaders(cookieStr, shopNo)
  const apiPath = '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=30'
  try {
    const res = await proxyFetch(BAEMIN_API + apiPath, { headers: hdrs } as RequestInit)
    if (!res.ok) return null
    const json = await res.json() as any
    const reviews: any[] = Array.isArray(json) ? json : (json.contents || json.data || json.reviews || json.list || [])
    return reviews
  } catch {
    return null
  }
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

    // 경로 A: 북마크릿 직접 전송
    if (Array.isArray(body.reviews) && body.reviews.length > 0) {
      const shopNo = String(body.shop_no || '14637452')
      const count = await saveRows(userId, shopNo, body.reviews, svc)
      return NextResponse.json({ ok: true, count, source: 'bookmarklet' }, { headers: ch })
    }

    // credentials 로드
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('account_id, extra_data, platform_store_id, last_login_status')
      .eq('user_id', userId)
      .eq('platform', 'baemin')
      .maybeSingle()

    if (!cred || !(cred as any).account_id) {
      return NextResponse.json({
        ok: false,
        error: '배민 연동 정보가 없어요. 먼저 아이디/비밀번호를 연동해주세요.',
        code: 'NO_CREDENTIALS',
      }, { status: 400, headers: ch })
    }

    const shopNo = String(body.shop_no || (cred as any).platform_store_id || '14637452')
    const extra  = (cred as any).extra_data as any || {}

    // 경로 B: 프록시 직접 API (쿠키 있음)
    if (extra.baemin_cookie_enc) {
      let cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
      let reviews = await fetchReviewsViaProxy(cookieStr, shopNo)

      // 쿠키 만료(null 반환) → 자동 재로그인
      if (!reviews && extra.baemin_pw_enc) {
        try {
          const id = decryptStr(extra.baemin_id_enc, extra.baemin_id_iv, extra.baemin_id_tag)
          const pw = decryptStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
          cookieStr = await baeminProxyLogin(id, pw)

          // 새 쿠키 저장
          const newCookieEnc = encryptStr(cookieStr)
          await svc.from('platform_credentials').update({
            extra_data: {
              ...extra,
              baemin_cookie_enc: newCookieEnc.enc,
              baemin_cookie_iv:  newCookieEnc.iv,
              baemin_cookie_tag: newCookieEnc.tag,
              cookie_saved_at:   new Date().toISOString(),
            },
            last_login_status: 'ok',
          }).eq('user_id', userId).eq('platform', 'baemin')

          reviews = await fetchReviewsViaProxy(cookieStr, shopNo)
        } catch (reloginErr: any) {
          // 재로그인 실패 → Worker fallback
          reviews = null
        }
      }

      if (reviews !== null) {
        if (reviews.length === 0) {
          return NextResponse.json({ ok: true, total: 0, source: 'proxy', message: '새로운 리뷰가 없어요.' }, { headers: ch })
        }
        const count = await saveRows(userId, shopNo, reviews, svc)
        return NextResponse.json({ ok: true, total: count, source: 'proxy', message: count + '건 수집 완료!' }, { headers: ch })
      }
    }

    // 경로 C: Worker fallback (프록시 실패 시)
    const jobResult = await enqueuePlatformJob({
      platform: 'baemin',
      action:   'fetch_reviews',
      userId,
      storeId:  shopNo,
    })

    if (jobResult.ok) {
      return NextResponse.json({
        ok: true,
        queued: true,
        jobId:   jobResult.jobId,
        message: '리뷰 수집 중... 잠시 후 자동으로 표시돼요.',
        source:  'worker',
      }, { headers: ch })
    }

    return NextResponse.json({
      ok: false,
      error: '리뷰 수집 실패: ' + jobResult.error,
    }, { status: 500, headers: ch })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: ch })
  }
}
