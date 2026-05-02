// app/api/notify/test/route.ts
// 알림 테스트 발송 — 본인 모든 활성 채널로 테스트 메시지 1개 보냄
//   POST /api/notify/test  → 본인에게 발송
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data: prefs } = await svc
    .from('user_notification_prefs')
    .select('*')
    .eq('user_id', auth.userId)
    .maybeSingle()

  const results: Record<string, { ok: boolean; error?: string }> = {}

  // ── 카카오톡 테스트 발송 ──
  if (prefs?.channel_kakao_talk) {
    try {
      const { sendMemoForUser } = await import('@/app/lib/kakao-api')
      const text = '🔔 로컬루션 알림 테스트\n\n새 리뷰가 도착하면 이런 식으로 알려드려요.\n낮은 별점 리뷰는 무조건 발송됩니다.'
      const r = await sendMemoForUser(auth.userId, text, {
        linkWebUrl: 'https://www.localution.co.kr/review-admin/naver',
        linkMobileUrl: 'https://www.localution.co.kr/review-admin/naver',
        buttonTitle: '리뷰 보러 가기',
      })
      results.kakao_talk = r.ok ? { ok: true } : { ok: false, error: r.error.slice(0, 200) }
    } catch (e: any) {
      results.kakao_talk = { ok: false, error: String(e?.message || e).slice(0, 200) }
    }
  } else {
    results.kakao_talk = { ok: false, error: 'channel_disabled (settings 에서 켜기)' }
  }

  // ── Web Push 테스트 발송 ──
  if (prefs?.channel_web_push && prefs?.web_push_subscription) {
    try {
      const webpush = (await import('web-push')).default || (await import('web-push'))
      const vapidPub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const vapidPriv = process.env.VAPID_PRIVATE_KEY
      const vapidSub = process.env.VAPID_SUBJECT || 'mailto:jty0221@gmail.com'
      if (!vapidPub || !vapidPriv) {
        results.web_push = { ok: false, error: 'vapid_not_configured (환경변수 미설정)' }
      } else {
        ;(webpush as any).setVapidDetails(vapidSub, vapidPub, vapidPriv)
        await (webpush as any).sendNotification(
          prefs.web_push_subscription,
          JSON.stringify({
            title: '🔔 로컬루션 알림 테스트',
            body: '새 리뷰가 도착하면 이런 식으로 알려드려요',
            url: '/review-admin/naver',
            tag: 'test-' + Date.now(),
          }),
        )
        results.web_push = { ok: true }
      }
    } catch (e: any) {
      results.web_push = { ok: false, error: String(e?.message || e).slice(0, 200) }
    }
  } else {
    results.web_push = { ok: false, error: 'channel_disabled (settings 에서 켜기)' }
  }

  return NextResponse.json({ ok: true, results })
}
