// app/lib/proxy-manager.ts
// ============================================================
// 한국 프록시 통합 관리
//
// 우선순위 (높은 순):
//   1. IPROYAL_USER/PASS  → IP Royal 주거형 프록시 (최고 신뢰도)
//   2. WEBSHARE_API_KEY   → Webshare API 자동 조회 (무료 티어 가능)
//   3. PROXY_HOST         → 정적 설정 (직접 입력)
//
// IP Royal 설정:
//   IPROYAL_USER = 이메일 (IP Royal 계정)
//   IPROYAL_PASS = 비밀번호 (한국 타겟팅: 비밀번호_country-KR 형식)
//   IPROYAL_HOST = geo.iproyal.com (기본값)
//   IPROYAL_PORT = 12321 (기본값)
//
// Webshare 설정 (무료 가입, 카드 불필요):
//   WEBSHARE_API_KEY = 발급받은 API 키
//
// 2Captcha:
//   TWOCAPTCHA_API_KEY = 발급받은 API 키 (캡차 자동 해결)
// ============================================================

export interface ProxyConfig {
  host:     string
  port:     string
  user:     string
  pass:     string
  protocol: string
  source:   'iproyal' | 'webshare' | 'static'
}

let _webshareCache: ProxyConfig[] | null = null
let _webshareCacheAt = 0
const CACHE_TTL = 5 * 60 * 1000
let _rotateIdx = 0

// ── 1. IP Royal 설정 읽기 ────────────────────────────────────
function getIPRoyalProxy(): ProxyConfig | null {
  const user = (process.env.IPROYAL_USER || '').trim()
  const pass = (process.env.IPROYAL_PASS || '').trim()
  if (!user || !pass || user.includes('@example') || pass.length < 4) return null

  const host = (process.env.IPROYAL_HOST || 'geo.iproyal.com').trim()
  const port = (process.env.IPROYAL_PORT || '12321').trim()

  // 한국 타겟팅 자동 추가 (이미 포함 안 된 경우)
  const passWithKR = pass.includes('country') ? pass : pass + '_country-KR'

  return { host, port, user, pass: passWithKR, protocol: 'http', source: 'iproyal' }
}

// ── 2. Webshare API ──────────────────────────────────────────
async function getWebshareProxy(): Promise<ProxyConfig | null> {
  const key = (process.env.WEBSHARE_API_KEY || '').trim()
  if (!key || key.length < 10 || key.includes('키')) return null

  const now = Date.now()
  if (_webshareCache && _webshareCache.length > 0 && now - _webshareCacheAt < CACHE_TTL) {
    return _webshareCache[_rotateIdx % _webshareCache.length]
  }

  try {
    const res = await fetch(
      'https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&country_code__in=KR&page=1&page_size=5&valid=true',
      { headers: { Authorization: 'Token ' + key }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json() as any
    const list: ProxyConfig[] = (data.results || []).map((p: any) => ({
      host:     String(p.proxy_address),
      port:     String(p.port),
      user:     String(p.username || ''),
      pass:     String(p.password || ''),
      protocol: 'http',
      source:   'webshare' as const,
    })).filter((p: ProxyConfig) => p.host)

    if (list.length > 0) {
      _webshareCache = list
      _webshareCacheAt = now
      console.log('[proxy] Webshare:', list.length, 'KR proxies loaded')
      return list[_rotateIdx % list.length]
    }
  } catch (e: any) {
    console.warn('[proxy] Webshare fetch failed:', e?.message)
  }
  return null
}

// ── 3. 정적 PROXY_HOST ──────────────────────────────────────
function getStaticProxy(): ProxyConfig | null {
  const host = (process.env.PROXY_HOST || '').trim()
  if (!host || host.includes('제공값') || host.includes('(') || host.length < 4) return null
  const user = (process.env.PROXY_USER || '').replace('유저명', '').trim()
  const pass = (process.env.PROXY_PASS || '').replace('비밀번호', '').trim()
  return {
    host, port: (process.env.PROXY_PORT || '80').trim(),
    user, pass, protocol: (process.env.PROXY_PROTOCOL || 'http').trim(),
    source: 'static',
  }
}

// ── 메인: 프록시 획득 ────────────────────────────────────────
export async function getProxy(): Promise<ProxyConfig | null> {
  return getIPRoyalProxy() || await getWebshareProxy() || getStaticProxy()
}

// ── 프록시 로테이션 ──────────────────────────────────────────
export function rotateProxy() { _rotateIdx++ }

// ── 프록시 URL 조합 ──────────────────────────────────────────
export function buildProxyUrl(cfg: ProxyConfig): string {
  const auth = cfg.user && cfg.pass
    ? encodeURIComponent(cfg.user) + ':' + encodeURIComponent(cfg.pass) + '@'
    : ''
  return cfg.protocol + '://' + auth + cfg.host + ':' + cfg.port
}

// ── IP 확인 테스트 ───────────────────────────────────────────
export async function testProxy(cfg: ProxyConfig): Promise<{ ok: boolean; ip?: string; countryCode?: string; error?: string }> {
  try {
    const undici = require('undici')
    const proxyUrl = buildProxyUrl(cfg)
    const dispatcher = new undici.ProxyAgent(proxyUrl)
    const res = await undici.fetch('http://ip-api.com/json?fields=status,country,countryCode,query', {
      dispatcher, signal: AbortSignal.timeout(10000),
    }) as Response
    const data = await res.json() as any
    return { ok: data.status === 'success', ip: data.query, countryCode: data.countryCode }
  } catch (e: any) {
    return { ok: false, error: e?.message }
  }
}

// ── Vercel에서 직접 fetch 시 프록시 경유 ─────────────────────
export async function proxyFetchWithManager(url: string, init: RequestInit = {}): Promise<Response> {
  const cfg = await getProxy()
  if (!cfg) return fetch(url, init)
  try {
    const undici = require('undici')
    const dispatcher = new undici.ProxyAgent(buildProxyUrl(cfg))
    return await undici.fetch(url, { ...init, dispatcher }) as unknown as Response
  } catch {
    rotateProxy()
    return fetch(url, init)
  }
}
