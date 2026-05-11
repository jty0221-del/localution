// app/api/user/platform-issues/route.ts
// ============================================================
// v38: 사용자별 플랫폼 자격증명 이슈 검출 — dashboard 배너용
//   · 본인 platform_credentials.last_login_status 확인
//   · failed/disabled 상태의 플랫폼 알림
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORM_LABELS: Record<string, string> = {
  naver_place: '네이버 플레이스',
  baemin: '배달의민족',
  yogiyo: '요기요',
  coupangeats: '쿠팡이츠',
  kakao_map: '카카오맵',
  threads: 'Threads',
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status })

  const svc = createServiceClient()
  const { data } = await svc
    .from('platform_credentials')
    .select('platform, last_login_status, last_login_error_message, last_login_at, platform_store_name')
    .eq('user_id', auth.userId)

  const issues: Array<{
    platform: string
    label: string
    status: string
    error_short: string
    last_login_at: string | null
    store_name: string | null
    suggestion: string
    connect_href: string
  }> = []

  for (const c of (data || [])) {
    if (c.last_login_status === 'success' || !c.last_login_status) continue

    const err = String(c.last_login_error_message || '').slice(0, 100)
    let suggestion = '플랫폼 연결을 다시 확인해주세요.'
    if (err.includes('아이디 또는 비밀번호') || err.includes('credentials_invalid')) {
      suggestion = '비밀번호가 변경됐을 수 있어요. 다시 연결해주세요.'
    } else if (err.includes('잠금') || err.includes('안전하지 않은') || err.includes('비정상')) {
      suggestion = '계정 잠금. 직접 로그인해서 잠금 해제 후 재시도해주세요.'
    } else if (err.includes('login form not found')) {
      suggestion = '플랫폼 로그인 페이지가 변경됐어요. 곧 자동 업데이트 됩니다.'
    } else if (err.includes('not_connected')) {
      // 정상 연결 해제 — skip
      continue
    }

    issues.push({
      platform: c.platform,
      label: PLATFORM_LABELS[c.platform] || c.platform,
      status: c.last_login_status,
      error_short: err,
      last_login_at: c.last_login_at,
      store_name: c.platform_store_name,
      suggestion,
      connect_href: `/my/platforms/${c.platform}/connect`,
    })
  }

  return NextResponse.json({
    ok: true,
    has_issues: issues.length > 0,
    count: issues.length,
    issues,
  })
}
