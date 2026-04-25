import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/app/lib/admin-emails'

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

// 관리자 전용 경로 (prefix 매칭) — 로그인 + 관리자 화이트리스트 모두 통과해야 함
const ADMIN_PREFIXES = ['/admin']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some(prefix =>
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

// localution_user 쿠키에서 email 추출
//   · 43차-1: 관리자 영역 진입 차단을 위해 미들웨어에서 화이트리스트 검사
//   · OAuth 사용자만 여기서 거른다. Supabase 세션 사용자는 토큰 검증이 무거우므로
//     /admin/layout.tsx 의 클라 사이드 isAdminEmail 검사에 위임한다.
function readLocalutionUserEmail(request: NextRequest): string | null {
  const raw = request.cookies.get('localution_user')?.value
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded) as { email?: string }
    const email = (parsed?.email || '').toString().toLowerCase().trim()
    return email || null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtected(pathname)) {
    return NextResponse.next({ request })
  }

  if (!hasAnySession(request)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /admin* 은 관리자 화이트리스트 추가 검증
  //   OAuth 로그인의 경우: 쿠키에서 email 직접 읽어 즉시 차단
  //   Supabase 로그인의 경우: 클라 사이드 layout 검사로 폴백
  if (isAdminPath(pathname)) {
    const luEmail = readLocalutionUserEmail(request)
    if (luEmail && !isAdminEmail(luEmail)) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      homeUrl.search = ''
      return NextResponse.redirect(homeUrl)
    }
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
