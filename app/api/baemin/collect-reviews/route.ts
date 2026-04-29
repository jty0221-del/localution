// app/api/baemin/collect-reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { doLogin } from '../save-login/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'
const BAEMIN_WEB = 'https://self.baemin.com'

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

function extractReviewsFromPageProps(pp: any): any[] {
  if (!pp || typeof pp !== 'object') return []
  for (const key of Object.keys(pp)) {
    const v = pp[key]
    if (Array.isArray(v) && v.length > 0 && v[0] && (v[0].reviewNo || v[0].reviewId || v[0].id)) return v
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const inner of ['contents', 'list', 'reviews', 'reviewList', 'data', 'items']) {
        const arr = v[inner]
        if (Array.isArray(arr) && arr.length > 0) return arr
      }
    }
  }
  return []
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

// 쿠키가 만료됐을 때 자동 갱신
async function refreshCookieIfNeeded(svc: any, userId: string, extra: any): Promise<string | null> {
  if (!extra.baemin_id_enc) return null
  try {
    const id = decryptStr(extra.baemin_id_enc, extra.baemin_id_iv, extra.baemin_id_tag)
    const pw = decryptStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
    const newCookie = await doLogin(id, pw)
    // 새 쿠키 DB에 저장
    const cookieEnc = encryptStr(newCookie)
    await svc.from('platform_credentials').update({
      extra_data: {
        ...extra,
        baemin_cookie_enc: cookieEnc.enc,
        baemin_cookie_iv: cookieEnc.iv,
        baemin_cookie_tag: cookieEnc.tag,
      }
    }).eq('user_id', userId).eq('platform', 'baemin')
    return newCookie
  } catch (e: any) {
    console.error('자동 로그인 실패:', e?.message)
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

    // 경로 A: 북마크릿이 리뷰 배열을 직접 전송
    if (Array.isArray(body.reviews) && body.reviews.length > 0) {
      const shopNo = String(body.shop_no || '14637452')
      const count = await saveRows(userId, shopNo, body.reviews, svc)
      return NextResponse.json({ ok: true, count, source: 'bookmarklet' }, { headers: ch })
    }

    // 저장된 자격증명 로드
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('extra_data, platform_store_id')
      .eq('user_id', userId)
      .eq('platform', 'baemin')
      .maybeSingle()

    const extra = (cred?.extra_data as any) || {}
    const shopNo = String(body.shop_no || cred?.platform_store_id || '14637452')

    // 아이디/비밀번호 저장 여부 확인
    if (!extra.baemin_id_enc && !extra.baemin_cookie_enc) {
      return NextResponse.json({
        ok: false,
        error: '배민 연동 정보가 없어요. 먼저 배민 아이디/비밀번호를 연동해주세요.',
        code: 'NO_CREDENTIALS',
      }, { status: 400, headers: ch })
    }

    // 쿠키 로드 (없거나 만료 시 자동 로그인)
    let cookieStr: string | null = null
    if (extra.baemin_cookie_enc) {
      try { cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag) } catch { cookieStr = null }
    }
    if (!cookieStr) {
      cookieStr = await refreshCookieIfNeeded(svc, userId, extra)
      if (!cookieStr) {
        return NextResponse.json({ ok: false, error: '자동 로그인 실패. 배민 아이디/비밀번호를 다시 확인해주세요.' }, { status: 401, headers: ch })
      }
    }

    const hdrs = baeminHeaders(cookieStr, shopNo)

    // 경로 B: self-api.baemin.com 직접 호출
    const apiPath = '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=20'
    const apiRes = await fetch(BAEMIN_API + apiPath, { headers: hdrs, cache: 'no-store' })

    if (apiRes.ok) {
      const json = await apiRes.json()
      const reviews: any[] = Array.isArray(json) ? json : (json.contents || json.data || json.reviews || json.list || [])
      if (reviews.length > 0) {
        const count = await saveRows(userId, shopNo, reviews, svc)
        return NextResponse.json({ ok: true, count, source: 'api' }, { headers: ch })
      }
      return NextResponse.json({ ok: true, count: 0, source: 'api' }, { headers: ch })
    }

    // 쿠키 만료(401/403) → 자동 재로그인 후 재시도
    if (apiRes.status === 401 || apiRes.status === 403) {
      const newCookie = await refreshCookieIfNeeded(svc, userId, extra)
      if (newCookie) {
        const retryRes = await fetch(BAEMIN_API + apiPath, { headers: baeminHeaders(newCookie, shopNo), cache: 'no-store' })
        if (retryRes.ok) {
          const json = await retryRes.json()
          const reviews: any[] = Array.isArray(json) ? json : (json.contents || json.data || json.reviews || json.list || [])
          if (reviews.length > 0) {
            const count = await saveRows(userId, shopNo, reviews, svc)
            return NextResponse.json({ ok: true, count, source: 'api-refreshed' }, { headers: ch })
          }
          return NextResponse.json({ ok: true, count: 0, source: 'api-refreshed' }, { headers: ch })
        }
      }
      return NextResponse.json({
        ok: false,
        error: '배민 자동 로그인에 실패했어요. 비밀번호가 변경됐을 수 있어요.',
        code: 'AUTH_FAILED',
      }, { status: 401, headers: ch })
    }

    const apiErrStatus = apiRes.status
    const apiErrText = await apiRes.text().catch(() => '')

    // 경로 C: HTML 페이지 → __NEXT_DATA__ 파싱
    const pageRes = await fetch(BAEMIN_WEB + '/shops/' + shopNo + '/reviews', {
      headers: { ...hdrs, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      redirect: 'follow',
      cache: 'no-store',
    })

    if (pageRes.ok) {
      const html = await pageRes.text()
      const startTag = '<script id="__NEXT_DATA__"'
      const startIdx = html.indexOf(startTag)
      if (startIdx !== -1) {
        const gtIdx = html.indexOf('>', startIdx)
        const endIdx = html.indexOf('</script>', gtIdx)
        if (gtIdx !== -1 && endIdx !== -1) {
          try {
            const nextData = JSON.parse(html.slice(gtIdx + 1, endIdx))
            const pp = nextData?.props?.pageProps || {}
            const reviews = extractReviewsFromPageProps(pp)
            if (reviews.length > 0) {
              const count = await saveRows(userId, shopNo, reviews, svc)
              return NextResponse.json({ ok: true, count, source: 'html' }, { headers: ch })
            }
            return NextResponse.json({
              ok: false,
              error: '페이지는 열렸지만 리뷰를 찾을 수 없어요.',
              debug_keys: Object.keys(pp).join(', '),
              api_status: apiErrStatus,
            }, { status: 422, headers: ch })
          } catch (_) { /* HTML 파싱 실패 */ }
        }
      }
    }

    return NextResponse.json({
      ok: false,
      error: 'API 오류 (HTTP ' + apiErrStatus + '). 잠시 후 다시 시도해주세요.',
      debug: apiErrText.slice(0, 400),
    }, { status: 502, headers: ch })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: ch })
  }
}
