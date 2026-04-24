// app/api/platform-accounts/cookies/route.ts
// ============================================================
// 41차-15 · 네이버 플레이스 세션 쿠키 등록
//
//   POST /api/platform-accounts/cookies
//     body: { platform, cookie_string }
//       cookie_string: "NID_AUT=xxx; NID_SES=yyy; ..."
//
//   처리:
//     - platform_credentials.extra_data.session_cookies 업데이트
//     - 기존 row 없으면 404 (아이디/비밀번호 먼저 등록)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { VALID_PLATFORMS, type PlatformSlug } from '@/app/lib/platform-credentials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 쿠키 문자열 파싱 → Playwright 쿠키 배열
function parseCookieString(raw: string, domain = '.naver.com') {
  return raw
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const idx = p.indexOf('=')
      if (idx < 0) return null
      const name = p.slice(0, idx).trim()
      const value = p.slice(idx + 1).trim()
      if (!name) return null
      return {
        name,
        value,
        domain,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None' as const,
        expires: -1,
      }
    })
    .filter(Boolean) as Array<{
      name: string; value: string; domain: string; path: string;
      secure: boolean; httpOnly: boolean; sameSite: 'None'; expires: number;
    }>
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId!

  let body: any = {}
  try { body = await req.json() } catch {}

  const platform = String(body?.platform || '').trim() as PlatformSlug
  if (!(VALID_PLATFORMS as readonly string[]).includes(platform)) {
    return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
  }

  const rawCookies = String(body?.cookie_string || '').trim()
  if (!rawCookies) {
    return NextResponse.json({ ok: false, error: 'cookie_string 필요' }, { status: 400 })
  }

  const cookies = parseCookieString(rawCookies)
  if (cookies.length === 0) {
    return NextResponse.json({
      ok: false,
      error: '유효한 쿠키를 찾지 못했어요. 형식: NID_AUT=xxx; NID_SES=yyy; ...',
    }, { status: 400 })
  }

  const svc = createServiceClient()

  // 기존 row 확인
  const { data: existing, error: selErr } = await svc
    .from('platform_credentials')
    .select('id, extra_data')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle()

  if (selErr) {
    return NextResponse.json({ ok: false, error: 'DB 조회 실패: ' + selErr.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({
      ok: false,
      error: '먼저 아이디/비밀번호를 등록해주세요.',
      redirect: `/my/platforms/${platform}/connect`,
    }, { status: 404 })
  }

  const newExtra = { ...(existing.extra_data as any ?? {}), session_cookies: cookies }
  const { error: updErr } = await svc
    .from('platform_credentials')
    .update({ extra_data: newExtra, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('platform', platform)

  if (updErr) {
    return NextResponse.json({ ok: false, error: '저장 실패: ' + updErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    saved_count: cookies.length,
    message: `${cookies.length}개 쿠키가 저장됐어요. Worker가 다음 실행 시 자동으로 사용해요.`,
  })
}
