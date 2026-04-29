// app/api/baemin/collect-reviews/route.ts
// Railway Worker(Playwright)에 fetch_reviews 작업 위임
// Worker가 실제 브라우저로 로그인 → XHR 캡처 → 사진 포함 리뷰 저장
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function extractPhotos(r: any): string[] {
  const urls: string[] = []
  for (const list of [r.photos, r.images, r.imageList, r.photoList, r.imageUrls, r.photoUrls, r.reviewImages]) {
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
  const raw = r.createdAt || r.writtenAt || r.orderDate || r.date || r.createdDate || ''
  if (raw) { try { return new Date(raw).toISOString() } catch { return new Date().toISOString() } }
  return new Date().toISOString()
}

function extractRating(r: any): number | null {
  const v = r.starScore ?? r.rating ?? r.starRating ?? r.star ?? r.score ?? null
  if (v === null) return null
  const n = Number(v)
  return (n >= 1 && n <= 5) ? n : null
}

function extractId(r: any): string {
  return String(r.reviewNo || r.reviewId || r.id || r.seq || r.orderNo || Math.random().toString(36).slice(2))
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
    has_reply: !!(r.comments?.length || r.commentList?.length || r.hasComment || r.hasReply || r.ownerReply || r.ownerComment),
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

    // 경로 A: 북마크릿에서 리뷰 배열 직접 전송 (즉시 저장)
    if (Array.isArray(body.reviews) && body.reviews.length > 0) {
      const shopNo = String(body.shop_no || '14637452')
      const count = await saveRows(userId, shopNo, body.reviews, svc)
      return NextResponse.json({ ok: true, count, source: 'bookmarklet' }, { headers: ch })
    }

    // credentials 확인
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('account_id, platform_store_id, last_login_status')
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

    // 경로 B: Railway Worker에 fetch_reviews 작업 위임
    // Worker가 Playwright 브라우저로 로그인 → XHR 캡처 → 사진 포함 리뷰 저장
    const jobResult = await enqueuePlatformJob({
      platform: 'baemin',
      action: 'fetch_reviews',
      userId,
      storeId: shopNo,
    })

    if (jobResult.ok) {
      return NextResponse.json({
        ok: true,
        queued: true,
        jobId: jobResult.jobId,
        message: '리뷰 수집을 시작했어요! 약 30~60초 후 새로고침하면 최신 리뷰를 볼 수 있어요.',
        source: 'worker',
      }, { headers: ch })
    }

    return NextResponse.json({
      ok: false,
      error: '리뷰 수집 작업 등록 실패: ' + jobResult.error,
    }, { status: 500, headers: ch })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500, headers: ch })
  }
}
