// app/api/admin/reply-quality-stats/route.ts
// ============================================================
// v38: AI 답글 품질 통계 — 톤별 성공률, 길이 분포, silent reject 패턴
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const days = Math.max(1, Math.min(90, parseInt(searchParams.get('days') || '30', 10)))
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

  const svc = createServiceClient()

  // 답글 데이터 (최근 N일)
  const { data: replies } = await svc
    .from('platform_reviews')
    .select('platform, reply_status, reply_error, reply_tone, draft_reply, reply_content, rating, posted_at, reply_submitted_at')
    .gte('reply_submitted_at', since)
    .not('reply_submitted_at', 'is', null)
    .limit(5000)

  const all = replies || []
  const total = all.length
  const submitted = all.filter(r => r.reply_status === 'submitted').length
  const failed = all.filter(r => r.reply_status === 'failed').length
  const queued = all.filter(r => r.reply_status === 'queued').length
  const successRate = total > 0 ? Math.round((submitted / total) * 100) : 0

  // 톤별 통계
  const byTone: Record<string, {
    total: number
    submitted: number
    failed: number
    avg_length: number
    sample_replies: string[]
  }> = {}
  let lengthSumAll = 0
  let lengthCountAll = 0
  for (const r of all) {
    const tone = r.reply_tone || 'unknown'
    if (!byTone[tone]) byTone[tone] = { total: 0, submitted: 0, failed: 0, avg_length: 0, sample_replies: [] }
    byTone[tone].total++
    if (r.reply_status === 'submitted') byTone[tone].submitted++
    if (r.reply_status === 'failed') byTone[tone].failed++
    const text = (r.reply_content || r.draft_reply || '').toString()
    if (text) {
      byTone[tone].avg_length += text.length
      lengthSumAll += text.length
      lengthCountAll++
      if (byTone[tone].sample_replies.length < 3) {
        byTone[tone].sample_replies.push(text.slice(0, 80))
      }
    }
  }
  // 평균 계산
  for (const tone of Object.keys(byTone)) {
    const t = byTone[tone]
    t.avg_length = t.total > 0 ? Math.round(t.avg_length / t.total) : 0
  }

  // 플랫폼별 통계
  const byPlatform: Record<string, { total: number; submitted: number; failed: number; success_rate: number }> = {}
  for (const r of all) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { total: 0, submitted: 0, failed: 0, success_rate: 0 }
    byPlatform[r.platform].total++
    if (r.reply_status === 'submitted') byPlatform[r.platform].submitted++
    if (r.reply_status === 'failed') byPlatform[r.platform].failed++
  }
  for (const p of Object.keys(byPlatform)) {
    const x = byPlatform[p]
    x.success_rate = x.total > 0 ? Math.round((x.submitted / x.total) * 100) : 0
  }

  // 실패 원인 분석
  const errorPatterns: Record<string, number> = {}
  for (const r of all) {
    if (r.reply_status !== 'failed' || !r.reply_error) continue
    const err = String(r.reply_error)
    let pattern = '기타'
    if (err.includes('silent reject')) pattern = 'Silent Reject (네이버 spam 의심)'
    else if (err.includes('답글 입력란')) pattern = 'DOM 입력란 못 찾음'
    else if (err.includes('login failed')) pattern = '로그인 실패'
    else if (err.includes('credentials_invalid') || err.includes('아이디 또는 비밀번호')) pattern = '자격증명 오류'
    else if (err.includes('잠금') || err.includes('안전하지 않은')) pattern = '계정 잠금'
    else if (err.includes('큐 분실')) pattern = '큐 분실'
    else if (err.includes('30일')) pattern = '배민 30일 만료'
    else if (err.includes('review card not found')) pattern = '리뷰 카드 못 찾음'
    errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1
  }

  // 답글 길이 분포 (silent reject 학습용)
  const lengthBuckets = {
    '0-50': 0, '51-100': 0, '101-150': 0,
    '151-200': 0, '201-250': 0, '251-280': 0, '281+': 0,
  }
  for (const r of all) {
    const text = (r.reply_content || r.draft_reply || '').toString()
    const len = text.length
    if (len <= 50) lengthBuckets['0-50']++
    else if (len <= 100) lengthBuckets['51-100']++
    else if (len <= 150) lengthBuckets['101-150']++
    else if (len <= 200) lengthBuckets['151-200']++
    else if (len <= 250) lengthBuckets['201-250']++
    else if (len <= 280) lengthBuckets['251-280']++
    else lengthBuckets['281+']++
  }

  // silent reject 답글 길이 분포
  const silentRejectLengths: number[] = []
  for (const r of all) {
    if (r.reply_status === 'failed' && String(r.reply_error || '').includes('silent reject')) {
      const len = (r.reply_content || r.draft_reply || '').toString().length
      silentRejectLengths.push(len)
    }
  }

  return NextResponse.json({
    ok: true,
    period_days: days,
    summary: {
      total_attempts: total,
      submitted,
      failed,
      queued,
      success_rate_pct: successRate,
      avg_reply_length: lengthCountAll > 0 ? Math.round(lengthSumAll / lengthCountAll) : 0,
    },
    by_tone: Object.entries(byTone)
      .map(([tone, v]) => ({
        tone,
        total: v.total,
        submitted: v.submitted,
        failed: v.failed,
        success_rate_pct: v.total > 0 ? Math.round((v.submitted / v.total) * 100) : 0,
        avg_length: v.avg_length,
        samples: v.sample_replies,
      }))
      .sort((a, b) => b.total - a.total),
    by_platform: Object.entries(byPlatform)
      .map(([p, v]) => ({ platform: p, ...v }))
      .sort((a, b) => b.total - a.total),
    error_patterns: Object.entries(errorPatterns)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count),
    length_distribution: lengthBuckets,
    silent_reject_lengths: silentRejectLengths,
    silent_reject_avg_length: silentRejectLengths.length > 0
      ? Math.round(silentRejectLengths.reduce((s, x) => s + x, 0) / silentRejectLengths.length)
      : null,
    generated_at: new Date().toISOString(),
  })
}
