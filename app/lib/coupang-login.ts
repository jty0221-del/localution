// app/lib/coupang-login.ts
// ============================================================
// 쿠팡이츠 사장님 로그인 (한국 proxy raw HTTP)
//   · 배민과 동일 패턴: Vercel 서버에서 직접 HTTP request → 응답 cookies 받음
//   · Playwright 안 씀 → 헤드리스 봇 탐지 회피
//   · 단, Akamai _abck JS 챌린지 통과 못 할 가능성 — 다중 endpoint 시도
// ============================================================
import { proxyFetch, extractCookies } from '@/app/lib/proxy-fetch'

const STORE_BASE = 'https://store.coupangeats.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
}

export type CoupangCookie = {
  name: string
  value: string
  domain: string
  path: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
}

export type CoupangLoginResult =
  | {
      ok: true
      cookies: CoupangCookie[]
      cookieStr: string
      method: string
      whoami?: any
    }
  | {
      ok: false
      error: string
      tried: Array<{ method: string; status: number; body?: string }>
    }

function cookieStrToObjects(cookieStr: string[]): CoupangCookie[] {
  return cookieStr.map((str) => {
    const [nameVal] = str.split(';')
    const eqIdx = nameVal.indexOf('=')
    if (eqIdx < 0) return null as any
    return {
      name: nameVal.slice(0, eqIdx).trim(),
      value: nameVal.slice(eqIdx + 1).trim(),
      domain: '.coupangeats.com',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax' as const,
    }
  }).filter(Boolean)
}

function dedupeCookies(cookieList: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  // 뒤에서부터 순회 = 최신 cookie 우선 (배민 패턴과 동일)
  for (let i = cookieList.length - 1; i >= 0; i--) {
    const c = cookieList[i]
    const key = c.split('=')[0]
    if (!seen.has(key)) {
      seen.add(key)
      result.unshift(c)
    }
  }
  return result
}

function hasAuthToken(cookies: string[]): boolean {
  return cookies.some((c) => {
    const k = c.split('=')[0].toLowerCase()
    return (
      k === 'unify-token' ||
      k === 'ce_session_id' ||
      k.startsWith('at-v01-') ||
      k === 'merchantsessionid' ||
      k === 'msessionid' ||
      k === 'access_token' ||
      k === 'accesstoken'
    )
  })
}

// ── 로그인 페이지 GET → 초기 Akamai cookies 수집 + form 정보 확인 ──
async function preflightLogin(): Promise<{
  cookies: string[]
  status: number
  bodyHint: string
}> {
  try {
    const res = await proxyFetch(STORE_BASE + '/merchant/login', {
      headers: {
        ...COMMON_HEADERS,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    } as RequestInit)
    const cookies = extractCookies(res)
    const body = await res.text().catch(() => '')
    return { cookies, status: res.status, bodyHint: body.slice(0, 300) }
  } catch (e: any) {
    return { cookies: [], status: 0, bodyHint: 'preflight error: ' + (e?.message || '') }
  }
}

// ── 시도 1: web form POST ──
async function tryWebFormLogin(
  id: string,
  password: string,
  preCookies: string[]
): Promise<{ ok: boolean; cookies: string[]; status: number; body: string }> {
  const formData = new URLSearchParams()
  formData.append('loginId', id.trim())
  formData.append('password', password.trim())
  formData.append('rememberMe', 'true')

  try {
    const res = await proxyFetch(STORE_BASE + '/merchant/login', {
      method: 'POST',
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Origin: STORE_BASE,
        Referer: STORE_BASE + '/merchant/login',
        ...(preCookies.length > 0 ? { Cookie: preCookies.join('; ') } : {}),
      },
      body: formData.toString(),
      redirect: 'manual',
    } as RequestInit)
    const newCookies = extractCookies(res)
    const all = dedupeCookies([...preCookies, ...newCookies])
    const body = await res.text().catch(() => '')
    return { ok: hasAuthToken(all), cookies: all, status: res.status, body: body.slice(0, 300) }
  } catch (e: any) {
    return { ok: false, cookies: preCookies, status: 0, body: 'form error: ' + (e?.message || '') }
  }
}

// ── 시도 2: JSON API endpoint 후보 ──
const JSON_ENDPOINTS = [
  STORE_BASE + '/api/v1/merchant/login',
  STORE_BASE + '/api/v1/merchant/auth/login',
  STORE_BASE + '/api/v2/merchant/login',
  STORE_BASE + '/api/v1/auth/login',
]

async function tryJsonLogin(
  endpoint: string,
  id: string,
  password: string,
  preCookies: string[]
): Promise<{ ok: boolean; cookies: string[]; status: number; body: string }> {
  const candidateBodies = [
    { loginId: id.trim(), password: password.trim() },
    { username: id.trim(), password: password.trim() },
    { id: id.trim(), pw: password.trim() },
  ]
  for (const bodyObj of candidateBodies) {
    try {
      const res = await proxyFetch(endpoint, {
        method: 'POST',
        headers: {
          ...COMMON_HEADERS,
          'Content-Type': 'application/json',
          Accept: 'application/json, */*',
          Origin: STORE_BASE,
          Referer: STORE_BASE + '/merchant/login',
          'X-Requested-With': 'XMLHttpRequest',
          ...(preCookies.length > 0 ? { Cookie: preCookies.join('; ') } : {}),
        },
        body: JSON.stringify(bodyObj),
        redirect: 'manual',
      } as RequestInit)
      const newCookies = extractCookies(res)
      const all = dedupeCookies([...preCookies, ...newCookies])
      const body = await res.text().catch(() => '')
      // 성공 판정: 응답이 JSON 이고 특정 필드 있거나 cookie 에 토큰 있음
      const looksOk = res.ok && (hasAuthToken(all) || /access[_-]?token|merchantId|unify/i.test(body))
      if (looksOk) return { ok: true, cookies: all, status: res.status, body: body.slice(0, 300) }
    } catch (_) { /* 다음 body 시도 */ }
  }
  return { ok: false, cookies: preCookies, status: 0, body: 'all body shapes failed' }
}

// ── 저장된 쿠키로 직접 whoami 조회 (외부에서 호출) ──
//   · admin 진단 도구가 사장님 비번 없이 매장 목록 확인할 때 사용
//   · 쿠키 만료 시 null 반환
export async function whoamiWithCookies(cookies: { name: string; value: string }[]): Promise<any> {
  try {
    const cookieStr = cookies.map(c => c.name + '=' + c.value).join('; ')
    const res = await proxyFetch(STORE_BASE + '/api/v1/merchant/whoami', {
      headers: {
        ...COMMON_HEADERS,
        Accept: 'application/json',
        Cookie: cookieStr,
        'X-Requested-With': 'XMLHttpRequest',
      },
    } as RequestInit)
    if (!res.ok) return { ok: false, status: res.status, error: 'http ' + res.status }
    const body = await res.json().catch(() => null)
    return { ok: true, status: res.status, body }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown' }
  }
}

// ── 시도 3: whoami 검증 ──
async function verifyWithWhoami(cookies: string[]): Promise<any> {
  try {
    const res = await proxyFetch(STORE_BASE + '/api/v1/merchant/whoami', {
      headers: {
        ...COMMON_HEADERS,
        Accept: 'application/json',
        Cookie: cookies.join('; '),
        'X-Requested-With': 'XMLHttpRequest',
      },
    } as RequestInit)
    if (!res.ok) return null
    return await res.json().catch(() => null)
  } catch { return null }
}

// ── 메인 ──
export async function coupangProxyLogin(
  id: string,
  password: string
): Promise<CoupangLoginResult> {
  const tried: Array<{ method: string; status: number; body?: string }> = []

  // Step 1: preflight (Akamai 쿠키 수집)
  const pre = await preflightLogin()
  tried.push({ method: 'preflight', status: pre.status, body: pre.bodyHint.slice(0, 100) })

  if (pre.cookies.length === 0 && pre.status !== 200 && pre.status !== 0) {
    return {
      ok: false,
      error: '로그인 페이지 진입 실패 (Akamai 차단 가능성). 사장님 IP에서 직접 접속되는지 확인 필요.',
      tried,
    }
  }

  // Step 2: web form login 시도
  const formRes = await tryWebFormLogin(id, password, pre.cookies)
  tried.push({ method: 'web_form', status: formRes.status, body: formRes.body.slice(0, 100) })

  if (formRes.ok) {
    const whoami = await verifyWithWhoami(formRes.cookies)
    if (whoami?.data?.merchantId || whoami?.data?.accountId || whoami?.data?.responsibleStoreId) {
      return {
        ok: true,
        cookies: cookieStrToObjects(formRes.cookies),
        cookieStr: formRes.cookies.join('; '),
        method: 'web_form',
        whoami: whoami.data,
      }
    }
    tried.push({ method: 'whoami_after_form', status: 0, body: 'whoami fail' })
  }

  // Step 3: JSON endpoint 후보 시도
  for (const ep of JSON_ENDPOINTS) {
    const res = await tryJsonLogin(ep, id, password, pre.cookies)
    tried.push({ method: 'json:' + ep.replace(STORE_BASE, ''), status: res.status, body: res.body.slice(0, 100) })
    if (res.ok) {
      const whoami = await verifyWithWhoami(res.cookies)
      if (whoami?.data?.merchantId || whoami?.data?.accountId || whoami?.data?.responsibleStoreId) {
        return {
          ok: true,
          cookies: cookieStrToObjects(res.cookies),
          cookieStr: res.cookies.join('; '),
          method: 'json:' + ep.replace(STORE_BASE, ''),
          whoami: whoami.data,
        }
      }
    }
  }

  return {
    ok: false,
    error: '쿠팡이츠 직접 로그인 모두 실패 (Akamai _abck JS 챌린지가 raw HTTP 차단 가능성)',
    tried,
  }
}
