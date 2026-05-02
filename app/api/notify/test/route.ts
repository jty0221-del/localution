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

  // ⭐ 테스트 발송은 channel toggle 무시 — 가능한 채널 모두 강제 시도
  // 인프라가 갖춰진 채널 (kakao_tokens 존재 / web_push_subscription 존재) 모두 발송

  // ── 카카오톡 테스트 발송 ──
  // kakao_tokens 테이블에 사용자 row 있으면 발송 (channel_kakao_talk toggle 무시)
  try {
    const { data: kakaoRow } = await svc
      .from('kakao_tokens')
      .select('user_id, scope')
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (!kakaoRow) {
      results.kakao_talk = { ok: false, error: '카카오 미연결 — settings 에서 [카카오 연결] 클릭' }
    } else if (!String(kakaoRow.scope || '').includes('talk_message')) {
      results.kakao_talk = { ok: false, error: 'talk_message scope 미동의 — 다시 [카카오 연결]' }
    } else {
      const { sendMemoForUser } = await import('@/app/lib/kakao-api')
      const text = '🔔 로컬루션 알림 테스트\n\n새 리뷰가 도착하면 이런 식으로 알려드려요.\n낮은 별점 리뷰는 무조건 발송됩니다.'
      const r = await sendMemoForUser(auth.userId, text, {
        linkWebUrl: 'https://www.localution.co.kr/review-admin/naver',
        linkMobileUrl: 'https://www.localution.co.kr/review-admin/naver',
        buttonTitle: '리뷰 보러 가기',
      })
      results.kakao_talk = r.ok
        ? { ok: true }
        : { ok: false, error: r.error.slice(0, 200) }
      // 성공 시 자동으로 channel_kakao_talk 활성화 (테스트 받으면 실사용도 받겠다는 의미)
      if (r.ok && !prefs?.channel_kakao_talk) {
        await svc.from('user_notification_prefs').upsert({
          user_id: auth.userId,
          channel_kakao_talk: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
    }
  } catch (e: any) {
    results.kakao_talk = { ok: false, error: String(e?.message || e).slice(0, 200) }
  }

  // ── Web Push 테스트 발송 ──
  // web_push_subscription 있으면 발송 (channel_web_push toggle 무시)
  if (!prefs?.web_push_subscription) {
    results.web_push = { ok: false, error: '브라우저 알림 미구독 — settings 에서 🔔 [켜기] 클릭 후 권한 허용' }
  } else {
    try {
      const webpush = (await import('web-push')).default || (await import('web-push'))
      const vapidPub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const vapidPriv = process.env.VAPID_PRIVATE_KEY
      const vapidSub = process.env.VAPID_SUBJECT || 'mailto:jty0221@gmail.com'
      if (!vapidPub || !vapidPriv) {
        results.web_push = { ok: false, error: 'VAPID 키 미설정 — Vercel 환경변수 확인 후 redeploy' }
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
        // 성공 시 자동 활성화
        if (!prefs.channel_web_push) {
          await svc.from('user_notification_prefs').upsert({
            user_id: auth.userId,
            channel_web_push: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        }
      }
    } catch (e: any) {
      results.web_push = { ok: false, error: String(e?.message || e).slice(0, 200) }
    }
  }

  return NextResponse.json({ ok: true, results })
}
