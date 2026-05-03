// app/api/review-import/coupang/paste/route.ts
// ============================================================
// 쿠팡이츠 리뷰 — Network 탭 JSON 붙여넣기 방식
//   POST { json, store_id?, store_name? }
//   · 사장님이 store.coupangeats.com Network 탭 응답 JSON을 그대로 붙여넣기
//   · 응답 구조 자동 파싱 (data.content / data.reviews / 배열 / 단일 객체 등)
//   · platform_reviews 테이블에 upsert
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function maskAuthor(name: string): string {
  if (!name) return ''
  const s = String(name).trim()
  if (s.length <= 1) return s
  if (s.length === 2) return s[0] + '*'
  if (s.length <= 4) return s[0] + '*'.repeat(s.length - 1)
  return s.slice(0, 2) + '*'.repeat(Math.max(2, s.length - 2))
}

// 다양한 응답 모양 → 리뷰 배열로 정규화
function extractReviews(input: any): any[] {
  if (!input) return []
  // 직접 배열
  if (Array.isArray(input)) return input
  // 흔한 키
  const candidates = [
    input?.data?.content,
    input?.data?.reviews,
    input?.data?.list,
    input?.data?.items,
    input?.data,
    input?.content,
    input?.reviews,
    input?.list,
    input?.items,
    input?.result?.content,
    input?.result?.reviews,
    input?.result,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }
  // 단일 객체에 id/content 있으면 1건
  if (input && (input.id || input.orderReviewId || input.reviewId)) return [input]
  return []
}

// 리뷰 객체 정규화 (쿠팡이츠 응답 키 다양함)
function normalizeReview(r: any, userId: string, platformStoreId: string | null) {
  const reviewId = String(
    r.orderReviewId ??
    r.reviewId ??
    r.id ??
    r.review_id ??
    r.orderId ??
    ''
  ).trim()
  if (!reviewId) return null

  const ratingRaw = Number(r.rating ?? r.score ?? r.starRating ?? r.star ?? 0)
  const rating = ratingRaw >= 1 && ratingRaw <= 5 ? Math.round(ratingRaw) : null

  const content = String(
    r.content ?? r.text ?? r.body ?? r.reviewContent ?? r.comment ?? ''
  ).slice(0, 2000).trim()

  const authorName = String(
    r.author ?? r.authorName ?? r.userName ?? r.nickname ?? r.customerName ?? r.writer ?? ''
  ).trim()

  // 답글 (사장님 답글)
  const reply =
    r.reply ??
    r.ownerReply ??
    r.merchantReply ??
    r.storeReply ??
    r.replyContent ??
    null
  let hasReply = false
  let replyContent: string | null = null
  if (reply) {
    if (typeof reply === 'string') {
      hasReply = !!reply.trim()
      replyContent = reply.trim() || null
    } else if (typeof reply === 'object') {
      const txt = String(reply.content ?? reply.text ?? reply.body ?? '').trim()
      if (txt) { hasReply = true; replyContent = txt.slice(0, 2000) }
    }
  }
  // 별도 키
  if (!hasReply && r.ownerCommentContent) {
    const txt = String(r.ownerCommentContent).trim()
    if (txt) { hasReply = true; replyContent = txt.slice(0, 2000) }
  }

  // 작성일
  let postedAt: string | null = null
  try {
    const dt =
      r.createdAt ??
      r.created_at ??
      r.reviewDate ??
      r.reviewedAt ??
      r.date ??
      r.orderedAt ??
      r.writeDate
    if (dt) {
      const d = typeof dt === 'number' ? new Date(dt) : new Date(String(dt))
      if (!isNaN(d.getTime())) postedAt = d.toISOString()
    }
  } catch {}

  // 메뉴
  let menus: string[] = []
  if (Array.isArray(r.menus)) {
    menus = r.menus.map((m: any) => String(typeof m === 'object' ? (m.name ?? m.menuName ?? '') : m).slice(0, 50)).filter(Boolean).slice(0, 10)
  } else if (Array.isArray(r.orderItems)) {
    menus = r.orderItems.map((m: any) => String(m.name ?? m.menuName ?? '').slice(0, 50)).filter(Boolean).slice(0, 10)
  }

  // 사진
  let photos: string[] = []
  if (Array.isArray(r.photos)) {
    photos = r.photos.map((p: any) => String(typeof p === 'object' ? (p.url ?? p.imageUrl ?? '') : p).slice(0, 500)).filter(Boolean).slice(0, 10)
  } else if (Array.isArray(r.images)) {
    photos = r.images.map((p: any) => String(typeof p === 'object' ? (p.url ?? p.imageUrl ?? '') : p).slice(0, 500)).filter(Boolean).slice(0, 10)
  } else if (Array.isArray(r.reviewImages)) {
    photos = r.reviewImages.map((p: any) => String(typeof p === 'object' ? (p.url ?? p.imageUrl ?? '') : p).slice(0, 500)).filter(Boolean).slice(0, 10)
  }

  return {
    user_id: userId,
    platform: 'coupangeats',
    platform_review_id: reviewId,
    platform_store_id: platformStoreId,
    author_name: authorName || null,
    author_mask: authorName ? maskAuthor(authorName) : null,
    rating,
    content: content || null,
    photos: photos.length > 0 ? photos : null,
    ordered_menus: menus.length > 0 ? menus : null,
    has_reply: hasReply,
    reply_content: replyContent,
    reply_status: hasReply ? 'submitted' : 'none',
    posted_at: postedAt,
    collected_at: new Date().toISOString(),
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId

  let body: any = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const rawJson = body?.json
  const platformStoreId = body?.store_id ? String(body.store_id).slice(0, 50) : null
  const platformStoreName = body?.store_name ? String(body.store_name).slice(0, 100) : null

  if (!rawJson) {
    return NextResponse.json({
      ok: false,
      error: 'missing_json',
      message: 'JSON 데이터를 붙여넣어 주세요.',
    }, { status: 400 })
  }

  // 문자열이면 파싱, 객체면 그대로
  let parsed: any
  try {
    parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: 'json_parse_error',
      message: 'JSON 형식이 올바르지 않습니다. Network 탭의 Response 전체를 복사해 주세요.',
      detail: e?.message?.slice(0, 200),
    }, { status: 400 })
  }

  const reviews = extractReviews(parsed)
  if (reviews.length === 0) {
    // 디버깅용: 키 목록 알려주기
    const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 20) : []
    const dataKeys = parsed?.data && typeof parsed.data === 'object' ? Object.keys(parsed.data).slice(0, 20) : []
    return NextResponse.json({
      ok: false,
      error: 'no_reviews_found',
      message: '리뷰 데이터를 찾지 못했어요. JSON 구조 확인이 필요해요.',
      hint: { topKeys: keys, dataKeys },
    }, { status: 400 })
  }

  const rows = reviews
    .map((r: any) => normalizeReview(r, userId, platformStoreId))
    .filter(Boolean)
    .slice(0, 1000) as any[]

  if (rows.length === 0) {
    return NextResponse.json({
      ok: false,
      error: 'no_valid_reviews',
      message: '유효한 리뷰가 없습니다 (id, content 필수)',
    }, { status: 400 })
  }

  const svc = createServiceClient()

  // 중복 검사
  const reviewIds = rows.map((r: any) => r.platform_review_id)
  const { data: existing } = await svc
    .from('platform_reviews')
    .select('id, platform_review_id')
    .eq('user_id', userId)
    .eq('platform', 'coupangeats')
    .in('platform_review_id', reviewIds)

  const existingIds = new Set((existing || []).map((e: any) => e.platform_review_id))
  const toInsert = rows.filter((r: any) => !existingIds.has(r.platform_review_id))
  const toUpdate = rows.filter((r: any) => existingIds.has(r.platform_review_id))

  let inserted = 0
  let updated = 0
  const errors: string[] = []

  if (toInsert.length > 0) {
    const { error: insertError, count } = await svc
      .from('platform_reviews')
      .insert(toInsert)
      .select('id', { count: 'exact', head: true })
    if (insertError) {
      errors.push('insert: ' + insertError.message.slice(0, 200))
    } else {
      inserted = count || toInsert.length
    }
  }

  for (const row of toUpdate) {
    const { error } = await svc
      .from('platform_reviews')
      .update({
        rating: row.rating,
        content: row.content,
        photos: row.photos,
        ordered_menus: row.ordered_menus,
        has_reply: row.has_reply,
        reply_content: row.reply_content,
        reply_status: row.reply_status,
        collected_at: row.collected_at,
      })
      .eq('user_id', userId)
      .eq('platform', 'coupangeats')
      .eq('platform_review_id', row.platform_review_id)
    if (error) {
      errors.push(`update ${row.platform_review_id}: ${error.message.slice(0, 100)}`)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    ok: true,
    parsed: rows.length,
    inserted,
    updated,
    errors: errors.slice(0, 5),
    message: `${inserted}개 신규 / ${updated}개 갱신 (총 ${rows.length}건 인식)`,
  })
}
