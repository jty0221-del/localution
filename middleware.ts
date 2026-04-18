import { NextResponse, type NextRequest } from 'next/server'

// 로그인 필수 경로 (prefix 매칭)
// ⚠️ 공개 페이지 절대 추가 금지:
//   - /review/[storeId]  ← QR 스캔한 고객이 보는 페이지. 고객은 로그인 없음.
//   - /inquiry           ← 비로그인 사용자가 견적·문의 보내는 공개 페이지.
//   - /login, /service-intro, /pricing, /community, /  ← 마케팅·공개 페이지
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/admin-biz',
  '/customers',
  '/crm',
  '/marketing',
  '/review-admin',
  '/reviews',
  '/qr-admin',
  '/settings',
  '/settlement',
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

