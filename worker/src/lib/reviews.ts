// worker/src/lib/reviews.ts
// ============================================================
// 32차-1 · platform_reviews UPSERT 공통 헬퍼
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Platform } from '../jobs'

export type CollectedReview = {
  platform_review_id: string     // 플랫폼별 고유 ID (중복 방지)
  author_name: string | null
  rating: number | null          // 1~5
  content: string | null
  photos: string[] | null
  posted_at: string | null       // ISO 8601
  has_reply: boolean
  reply_content?: string | null
  raw_snapshot?: unknown
}

function maskAuthor(name: string | null | undefined): string | null {
  if (!name) return null
  const s = String(name).trim()
  if (s.length <= 1) return s + '*'
  if (s.length === 2) return s[0] + '*'
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

export type UpsertResult = {
  inserted: number
  total: number
}

export async function upsertReviews(
  svc: SupabaseClient,
  userId: string,
  platform: Platform,
  platformStoreId: string,
  reviews: CollectedReview[],
): Promise<UpsertResult> {
  if (reviews.length === 0) return { inserted: 0, total: 0 }

  const now = new Date().toISOString()
  const rows = reviews.map((r) => ({
    user_id: userId,
    platform,
    platform_store_id: platformStoreId,
    platform_review_id: r.platform_review_id,
    author_name: r.author_name,
    author_mask: maskAuthor(r.author_name),
    rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
    content: r.content,
    photos: r.photos && r.photos.length > 0 ? r.photos : null,
    posted_at: r.posted_at,
    collected_at: now,
    has_reply: r.has_reply,
    reply_content: r.reply_content ?? null,
    raw_snapshot: r.raw_snapshot ?? r,
  }))

  const { data, error } = await svc
    .from('platform_reviews')
    .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
    .select('platform_review_id')

  if (error) throw new Error(`platform_reviews upsert: ${error.message}`)

  return {
    inserted: Array.isArray(data) ? data.length : 0,
    total: reviews.length,
  }
}
