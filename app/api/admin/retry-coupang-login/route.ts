// app/api/admin/retry-coupang-login/route.ts
// ============================================================
// 관리자: 특정 사용자의 쿠팡이츠 save-login 재시도
//   · 저장된 평문 비밀번호로 Vercel raw HTTP 로그인 다시 시도
//   · 성공 시 session_cookies 갱신 → 워커 fetch 가 즉시 작동
//   · 실패 시 상세 에러 (어느 단계에서 실패했는지)
//
// GET ?user_id=<uuid>
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { coupangProxyLogin } from '@/app/lib/coupang-login'
import { loadPlainCredentials } from '@/app/lib/platform-credentials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || ''
  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })

  const svc = createServiceClient()

  // 저장된 자격증명 (복호화 헬퍼 사용)
  const credResult = await loadPlainCredentials(svc, userId, 'coupangeats')
  if (!credResult.ok) {
    return NextResponse.json({
      ok: false,
      step: 'decrypt',
      error: credResult.error,
      hint: credResult.error === 'not_connected'
        ? '플랫폼 연결 안 됨'
        : 'ENCRYPTION_KEK_HEX 변경됐을 가능성 — 사장님 재로그인 필요',
    }, { status: credResult.error === 'not_connected' ? 404 : 500 })
  }

  // extra_data 도 따로 조회
  const { data: extraRow } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', userId).eq('platform', 'coupangeats')
    .maybeSingle()

  // save-login 시도
  const t0 = Date.now()
  const result = await coupangProxyLogin(credResult.account_id, credResult.password)
  const elapsed = Date.now() - t0

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      step: 'proxy_login',
      elapsed_ms: elapsed,
      error: result.error,
      tried: result.tried,
      hint: '대부분 PROXY 환경변수 / iproyal 잔액 / Akamai 차단 강화 중 하나',
    })
  }

  // 성공 → DB 갱신
  const existingExtra = (extraRow?.extra_data as Record<string, unknown>) || {}
  const newExtra: Record<string, unknown> = {
    ...existingExtra,
    session_cookies: result.cookies,
    coupang_login_method: result.method,
    coupang_login_at: new Date().toISOString(),
  }
  const updateRow: Record<string, unknown> = {
    extra_data: newExtra,
    last_login_status: 'success:save-login:admin-retry',
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (result.whoami) {
    const w: any = result.whoami
    const sid = w.responsibleStoreId || w.storeId || w.defaultStoreId ||
      (Array.isArray(w.stores) && w.stores[0]?.storeId) || null
    const sname = w.storeName ||
      (Array.isArray(w.stores) && (w.stores[0]?.name || w.stores[0]?.storeName)) || null
    if (sid) updateRow.platform_store_id = String(sid)
    if (sname) updateRow.platform_store_name = String(sname)
  }
  await svc.from('platform_credentials').update(updateRow)
    .eq('user_id', userId).eq('platform', 'coupangeats')

  return NextResponse.json({
    ok: true,
    step: 'success',
    elapsed_ms: elapsed,
    method: result.method,
    cookie_count: result.cookies.length,
    whoami: result.whoami,
    triggered_by: admin.email,
    message: '저장 완료 — 다음 cron 또는 수동 fetch 시 즉시 사용',
  })
}
