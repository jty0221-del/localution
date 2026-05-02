// app/lib/notifications-trigger.ts
// ============================================================
// 새 리뷰 발견 시 알림 발송 trigger
//   · 사용자 알림 설정 (user_notification_prefs) 로드
//   · 별점 ≤ threshold 면 review_alerts_enabled 무시 (강제 발송)
//   · 활성 채널별 발송 (web_push, kakao_talk, email)
//   · notification_log 에 발송 이력 기록 (중복 발송 방지)
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export type ReviewRow = {
  user_id: string
  platform: string
  platform_store_id: string
  platform_review_id: string
  author_name?: string | null
  author_mask?: string | null
  rating?: number | null
  content?: string | null
  posted_at?: string | null
}

type Prefs = {
  user_id: string
  review_alerts_enabled: boolean
  low_rating_force_alert: boolean
  low_rating_threshold: number
  channel_web_push: boolean
  channel_kakao_talk: boolean
  channel_email: boolean
  web_push_subscription: any
  kakao_access_token: string | null
}

const DEFAULT_PREFS: Omit<Prefs, 'user_id'> = {
  review_alerts_enabled: true,
  low_rating_force_alert: true,
  low_rating_threshold: 3,
  channel_web_push: true,
  channel_kakao_talk: false,
  channel_email: false,
  web_push_subscription: null,
  kakao_access_token: null,
}

async function loadPrefs(svc: SupabaseClient, userId: string): Promise<Prefs> {
  try {
    const { data } = await svc
      .from('user_notification_prefs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (data) return { ...DEFAULT_PREFS, ...data, user_id: userId } as Prefs
  } catch {}
  return { user_id: userId, ...DEFAULT_PREFS }
}

// 발송 결정 — 사용자 설정 + 별점 우선순위 적용
function shouldNotify(prefs: Prefs, rating: number | null): boolean {
  // 낮은 별점 강제 알림 — 사용자가 끄도 발송
  if (prefs.low_rating_force_alert && rating !== null && rating <= prefs.low_rating_threshold) {
    return true
  }
  // 일반 알림 — 사용자 설정 따름
  return prefs.review_alerts_enabled
}

// 발송 메시지 빌더
function buildMessage(review: ReviewRow): { title: string; body: string } {
  const isLow = typeof review.rating === 'number' && review.rating <= 2
  const ratingStr = typeof review.rating === 'number' ? '⭐'.repeat(review.rating) : ''
  const author = review.author_mask || review.author_name || '익명'
  const preview = (review.content || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  return {
    title: isLow
      ? `⚠️ ${ratingStr} 낮은 별점 리뷰가 등록됐어요`
      : `💬 새 리뷰 ${ratingStr}`,
    body: `${author}님: ${preview}${preview.length === 60 ? '…' : ''}`,
  }
}

// 중복 발송 차단 — notification_log 에 이미 같은 ref_id 가 있으면 skip
async function alreadySent(
  svc: SupabaseClient,
  userId: string,
  kind: string,
  refId: string,
  channel: string,
): Promise<boolean> {
  try {
    const { count } = await svc
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('ref_id', refId)
      .eq('channel', channel)
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

// 실제 발송 hook (Phase 2 에서 채워짐 — 지금은 log 만 기록)
async function sendViaChannel(
  svc: SupabaseClient,
  prefs: Prefs,
  review: ReviewRow,
  channel: 'web_push' | 'kakao_talk' | 'email',
  msg: { title: string; body: string },
): Promise<{ ok: boolean; error?: string }> {
  // Phase 2 에서 실제 webpush.sendNotification / Kakao API / SES 호출 추가
  // 지금은 log 만 — 발송 큐는 Phase 2 에서 처리
  return { ok: true }
}

export async function triggerReviewNotifications(
  svc: SupabaseClient,
  userId: string,
  newReviews: ReviewRow[],
): Promise<{ sent: number; skipped: number; failed: number }> {
  if (!newReviews || newReviews.length === 0) return { sent: 0, skipped: 0, failed: 0 }

  const prefs = await loadPrefs(svc, userId)
  let sent = 0, skipped = 0, failed = 0

  for (const review of newReviews) {
    const rating = typeof review.rating === 'number' ? review.rating : null
    if (!shouldNotify(prefs, rating)) {
      skipped += 1
      continue
    }

    const isLow = rating !== null && rating <= prefs.low_rating_threshold
    const kind = isLow ? 'review_low_rating' : 'review_new'
    const msg = buildMessage(review)

    const channels: Array<'web_push' | 'kakao_talk' | 'email'> = []
    if (prefs.channel_web_push && prefs.web_push_subscription) channels.push('web_push')
    if (prefs.channel_kakao_talk && prefs.kakao_access_token) channels.push('kakao_talk')
    if (prefs.channel_email) channels.push('email')

    if (channels.length === 0) {
      // 알림 채널 미설정 — 페이지 내 토스트로만 노출 (notification_log 기록)
      try {
        await svc.from('notification_log').insert({
          user_id: userId,
          kind,
          channel: 'in_app',
          ref_id: review.platform_review_id,
          payload: msg,
          status: 'sent',
        })
      } catch {}
      sent += 1
      continue
    }

    for (const channel of channels) {
      // eslint-disable-next-line no-await-in-loop
      if (await alreadySent(svc, userId, kind, review.platform_review_id, channel)) {
        skipped += 1
        continue
      }
      // eslint-disable-next-line no-await-in-loop
      const r = await sendViaChannel(svc, prefs, review, channel, msg)
      try {
        await svc.from('notification_log').insert({
          user_id: userId,
          kind,
          channel,
          ref_id: review.platform_review_id,
          payload: msg,
          status: r.ok ? 'sent' : 'failed',
          error_message: r.ok ? null : (r.error || 'unknown'),
        })
      } catch {}
      if (r.ok) sent += 1
      else failed += 1
    }
  }

  return { sent, skipped, failed }
}
