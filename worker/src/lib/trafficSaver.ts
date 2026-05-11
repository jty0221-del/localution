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

// 요기요 사장님 페이지 로드 시 자동 호출되는 부수 API 차단
// (review API 만 살리고 announcements/banners/faqs/onboarding 등 모두 차단)
const YOGIYO_BLOCK_PATTERNS = [
  '/announcements/', '/banners/', '/faqs/', '/self-onboarding/',
  '/companies/', '/marketing/', '/notifications/', '/sales-summary/',
  '/credit-cards/', '/popular-menus/', '/restaurant-tutorial/',
  '/help-center/', '/customer-service/', '/payment-info/',
  '/announcements-history/', '/banner-history/',
]

// 배민 사장님 페이지 로드 시 자동 호출되는 부수 API 차단
const BAEMIN_BLOCK_PATTERNS = [
  '/notifications/', '/announcements/', '/banners/', '/onboarding/',
  '/marketing/', '/customer-service/', '/faqs/',
]

export function shouldBlockYogiyoRequest(url: string): boolean {
  if (!url.includes('yogiyo.co.kr') && !url.includes('ceo-api.yogiyo')) return false
  // 리뷰 관련 endpoint 는 통과
  if (/\/reviews?\//.test(url) || /\/comment/.test(url) || /\/review/.test(url)) return false
  return YOGIYO_BLOCK_PATTERNS.some(p => url.includes(p))
}

export function shouldBlockBaeminRequest(url: string): boolean {
  if (!url.includes('baemin.com') && !url.includes('biz-member')) return false
  if (/\/reviews?/.test(url) || /\/comment/.test(url) || /\/shops?\//.test(url)) return false
  return BAEMIN_BLOCK_PATTERNS.some(p => url.includes(p))
}

const BLOCK_RESOURCE_TYPES = new Set(['image', 'font', 'media', 'stylesheet'])

export async function applyTrafficSaver(
  context: BrowserContext,
  options: { platform?: string } = {}
): Promise<void> {
  const platform = options.platform || ''
  try {
    await context.route('**/*', (route) => {
      const url = route.request().url()
      const resourceType = route.request().resourceType()
      if (BLOCK_RESOURCE_TYPES.has(resourceType)) return route.abort()
      if (BLOCK_DOMAINS.some(d => url.includes(d))) return route.abort()
      // 플랫폼별 부수 API 차단 (리뷰 외 API 호출 stop)
      if (platform === 'yogiyo' && shouldBlockYogiyoRequest(url)) return route.abort()
      if (platform === 'baemin' && shouldBlockBaeminRequest(url)) return route.abort()
      return route.continue()
    })
  } catch (_) {
    // route 등록 실패 시 계속 진행
  }
}
