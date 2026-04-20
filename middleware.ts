import { NextResponse, type NextRequest } from 'next/server'

// 로그인 필수 경로 (prefix 매칭)
// ⚠️ 공개 페이지 절대 추가 금지:
//   - /review/[storeId]  ← QR 스캔한 고객이 보는 페이지. 고객은 로그인 없음.
//   - /inquiry           ← 비로그인 사용자가 견적·문의 보내는 공개 페이지.
//   - /login, /service-intro, /pricing, /community, /  ← 마케팅·공개 페이지
//   - /marketing/*       ← 자영업자가 서비스 미리 체험할 수 있는 공개 도구 페이지
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/admin-biz',
  '/customers',
  '/crm',
  '/review-admin',
  '/reviews',
  '/qr-admin',
  '/settings',
  '/settlement',
  '/my',
  '/reservations',
  '/partner-points',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

// 세션 쿠키 존재 판단 — 듀얼 모드
//   1) localution_session  : 네이버/카카오/구글 OAuth
//   2) sb-*-auth-token     : Supabase Auth (브라우저 SDK)
function hasAnySession(request: NextRequest): boolean {
  if (request.cookies.get('localution_session')?.value) return true

  // Supabase 클라이언트가 심는 쿠키는 sb-<projectref>-auth-token 형식
  // Next.js RequestCookies 는 getAll() 지원
  const all = request.cookies.getAll()
  if (all.some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token') && c.value)) {
    return true
  }
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtected(pathname)) {
    return NextResponse.next({ request })
  }

  if (hasAnySession(request)) {
    return NextResponse.next({ request })
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
