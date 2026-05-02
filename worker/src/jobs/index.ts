// worker/src/jobs/index.ts
// ============================================================
// 32차-3 · 잡 라우터 — platform + action 조합으로 어댑터 호출
//   · 23차 stub 체계 제거 → 실제 어댑터 인스턴스로 라우팅
//   · Playwright Browser 는 엔트리(index.ts) 에서 싱글톤 주입
// ============================================================
import type { Browser } from 'playwright'
import type { Logger } from 'pino'
import { runBaemin } from '../adapters/baemin'
import { runYogiyo } from '../adapters/yogiyo'
import { runCoupangEats } from '../adapters/coupangeats'
import { runNaver } from '../adapters/naver'

export type Platform = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
export type Action =
  | 'fetch_reviews'
  | 'post_reply'
  | 'fetch_rank'
  | 'health_check'
  | 'fetch_menu'

export interface PlatformJobData {
  platform: Platform
  action: Action
  userId: string
  storeId: string
  payload?: Record<string, unknown>
}

export interface JobResult {
  status: 'ok' | 'skipped' | 'failed'
  message?: string
  data?: unknown
  debug?: unknown
}

export async function runJob(
  data: PlatformJobData,
  log: Logger,
  browser: Browser,
): Promise<JobResult> {
  const { platform, action, userId, storeId, payload } = data
  const opts = { userId, storeId, browser, log }

  switch (platform) {
    case 'baemin':
      return runBaemin(opts, action, payload)
    case 'yogiyo':
      return runYogiyo(opts, action, payload)
    case 'coupangeats':
      return runCoupangEats(opts, action, payload)
    case 'naver_place':
      // 41차-10: post_reply 는 NaverAdapter 가 SmartPlace Playwright 로 처리
      // fetch_reviews 는 Vercel /api/place/reviews/fetch 로 수집 (공개 GraphQL)
      return runNaver(opts, action, payload)
    case 'kakao_map':
      // 카카오맵은 Vercel 쪽 /api/place/kakao/collect 공개 panel3 으로 수집.
      log.warn({ platform, action }, 'kakao_map handled by Vercel panel3 collector')
      return { status: 'skipped', message: 'kakao_map: use /api/place/kakao/collect on Vercel' }
    default:
      return { status: 'failed', message: `unknown platform: ${platform}` }
  }
}
