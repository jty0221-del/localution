// worker/src/jobs/index.ts
// ============================================================
// 잡 라우터 — platform + action 조합으로 어댑터 호출
// ============================================================
import type { Logger } from 'pino'

export type Platform = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
export type Action =
  | 'fetch_reviews'          // 리뷰 수집
  | 'post_reply'             // 답글 등록
  | 'fetch_rank'             // 순위 조회
  | 'health_check'           // 단순 ping (연결/로그인 상태 확인)

export interface PlatformJobData {
  platform: Platform
  action: Action
  userId: string             // Supabase auth.uid
  storeId: string            // stores.store_id
  payload?: Record<string, unknown>
}

export interface JobResult {
  status: 'ok' | 'skipped' | 'failed'
  message?: string
  data?: unknown
}

// ─────────────────────────────────────────────
// 실행 라우터 (어댑터는 23차-4~5 에서 구현)
// 현재는 스텁 — 환경 검증 + 스킵 반환
// ─────────────────────────────────────────────
export async function runJob(data: PlatformJobData, log: Logger): Promise<JobResult> {
  const { platform, action } = data

  switch (platform) {
    case 'naver_place':
      return stubRun('NaverPlaceAdapter', action, log)
    case 'baemin':
      return stubRun('BaeminAdapter', action, log)
    case 'yogiyo':
      return stubRun('YogiyoAdapter', action, log)
    case 'coupangeats':
      return stubRun('CoupangEatsAdapter', action, log)
    case 'kakao_map':
      return stubRun('KakaoMapAdapter', action, log)
    default:
      return { status: 'failed', message: `unknown platform: ${platform}` }
  }
}

async function stubRun(adapterName: string, action: Action, log: Logger): Promise<JobResult> {
  log.warn({ adapter: adapterName, action }, 'adapter not implemented yet (23차-4~5 대기)')
  return {
    status: 'skipped',
    message: `${adapterName} not implemented yet — queued for 23차-4~5`,
  }
}
