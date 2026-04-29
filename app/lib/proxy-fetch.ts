// app/lib/proxy-fetch.ts
// 한국 프록시(Webshare/IP Royal)를 통한 fetch 래퍼
// PROXY_HOST / PROXY_PORT / PROXY_USER / PROXY_PASS 환경변수 사용
// undici(Next.js 번들) ProxyAgent 활용 — 추가 패키지 설치 불필요

export async function proxyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const host = process.env.PROXY_HOST
  if (!host) return fetch(url, init)

  const port  = process.env.PROXY_PORT || '80'
  const user  = process.env.PROXY_USER || ''
  const pass  = process.env.PROXY_PASS || ''
  const proto = process.env.PROXY_PROTOCOL || 'http'
  const auth  = user && pass
    ? encodeURIComponent(user) + ':' + encodeURIComponent(pass) + '@'
    : ''
  const proxyUrl = proto + '://' + auth + host + ':' + port

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const undici = require('undici')
    const dispatcher = new undici.ProxyAgent(proxyUrl)
    return await undici.fetch(url, { ...init, dispatcher }) as unknown as Response
  } catch {
    // undici 미지원 환경 → 직접 fetch
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
