// worker/src/lib/trafficSaver.ts
// ============================================================
// 트래픽 절감 헬퍼 — Playwright context 에 리소스/분석 도메인 차단 적용
//   · 이미지/폰트/미디어/CSS 차단 (data fetch 와 무관)
//   · 분석/광고/추적 도메인 차단
//   · iproyal proxy 트래픽 ~40~60% 절감 효과
// ============================================================
import type { BrowserContext } from 'playwright'

const BLOCK_DOMAINS = [
  'google-analytics.com', 'analytics.google.com', 'googletagmanager.com', 'gstatic.com/recaptcha',
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'pagead2.googlesyndication.com',
  'facebook.net', 'connect.facebook.net', 'pixel.facebook.com', 'fbcdn.net',
  'hotjar.com', 'static.hotjar.com', 'segment.io', 'mixpanel.com', 'cdn.mxpnl.com',
  'amplitude.com', 'amplitude.us', 'api.amplitude.com',
  'newrelic.com', 'datadog.com', 'sentry.io', 'bugsnag.com',
  'criteo.com', 'taboola.com', 'outbrain.com',
  'cc.naver.com', 'ad.naver.com', 'siteadvisor.com',
  't1.kakaocdn.net/track', 'kt-tracker',
  'beacon-v2.helpscout.net', 'cdn.heapanalytics.com',
  'fpcdn.io', 'fingerprintjs.com',
  'sentry-cdn.com', 'cdn.bugsnag.com',
]

const BLOCK_RESOURCE_TYPES = new Set(['image', 'font', 'media', 'stylesheet'])

export async function applyTrafficSaver(context: BrowserContext): Promise<void> {
  try {
    await context.route('**/*', (route) => {
      const url = route.request().url()
      const resourceType = route.request().resourceType()
      if (BLOCK_RESOURCE_TYPES.has(resourceType)) return route.abort()
      if (BLOCK_DOMAINS.some(d => url.includes(d))) return route.abort()
      return route.continue()
    })
  } catch (_) {
    // route 등록 실패 시 계속 진행
  }
}
