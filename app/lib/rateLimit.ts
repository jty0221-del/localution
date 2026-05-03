// app/lib/rateLimit.ts
// ============================================================
// 간단한 in-memory rate limiter
//   · 단일 인스턴스 메모리 (Vercel 다중 인스턴스에선 부분 보호)
//   · 비용 폭주 1차 방어용 (악성 봇/스크립트 차단)
//   · 본격 분산 limit는 추후 Redis/DB 기반으로 교체
// ============================================================
import { NextRequest } from 'next/server'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 5000  // 메모리 폭주 방지

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  resetIn: number  // 초 단위
}

/**
 * @param key 식별자 (IP, IP+route, slug, user_id 등)
 * @param limit 윈도우 내 최대 호출 수
 * @param windowSec 윈도우 (초)
 */
export function checkRate(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSec * 1000

  // 메모리 cap
  if (buckets.size > MAX_KEYS) {
    // 오래된 bucket 정리
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k)
    }
  }

  const existing = buckets.get(key)
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, resetIn: windowSec }
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetIn: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count++
  return {
    ok: true,
    remaining: limit - existing.count,
    resetIn: Math.ceil((existing.resetAt - now) / 1000),
  }
}

/**
 * 편의 함수: req + bucket name + limit 으로 즉시 체크
 */
export function rateLimitByIp(req: NextRequest, bucket: string, limit: number, windowSec: number): RateLimitResult {
  const ip = getClientIp(req)
  return checkRate(`${bucket}:${ip}`, limit, windowSec)
}
