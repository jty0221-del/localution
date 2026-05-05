// app/api/reply-stats/route.ts
// ============================================================
// 답글 발행 통계 — 사장님이 자신의 답글 성공률 확인
//   GET /api/reply-stats?days=30
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  const u = new URL(req.url)
  const days = Math.min(365, Math.max(1, Number(u.searchParams.get('days') || 30)))
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  const svc = createServiceClient()

  try {
    const { data, error } = await svc
      .from('platform_reviews')
      .select('platform, reply_status, has_reply, reply_submitted_at, reply_error, posted_at, collected_at, rating')
      .eq('user_id', userId)
      .gte('collected_at', since)
      .limit(5000)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    const rows = data || []

    // 플랫폼별 통계
    const byPlatform: Record<string, {
      total: number
      replied: number          // has_reply OR reply_status='submitted'
      submittedByUs: number    // reply_status='submitted' (우리가 발행)
      pending: number          // reply_status='queued' or 'submitting'
      failed: number           // reply_status='failed'
      successRate: number      // submittedByUs / (submittedByUs + failed)
      negativeUnreplied: number  // 별점 1-2점 + 미답변
      avgDaysToReply: number | null  // 평균 답글 시간 (일)
    }> = {}

    // 실패 원인 그룹핑
    const failureReasons: Record<string, number> = {}

    for (const r of rows) {
      const p = String(r.platform || 'unknown')
      if (!byPlatform[p]) {
        byPlatform[p] = {
          total: 0, replied: 0, submittedByUs: 0, pending: 0, failed: 0,
          successRate: 0, negativeUnreplied: 0, avgDaysToReply: null,
        }
      }
      const stat = byPlatform[p]
      stat.total++

      const replyStatus = String(r.reply_status || 'none')
      const isReplied = !!r.has_reply || replyStatus === 'submitted'
      if (isReplied) stat.replied++
      if (replyStatus === 'submitted') stat.submittedByUs++
      if (replyStatus === 'queued' || replyStatus === 'submitting') stat.pending++
      if (replyStatus === 'failed') stat.failed++

      if (!isReplied && typeof r.rating === 'number' && r.rating <= 2) {
        stat.negativeUnreplied++
      }

      // 실패 원인 카테고리화
      if (replyStatus === 'failed' && r.reply_error) {
        const err = String(r.reply_error)
        let category = 'other'
        if (err.includes('30일') || err.includes('expired')) category = '30일 정책 (배민)'
        else if (err.includes('쿠키') || err.includes('cookie')) category = '쿠키 만료'
        else if (err.includes('로그인')) category = '로그인 실패'
        else if (err.includes('Akamai') || err.includes('403')) category = 'Akamai 차단'
        else if (err.includes('captcha') || err.includes('block')) category = 'CAPTCHA / Block'
        else if (err.includes('timeout')) category = 'Timeout'
        else if (err.includes('network')) category = '네트워크 오류'
        else if (err.includes('ALREADY')) category = '이미 답글 등록됨'
        failureReasons[category] = (failureReasons[category] || 0) + 1
      }
    }

    // 성공률 + 평균 답글 시간 계산
    for (const p in byPlatform) {
      const s = byPlatform[p]
      const denom = s.submittedByUs + s.failed
      s.successRate = denom > 0 ? Math.round((s.submittedByUs / denom) * 1000) / 10 : 0

      // 평균 답글 시간 (collected → submitted)
      const replyTimes: number[] = []
      for (const r of rows) {
        if (r.platform !== p) continue
        if (r.reply_status !== 'submitted') continue
        if (!r.reply_submitted_at || !r.collected_at) continue
        const diff = (new Date(r.reply_submitted_at).getTime() - new Date(r.collected_at).getTime()) / 86400_000
        if (diff >= 0 && diff < 365) replyTimes.push(diff)
      }
      if (replyTimes.length > 0) {
        s.avgDaysToReply = Math.round((replyTimes.reduce((a,b) => a+b, 0) / replyTimes.length) * 10) / 10
      }
    }

    // 전체 합계
    const total = Object.values(byPlatform).reduce((s, x) => s + x.total, 0)
    const totalReplied = Object.values(byPlatform).reduce((s, x) => s + x.replied, 0)
    const totalSubmitted = Object.values(byPlatform).reduce((s, x) => s + x.submittedByUs, 0)
    const totalFailed = Object.values(byPlatform).reduce((s, x) => s + x.failed, 0)
    const totalNegativeUnreplied = Object.values(byPlatform).reduce((s, x) => s + x.negativeUnreplied, 0)
    const overallReplyRate = total > 0 ? Math.round((totalReplied / total) * 1000) / 10 : 0
    const overallSuccessRate = (totalSubmitted + totalFailed) > 0
      ? Math.round((totalSubmitted / (totalSubmitted + totalFailed)) * 1000) / 10 : 0

    return NextResponse.json({
      ok: true,
      days,
      since,
      total,
      summary: {
        totalReplied,
        totalUnreplied: total - totalReplied,
        totalSubmittedByUs: totalSubmitted,
        totalFailed,
        totalNegativeUnreplied,
        overallReplyRate,           // 전체 답변률 (%)
        overallSuccessRate,         // 우리 발행 성공률 (%)
      },
      byPlatform,
      failureReasons,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
