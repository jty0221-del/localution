// app/api/review-reply/collect/route.ts
// ============================================================
// 32차-4 · 리뷰 수집 큐잉 — BullMQ 로 Railway Worker 에 fetch_reviews 잡 등록
//
//   POST /api/review-reply/collect?platform=baemin
//     또는 body: { platform: 'baemin'|'yogiyo'|'coupangeats'|'naver_place'|'kakao_map' }
//
//   naver_place / kakao_map 은 Vercel 공개 수집기 우선 사용 — 큐 우회 안내
//   baemin / yogiyo / coupangeats 는 Worker 로 enqueue
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob, Platform } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WORKER_PLATFORMS: Platform[] = ['baemin', 'yogiyo', 'coupangeats']
const VERCEL_BYPASS: Record<string, string> = {
  naver_place: '/api/place/reviews/fetch',
  kakao_map: '/api/place/kakao/collect',
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId

  let body: any = {}
  try { body = await req.json() } catch {}
  const { searchParams } = new URL(req.url)
  const platform = String(searchParams.get('platform') || body?.platform || '').trim() as Platform

  if (!platform) {
    return NextResponse.json({ ok: false, error: 'platform 필요' }, { status: 400 })
  }

  // naver_place / kakao_map 은 공개 수집기 우선
  if (platform in VERCEL_BYPASS) {
    return NextResponse.json({
      ok: false,
      error: `${platform} 은 Worker 큐가 아닌 ${VERCEL_BYPASS[platform]} 를 사용하세요`,
      bypass: VERCEL_BYPASS[platform],
    }, { status: 400 })
  }

  if (!WORKER_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { ok: false, error: `지원하지 않는 platform: ${platform}` },
      { status: 400 },
    )
  }

  try {
    const svc = createServiceClient()

    // 해당 user 의 platform_credentials 존재 확인
    const { data: cred, error: credErr } = await svc
      .from('platform_credentials')
      .select('id, platform, platform_store_id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .maybeSingle()

    if (credErr) {
      return NextResponse.json({ ok: false, error: 'credentials 조회 실패: ' + credErr.message }, { status: 500 })
    }
    if (!cred) {
      return NextResponse.json(
        { ok: false, error: `${platform} 로그인 정보가 없습니다. 먼저 /my/platforms 에서 연결하세요.` },
        { status: 400 },
      )
    }

    // 해당 user 의 store_id 취득 (platform_store_id 또는 stores 테이블 첫 매장)
    let storeId = cred.platform_store_id || ''
    if (!storeId) {
      const { data: store } = await svc
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      storeId = store?.id || 'default'
    }

    const jobId = `${userId}_${platform}_fetch_${Date.now()}`

    const result = await enqueuePlatformJob(
      {
        platform,
        action: 'fetch_reviews',
        userId,
        storeId,
      },
      { jobId },
    )

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: 'enqueue 실패: ' + result.error },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      platform,
      jobId: result.jobId,
      total: 0,
      queued: true,
      note: '리뷰 수집을 시작했어요! 잠시 후 자동으로 표시돼요.',
      message: '리뷰 수집을 시작했어요! 잠시 후 자동으로 표시돼요.',
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: '예외: ' + (e?.message ?? String(e)) },
      { status: 500 },
    )
  }
}
