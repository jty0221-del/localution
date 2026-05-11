// app/api/user/creator-channels/route.ts
// ============================================================
// v38: 마케터·블로거·1인 사업자 채널 URL 저장
//   · homepage / blog / instagram / threads / youtube 본인 채널 URL
//   · stores.creator_channels JSON 에 저장 (매장 없으면 빈 store row 자동 생성)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_KEYS = ['homepage_url', 'blog_url', 'instagram_url', 'threads_url', 'youtube_channel_url'] as const
type ChannelKey = typeof ALLOWED_KEYS[number]

function sanitizeUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, 500)
  if (!s) return null
  if (!s.startsWith('http://') && !s.startsWith('https://')) return null
  try { new URL(s) } catch { return null }
  return s
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const svc = createServiceClient()

  // stores 테이블의 creator_channels JSON 컬럼 — 없으면 빈 객체
  const { data: store } = await svc
    .from('stores')
    .select('creator_channels')
    .eq('user_id', auth.userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const raw = (store?.creator_channels as Record<string, unknown> | null) || {}
  const channels: Record<string, string> = {}
  for (const k of ALLOWED_KEYS) {
    const v = raw[k]
    if (typeof v === 'string' && v.trim()) channels[k] = v.trim()
  }

  return NextResponse.json({ ok: true, channels })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}

  // sanitize — 허용된 키만, 유효 URL 만
  const cleaned: Record<string, string> = {}
  for (const k of ALLOWED_KEYS) {
    const v = sanitizeUrl(body[k])
    if (v) cleaned[k] = v
  }

  const svc = createServiceClient()

  // 기존 store 조회 — 매장 있으면 update, 없으면 빈 store insert
  const { data: existing } = await svc
    .from('stores')
    .select('id, creator_channels')
    .eq('user_id', auth.userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await svc
      .from('stores')
      .update({
        creator_channels: cleaned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      // creator_channels 컬럼 없으면 마이그레이션 필요한 케이스 — 진단 정보 반환
      return NextResponse.json({
        ok: false,
        error: error.message,
        hint: error.message.includes('column') ? 'stores 테이블에 creator_channels JSONB 컬럼 추가 필요 (마이그레이션)' : undefined,
      }, { status: 500 })
    }
  } else {
    // 매장 없는 사용자 — 빈 store 자동 생성 (creator profile 용)
    const { error } = await svc
      .from('stores')
      .insert({
        user_id: auth.userId,
        name: '내 채널',
        creator_channels: cleaned,
        // store 필수 필드들 — null 또는 빈값 허용 여부 확인 필요
      })

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        hint: '빈 store 생성 실패. 필수 컬럼이 있을 수 있음.',
      }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, channels: cleaned })
}
