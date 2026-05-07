// app/api/admin/impersonate/route.ts
// ============================================================
// 관리자 임시 로그인 (impersonation)
//
// POST { user_id } — 해당 사용자로 임시 로그인
//   · 원본 admin localution_user / localution_session 쿠키를
//     localution_admin_orig / localution_admin_orig_session 으로 백업
//   · 새 localution_user / localution_session 발행 (대상 사용자)
//   · 사장님과 동일하게 모든 페이지 사용 가능 (review-admin / settings 등)
//
// DELETE — 임시 로그인 종료, 원래 admin 으로 복귀
//
// GET — 현재 임시 로그인 상태 조회
//
// 보안:
//   · requireAdmin (admin-emails 화이트리스트) 만 호출 가능
//   · 모든 호출 로그 console.log (감사 추적)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { signCookie, verifyCookie } from '@/app/lib/cookieSigning'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60, // 1시간 — 임시 로그인은 짧게
  path: '/',
}

const BACKUP_COOKIE = 'localution_admin_orig'
const BACKUP_SESSION = 'localution_admin_orig_session'

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  let body: any = {}
  try { body = await req.json() } catch {}
  const targetUserId = String(body.user_id || '').trim()
  if (!targetUserId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })

  const svc = createServiceClient()

  // 대상 사용자 정보 조회 — supabase auth + platform_credentials 으로 email/name 추정
  let targetEmail: string | null = null
  let targetName: string | null = null
  let targetProvider: string | null = null
  try {
    const { data: authData } = await svc.auth.admin.getUserById(targetUserId)
    if (authData?.user) {
      targetEmail = authData.user.email || null
      targetName = (authData.user.user_metadata as any)?.full_name || (authData.user.user_metadata as any)?.name || null
      targetProvider = (authData.user.app_metadata as any)?.provider || null
    }
  } catch {}

  // 보조: stores 테이블에서 매장명
  if (!targetName) {
    try {
      const { data: store } = await svc
        .from('stores')
        .select('name')
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (store?.name) targetName = store.name
    } catch {}
  }

  // 원본 admin 쿠키 백업 + 새 쿠키 발행
  const cookieStore = await cookies()
  const originalUser = cookieStore.get('localution_user')?.value || ''
  const originalSession = cookieStore.get('localution_session')?.value || ''

  // 원본 백업 (이미 백업되어 있으면 그대로 — 중첩 임시로그인 방지)
  if (!cookieStore.get(BACKUP_COOKIE)?.value && originalUser) {
    cookieStore.set(BACKUP_COOKIE, originalUser, COOKIE_OPTS)
  }
  if (!cookieStore.get(BACKUP_SESSION)?.value && originalSession) {
    cookieStore.set(BACKUP_SESSION, originalSession, COOKIE_OPTS)
  }

  // 대상 사용자로 새 쿠키 발행
  const signed = signCookie({
    id: targetUserId,
    email: targetEmail || '',
    name: targetName || '임시 로그인 사용자',
    provider: targetProvider || 'admin_impersonation',
  })
  cookieStore.set('localution_user', signed, COOKIE_OPTS)
  // localution_session 은 access_token 형식을 기대 — fake token 표시
  cookieStore.set('localution_session', `impersonation:${admin.email}:${targetUserId}`, COOKIE_OPTS)

  console.log(`[admin-impersonate] ${admin.email} → ${targetUserId} (${targetEmail || 'no-email'})`)

  return NextResponse.json({
    ok: true,
    impersonating: {
      user_id: targetUserId,
      email: targetEmail,
      name: targetName,
    },
    admin_email: admin.email,
    expires_in_sec: COOKIE_OPTS.maxAge,
    message: '임시 로그인 활성화 (1시간) — 사장님 화면 동일하게 사용 가능',
  })
}

export async function GET() {
  const cookieStore = await cookies()
  const current = cookieStore.get('localution_user')?.value || ''
  const backup = cookieStore.get(BACKUP_COOKIE)?.value || ''
  if (!backup) {
    return NextResponse.json({ ok: true, impersonating: false })
  }
  const currentUser = verifyCookie(current)
  const adminUser = verifyCookie(backup)
  return NextResponse.json({
    ok: true,
    impersonating: true,
    current_user: currentUser ? { id: currentUser.id, email: currentUser.email, name: currentUser.name } : null,
    admin_user: adminUser ? { id: adminUser.id, email: adminUser.email, name: adminUser.name } : null,
  })
}

export async function DELETE() {
  const admin = await requireAdmin()
  // 백업 쿠키 검증 — admin 권한이거나, 이미 백업이 있는 상태에서 본인 호출
  const cookieStore = await cookies()
  const backup = cookieStore.get(BACKUP_COOKIE)?.value || ''
  const backupSession = cookieStore.get(BACKUP_SESSION)?.value || ''

  if (!backup) {
    return NextResponse.json({ ok: false, error: '임시 로그인 상태 아님' }, { status: 400 })
  }

  // 원본 복원
  cookieStore.set('localution_user', backup, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  if (backupSession) {
    cookieStore.set('localution_session', backupSession, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
  }

  // 백업 쿠키 삭제
  cookieStore.delete(BACKUP_COOKIE)
  cookieStore.delete(BACKUP_SESSION)

  console.log(`[admin-impersonate] revert by ${admin.ok ? admin.email : 'unknown'}`)

  return NextResponse.json({ ok: true, message: '관리자 계정으로 복귀' })
}
