// app/api/baemin/collect-reviews/route.ts
// 배민 셀프서비스 API에서 실제 리뷰(사진 포함) 수집
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  const hex = raw.replace(/\s+/g, '')
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const decipher = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8')
}

function extractPhotos(review: any): string[] {
  const urls: string[] = []
  const tryList = [
    review.images, review.imageList, review.photos, review.photoList,
    review.imageUrls, review.photoUrls,
  ]
  for (const list of tryList) {
    if (Array.isArray(list) && list.length > 0) {
      for (const item of list) {
        const url = typeof item === 'string' ? item : (item.url || item.imageUrl || item.src || '')
        if (url && typeof url === 'string' && url.startsWith('http')) urls.push(url)
      }
      if (urls.length > 0) break
    }
  }
  return urls
}

function extractAuthor(review: any): string {
  return (
    review.writer?.nickname ||
    review.writer?.name ||
    review.memberNickname ||
    review.nickname ||
    review.authorName ||
    review.author ||
    '익명'
  )
}

function maskName(name: string): string {
  if (!name || name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

function extractDate(review: any): string {
  const raw = review.createdAt || review.writtenAt || review.orderDate || review.date || ''
  if (raw) return new Date(raw).toISOString()
  return new Date().toISOString()
}

function extractRating(review: any): number | null {
  const r = review.starScore ?? review.rating ?? review.starRating ?? review.star ?? null
  if (r === null) return null
  const n = Number(r)
  return (n >= 1 && n <= 5) ? n : null
}

function extractReviewId(review: any): string {
  return String(review.reviewNo || review.reviewId || review.id || review.orderNo || Math.random().toString(36))
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId

  try {
    const body = await req.json().catch(() => ({}))
    const svc = createServiceClient()

    // ── 1) 저장된 쿠키 로드 ──
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('extra_data, platform_store_id')
      .eq('user_id', userId)
      .eq('platform', 'baemin')
      .maybeSingle()

    const extra = (cred?.extra_data as any) || {}
    if (!extra.baemin_cookie_enc) {
      return NextResponse.json({ ok: false, error: '배민 쿠키가 저장되지 않았어요. 먼저 쿠키를 저장해주세요.' }, { status: 400 })
    }

    const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
    const shopNo = String(body.shop_no || cred?.platform_store_id || '14637452')

    // ── 2) 배민 API 호출 ──
    const apiUrl = BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews?pageNumber=1&pageSize=20'
    const baeminRes = await fetch(apiUrl, {
      headers: {
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://self.baemin.com/',
        'Origin': 'https://self.baemin.com',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      cache: 'no-store',
    })

    if (!baeminRes.ok) {
      const errText = await baeminRes.text().catch(() => '')
      if (baeminRes.status === 401 || baeminRes.status === 403) {
        return NextResponse.json({ ok: false, error: '쿠키가 만료됐어요. 배민 셀프서비스에서 쿠키를 다시 복사해주세요.' }, { status: 401 })
      }
      return NextResponse.json({ ok: false, error: 'Baemin API 오류 (' + baeminRes.status + '): ' + errText.slice(0, 200) }, { status: 500 })
    }

    const json = await baeminRes.json()
    // 응답 구조: { contents: [...] } 또는 배열 직접
    const reviews: any[] = Array.isArray(json) ? json : (json.contents || json.data || json.reviews || json.list || [])

    if (reviews.length === 0) {
      return NextResponse.json({ ok: true, count: 0, message: '가져올 리뷰가 없어요.' })
    }

    // ── 3) DB 저장 ──
    const rows = reviews.map((r: any) => ({
      user_id: userId,
      platform: 'baemin',
      platform_review_id: 'baemin-real-' + extractReviewId(r),
      platform_store_id: shopNo,
      author_name: extractAuthor(r),
      author_mask: maskName(extractAuthor(r)),
      content: r.content || r.reviewContent || r.text || null,
      rating: extractRating(r),
      photos: extractPhotos(r),
      has_reply: !!(r.comments?.length || r.commentList?.length || r.hasComment || r.hasReply),
      posted_at: extractDate(r),
      collected_at: new Date().toISOString(),
    }))

    const { data: saved, error: saveErr } = await svc
      .from('platform_reviews')
      .upsert(rows, { onConflict: 'platform,platform_review_id' })
      .select('id')

    if (saveErr) {
      return NextResponse.json({ ok: false, error: saveErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: saved?.length ?? rows.length, raw_count: reviews.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
