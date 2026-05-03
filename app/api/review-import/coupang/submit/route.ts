// app/api/review-import/coupang/submit/route.ts
// ============================================================
// 북마클릿이 추출한 쿠팡이츠 리뷰 데이터 받기
//   POST { token, reviews, store_id?, store_name? }
//   · 토큰 검증 (HMAC, 30분)
//   · platform_reviews 테이블에 upsert
//   · 중복 (platform_review_id 기준) 자동 처리
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyImportToken } from '../init/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// 작성자 마스킹: "김민수" → "김**", "abc1234" → "ab****"
function maskAuthor(name: string): string {
  if (!name) return ''
  const s = String(name).trim()
  if (s.length <= 1) return s
  if (s.length === 2) return s[0] + '*'
  if (s.length <= 4) return s[0] + '*'.repeat(s.length - 1)
  return s.slice(0, 2) + '*'.repeat(Math.max(2, s.length - 2))
}

export async function POST(req: NextRequest) {
  let body: any = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: CORS })
  }

  const token = String(body?.token || '').trim()
  const reviews = Array.isArray(body?.reviews) ? body.reviews : []
  const platformStoreId = body?.store_id ? String(body.store_id).slice(0, 50) : null
  const platformStoreName = body?.store_name ? String(body.store_name).slice(0, 100) : null

  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400, headers: CORS })
  }
  const verified = verifyImportToken(token)
  if (!verified) {
    return NextResponse.json({
      ok: false,
      error: 'token_invalid_or_expired',
      message: '토큰이 만료됐거나 잘못됐어요. 로컬루션에서 새로 생성해주세요.',
    }, { status: 401, headers: CORS })
  }
  const userId = verified.userId

  if (reviews.length === 0) {
    return NextResponse.json({
      ok: false,
      error: 'no_reviews',
      message: '리뷰를 1개 이상 추출해야 합니다.',
    }, { status: 400, headers: CORS })
  }

  const svc = createServiceClient()

  // platform_reviews upsert 데이터 정규화
  const rows = reviews
    .map((r: any) => {
      // 필수 필드: id, content, rating
      const reviewId = String(r.id || r.orderReviewId || r.review_id || '').trim()
      if (!reviewId) return null
      const ratingRaw = Number(r.rating ?? r.score ?? 0)
      const rating = ratingRaw >= 1 && ratingRaw <= 5 ? Math.round(ratingRaw) : null
      const content = String(r.content || r.text || r.body || '').slice(0, 2000).trim()
      const authorName = String(r.author || r.authorName || r.userName || r.nickname || '').trim()

      // 답글 정보 (있으면)
      const reply = r.reply || r.ownerReply || null
      const hasReply = !!(reply && (reply.content || reply.text || typeof reply === 'string'))
      const replyContent = hasReply ? String(reply.content || reply.text || reply || '').slice(0, 2000) : null

      // 작성일
      let postedAt: string | null = null
      try {
        const dt = r.createdAt || r.created_at || r.date || r.orderedAt
        if (dt) postedAt = new Date(dt).toISOString()
      } catch {}

      // 메뉴
      const menus = Array.isArray(r.menus) ? r.menus.slice(0, 10).map((m: any) => String(m).slice(0, 50)) : []
      // 사진
      const photos = Array.isArray(r.photos) ? r.photos.slice(0, 10).map((p: any) => String(p).slice(0, 500)) : []

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
    })
    .filter(Boolean)
    .slice(0, 500)

  if (rows.length === 0) {
    return NextResponse.json({
      ok: false,
      error: 'no_valid_reviews',
      message: '유효한 리뷰가 없습니다 (id, content 필수)',
    }, { status: 400, headers: CORS })
  }

  // upsert: platform_review_id + user_id + platform 으로 중복 판정
  // Supabase upsert는 unique constraint 필요. 없으면 1차 select → insert/update.
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

  // INSERT (batch)
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

  // UPDATE one by one (변경된 필드만)
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
    received: rows.length,
    inserted,
    updated,
    errors: errors.slice(0, 5),
    message: `${inserted}개 신규 / ${updated}개 갱신`,
  }, { headers: CORS })
}
