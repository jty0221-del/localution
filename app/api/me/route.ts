import { NextRequest, NextResponse } from 'next/server'
import { signCookie, verifyCookie } from '@/app/lib/cookieSigning'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 30일 = 2,592,000초
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60

export async function GET(req: NextRequest) {
 const userCookie = req.cookies.get('localution_user')?.value
 const sessionCookie = req.cookies.get('localution_session')?.value

 // 둘 다 없으면 진짜 로그아웃 상태 → 401
 if (!userCookie && !sessionCookie) {
 return NextResponse.json({ user: null }, { status: 401 })
 }

 // user 쿠키 없지만 session 있으면 (시그너처 손상 등) → 401 + reset 안내
 if (!userCookie && sessionCookie) {
 return NextResponse.json({ user: null, hint: 'session_only' }, { status: 401 })
 }

 // 1차: signed cookie verify
 const verified = verifyCookie(userCookie!)
 if (verified) {
 // Sliding session: 정상 검증되면 쿠키 만료 갱신 (방문할 때마다 +30일)
 //   → 매월 1번 이상 방문 사장님은 사실상 영구 로그인
 const res = NextResponse.json({ user: verified })
 try {
 const renewed = signCookie({
 id: verified.id,
 email: verified.email,
 name: verified.name,
 provider: verified.provider,
 })
 res.cookies.set('localution_user', renewed, {
 httpOnly: true, secure: true, sameSite: 'lax',
 maxAge: COOKIE_MAX_AGE, path: '/',
 })
 if (sessionCookie) {
 res.cookies.set('localution_session', sessionCookie, {
 httpOnly: true, secure: true, sameSite: 'lax',
 maxAge: COOKIE_MAX_AGE, path: '/',
 })
 }
 } catch (_) { /* secret missing 등 — 갱신만 실패, 로그인 상태는 유지 */ }
 return res
 }

 // 2차: legacy 평문 JSON (예전 시스템 호환)
 try {
 const user = JSON.parse(userCookie!)
 return NextResponse.json({ user })
 } catch {
 // 3차: 시그너처 검증은 실패했지만 session 쿠키는 있음 → graceful 401 (재로그인 유도)
 return NextResponse.json({ user: null, hint: 'verify_failed' }, { status: 401 })
 }
}

export async function DELETE(_req: NextRequest) {
 const res = NextResponse.json({ ok: true })
 res.cookies.delete('localution_session')
 res.cookies.delete('localution_user')
 return res
}
