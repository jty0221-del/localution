/**
 * app/lib/telemetry.ts — 에러·이벤트 리포팅 단일 진입점
 *
 * 현재: console.* 로만 수집 (외부 계정 미연동 상태)
 * 추후 Sentry 또는 PostHog 도입 시 이 파일 한 곳만 수정하면
 * error.tsx / global-error.tsx / _app 모두 자동 전파됨.
 *
 * ENV (추후):
 *   NEXT_PUBLIC_SENTRY_DSN — 설정되면 fetch 로 Sentry ingest 호출
 *   NEXT_PUBLIC_APP_ENV    — 'production' 이외는 로컬 콘솔만
 */

export type ReportContext = {
  route?: string
  userId?: string
  storeId?: string
  digest?: string
  tags?: Record<string, string>
  level?: 'fatal' | 'error' | 'warning' | 'info'
}

/**
 * 에러 리포팅 — 실패해도 silent (리포팅 실패가 앱 전파되지 않도록)
 */
export function reportError(error: unknown, ctx: ReportContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const payload = {
    message: err.message,
    stack: err.stack,
    name: err.name,
    ctx,
    ts: new Date().toISOString(),
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    href: typeof window !== 'undefined' ? window.location.href : '',
  }

  // 개발 편의: 항상 콘솔에 출력
  // eslint-disable-next-line no-console
  console.error('[localution:error]', payload)

  // 프로덕션 + DSN 설정 시 외부 전송 (현재 OFF)
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!dsn || typeof window === 'undefined') return
    // 실제 연동 시 Sentry SDK로 교체 — 현재는 placeholder
    // fetch(dsn, { method: 'POST', keepalive: true, body: JSON.stringify(payload) }).catch(() => {})
  } catch (_) {
    /* silent */
  }
}

/**
 * 중요 이벤트 리포팅 (결제 성공, 해지, 큰 전환 등)
 */
export function reportEvent(name: string, meta: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log('[localution:event]', name, meta)
}
