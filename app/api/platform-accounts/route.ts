// app/api/platform-accounts/route.ts
// ============================================================
// 23차-8b: 플랫폼 자격증명 CRUD (2026-04-21)
//
//   GET    /api/platform-accounts
//     · 본인이 연결한 모든 플랫폼 라벨 반환 (비밀번호 복호화 안 함)
//
//   POST   /api/platform-accounts
//     · body: { platform, account_id, password, platform_store_id?, platform_store_name? }
//     · 사전조건: /api/legal/platform-consent 동의 기록 존재
//     · 평문 password → encryptSecret() → platform_credentials upsert
//     · 응답에는 비밀번호 절대 포함 금지
//
//   DELETE /api/platform-accounts?platform=naver_place
//     · 연결 해제 (credentials 삭제 + platform_consents soft-revoke)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import {
  VALID_PLATFORMS,
  PLATFORM_LABELS,
  savePlatformCredentials,
  listPlatformCredentialLabels,
  removePlatformCredentials,
  type PlatformSlug,
} from '@/app/lib/platform-credentials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidPlatform(v: unknown): v is PlatformSlug {
  return typeof v === 'string' && (VALID_PLATFORMS as readonly string[]).includes(v)
}

async function extractIp(): Promise<string | null> {
  try {
    const h = await headers()
    const f = h.get('x-forwarded-for')
    if (f) return f.split(',')[0].trim()
    return h.get('x-real-ip') ?? null
  } catch {
    return null
  }
}

async function extractUa(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get('user-agent') ?? null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────
// GET — 연결된 플랫폼 라벨 목록
// ─────────────────────────────────────────────
export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const svc = createServiceClient()
  const labels = await listPlatformCredentialLabels(svc, auth.userId)

  return NextResponse.json({
    ok: true,
    accounts: labels,
    available_platforms: VALID_PLATFORMS.map((p) => ({
      platform: p,
      label: PLATFORM_LABELS[p],
      connected: labels.some((l) => l.platform === p),
    })),
  })
}

// ─────────────────────────────────────────────
// POST — 자격증명 저장
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  let body: {
    platform?: string
    account_id?: string
    password?: string
    platform_store_id?: string
    platform_store_name?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!isValidPlatform(body.platform)) {
    return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
  }
  if (!body.account_id || typeof body.account_id !== 'string' || body.account_id.length < 2) {
    return NextResponse.json({ ok: false, error: 'invalid_account_id' }, { status: 400 })
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 1) {
    return NextResponse.json({ ok: false, error: 'password_required' }, { status: 400 })
  }

  const svc = createServiceClient()

  // 사전조건: 해당 플랫폼에 대한 유효 동의가 존재해야 함
  const { data: consent, error: consentErr } = await svc
    .from('v_active_platform_consents')
    .select('consent_id, consent_version')
    .eq('user_id', auth.userId)
    .eq('platform', body.platform)
    .maybeSingle()

  if (consentErr) {
    return NextResponse.json(
      { ok: false, error: 'consent_check_failed', message: consentErr.message },
      { status: 500 }
    )
  }
  if (!consent) {
    return NextResponse.json(
      {
        ok: false,
        error: 'consent_required',
        message: '대리권 위임 동의가 먼저 필요합니다. /api/legal/platform-consent POST 선행.',
      },
      { status: 412 } // Precondition Failed
    )
  }

  const ip = await extractIp()
  const ua = await extractUa()

  const result = await savePlatformCredentials(svc, {
    user_id: auth.userId,
    platform: body.platform,
    account_id: body.account_id.trim(),
    password: body.password,
    platform_store_id: body.platform_store_id ?? null,
    platform_store_name: body.platform_store_name ?? null,
    consent_version: consent.consent_version ?? 'v1.0',
    consent_ip: ip,
    consent_user_agent: ua,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: 'save_failed', message: result.error },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    platform: body.platform,
    label: PLATFORM_LABELS[body.platform as PlatformSlug],
  })
}

// ─────────────────────────────────────────────
// DELETE — 연결 해제 (credentials 삭제 + consent soft-revoke)
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  if (!isValidPlatform(platform)) {
    return NextResponse.json({ ok: false, error: 'invalid_platform' }, { status: 400 })
  }

  const svc = createServiceClient()

  // 1) credentials 삭제
  const removed = await removePlatformCredentials(svc, auth.userId, platform)
  if (!removed.ok) {
    return NextResponse.json(
      { ok: false, error: 'remove_failed', message: removed.error },
      { status: 500 }
    )
  }

  // 2) consent soft-revoke (3년 보관은 유지되고 revoked_at 만 세팅)
  try {
    await svc
      .from('platform_consents')
      .update({
        revoked_at: new Date().toISOString(),
        revoke_reason: 'user_unlink',
      })
      .eq('user_id', auth.userId)
      .eq('platform', platform)
      .is('revoked_at', null)
  } catch (e) {
    console.warn('[platform-accounts] consent revoke failed:', e)
  }

  return NextResponse.json({
    ok: true,
    removed: removed.removed,
    platform,
  })
}
