// app/lib/proxy-manager.ts
// ============================================================
// 한국 프록시 통합 관리
//
// 우선순위:
//   1. WEBSHARE_API_KEY → Webshare API로 한국 프록시 자동 조회
//   2. PROXY_HOST / PROXY_PORT / PROXY_USER / PROXY_PASS → 정적 설정
//   3. 없으면 null (직접 연결 — geo-block 가능성)
//
// Webshare 무료 계정: https://proxy.webshare.io
//   - 회원가입 후 API 키 발급 (무료, 카드 불필요)
//   - 10개 프록시, 1GB/월 제공
//   - WEBSHARE_API_KEY=토큰값 을 Vercel/Railway env에 설정
// ============================================================

export interface ProxyConfig {
  host: string
  port: string
  user: string
  pass: string
  protocol: string
}

// 서버리스 in-memory 캐시 (함수 인스턴스 내)
let _cachedProxies: ProxyConfig[] | null = null
let _cacheAt = 0
const CACHE_TTL = 5 * 60 * 1000   // 5분
let _lastWorkingIdx = 0

// ── Webshare API로 한국 프록시 목록 조회 ─────────────────────
async function fetchWebshareProxies(): Promise<ProxyConfig[]> {
  const key = (process.env.WEBSHARE_API_KEY || '').trim()
  if (!key || key.includes('API키') || key.includes('키') || key.length < 10) return []

  const now = Date.now()
  if (_cachedProxies && now - _cacheAt < CACHE_TTL) return _cachedProxies

  try {
    const res = await fetch(
      'https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&country_code__in=KR&page=1&page_size=5&valid=true',
      { headers: { Authorization: 'Token ' + key }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) {
      console.warn('[proxy-manager] Webshare API error:', res.status)
      return []
    }
    const data = await res.json() as any
    const list: ProxyConfig[] = (data.results || []).map((p: any) => ({
      host:     String(p.proxy_address || ''),
      port:     String(p.port || 80),
      user:     String(p.username || ''),
      pass:     String(p.password || ''),
      protocol: 'http',
    })).filter((p: ProxyConfig) => p.host && p.port)

    if (list.length > 0) {
      _cachedProxies = list
      _cacheAt = now
      console.log('[proxy-manager] Webshare:', list.length, 'KR proxies')
    }
    return list
  } catch (e: any) {
    console.warn('[proxy-manager] Webshare fetch failed:', e?.message)
    return []
  }
}

// ── 정적 PROXY_HOST 설정 읽기 ────────────────────────────────
function getStaticProxy(): ProxyConfig | null {
  const host = (process.env.PROXY_HOST || '').trim()
  if (!host || host.includes('제공값') || host.includes('webshare') && !host.includes('.io')) return null
  return {
    host,
    port:     (process.env.PROXY_PORT || '80').trim(),
    user:     (process.env.PROXY_USER || '').replace('유저명', '').trim(),
    pass:     (process.env.PROXY_PASS || '').replace('비밀번호', '').trim(),
    protocol: (process.env.PROXY_PROTOCOL || 'http').trim(),
  }
}

// ── 프록시 설정 획득 (메인 API) ──────────────────────────────
export async function getProxy(): Promise<ProxyConfig | null> {
  // 1. Webshare API
  const webshareList = await fetchWebshareProxies()
  if (webshareList.length > 0) {
    const idx = _lastWorkingIdx % webshareList.length
    return webshareList[idx]
  }
  // 2. 정적 설정
  return getStaticProxy()
}

// ── 다음 프록시로 로테이션 ────────────────────────────────────
export function rotateProxy() {
  _lastWorkingIdx++
}

// ── 프록시 URL 조합 ─────────────────────────────────────────
export function buildProxyUrl(cfg: ProxyConfig): string {
  const auth = cfg.user && cfg.pass
    ? encodeURIComponent(cfg.user) + ':' + encodeURIComponent(cfg.pass) + '@'
    : ''
  return cfg.protocol + '://' + auth + cfg.host + ':' + cfg.port
}

// ── 프록시 동작 여부 테스트 ──────────────────────────────────
export async function testProxy(cfg: ProxyConfig): Promise<{ ok: boolean; ip?: string; country?: string; error?: string }> {
  try {
    const undici = require('undici')
    const dispatcher = new undici.ProxyAgent(buildProxyUrl(cfg))
    const res = await undici.fetch('http://ip-api.com/json?fields=status,country,countryCode,query', {
      dispatcher,
      signal: AbortSignal.timeout(10000),
    }) as any
    const data = await res.json() as any
    return {
      ok: data.status === 'success',
      ip: data.query,
      country: data.country,
      countryCode: data.countryCode,
    } as any
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown' }
  }
}

// ── proxyFetch 호환 함수 ─────────────────────────────────────
export async function proxyFetchWithManager(url: string, init: RequestInit = {}): Promise<Response> {
  const cfg = await getProxy()
  if (!cfg) return fetch(url, init)
  try {
    const undici = require('undici')
    const dispatcher = new undici.ProxyAgent(buildProxyUrl(cfg))
    return await undici.fetch(url, { ...init, dispatcher }) as unknown as Response
  } catch (e: any) {
    // 프록시 실패 시 다음 프록시로 로테이션 후 직접 연결 시도
    rotateProxy()
    console.warn('[proxy-manager] proxy failed, fallback direct:', e?.message)
    return fetch(url, init)
  }
}
