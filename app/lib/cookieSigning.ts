// app/lib/cookieSigning.ts
// ============================================================
// localution_user 쿠키 HMAC 서명 (위조 방지)
//   · 환경변수 LOCALUTION_COOKIE_SECRET (Vercel 등록)
//   · 발급 시 sign() — payload + 서명 분리 형식 "<base64payload>.<sig>"
//   · 검증 시 verify() — 서명 일치 + payload JSON.parse
//   · 기존 unsigned cookie 는 검증 실패 → 401 (재로그인 필요)
// ============================================================
import crypto from 'crypto'

export type LocalutionUser = {
  id: string
  email?: string
  name?: string
  provider?: string
  iat?: number  // issued at (unix seconds)
}

const SIG_LENGTH = 43  // base64url SHA-256 (32 bytes → 43 chars without padding)

function getSecret(): string {
  const s = process.env.LOCALUTION_COOKIE_SECRET
  if (!s || s.length < 16) {
    throw new Error('LOCALUTION_COOKIE_SECRET 환경변수 누락 또는 너무 짧음 (16자 이상 필요)')
  }
  return s
}

function hmac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

/**
 * 서명된 cookie 값 생성: "<base64payload>.<sig>"
 */
export function signCookie(user: LocalutionUser): string {
  const secret = getSecret()
  const payload = { ...user, iat: Math.floor(Date.now() / 1000) }
  const json = JSON.stringify(payload)
  const b64 = Buffer.from(json, 'utf8').toString('base64url')
  const sig = hmac(b64, secret)
  return `${b64}.${sig}`
}

/**
 * 서명 검증 + payload 추출. 실패 시 null.
 */
export function verifyCookie(raw: string): LocalutionUser | null {
  try {
    if (!raw) return null
    let value = raw
    // URL 인코딩된 경우 (httpOnly:false 쿠키는 자주 인코딩됨)
    try { value = decodeURIComponent(raw) } catch {}
    const dotIdx = value.lastIndexOf('.')
    if (dotIdx <= 0) return null
    const b64 = value.slice(0, dotIdx)
    const sig = value.slice(dotIdx + 1)
    if (!sig || sig.length !== SIG_LENGTH) return null
    const secret = getSecret()
    const expected = hmac(b64, secret)
    // 타이밍 공격 방지 (constant-time 비교)
    if (sig.length !== expected.length) return null
    let mismatch = 0
    for (let i = 0; i < sig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    if (mismatch !== 0) return null
    const json = Buffer.from(b64, 'base64url').toString('utf8')
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') return null
    return parsed as LocalutionUser
  } catch {
    return null
  }
}
