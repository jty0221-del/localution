// app/api/platform-health/route.ts
// 플랫폼 자가점검 API
// GET  → 현재 연결된 플랫폼별 상태 조회
// POST → 전체 플랫폼 health_check 잡 큐에 등록

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { enqueuePlatformJob } from '../../lib/queue'
import type { Platform } from '../../lib/queue'

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    },
  )
}

// GET: 모든 연결된 플랫폼 상태 반환
export async function GET() {
  try {
    const svc = makeSupabase()
    const { data: { user } } = await svc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: creds, error } = await svc
      .from('platform_credentials')
      .select('platform, platform_store_id, platform_store_name, last_login_at, last_login_status, connected_at')
      .eq('user_id', user.id)
      .order('connected_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const platforms = (creds || []).map((c: any) => ({
      platform: c.platform,
      storeId: c.platform_store_id,
      storeName: c.platform_store_name,
      lastCheckedAt: c.last_login_at,
      status: deriveStatus(c.last_login_status),
      rawStatus: c.last_login_status,
      connectedAt: c.connected_at,
    }))

    return NextResponse.json({ platforms, checkedAt: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: health_check 잡을 모든 연결 플랫폼에 큐 등록
export async function POST(req: NextRequest) {
  try {
    const svc = makeSupabase()
    const { data: { user } } = await svc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 특정 플랫폼만 지정 가능 (없으면 전체)
    const body = await req.json().catch(() => ({}))
    const targetPlatform: string | null = body?.platform ?? null

    const { data: creds, error } = await svc
      .from('platform_credentials')
      .select('platform, platform_store_id')
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!creds || creds.length === 0) {
      return NextResponse.json({ message: '연결된 플랫폼이 없습니다', queued: 0 })
    }

    const targets = targetPlatform
      ? creds.filter((c: any) => c.platform === targetPlatform)
      : creds

    const queued: string[] = []
    for (const c of targets) {
      try {
        await enqueuePlatformJob({
          platform: c.platform as Platform,
          action: 'health_check',
          userId: user.id,
          storeId: c.platform_store_id || '',
        })
        queued.push(c.platform)
      } catch (e: any) {
        console.error(`platform-health: failed to enqueue ${c.platform}:`, e.message)
      }
    }

    return NextResponse.json({
      message: `${queued.length}개 플랫폼 점검 시작`,
      queued,
      startedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function deriveStatus(raw: string | null): 'ok' | 'failed' | 'unknown' {
  if (!raw) return 'unknown'
  const s = raw.toLowerCase()
  if (s.startsWith('success') || s === 'ok') return 'ok'
  if (s.startsWith('failed') || s === 'blocked' || s === 'wrong_pw' || s === 'captcha' || s === 'two_factor') return 'failed'
  return 'unknown'
}
