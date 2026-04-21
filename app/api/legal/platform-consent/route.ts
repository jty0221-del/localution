// app/api/legal/platform-consent/route.ts
// ============================================================
// 23차-8a: 외부 플랫폼 대리권 위임 동의 기록 API (2026-04-21)
//
//   POST  /api/legal/platform-consent
//     · body: { platform, agreed_scope, agreed_ownership, agreed_risk, extra_payload? }
//     · 3개 체크박스 전부 true 가 아니면 400
//     · IP + User-Agent 자동 수집
//     · platform_consents 에 새 row 인서트 → consent_id 반환
//     · 동일 user+platform 기존 활성 동의는 revoked_at = now() 로 soft-revoke (최신본 1건만 유효)
//
//   GET   /api/legal/platform-consent?platform=naver_place
//     · 현재 활성 동의 조회 (UI 에서 "이미 동의함" 상태 확인용)
//
//   DELETE /api/legal/platform-consent?consent_id=xxx
//     · 동의 철회 (자격증명 해제와 함께 호출됨)
//     · 실제로는 revoked_at = now() 업데이트
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PLATFORMS = ['naver_place', 'baemin', 'yogiyo', 'coupangeats'] as const
type PlatformSlug = typeof VALID_PLATFORMS[number]

const CURRENT_VERSIONS = {
  terms_version: 'v2.0',
  privacy_version: 'v2.0',
  consent_version: 'v1.0',
} as const

// ─────────────────────────────────────────────
// 클라이언트 IP 추출
// ─────────────────────────────────────────────
async function extractClientIp(): Promise<string | null> {
  try {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) {
      // 여러 IP 가 있을 수 있어 첫 번째만
      return forwarded.split(',')[0].trim()
    }
    return h.get('x-real-ip') ?? null
  } catch {
    return null
  }
}

async function extractUserAgent(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get('user-agent') ?? null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────
// POST — 동의 기록
// ─────────────────────────────────────────────
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

  const platform = body.platform
  if (!platform || !VALID_PLATFORMS.includes(platform as PlatformSlug)) {
    return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
  }

  // 3개 체크박스 전부 true 여야 수락
  if (!body.agreed_scope || !body.agreed_ownership || !body.agreed_risk) {
    return NextResponse.json(
      { ok: false, error: 'all_checkboxes_required', message: '3개 항목 모두 동의해야 합니다.' },
      { status: 400 }
    )
  }

  const ip = await extractClientIp()
  const ua = await extractUserAgent()

  const svc = createServiceClient()

  // 1) 기존 활성 동의를 soft-revoke (같은 user+platform 최신본만 유지)
  try {
    await svc
      .from('platform_consents')
      .update({
        revoked_at: new Date().toISOString(),
        revoke_reason: 'superseded_by_new_consent',
      })
      .eq('user_id', auth.userId)
      .eq('platform', platform)
      .is('revoked_at', null)
  } catch (e) {
    // 기존본 철회 실패는 로그만 남기고 신규는 진행
    console.warn('[platform-consent] soft-revoke previous failed:', e)
  }

  // 2) 신규 동의 인서트
  const { data, error } = await svc
    .from('platform_consents')
    .insert({
      user_id: auth.userId,
      platform,
      terms_version: CURRENT_VERSIONS.terms_version,
      privacy_version: CURRENT_VERSIONS.privacy_version,
      consent_version: CURRENT_VERSIONS.consent_version,
      agreed_scope: body.agreed_scope,
      agreed_ownership: body.agreed_ownership,
      agreed_risk: body.agreed_risk,
      ip_address: ip,
      user_agent: ua,
      extra_payload: body.extra_payload ?? {},
    })
    .select('consent_id, consent_ts, platform')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: 'insert_failed', message: error?.message ?? 'unknown' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    consent_id: data.consent_id,
    platform: data.platform,
    consent_ts: data.consent_ts,
    versions: CURRENT_VERSIONS,
  })
}

// ─────────────────────────────────────────────
// GET — 현재 활성 동의 조회
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')

  if (platform && !VALID_PLATFORMS.includes(platform as PlatformSlug)) {
    return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
  }

  const svc = createServiceClient()
  let query = svc
    .from('v_active_platform_consents')
    .select('consent_id, platform, consent_version, consent_ts, terms_version, privacy_version')
    .eq('user_id', auth.userId)

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'query_failed', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    active_consents: data ?? [],
    current_versions: CURRENT_VERSIONS,
  })
}

// ─────────────────────────────────────────────
// DELETE — 동의 철회
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const consentId = searchParams.get('consent_id')
  const platform = searchParams.get('platform')
  const reason = searchParams.get('reason') || 'user_unlink'

  if (!consentId && !platform) {
    return NextResponse.json(
      { ok: false, error: 'consent_id_or_platform_required' },
      { status: 400 }
    )
  }

  const svc = createServiceClient()
  let query = svc
    .from('platform_consents')
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq('user_id', auth.userId)
    .is('revoked_at', null)

  if (consentId) {
    query = query.eq('consent_id', consentId)
  } else if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query.select('consent_id, platform')

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'revoke_failed', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    revoked_count: data?.length ?? 0,
    revoked: data ?? [],
  })
}
