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
  const allRows = reviews.map((r) => ({
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

  // ── 62차-3: batch 내부 중복 platform_review_id 제거 ──
  // 슬라이딩 윈도우가 EXPOSE + UNEXPOSE 또는 day 경계 중복으로 같은 리뷰를 두 번 잡을 수 있음.
  // PostgreSQL ON CONFLICT DO UPDATE 는 batch 내 동일 key 두 번이면 에러.
  // 68차: dedupe 에서 뒤에 있는 row 우선 (replies 가 채워진 최신 버전 우선)
  //       기존: 첫 번째 발견된 것만 → 답글 단 review 가 EXPOSE/UNEXPOSE 둘 다 있을 때
  //              먼저 발견된 게 답글 없는 버전이면 답글 정보 손실
  //       수정: 마지막 발견된 것 우선 (또는 has_reply=true 인 것 우선)
  const dedupeMap = new Map<string, typeof allRows[number]>()
  for (const row of allRows) {
    const key = `${row.user_id}::${row.platform}::${row.platform_review_id}`
    const existing = dedupeMap.get(key)
    if (!existing) {
      dedupeMap.set(key, row)
      continue
    }
    // 답글 있는 버전 우선
    if (row.has_reply && !existing.has_reply) {
      dedupeMap.set(key, row)
    } else if (row.has_reply === existing.has_reply) {
      // 둘 다 같은 has_reply 상태면 reply_content 가 있는 쪽 우선
      const rowHasContent = !!(row.reply_content)
      const existHasContent = !!(existing.reply_content)
      if (rowHasContent && !existHasContent) dedupeMap.set(key, row)
    }
  }
  const fullRows = Array.from(dedupeMap.values())
  if (fullRows.length !== allRows.length) {
    console.log(`[upsertReviews] dedupe: ${allRows.length} → ${fullRows.length} (중복 ${allRows.length - fullRows.length}개 제거)`)
  }

  // 1차 시도: 모든 컬럼 포함
  const { data, error } = await svc
    .from('platform_reviews')
    .upsert(fullRows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
    .select('platform_review_id')

  if (!error) {
    return {
      inserted: Array.isArray(data) ? data.length : 0,
      total: reviews.length,
    }
  }

  // ── 62차-2: 컬럼 없음 에러 (schema cache miss) → 미지원 컬럼 제거 후 retry ──
  // 예: "Could not find the 'reply_content' column of 'platform_reviews' in the schema cache"
  const errMsg = String(error.message || '')
  const missingColMatch = errMsg.match(/'([a-z_]+)' column/i)
  if (missingColMatch || errMsg.includes('schema cache')) {
    const skipCols = ['reply_content', 'raw_snapshot']
    if (missingColMatch && missingColMatch[1] && !skipCols.includes(missingColMatch[1])) {
      skipCols.push(missingColMatch[1])
    }
    const slimRows = fullRows.map((row: any) => {
      const out: any = { ...row }
      for (const col of skipCols) delete out[col]
      return out
    })
    const { data: data2, error: error2 } = await svc
      .from('platform_reviews')
      .upsert(slimRows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
      .select('platform_review_id')
    if (!error2) {
      console.warn(`[upsertReviews] 1차 실패 → 컬럼 ${skipCols.join(',')} 제외 후 retry 성공`)
      return {
        inserted: Array.isArray(data2) ? data2.length : 0,
        total: reviews.length,
      }
    }
    throw new Error(`platform_reviews upsert (retry): ${error2.message}`)
  }

  throw new Error(`platform_reviews upsert: ${error.message}`)
}
