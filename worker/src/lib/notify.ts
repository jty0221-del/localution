// worker/src/lib/notify.ts
// ============================================================
// 워커 → Vercel 알림 트리거
//   · /api/internal/notify-new-reviews 호출
//   · TRIGGER_SECRET 으로 인증
//   · 리뷰 수집 완료 직후 호출 → 사장님이 즉시 푸시 알림 받음
// ============================================================
import type { Logger } from 'pino'

export type NotifyResult = {
  ok: boolean
  sent?: number
  skipped?: number
  failed?: number
  total?: number
  error?: string
}

/**
 * 새 리뷰 알림 트리거 (워커가 호출).
 *   reviewIds: 'all_new' = 최근 24시간 새 리뷰 모두 / 배열 = 특정 ID 만
 */
export async function notifyNewReviews(
  log: Logger,
  args: {
    userId: string
    platform: string
    reviewIds?: string[] | 'all_new'
  },
): Promise<NotifyResult> {
  const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.localution.co.kr'
  const TRIGGER_SECRET = process.env.TRIGGER_SECRET || ''

  if (!TRIGGER_SECRET) {
    log.warn('notify: TRIGGER_SECRET missing — skipping notification trigger')
    return { ok: false, error: 'TRIGGER_SECRET missing' }
  }

  const url = `${APP_URL.replace(/\/$/, '')}/api/internal/notify-new-reviews`
  const body = {
    user_id: args.userId,
    platform: args.platform,
    review_ids: args.reviewIds ?? 'all_new',
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIGGER_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      log.warn({ status: res.status, body: JSON.stringify(json).slice(0, 200) }, 'notify: trigger failed')
      return { ok: false, error: `HTTP ${res.status}` }
    }
    log.info({
      sent: json.sent,
      skipped: json.skipped,
      failed: json.failed,
      total: json.total,
    }, 'notify: trigger ok')
    return {
      ok: true,
      sent: json.sent,
      skipped: json.skipped,
      failed: json.failed,
      total: json.total,
    }
  } catch (e: any) {
    log.warn({ err: e?.message?.slice(0, 100) }, 'notify: exception')
    return { ok: false, error: e?.message || String(e) }
  }
}
