// app/api/admin/queue-cleanup/route.ts
// ============================================================
// 사장님 본인의 큐 적체 정리
//   POST → 본인 user_id 의 fetch_reviews waiting/failed 모두 제거
//   · cron 이 다시 만들 거니까 안전
//   · post_reply 는 보존 (남은 발행 요청 처리 위해)
//   · stalled fetch_reviews 가 큐 막은 케이스 해결
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  try {
    const q = getPlatformQueue()

    const removed = { waiting_fetch: 0, failed: 0, delayed: 0 }
    const kept = { post_reply: 0, others: 0 }

    // 1) waiting 중 사장님 fetch_reviews 만 제거 (post_reply 는 보존!)
    const waiting = await q.getWaiting(0, 999)
    for (const j of waiting) {
      if (j.data?.userId !== auth.userId) {
        kept.others++
        continue
      }
      if (j.data?.action === 'post_reply') {
        kept.post_reply++
        continue
      }
      try {
        await j.remove()
        removed.waiting_fetch++
      } catch (_) {}
    }

    // 2) failed 중 사장님 거 정리 (다음 cron 이 새로 enqueue)
    const failed = await q.getFailed(0, 999)
    for (const j of failed) {
      if (j.data?.userId !== auth.userId) continue
      try {
        await j.remove()
        removed.failed++
      } catch (_) {}
    }

    // 3) delayed (지연된 retry) 도 정리
    const delayed = await q.getDelayed(0, 999)
    for (const j of delayed) {
      if (j.data?.userId !== auth.userId) continue
      try {
        await j.remove()
        removed.delayed++
      } catch (_) {}
    }

    return NextResponse.json({
      ok: true,
      removed,
      kept,
      message: `사장님 큐 정리 완료 — fetch_reviews ${removed.waiting_fetch}개 제거, post_reply ${kept.post_reply}개 보존`,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'cleanup failed' }, { status: 500 })
  }
}

// GET 으로도 호출 가능 (브라우저 직접 접속)
export async function GET(req: NextRequest) {
  return POST(req)
}
