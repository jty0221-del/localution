// app/api/platform-accounts/coupang-status/route.ts
// ============================================================
// 쿠팡이츠 연동 진행 상태 조회 (장사닥터 패턴 폴링용)
//   GET ?job_id=...
//   응답: { status: 'queued' | 'processing' | 'completed' | 'failed' | 'unknown', ... }
//   · BullMQ Queue 에서 job 상태 직접 조회
//   · 동시에 platform_credentials.last_login_status 도 확인
//   · UI 는 1~5초 간격으로 폴링하다가 완료 시 푸시 알림
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Status = 'queued' | 'processing' | 'completed' | 'failed' | 'unknown'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('job_id')

  // 1) DB 상태 확인 (last_login_status, reviews 수집 결과)
  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('last_login_status, last_login_at, platform_store_name, platform_store_id')
    .eq('user_id', auth.userId)
    .eq('platform', 'coupangeats')
    .maybeSingle()

  // 리뷰 수집 결과 카운트
  const { count: reviewCount } = await svc
    .from('platform_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .eq('platform', 'coupangeats')

  // 2) BullMQ Job 상태 확인
  let jobState: string | null = null
  let jobProgress: number | null = null
  let jobFailedReason: string | null = null
  if (jobId) {
    try {
      const q = getPlatformQueue()
      const job = await q.getJob(jobId)
      if (job) {
        jobState = await job.getState()
        const prog = job.progress
        if (typeof prog === 'number') jobProgress = prog
        jobFailedReason = job.failedReason || null
      }
    } catch (e) {
      console.warn('[coupang-status] queue lookup failed:', e)
    }
  }

  // 3) 종합 상태 판정
  let status: Status = 'unknown'
  let message = ''

  // DB 상태 우선 (워커가 끝까지 처리한 경우)
  const lastStatus = String(cred?.last_login_status || '')
  if (lastStatus === 'ok' || lastStatus.startsWith('reviews_synced')) {
    status = 'completed'
    message = `리뷰 ${reviewCount || 0}개 수집 완료`
  } else if (lastStatus.startsWith('credentials_invalid')) {
    status = 'failed'
    message = '아이디/비밀번호가 맞지 않아요. 다시 입력해주세요.'
  } else if (lastStatus.startsWith('account_locked')) {
    status = 'failed'
    message = '계정이 잠겼어요. 쿠팡이츠 사장님에서 직접 로그인해 잠금을 해제해주세요.'
  } else if (lastStatus.startsWith('captcha')) {
    status = 'processing'
    message = '봇 검증 통과 중이에요. 조금만 더 기다려주세요.'
  } else if (jobState === 'completed') {
    status = 'completed'
    message = `리뷰 ${reviewCount || 0}개 수집 완료`
  } else if (jobState === 'failed') {
    status = 'failed'
    message = jobFailedReason || '처리 중 오류가 발생했어요. 다시 시도해주세요.'
  } else if (jobState === 'active') {
    status = 'processing'
    message = '리뷰 수집 중이에요. 잠시만 기다려주세요.'
  } else if (jobState === 'waiting' || jobState === 'delayed') {
    status = 'queued'
    message = '대기열에 등록됐어요. 곧 처리가 시작돼요.'
  } else {
    // jobState 없음 + DB 상태 없음 = 신청 직후
    status = 'queued'
    message = '연동 신청을 받았어요.'
  }

  return NextResponse.json({
    ok: true,
    status,
    message,
    review_count: reviewCount || 0,
    last_login_status: cred?.last_login_status || null,
    last_login_at: cred?.last_login_at || null,
    platform_store_name: cred?.platform_store_name || null,
    platform_store_id: cred?.platform_store_id || null,
    job_state: jobState,
    job_progress: jobProgress,
    job_failed_reason: jobFailedReason,
  })
}
