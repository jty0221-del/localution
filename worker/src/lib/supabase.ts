// worker/src/lib/supabase.ts
// ============================================================
// 32차-1 · Supabase service-role client (singleton)
// v1.6n: Node 20 WebSocket polyfill — Supabase realtime 모듈이 ws 모듈 필요
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js'
// @ts-ignore — ws 는 worker dependencies 에 추가됨
import ws from 'ws'

// Node 20 에서 native WebSocket 없음 → ws 모듈로 polyfill
// (Supabase realtime 모듈이 module load 시점에 WebSocket 검사)
if (typeof (globalThis as any).WebSocket === 'undefined') {
  ;(globalThis as any).WebSocket = ws
}

let cached: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // realtime 도 명시 — transport 로 ws 사용
    realtime: {
      // @ts-ignore
      transport: ws,
    },
  })
  return cached
}
