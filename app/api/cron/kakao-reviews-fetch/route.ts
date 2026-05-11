// app/api/cron/kakao-reviews-fetch/route.ts
// ============================================================
// v38: 카카오맵 공개 리뷰 자동 수집 크론 (30분마다)
//   · platform_credentials.platform=kakao_map 모든 사용자 대상
//   · place-api panel3 임베디드 최근 3-5건 수집
//   · 신규 리뷰 감지 시 notifications-trigger 발송 후보
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'
import { fetchKakaoVisitorReviews } from '@/app/lib/kakao-place'
import { triggerReviewNotifications } from '@/app/lib/notifications-trigger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_USERS_PER_RUN = 50
const GAP_MS = 600

function maskAuthor(name: string | null | undefined): string | null {
  if (!name) return null
  const s = String(name).trim()
  if (s.length <= 1) return s + '*'
  if (s.length === 2) return s[0] + '*'
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

function parseDateSafely(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}T${m1[4]}:${m1[5]}:${m1[6]}+09:00`
  const m2 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}T00:00:00+09:00`
  return null
}

export async function GET(req: NextRequest) {
  const a = verifyCronAuth(req.headers.get('authorization'))
  if (!a.ok) return NextResponse.json({ error: a.message }, { status: a.status })

  const startedAt = Date.now()
  const svc = createServiceClient()

  // 1) 대상 유저: platform_credentials.platform=kakao_map + platform_store_id 있음
  const { data: creds, error } = await svc
    .from('platform_credentials')
    .select('user_id, platform_store_id')
    .eq('platform', 'kakao_map')
    .not('platform_store_id', 'is', null)
    .neq('platform_store_id', '')
    .order('updated_at', { ascending: true })
    .limit(MAX_USERS_PER_RUN * 2)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const targets = (creds || [])
    .filter(c => c.platform_store_id && /^\d+$/.test(String(c.platform_store_id)))
    .slice(0, MAX_USERS_PER_RUN)

  if (targets.length === 0) {
    return NextResponse.json({
      ok: true,
      mode: 'cron_kakao_reviews_fetch',
      count: 0,
      message: '대상 카카오 유저 없음',
      duration_ms: Date.now() - startedAt,
    })
  }

  let okUsers = 0
  let failUsers = 0
  let totalCollected = 0
  let totalUpserted = 0
  const results: any[] = []

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    const placeId = String(t.platform_store_id)
    const now = new Date().toISOString()

    try {
      const reviews = await fetchKakaoVisitorReviews(placeId).catch((e) => {
        results.push({ user_id: t.user_id.slice(0, 12) + '...', place_id: placeId, error: e?.message?.slice(0, 100) })
        return []
      })

      if (!reviews || reviews.length === 0) {
        results.push({ user_id: t.user_id.slice(0, 12) + '...', place_id: placeId, collected: 0, upserted: 0 })
      } else {
        const rows = reviews.map((r) => ({
          user_id: t.user_id,
          platform: 'kakao_map' as const,
          platform_store_id: placeId,
          platform_review_id: String(r.reviewId),
          author_name: r.authorName ?? null,
          author_mask: maskAuthor(r.authorName),
          rating: typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null,
          content: r.body,
          photos: r.photos && r.photos.length > 0 ? r.photos : null,
          posted_at: parseDateSafely(r.postedAt),
          collected_at: now,
          has_reply: false,  // kakao panel3 는 owner reply 정보 없음 — worker 가 전체 수집 시 갱신
          raw_snapshot: r,
        }))

        const { data: upData, error: upErr } = await svc
          .from('platform_reviews')
          .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
          .select('platform_review_id')

        if (upErr) {
          failUsers++
          results.push({ user_id: t.user_id.slice(0, 12) + '...', place_id: placeId, collected: reviews.length, upserted: 0, error: upErr.message?.slice(0, 100) })
        } else {
          okUsers++
          const upsertedCount = Array.isArray(upData) ? upData.length : 0
          totalCollected += reviews.length
          totalUpserted += upsertedCount
          results.push({ user_id: t.user_id.slice(0, 12) + '...', place_id: placeId, collected: reviews.length, upserted: upsertedCount })

          // 신규 리뷰 알림 trigger
          if (Array.isArray(upData) && upData.length > 0) {
            try {
              const newReviewIds = new Set(upData.map(r => r.platform_review_id).filter(Boolean))
              const newReviews = rows.filter(r => newReviewIds.has(r.platform_review_id))
              await triggerReviewNotifications(svc, t.user_id, newReviews).catch(() => null)
            } catch (_) {}
          }
        }
      }
    } catch (e: any) {
      failUsers++
      results.push({ user_id: t.user_id.slice(0, 12) + '...', place_id: placeId, error: e?.message?.slice(0, 100) })
    }

    if (i < targets.length - 1) await new Promise(r => setTimeout(r, GAP_MS))
  }

  return NextResponse.json({
    ok: true,
    mode: 'cron_kakao_reviews_fetch',
    count: targets.length,
    ok_users: okUsers,
    fail_users: failUsers,
    total_collected: totalCollected,
    total_upserted: totalUpserted,
    duration_ms: Date.now() - startedAt,
    results: results.slice(0, 30),
  })
}
