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
    // v1.6z: 카테고리별 실제 에러 메시지 샘플 (최대 5건)
    const failureSamples: Record<string, Array<{ platform: string; message: string; postedAt: string | null }>> = {}

    // v1.6z: 더 정교한 카테고리 분류
    function categorizeError(err: string): string {
      const e = err.toLowerCase()
      // 30일 / 만료
      if (err.includes('30일') || e.includes('expired') || e.includes('writable')) return '30일 정책 만료'
      // 쿠키 / 세션
      if (err.includes('쿠키') || e.includes('cookie') || e.includes('session') || e.includes('not logged in')) return '쿠키·세션 만료'
      // 로그인
      if (err.includes('로그인') || e.includes('login fail') || e.includes('unauthorized') || e.includes('401')) return '로그인 실패'
      // Akamai / 봇 차단
      if (err.includes('Akamai') || e.includes('akamai') || e.includes('403') || e.includes('forbidden')) return 'Akamai / 봇 차단'
      // CAPTCHA
      if (e.includes('captcha') || e.includes('block')) return 'CAPTCHA / 차단'
      // 권한 부족 (사장님 / 비즈니스 권한)
      if (err.includes('사장님') || err.includes('권한') || err.includes('비즈니스') || e.includes('permission') || e.includes('not owner')) return '사장님 권한 부족'
      // DOM / 셀렉터 변경
      if (err.includes('못찾') || err.includes('없음') || e.includes('not found') || e.includes('selector') || e.includes('textarea') || e.includes('button')) return 'DOM 구조 변경'
      // 카드 매칭 실패 (리뷰 ID 매칭 안 됨)
      if (err.includes('카드') || e.includes('card not found') || e.includes('review_id')) return '리뷰 카드 매칭 실패'
      // Timeout
      if (e.includes('timeout') || e.includes('time out') || e.includes('timed out')) return 'Timeout (응답 지연)'
      // 네트워크
      if (e.includes('network') || e.includes('fetch') || e.includes('econnrefused') || e.includes('socket')) return '네트워크 오류'
      // 이미 등록됨
      if (e.includes('already') || err.includes('이미') || err.includes('중복')) return '이미 답글 등록됨'
      // 매장 ID 누락
      if (err.includes('매장') || err.includes('store_id') || e.includes('store id') || e.includes('place_id')) return '매장 ID 누락'
      // 파싱 / 형식 오류
      if (e.includes('parse') || e.includes('json') || e.includes('invalid')) return '응답 형식 오류'
      // 프록시 관련
      if (e.includes('proxy') || e.includes('iproyal')) return '프록시 오류'
      // 기타 (분류 불가)
      return '기타 (분류 불가)'
    }

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

      // 실패 원인 카테고리화 (v1.6z: 더 정교)
      if (replyStatus === 'failed' && r.reply_error) {
        const err = String(r.reply_error)
        const category = categorizeError(err)
        failureReasons[category] = (failureReasons[category] || 0) + 1
        // 샘플 에러 메시지 (각 카테고리별 최대 5건)
        if (!failureSamples[category]) failureSamples[category] = []
        if (failureSamples[category].length < 5) {
          failureSamples[category].push({
            platform: p,
            message: err.length > 200 ? err.slice(0, 200) + '...' : err,
            postedAt: r.posted_at || r.collected_at || null,
          })
        }
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
      failureSamples,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
