import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 현재 전체 공개 모드 (피드백 수집 중)
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
