// app/api/review-import/coupang/init/route.ts
// ============================================================
// 쿠팡이츠 리뷰 북마클릿 초기화
// POST → token 생성 (HMAC 서명, 30분 유효)
// 사장님이 token을 북마클릿으로 store.coupangeats.com 리뷰 페이지에서 사용
// DB 마이그레이션 불필요 — 토큰 자체가 user_id 담음
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30분

function getSecret(): string {
 return process.env.LOCALUTION_COOKIE_SECRET || 'dev-fallback-secret-change-me'
}

export function signImportToken(userId: string): string {
 const payload = { uid: userId, exp: Date.now() + TOKEN_TTL_MS, kind: 'cpe-rev' }
 const json = JSON.stringify(payload)
 const b64 = Buffer.from(json, 'utf8').toString('base64url')
 const sig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url')
 return `${b64}.${sig}`
}

export function verifyImportToken(token: string): { userId: string } | null {
 try {
 const [b64, sig] = token.split('.')
 if (!b64 || !sig) return null
 const expected = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url')
 // constant-time compare
 if (sig.length !== expected.length) return null
 let mismatch = 0
 for (let i = 0; i < sig.length; i++) {
 mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
 }
 if (mismatch !== 0) return null
 const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
 if (!payload || payload.kind !== 'cpe-rev') return null
 if (typeof payload.uid !== 'string') return null
 if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
 return { userId: payload.uid }
 } catch {
 return null
 }
}

export async function POST() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const token = signImportToken(auth.userId)
 return NextResponse.json({ ok: true, token, expires_in_minutes: 30 })
}
