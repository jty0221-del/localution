// app/api/autoreply/settings/route.ts
// ============================================================
// v38: 플랫폼-범용 autoreply 설정 (naver/kakao/baemin/yogiyo/coupangeats)
//   GET ?platform=kakao_map  → 현재 설정
//   PATCH ?platform=kakao_map { enabled, tone, auto_approve, max_per_run }
//
// 기존 /api/naver-autoreply/settings 는 naver 전용 — 이건 모든 플랫폼 지원
// extra_data 의 autoreply_* 필드 사용 (cron 들이 이미 읽고 있는 동일 키)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PLATFORMS = ['naver_place', 'kakao_map', 'baemin', 'yogiyo', 'coupangeats']
const VALID_TONES = ['friendly', 'expert', 'witty', 'simple', 'emo', 'mz', 'formal']

interface Settings {
  enabled: boolean
  tone: string
  auto_approve: boolean
  max_per_run: number
}

const DEFAULTS: Settings = {
  enabled: false,
  tone: 'friendly',
  auto_approve: false,
  max_per_run: 5,
}

function extract(extra: Record<string, unknown>): Settings {
  return {
    enabled: Boolean(extra.autoreply_enabled ?? DEFAULTS.enabled),
    tone: VALID_TONES.includes(String(extra.autoreply_tone || ''))
      ? String(extra.autoreply_tone)
      : DEFAULTS.tone,
    auto_approve: Boolean(extra.autoreply_auto_approve ?? DEFAULTS.auto_approve),
    max_per_run: Math.min(20, Math.max(1, Number(extra.autoreply_max_per_run) || DEFAULTS.max_per_run)),
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || ''
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ ok: false, error: 'platform 유효하지 않음' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', auth.userId)
    .eq('platform', platform)
    .maybeSingle()

  const extra = (data?.extra_data as Record<string, unknown>) || {}
  return NextResponse.json({
    ok: true,
    platform,
    connected: data !== null,
    settings: extract(extra),
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || ''
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ ok: false, error: 'platform 유효하지 않음' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const svc = createServiceClient()

  const { data: existing } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', auth.userId)
    .eq('platform', platform)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({
      ok: false,
      error: `${platform} 연동이 없습니다. 먼저 플랫폼을 연결해주세요.`,
      connect_href: `/my/platforms/${platform}/connect`,
    }, { status: 404 })
  }

  const prev = (existing.extra_data as Record<string, unknown>) || {}
  const patch: Record<string, unknown> = {}

  if (typeof body.enabled === 'boolean')
    patch.autoreply_enabled = body.enabled
  if (typeof body.tone === 'string' && VALID_TONES.includes(body.tone))
    patch.autoreply_tone = body.tone
  if (typeof body.auto_approve === 'boolean')
    patch.autoreply_auto_approve = body.auto_approve
  if (typeof body.max_per_run === 'number')
    patch.autoreply_max_per_run = Math.min(20, Math.max(1, Math.round(body.max_per_run)))

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: '변경할 설정 없음' }, { status: 400 })
  }

  const next = { ...prev, ...patch }
  const { error } = await svc
    .from('platform_credentials')
    .update({ extra_data: next, updated_at: new Date().toISOString() })
    .eq('user_id', auth.userId)
    .eq('platform', platform)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    platform,
    settings: extract(next),
  })
}
