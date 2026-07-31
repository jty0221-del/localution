import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sessionCookieDeleteOpts } from '@/app/lib/session-cookies'

async function clearAll(requestUrl: string) {
  const cookieStore = await cookies()
  const opts = sessionCookieDeleteOpts(requestUrl)
  // 모든 인증/캐시 쿠키 명시적 제거 (path=/, domain=.localution.co.kr 매칭)
  const keys = ['localution_session', 'localution_user', 'sb-access-token', 'sb-refresh-token']
  for (const k of keys) {
    try { cookieStore.delete(k) } catch {}
    // 도메인 스코프로 심어진 쿠키 삭제 (매칭 실패 시 브라우저가 무시)
    try { cookieStore.set(k, '', opts) } catch {}
    // 이전 버전에서 도메인 없이 심어진 쿠키도 함께 삭제 (전환기 대응)
    try { cookieStore.set(k, '', { expires: new Date(0), path: '/', maxAge: 0 }) } catch {}
  }
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin
  await clearAll(request.url)
  return NextResponse.redirect(new URL('/login', baseUrl))
}

// 클라이언트 fetch('/api/auth/logout', { method: 'POST' }) 호환
export async function POST(request: Request) {
  await clearAll(request.url)
  return NextResponse.json({ ok: true })
}
