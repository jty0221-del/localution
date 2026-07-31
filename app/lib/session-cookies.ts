// app/lib/session-cookies.ts
// ============================================================
// OAuth 콜백에서 세션 쿠키(localution_session, localution_user) 발급 시
// 공통으로 쓰는 옵션 헬퍼.
//
// 배경 (2026-07-30 hotfix):
//   · 사장님이 www.localution.co.kr 에서 네이버 로그인 후 /my/platforms 에서
//     "연결하기" 클릭 시 /login 으로 튕겨나가는 이슈 발생
//   · 원인: OAuth 콜백이 localution.co.kr(www 없음) 또는 www.localution.co.kr
//     중 한쪽에서 실행되면 쿠키가 해당 호스트 스코프로만 발급 → 다른
//     서브도메인 방문 시 안 보임 → middleware 세션 판단 실패 → login 리다이렉트
//
// 해결책:
//   · 프로덕션(localution.co.kr) 요청은 domain=".localution.co.kr" 지정 →
//     www/root 어디서든 유효
//   · Vercel Preview / localhost 등은 domain 지정 없이 발급 (host 스코프)
// ============================================================

const THIRTY_DAYS = 30 * 24 * 60 * 60

/**
 * 요청 host 에서 프로덕션 apex 도메인을 추출.
 * · www.localution.co.kr → .localution.co.kr
 * · localution.co.kr     → .localution.co.kr
 * · localution.vercel.app / localhost / preview URL 등 → null (host 스코프)
 */
export function detectApexDomain(host: string | null | undefined): string | null {
  if (!host) return null
  const hostname = host.split(':')[0].toLowerCase()
  if (hostname === 'localution.co.kr' || hostname.endsWith('.localution.co.kr')) {
    return '.localution.co.kr'
  }
  return null
}

/**
 * 요청 URL 기준으로 세션 쿠키에 붙일 공통 옵션을 반환.
 * (httpOnly 는 콜백에서 명시 — signCookie 사용 시 true 권장)
 */
export function sessionCookieOpts(requestUrl: string) {
  const domain = detectApexDomain(new URL(requestUrl).host)
  return {
    secure: true,
    sameSite: 'lax' as const,
    maxAge: THIRTY_DAYS,
    path: '/',
    ...(domain ? { domain } : {}),
  }
}

/**
 * 로그아웃 시 세션 쿠키 삭제 옵션.
 * domain 을 지정한 쿠키는 반드시 같은 domain 으로 delete 해야 지워짐.
 */
export function sessionCookieDeleteOpts(requestUrl: string) {
  const domain = detectApexDomain(new URL(requestUrl).host)
  return {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    ...(domain ? { domain } : {}),
  }
}
