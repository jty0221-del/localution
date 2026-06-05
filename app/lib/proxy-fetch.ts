// app/lib/proxy-fetch.ts
// 한국 프록시 fetch 래퍼 (v2 — IP Royal / Webshare / Static 지원)
// 우선순위: IPROYAL_USER > PROXY_HOST
// undici ProxyAgent 활용 — 추가 패키지 설치 불필요

function buildProxyUrl(): string | null {
  // 1. IP Royal 주거형 (IPROYAL_*)
  const irUser = (process.env.IPROYAL_USER || '').trim()
  const irPass = (process.env.IPROYAL_PASS || '').trim()
  if (irUser && irPass) {
    const host = (process.env.IPROYAL_HOST || 'geo.iproyal.com').trim()
    const port = (process.env.IPROYAL_PORT || '12321').trim()
    const pass = irPass.toLowerCase().includes('_country-kr') || irPass.toLowerCase().includes('_country-KR')
      ? irPass
      : irPass + '_country-KR'
    return 'http://' + encodeURIComponent(irUser) + ':' + encodeURIComponent(pass) + '@' + host + ':' + port
  }
  // 2. 정적 프록시 (PROXY_HOST)
  const host = (process.env.PROXY_HOST || '').trim()
  if (host) {
    const port  = (process.env.PROXY_PORT || '80').trim()
    const user  = (process.env.PROXY_USER || '').trim()
    const pass  = (process.env.PROXY_PASS || '').trim()
    const proto = (process.env.PROXY_PROTOCOL || 'http').trim()
    const auth  = user && pass
      ? encodeURIComponent(user) + ':' + encodeURIComponent(pass) + '@'
      : ''
    return proto + '://' + auth + host + ':' + port
  }
  return null
}

export async function proxyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const proxyUrl = buildProxyUrl()
  if (!proxyUrl) return fetch(url, init)
  try {
    const undici = require('undici')
    const dispatcher = new undici.ProxyAgent(proxyUrl)
    return await undici.fetch(url, { ...init, dispatcher }) as unknown as Response
  } catch {
    return fetch(url, init)
  }
}

export function extractCookies(res: Pick<Response, 'headers'>): string[] {
  const parts: string[] = []
  const headers = res.headers as any
  if (typeof headers.getSetCookie === 'function') {
    for (const c of headers.getSetCookie()) {
      const p = c.split(';')[0].trim()
      if (p) parts.push(p)
    }
  } else {
    headers.forEach((val: string, name: string) => {
      if (name.toLowerCase() === 'set-cookie') {
        const p = val.split(';')[0].trim()
        if (p && !parts.includes(p)) parts.push(p)
      }
    })
  }
  return parts
}
