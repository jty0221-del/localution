import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function clearAll() {
  const cookieStore = await cookies()
  // 모든 인증/캐시 쿠키 명시적 제거 (path=/ 확실하게)
  const keys = ['localution_session', 'localution_user', 'sb-access-token', 'sb-refresh-token']
  for (const k of keys) {
    try { cookieStore.delete(k) } catch {}
    try {
      cookieStore.set(k, '', { expires: new Date(0), path: '/', maxAge: 0 })
    } catch {}
  }
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin
  await clearAll()
  return NextResponse.redirect(new URL('/login', baseUrl))
}

// 클라이언트 fetch('/api/auth/logout', { method: 'POST' }) 호환
export async function POST() {
  await clearAll()
  return NextResponse.json({ ok: true })
}
