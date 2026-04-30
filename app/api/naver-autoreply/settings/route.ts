// app/api/naver-autoreply/settings/route.ts
// ============================================================
// GET  → 현재 자동답글 설정 조회
// PATCH → 설정 변경 (platform_credentials.extra_data에 저장)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AutoReplySettings {
  enabled: boolean
  tone: string
  auto_approve: boolean
  max_per_run: number
}

const DEFAULTS: AutoReplySettings = {
  enabled: false,
  tone: 'friendly',
  auto_approve: false,
  max_per_run: 5,
}

const VALID_TONES = ['friendly', 'expert', 'witty', 'simple', 'emo', 'mz', 'formal']

function extractSettings(extra: Record<string, unknown>): AutoReplySettings {
  return {
    enabled:      Boolean(extra.autoreply_enabled  ?? DEFAULTS.enabled),
    tone:         VALID_TONES.includes(String(extra.autoreply_tone || ''))
                    ? String(extra.autoreply_tone)
                    : DEFAULTS.tone,
    auto_approve: Boolean(extra.autoreply_auto_approve ?? DEFAULTS.auto_approve),
    max_per_run:  Math.min(20, Math.max(1, Number(extra.autoreply_max_per_run) || DEFAULTS.max_per_run)),
  }
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', auth.userId)
    .eq('platform', 'naver_place')
    .maybeSingle()

  if (error) return NextResponse.json({ error: '설정 조회 실패' }, { status: 500 })

  const extra = (data?.extra_data as Record<string, unknown>) || {}
  const connected = data !== null

  return NextResponse.json({
    ok: true,
    connected,
    settings: extractSettings(extra),
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const svc = createServiceClient()

  // 기존 extra_data 읽기
  const { data: existing, error: fetchErr } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', auth.userId)
    .eq('platform', 'naver_place')
    .maybeSingle()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: '네이버 플레이스 연동이 없습니다.' }, { status: 404 })
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
    return NextResponse.json({ error: '변경할 설정이 없습니다.' }, { status: 400 })
  }

  const next: Record<string, unknown> = { ...prev, ...patch }

  const { error: updateErr } = await svc
    .from('platform_credentials')
    .update({ extra_data: next })
    .eq('user_id', auth.userId)
    .eq('platform', 'naver_place')

  if (updateErr) return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 })

  return NextResponse.json({ ok: true, settings: extractSettings(next) })
}
