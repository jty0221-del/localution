import { NextResponse, type NextRequest } from 'next/server'

// 로그인 필수 경로 (prefix 매칭)
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/admin-biz',
  '/customers',
  '/crm',
  '/marketing',
  '/review-admin',
  '/reviews',
  '/review',
  '/qr-admin',
  '/store',
  '/settings',
  '/settlement',
  '/inquiry',
  '/my',
  '/reservations',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 보호 경로가 아니면 통과
  if (!isProtected(pathname)) {
    return NextResponse.next({ request })
  }

  // 세션 쿠키 존재 여부만 체크 (가벼운 가드)
  const session = request.cookies.get('localution_session')?.value
  if (session) {
    return NextResponse.next({ request })
  }

  // 미인증 → 로그인 페이지로 리디렉트 (원래 가려던 경로 보존)
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = '' // 기존 쿼리 제거
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
