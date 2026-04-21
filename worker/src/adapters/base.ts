// worker/src/adapters/base.ts
// ============================================================
// 플랫폼 어댑터 공통 인터페이스
//   · 23차-4 NaverPlaceAdapter 부터 실제 구현
//   · Playwright Browser 주입 + 세션 쿠키 복호화 패턴
// ============================================================
import type { Browser, BrowserContext } from 'playwright'
import type { Logger } from 'pino'
import type { Action, JobResult } from '../jobs'

export interface AdapterContext {
  browser: Browser
  log: Logger
  userId: string
  storeId: string
  sessionBlob?: string      // 암호화된 세션 (platform_sessions.encrypted_session)
}

export interface PlatformAdapter {
  name: string
  /** 지원하는 액션 목록 */
  supports(action: Action): boolean
  /** 액션 실행 */
  run(ctx: AdapterContext, action: Action, payload?: Record<string, unknown>): Promise<JobResult>
  /** 세션 유효성 확인 (로그인 유지 여부) */
  healthCheck(ctx: AdapterContext): Promise<boolean>
}

// ─────────────────────────────────────────────
// 세션 컨텍스트 헬퍼 — 암호화된 blob 에서 BrowserContext 생성
// 23차-4 구현 시 KEK 복호화 + storageState 주입
// ─────────────────────────────────────────────
export async function createContext(
  browser: Browser,
  sessionBlob?: string
): Promise<BrowserContext> {
  if (!sessionBlob) {
    return browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    })
  }
  // TODO(23차-4): KEK 복호화 + storageState 주입
  // const state = JSON.parse(decryptAesGcm(sessionBlob, KEK))
  // return browser.newContext({ storageState: state, ... })
  return browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })
}
