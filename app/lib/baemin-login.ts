// app/lib/baemin-login.ts
// 배민 RSA 로그인 (한국 프록시 경유)
// save-login 과 collect-reviews 에서 공유
// v2: proxy-manager (IP Royal > Webshare > Static) 사용
import { createPublicKey, publicEncrypt, constants } from 'crypto'
import { proxyFetchWithManager } from '@/app/lib/proxy-manager'
import { extractCookies } from '@/app/lib/proxy-fetch'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const BIZ_BASE = 'https://biz-member.baemin.com'

function rsaEncryptHex(modHex: string, expHex: string, text: string): string {
  const n = Buffer.from(modHex, 'hex').toString('base64url')
  const e = Buffer.from(expHex, 'hex').toString('base64url')
  const key = createPublicKey({ key: { kty: 'RSA', n, e }, format: 'jwk' })
  return publicEncrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(text)).toString('hex')
}

export async function baeminProxyLogin(id: string, pw: string): Promise<string> {
  const common: Record<string, string> = {
    'User-Agent': UA,
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
  }

  // Step 0: 로그인 페이지 방문 -> dsid 초기 쿠키
  const preRes = await proxyFetchWithManager(BIZ_BASE + '/login', {
    headers: { ...common, Accept: 'text/html,*/*;q=0.8' },
    redirect: 'follow',
  } as RequestInit)
  const preCookies = extractCookies(preRes)

  // Step 1: RSA 공개키 획득
  const initRes = await proxyFetchWithManager(BIZ_BASE + '/v1/login/init?__ts=' + Date.now(), {
    headers: {
      ...common,
      Accept: 'application/json, text/plain, */*',
      Origin: BIZ_BASE,
      Referer: BIZ_BASE + '/login',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      ...(preCookies.length > 0 ? { Cookie: preCookies.join('; ') } : {}),
    },
  } as RequestInit)

  if (!initRes.ok) {
    const body = await initRes.text().catch(() => '')
    throw new Error('배민 로그인 초기화 실패 (' + initRes.status + ')' + (body ? ': ' + body.slice(0, 120) : ''))
  }

  const initCookies = [...preCookies, ...extractCookies(initRes)]
  const initData = await initRes.json() as any
  if (initData.status !== 'SUCCESS') throw new Error('초기화 오류: ' + initData.status)

  const value1 = rsaEncryptHex(initData.data.tag, initData.data.value, id.trim())
  const value2 = rsaEncryptHex(initData.data.tag, initData.data.value, pw.trim())
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const pwDecoy = Array.from({ length: 60 }, () => chars[Math.floor(Math.random() * 36)]).join('')

  // Step 2: 로그인
  const loginRes = await proxyFetchWithManager(BIZ_BASE + '/v1/login?__ts=' + Date.now(), {
    method: 'POST',
    headers: {
      ...common,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      Origin: BIZ_BASE,
      Referer: BIZ_BASE + '/login',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      ...(initCookies.length > 0 ? { Cookie: initCookies.join('; ') } : {}),
    },
    body: JSON.stringify({ id: id.trim(), pw: pwDecoy, value1, value2, token: '', autoLogin: false }),
  } as RequestInit)

  const loginData = await loginRes.json().catch(() => ({})) as any
  if (loginData.status !== 'SUCCESS') {
    if (loginData.status === 'FAIL_WRONG_AUTHENTICATION') {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
    throw new Error(loginData.message || loginData.status || '로그인 실패')
  }

  // 모든 쿠키 병합 (중복 제거)
  const allCookies = [...initCookies, ...extractCookies(loginRes)]
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const c of allCookies) {
    const key = c.split('=')[0]
    if (!seen.has(key)) { seen.add(key); deduped.push(c) }
  }
  if (deduped.length === 0) throw new Error('로그인 쿠키를 받지 못했어요.')

  // Step 3: self.baemin.com 방문 -> self-api 용 추가 쿠키
  try {
    const selfRes = await proxyFetchWithManager('https://self.baemin.com', {
      headers: { ...common, Accept: 'text/html,*/*;q=0.8', Cookie: deduped.join('; ') },
      redirect: 'follow',
    } as RequestInit)
    for (const c of extractCookies(selfRes)) {
      const key = c.split('=')[0]
      if (!deduped.some(x => x.split('=')[0] === key)) deduped.push(c)
    }
  } catch { /* self.baemin.com 실패해도 로그인 쿠키로 시도 */ }

  return deduped.join('; ')
}
