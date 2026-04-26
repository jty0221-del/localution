// app/api/legal/platform-consent/route.ts
// ============================================================
// 플랫폼 대리권 위임 동의 저장
//   POST { platform, agreed_scope, agreed_ownership, agreed_risk, extra_payload? }
//   → platform_consents 테이블 upsert
//   → { ok: true, consent_id }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PLATFORMS = ['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'kakao_map'] as const
const CONSENT_VERSION = 'v1.0'

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  let body: {
    platform?: string
    agreed_scope?: boolean
    agreed_ownership?: boolean
    agreed_risk?: boolean
    extra_payload?: Record<string, unknown>
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.platform || !(VALID_PLATFORMS as readonly string[]).includes(body.platform)) {
    return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
  }
  if (!body.agreed_scope || !body.agreed_ownership || !body.agreed_risk) {
    return NextResponse.json({ ok: false, error: 'all_consents_required' }, { status: 400 })
  }

  // IP / UA 기록
  let ip: string | null = null
  let ua: string | null = null
  try {
    const h = await headers()
    const fwd = h.get('x-forwarded-for')
    ip = fwd ? fwd.split(',')[0].trim() : (h.get('x-real-ip') ?? null)
    ua = h.get('user-agent') ?? null
  } catch {}

  const svc = createServiceClient()

  try {
    // 기존 동의가 있으면 갱신, 없으면 신규 생성
    const { data, error } = await svc
      .from('platform_consents')
      .upsert(
        {
          user_id: auth.userId,
          platform: body.platform,
          agreed_scope: body.agreed_scope,
          agreed_ownership: body.agreed_ownership,
          agreed_risk: body.agreed_risk,
          consent_version: CONSENT_VERSION,
          ip_address: ip,
          user_agent: ua,
          extra_payload: body.extra_payload ?? null,
          revoked_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      )
      .select('id')
      .single()

    if (error) {
      console.error('[platform-consent] upsert error:', error.message)
      return NextResponse.json(
        { ok: false, error: 'consent_save_failed', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, consent_id: data.id })
  } catch (e: any) {
    console.error('[platform-consent] unexpected error:', e?.message)
    return NextResponse.json(
      { ok: false, error: 'server_error', message: e?.message },
      { status: 500 }
    )
  }
}
