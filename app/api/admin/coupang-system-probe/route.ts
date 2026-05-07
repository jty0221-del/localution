// app/api/admin/coupang-system-probe/route.ts
// ============================================================
// 쿠팡이츠 시스템 능동 테스트 (관리자 전용)
//
// GET /api/admin/coupang-system-probe
//   1) PROXY_HOST 가 실제로 작동하는가? (외부 IP 확인 사이트 fetch)
//   2) Redis (BullMQ) 큐 ping 작동하는가?
//   3) ENCRYPTION_KEK_HEX 로 실제 암호화/복호화 라운드트립 가능한가?
//   4) Supabase 서비스 클라이언트 정상 작동?
//   5) Coupang 로그인 endpoint 자체가 살아있는가? (HEAD 요청)
//
// 응답: 각 단계별 ok/fail + latency + 오류 상세
// ============================================================
import { NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { proxyFetch } from '@/app/lib/proxy-fetch'
import { getPlatformQueue } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Step = { name: string; ok: boolean; latency_ms: number; detail?: any; error?: string }

async function timed<T>(name: string, fn: () => Promise<T>): Promise<Step & { result?: T }> {
  const t0 = Date.now()
  try {
    const result = await fn()
    return { name, ok: true, latency_ms: Date.now() - t0, result }
  } catch (e: any) {
    return {
      name,
      ok: false,
      latency_ms: Date.now() - t0,
      error: e?.message || String(e),
    }
  }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const steps: Step[] = []

  // ── 1. PROXY 외부 IP 확인 ──
  const proxyStep = await timed('proxy_external_ip', async () => {
    if (!process.env.PROXY_HOST) throw new Error('PROXY_HOST 환경변수 없음')
    const r = await proxyFetch('https://api.ipify.org?format=json', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!r.ok) throw new Error('IP 확인 실패: HTTP ' + r.status)
    const j = await r.json() as any
    return { ip: j.ip, hostUsed: process.env.PROXY_HOST }
  })
  steps.push(proxyStep)

  // ── 2. Redis 큐 ping ──
  const queueStep = await timed('bullmq_queue', async () => {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL 환경변수 없음')
    const q = getPlatformQueue()
    const counts = await q.getJobCounts('active', 'waiting', 'failed', 'completed')
    return counts
  })
  steps.push(queueStep)

  // ── 3. AES-256-GCM 라운드트립 ──
  const cryptoStep = await timed('encryption_kek_roundtrip', async () => {
    const raw = (process.env.ENCRYPTION_KEK_HEX || '').replace(/\s/g, '')
    if (raw.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 64 hex 필요 (현재 ' + raw.length + ')')
    const kek = Buffer.from(raw, 'hex')
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', kek, iv)
    const enc = Buffer.concat([cipher.update(Buffer.from('test-payload')), cipher.final()])
    const tag = cipher.getAuthTag()
    const decipher = createDecipheriv('aes-256-gcm', kek, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString()
    if (dec !== 'test-payload') throw new Error('round-trip 검증 실패')
    return { ok: true }
  })
  steps.push(cryptoStep)

  // ── 4. Supabase service client ──
  const supabaseStep = await timed('supabase_service_client', async () => {
    const svc = createServiceClient()
    const { count, error } = await svc
      .from('platform_credentials')
      .select('user_id', { count: 'exact', head: true })
      .eq('platform', 'coupangeats')
    if (error) throw new Error(error.message)
    return { coupang_user_count: count || 0 }
  })
  steps.push(supabaseStep)

  // ── 5. Coupang 로그인 endpoint 살아있는지 (proxy 통해서) ──
  const coupangAliveStep = await timed('coupang_login_endpoint_alive', async () => {
    const r = await proxyFetch('https://store.coupangeats.com/merchant/login', {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' },
    })
    return { status: r.status, ok: r.status < 500 }
  })
  steps.push(coupangAliveStep)

  // ── 6. 최근 24시간 fetch 시도된 user 수 (last_login_at 기준) ──
  const recentActivityStep = await timed('recent_24h_activity', async () => {
    const svc = createServiceClient()
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: recent } = await svc
      .from('platform_credentials')
      .select('user_id, last_login_status, last_login_at')
      .eq('platform', 'coupangeats')
      .gte('last_login_at', since)

    const byStatus: Record<string, number> = {}
    for (const r of recent || []) {
      const s = String(r.last_login_status || 'unknown').split(':')[0]
      byStatus[s] = (byStatus[s] || 0) + 1
    }
    return { count: recent?.length || 0, by_status: byStatus }
  })
  steps.push(recentActivityStep)

  // ── 7. 최근 24시간 수집된 review 수 ──
  const recentReviewsStep = await timed('recent_24h_reviews_collected', async () => {
    const svc = createServiceClient()
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count } = await svc
      .from('platform_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'coupangeats')
      .gte('collected_at', since)
    return { count: count || 0 }
  })
  steps.push(recentReviewsStep)

  const overall_ok = steps.every(s => s.ok)
  const failed_steps = steps.filter(s => !s.ok).map(s => s.name)

  return NextResponse.json({
    ok: overall_ok,
    generated_at: new Date().toISOString(),
    steps,
    failed_steps,
    summary: overall_ok
      ? '시스템 정상 작동'
      : `${failed_steps.length}개 단계 실패: ${failed_steps.join(', ')}`,
  })
}
