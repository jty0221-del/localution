// app/lib/rate-limit.ts
// ============================================================
// 43차-2 · Redis 기반 fixed-window 레이트 리미터
//   · ioredis (BullMQ 와 동일 connection pool 재사용)
//   · REDIS_URL 미설정 시 graceful degrade (allow + warn)
//
// 사용 예:
//   import { rateLimit } from '@/app/lib/rate-limit'
//   const r = await rateLimit({ bucket: 'ai', id: userId, limit: 10, windowSec: 60 })
//   if (!r.ok) return NextResponse.json({ error: '...', retryAfter: r.retryAfter }, { status: 429 })
// ============================================================
import IORedis from 'ioredis'

let _client: IORedis | null = null
let _disabled = false

function getClient(): IORedis | null {
  if (_disabled) return null
  if (_client) return _client
  const url = process.env.REDIS_URL
  if (!url) {
    _disabled = true
    console.warn('[rate-limit] REDIS_URL 미설정 — 레이트 리밋 비활성화 (allow all)')
    return null
  }
  try {
    _client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      // 짧은 타임아웃 — 리밋 검사 때문에 요청이 끊기면 안 됨
      connectTimeout: 1500,
    })
    _client.on('error', () => { /* 조용히 무시 — degrade to allow */ })
  } catch {
    _disabled = true
    return null
  }
  return _client
}

export type RateLimitInput = {
  bucket: string         // 'ai', 'inquiry' 등
  id: string             // userId 또는 ip
  limit: number          // 윈도 당 최대 요청 수
  windowSec: number      // 윈도 길이 (초)
}

export type RateLimitResult = {
  ok: boolean            // false면 차단
  remaining: number
  retryAfter: number     // 초 (윈도 만료까지)
}

export async function rateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const client = getClient()
  if (!client) {
    return { ok: true, remaining: input.limit, retryAfter: 0 }
  }
  const key = `rl:${input.bucket}:${input.id}`
  try {
    // INCR + 첫 요청에만 EXPIRE — fixed window
    const count = await client.incr(key)
    if (count === 1) {
      await client.expire(key, input.windowSec)
    }
    if (count > input.limit) {
      const ttl = await client.ttl(key)
      return {
        ok: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : input.windowSec,
      }
    }
    return {
      ok: true,
      remaining: Math.max(0, input.limit - count),
      retryAfter: 0,
    }
  } catch {
    // Redis 장애 시에도 서비스는 살리는 쪽 — fail-open
    return { ok: true, remaining: input.limit, retryAfter: 0 }
  }
}

// 요청에서 IP 식별 (X-Forwarded-For 1번째)
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0]?.trim()
  if (first) return first
  return req.headers.get('x-real-ip') || 'unknown'
}
