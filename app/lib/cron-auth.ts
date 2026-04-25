// app/lib/cron-auth.ts
// ============================================================
// 43차-3 · Vercel Cron Bearer 토큰 검증 (timing-safe)
//   · 호출자: app/api/cron/*
// ============================================================
import { timingSafeEqual } from 'crypto'

export function verifyCronAuth(authHeader: string | null | undefined): {
  ok: boolean
  status: number
  message?: string
} {
  const secret = process.env.CRON_SECRET || ''
  if (!secret) {
    return { ok: false, status: 500, message: 'CRON_SECRET 미설정' }
  }
  const expected = `Bearer ${secret}`
  const got = String(authHeader || '')
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    return { ok: false, status: 401, message: 'unauthorized' }
  }
  if (!timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: 'unauthorized' }
  }
  return { ok: true, status: 200 }
}
