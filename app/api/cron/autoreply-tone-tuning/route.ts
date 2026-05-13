// app/api/cron/autoreply-tone-tuning/route.ts
// ============================================================
// v38: 주간 AI 톤 자동 조정 — 사장님 피드백 기반
//   · reply_feedback 의 최근 30일 데이터 집계
//   · 사용자별로 'good' 비율 가장 높은 톤 → autoreply_tone 자동 변경
//   · 최소 5건 피드백 + 70% good 이상일 때만 변경
// 매주 월요일 02:30 KST 실행
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { verifyCronAuth } from '@/app/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MIN_FEEDBACK_COUNT = 5
const GOOD_RATIO_THRESHOLD = 0.7

export async function GET(req: NextRequest) {
  const a = verifyCronAuth(req.headers.get('authorization'))
  if (!a.ok) return NextResponse.json({ error: a.message }, { status: a.status })

  const svc = createServiceClient()
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  // 최근 30일 피드백 전체
  const { data: allFeedback } = await svc
    .from('reply_feedback')
    .select('user_id, platform, tone, feedback')
    .gte('created_at', since30d)
    .limit(10000)

  // user 별 → tone 별 → good/bad/edited 집계
  const byUserTone: Map<string, Map<string, { good: number; bad: number; edited: number; total: number }>> = new Map()
  for (const r of (allFeedback || [])) {
    if (!r.tone) continue
    const userMap = byUserTone.get(r.user_id) || new Map()
    const tone = userMap.get(r.tone) || { good: 0, bad: 0, edited: 0, total: 0 }
    tone.total++
    if (r.feedback === 'good') tone.good++
    if (r.feedback === 'bad') tone.bad++
    if (r.feedback === 'edited') tone.edited++
    userMap.set(r.tone, tone)
    byUserTone.set(r.user_id, userMap)
  }

  const updates: Array<{ user_id: string; old_tone: string | null; new_tone: string; reason: string }> = []

  for (const [userId, toneMap] of byUserTone) {
    // 가장 good 비율 높은 톤 찾기 (최소 5건 + 70% 이상)
    let bestTone: string | null = null
    let bestRatio = 0
    for (const [tone, stats] of toneMap) {
      if (stats.total < MIN_FEEDBACK_COUNT) continue
      const ratio = stats.good / stats.total
      if (ratio >= GOOD_RATIO_THRESHOLD && ratio > bestRatio) {
        bestRatio = ratio
        bestTone = tone
      }
    }
    if (!bestTone) continue

    // 사용자의 모든 platform_credentials 의 autoreply_tone 갱신
    const { data: creds } = await svc
      .from('platform_credentials')
      .select('id, platform, extra_data')
      .eq('user_id', userId)

    for (const c of (creds || [])) {
      const extra = (c.extra_data as any) || {}
      const currentTone = extra.autoreply_tone || null
      if (currentTone === bestTone) continue  // 이미 best
      if (extra.autoreply_tone_locked === true) continue  // 사장님이 수동 lock

      const newExtra = { ...extra, autoreply_tone: bestTone, autoreply_tone_auto_tuned_at: new Date().toISOString() }
      await svc
        .from('platform_credentials')
        .update({ extra_data: newExtra, updated_at: new Date().toISOString() })
        .eq('id', c.id)
      updates.push({
        user_id: userId.slice(0, 12) + '...',
        old_tone: currentTone,
        new_tone: bestTone,
        reason: `${Math.round(bestRatio * 100)}% good (${toneMap.get(bestTone)!.total}건)`,
      })
    }
  }

  return NextResponse.json({
    ok: true,
    mode: 'cron_autoreply_tone_tuning',
    total_users_analyzed: byUserTone.size,
    updates_applied: updates.length,
    updates,
    generated_at: new Date().toISOString(),
  })
}
