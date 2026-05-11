// app/api/cron/kakao-reply-generate/route.ts
// ============================================================
// v38: 카카오맵 리뷰 AI 자동답글 초안 생성 (하루 4회)
//   · autoreply_enabled=true 유저의 미답변 카카오 리뷰에 AI 초안
//   · 카카오는 worker post_reply 가능 (사장님 비즈니스 계정 연동시)
//   · 미연동 사용자는 draft 만 저장 → 사장님이 manual_paste 로 등록
// ============================================================
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface UserStat {
  userId: string
  drafted: number
  skipped: number
  errors: string[]
}

export async function GET(req: Request) {
  const a = verifyCronAuth(req.headers.get('authorization'))
  if (!a.ok) return NextResponse.json({ error: a.message }, { status: a.status })

  const startTime = Date.now()
  const svc = createServiceClient()

  // 1) autoreply 활성화 + kakao_map 연결 사용자
  const { data: credRows, error: credErr } = await svc
    .from('platform_credentials')
    .select('user_id, extra_data')
    .eq('platform', 'kakao_map')

  if (credErr || !credRows) {
    return NextResponse.json({ ok: false, error: 'DB 조회 실패' }, { status: 500 })
  }

  const enabledUsers = credRows.filter(row => {
    const extra = (row.extra_data as Record<string, unknown>) || {}
    return extra.autoreply_enabled === true || extra.kakao_autoreply_enabled === true
  })

  if (enabledUsers.length === 0) {
    return NextResponse.json({
      ok: true,
      message: '카카오 자동답글 활성화 유저 없음',
      processed: 0,
      elapsed_ms: Date.now() - startTime,
    })
  }

  // generate-reply 헬퍼 (네이버 패턴 재사용)
  const { loadStoreInfo, generateNaverReply } = await import('@/app/lib/generate-naver-reply')

  const summary: UserStat[] = []

  for (const cred of enabledUsers) {
    const userId: string = cred.user_id
    const extra = (cred.extra_data as Record<string, unknown>) || {}
    const tone: string = String(extra.autoreply_tone || extra.kakao_autoreply_tone || 'friendly')
    const maxPerRun: number = Math.min(20, Math.max(1, Number(extra.autoreply_max_per_run) || 5))

    const stat: UserStat = { userId: userId.slice(0, 8) + '…', drafted: 0, skipped: 0, errors: [] }

    try {
      const { data: reviews, error: revErr } = await svc
        .from('platform_reviews')
        .select('id, content, rating, photos, platform_review_id, author_name')
        .eq('user_id', userId)
        .eq('platform', 'kakao_map')
        .eq('has_reply', false)
        .is('draft_reply', null)
        .order('posted_at', { ascending: false })
        .limit(maxPerRun)

      if (revErr) {
        stat.errors.push('review fetch: ' + revErr.message)
        summary.push(stat)
        continue
      }

      if (!reviews || reviews.length === 0) {
        summary.push(stat)
        continue
      }

      // 매장 정보 로드 (AI 컨텍스트)
      const storeInfo = await loadStoreInfo(svc, userId).catch(() => null)
      if (!storeInfo) {
        stat.errors.push('store info 없음 — 매장 등록 필요')
        summary.push(stat)
        continue
      }

      for (const r of reviews) {
        try {
          const draft = await generateNaverReply({
            store: storeInfo,
            review: {
              content: r.content || '',
              rating: r.rating || null,
              authorName: r.author_name || null,
              photos: r.photos || [],
            },
            tone,
          })
          if (draft && draft.trim()) {
            // 카카오는 250자 제한 적용 (네이버와 비슷한 spam filter 가정)
            const trimmed = draft.length > 250 ? draft.slice(0, 247) + '...' : draft
            await svc
              .from('platform_reviews')
              .update({ draft_reply: trimmed, draft_generated_at: new Date().toISOString() })
              .eq('id', r.id)
            stat.drafted++
          } else {
            stat.skipped++
          }
        } catch (e: any) {
          stat.errors.push(`review ${r.platform_review_id}: ${e?.message?.slice(0, 80)}`)
        }
      }
    } catch (e: any) {
      stat.errors.push('exception: ' + (e?.message || String(e)).slice(0, 100))
    }

    summary.push(stat)
  }

  const totalDrafted = summary.reduce((s, x) => s + x.drafted, 0)
  return NextResponse.json({
    ok: true,
    mode: 'cron_kakao_reply_generate',
    processed_users: summary.length,
    total_drafted: totalDrafted,
    summary,
    elapsed_ms: Date.now() - startTime,
  })
}
