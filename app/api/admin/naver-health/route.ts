// app/api/admin/naver-health/route.ts
// ============================================================
// 네이버 연동 상태 종합 진단 API
//   · GET → 로그인 유저 기준으로 8개 항목 체크 후 결과 반환
//   · POST { action: 'live_test' } → 네이버 오픈 API 실시간 테스트만 별도 실행
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type CheckStatus = 'ok' | 'warn' | 'error' | 'skip'

export interface CheckItem {
  id: string
  label: string
  category: string
  status: CheckStatus
  message: string
  detail?: string | null
  value?: string | number | null
  action_url?: string | null
}

export interface HealthReport {
  ok: boolean
  overall: CheckStatus
  checked_at: string
  checks: CheckItem[]
  summary: {
    ok: number
    warn: number
    error: number
    skip: number
  }
}

function fmtKST(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const svc = createServiceClient()
  const userId = auth.userId
  const checks: CheckItem[] = []

  // ── 1. ENV: 네이버 오픈 API ─────────────────────────────
  const hasOpenId  = !!process.env.NAVER_CLIENT_ID
  const hasOpenSec = !!process.env.NAVER_CLIENT_SECRET
  const hasOpenApi = hasOpenId && hasOpenSec
  checks.push({
    id: 'env_open_api',
    label: '네이버 오픈 API 키',
    category: '환경변수',
    status: hasOpenApi ? 'ok' : 'error',
    message: hasOpenApi
      ? '정상 설정됨'
      : !hasOpenId
        ? 'NAVER_CLIENT_ID 미설정'
        : 'NAVER_CLIENT_SECRET 미설정',
    detail: hasOpenApi
      ? `Client ID: ${process.env.NAVER_CLIENT_ID!.slice(0, 6)}***`
      : '.env.local 또는 Vercel 환경변수에 추가 필요',
    action_url: hasOpenApi ? null : 'https://developers.naver.com/apps/#/list',
  })

  // ── 2. ENV: 네이버 광고 API (키워드 분석) ──────────────
  const hasAdKey  = !!process.env.NAVER_AD_API_KEY
  const hasAdSec  = !!process.env.NAVER_AD_SECRET_KEY
  const hasAdCust = !!process.env.NAVER_AD_CUSTOMER_ID
  const hasAdApi  = hasAdKey && hasAdSec && hasAdCust
  const missingAd = [
    !hasAdKey  ? 'NAVER_AD_API_KEY' : '',
    !hasAdSec  ? 'NAVER_AD_SECRET_KEY' : '',
    !hasAdCust ? 'NAVER_AD_CUSTOMER_ID' : '',
  ].filter(Boolean)
  checks.push({
    id: 'env_ad_api',
    label: '네이버 광고 API 키 (키워드 분석)',
    category: '환경변수',
    status: hasAdApi ? 'ok' : 'warn',
    message: hasAdApi ? '정상 설정됨' : `미설정: ${missingAd.join(', ')}`,
    detail: hasAdApi ? null : '키워드 조회/분석 기능이 503 오류 발생',
    action_url: hasAdApi ? null : 'https://searchad.naver.com/',
  })

  // ── 3. 플랫폼 계정 연결 상태 ───────────────────────────
  let credStatus: CheckStatus = 'warn'
  let credMsg = '연결된 네이버 플레이스 계정 없음'
  let credDetail: string | null = '/settings/platforms 에서 연결하세요'
  try {
    const { data: cred, error: credErr } = await svc
      .from('platform_credentials')
      .select('id, created_at, platform_store_id, platform_store_name')
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .maybeSingle()
    if (credErr) {
      credStatus = 'error'; credMsg = `DB 오류: ${credErr.message}`; credDetail = null
    } else if (cred) {
      credStatus = 'ok'
      credMsg = '네이버 플레이스 계정 연결됨'
      credDetail = cred.platform_store_name
        ? `매장: ${cred.platform_store_name}`
        : `연결일: ${fmtKST(cred.created_at)}`
    }
  } catch (e) {
    credStatus = 'error'; credMsg = String(e); credDetail = null
  }
  checks.push({
    id: 'platform_connect',
    label: '네이버 플레이스 계정 연결',
    category: '연동 상태',
    status: credStatus,
    message: credMsg,
    detail: credDetail,
    action_url: credStatus !== 'ok' ? '/settings/platforms' : null,
  })

  // ── 4. 플레이스 추적 타겟 수 ───────────────────────────
  try {
    const { count: tc, error: te } = await svc
      .from('place_targets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    checks.push({
      id: 'place_targets',
      label: '플레이스 추적 타겟',
      category: '연동 상태',
      status: te ? 'error' : (tc ?? 0) === 0 ? 'warn' : 'ok',
      message: te ? `오류: ${te.message}` : `${tc ?? 0}개 등록`,
      detail: (tc ?? 0) === 0 ? '플레이스 추적 페이지에서 타겟을 추가하세요' : null,
      value: tc ?? 0,
      action_url: (tc ?? 0) === 0 ? '/marketing/place' : null,
    })
  } catch (e) {
    checks.push({ id: 'place_targets', label: '플레이스 추적 타겟', category: '연동 상태', status: 'error', message: String(e) })
  }

  // ── 5. 최신 리뷰 수집 시간 ─────────────────────────────
  try {
    const { data: lr } = await svc
      .from('platform_reviews')
      .select('collected_at, posted_at')
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .order('collected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!lr) {
      checks.push({
        id: 'review_latest',
        label: '최신 리뷰 수집',
        category: '리뷰 수집',
        status: 'warn',
        message: '수집된 네이버 리뷰 없음',
        detail: '리뷰 수집 크론이 아직 실행되지 않았거나 플레이스 연결이 필요합니다',
      })
    } else {
      const h = hoursAgo(lr.collected_at)
      const st: CheckStatus = h < 5 ? 'ok' : h < 25 ? 'warn' : 'error'
      checks.push({
        id: 'review_latest',
        label: '최신 리뷰 수집',
        category: '리뷰 수집',
        status: st,
        message: h < 1 ? '방금 전 수집됨' : h < 5 ? `${Math.round(h)}시간 전 수집됨` : h < 25 ? `${Math.round(h)}시간 전 (24시간 초과)` : `${Math.round(h / 24)}일 전 (수집 지연)`,
        detail: `마지막 수집: ${fmtKST(lr.collected_at)}`,
      })
    }
  } catch (e) {
    checks.push({ id: 'review_latest', label: '최신 리뷰 수집', category: '리뷰 수집', status: 'error', message: String(e) })
  }

  // ── 6. 최근 30일 수집 리뷰 수 ─────────────────────────
  try {
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
    const { count: rc30 } = await svc
      .from('platform_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('platform', 'naver_place')
      .gte('collected_at', since30)
    checks.push({
      id: 'review_count_30d',
      label: '최근 30일 수집 리뷰',
      category: '리뷰 수집',
      status: (rc30 ?? 0) > 0 ? 'ok' : 'warn',
      message: `${rc30 ?? 0}건 수집`,
      value: rc30 ?? 0,
      detail: (rc30 ?? 0) === 0 ? '리뷰가 없거나 수집이 안 되고 있습니다' : null,
    })
  } catch (e) {
    checks.push({ id: 'review_count_30d', label: '최근 30일 수집 리뷰', category: '리뷰 수집', status: 'error', message: String(e) })
  }

  // ── 7. 크론: 리뷰 자동 수집 상태 (전체 유저 기준) ─────
  try {
    const since6h = new Date(Date.now() - 6 * 3600000).toISOString()
    const { count: rc6h } = await svc
      .from('platform_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'naver_place')
      .gte('collected_at', since6h)
    checks.push({
      id: 'cron_review',
      label: '리뷰 자동수집 크론 (4시간 주기)',
      category: '크론 상태',
      status: (rc6h ?? 0) > 0 ? 'ok' : 'warn',
      message: (rc6h ?? 0) > 0
        ? `최근 6시간 내 수집 확인됨 (전체 ${rc6h}건)`
        : '최근 6시간 내 수집 기록 없음 — 크론 미실행 가능성',
      detail: 'KST 09:00 / 13:00 / 17:00 / 21:00 / 01:00 / 05:00 자동 수집',
    })
  } catch (e) {
    checks.push({ id: 'cron_review', label: '리뷰 자동수집 크론', category: '크론 상태', status: 'error', message: String(e) })
  }

  // ── 8. 실시간 API 테스트 (네이버 오픈 API) ─────────────
  if (!hasOpenApi) {
    checks.push({
      id: 'live_api',
      label: '네이버 오픈 API 실시간 테스트',
      category: 'API 테스트',
      status: 'skip',
      message: 'API 키 미설정으로 테스트 불가',
      detail: null,
    })
  } else {
    try {
      const r = await fetch('https://openapi.naver.com/v1/search/local.json?query=카페&display=1', {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
        },
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      })
      if (r.ok) {
        const d = await r.json()
        checks.push({
          id: 'live_api',
          label: '네이버 오픈 API 실시간 테스트',
          category: 'API 테스트',
          status: 'ok',
          message: `API 응답 정상 (HTTP ${r.status})`,
          detail: `로컬 검색 결과 ${d.total ?? '?'}건 확인`,
        })
      } else {
        const txt = await r.text()
        checks.push({
          id: 'live_api',
          label: '네이버 오픈 API 실시간 테스트',
          category: 'API 테스트',
          status: 'error',
          message: `API 오류 HTTP ${r.status}`,
          detail: txt.slice(0, 120),
        })
      }
    } catch (e) {
      checks.push({
        id: 'live_api',
        label: '네이버 오픈 API 실시간 테스트',
        category: 'API 테스트',
        status: 'error',
        message: `호출 실패: ${e instanceof Error ? e.message : String(e)}`,
        detail: null,
      })
    }
  }

  // ── 9. 광고 API 실시간 테스트 ──────────────────────────
  if (!hasAdApi) {
    checks.push({
      id: 'live_ad_api',
      label: '네이버 광고 API 실시간 테스트',
      category: 'API 테스트',
      status: 'skip',
      message: '광고 API 키 미설정으로 테스트 불가',
      detail: null,
    })
  } else {
    try {
      const crypto = await import('crypto')
      const ts = Date.now()
      const path = '/keywordstool'
      const msg = `${ts}.GET.${path}`
      const sig = crypto.createHmac('sha256', process.env.NAVER_AD_SECRET_KEY!)
        .update(msg).digest('base64')
      const r = await fetch(`https://api.searchad.naver.com${path}?hintKeywords=카페&showDetail=0`, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Timestamp': String(ts),
          'X-API-KEY': process.env.NAVER_AD_API_KEY!,
          'X-Customer': process.env.NAVER_AD_CUSTOMER_ID!,
          'X-Signature': sig,
        },
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      })
      if (r.ok) {
        const d = await r.json()
        checks.push({
          id: 'live_ad_api',
          label: '네이버 광고 API 실시간 테스트',
          category: 'API 테스트',
          status: 'ok',
          message: `API 응답 정상 (HTTP ${r.status})`,
          detail: `키워드 결과 ${(d.keywordList ?? []).length}건`,
        })
      } else {
        const txt = await r.text()
        checks.push({
          id: 'live_ad_api',
          label: '네이버 광고 API 실시간 테스트',
          category: 'API 테스트',
          status: 'error',
          message: `API 오류 HTTP ${r.status}`,
          detail: txt.slice(0, 120),
        })
      }
    } catch (e) {
      checks.push({
        id: 'live_ad_api',
        label: '네이버 광고 API 실시간 테스트',
        category: 'API 테스트',
        status: 'error',
        message: `호출 실패: ${e instanceof Error ? e.message : String(e)}`,
        detail: null,
      })
    }
  }

  // ── 10. Claude AI API 상태 (AI 답글 생성용) ───────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    checks.push({
      id: 'claude_api',
      label: 'Claude AI API (AI 답글 생성)',
      category: 'AI 상태',
      status: 'error',
      message: 'ANTHROPIC_API_KEY 미설정 — AI 답글 생성 불가',
      detail: 'Vercel 환경변수에 ANTHROPIC_API_KEY 추가 필요',
      action_url: 'https://console.anthropic.com/settings/keys',
    })
  } else {
    // 미니멀 API 호출로 키 유효성 확인
    try {
      const t0 = Date.now()
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 5,
          messages: [{ role: 'user', content: '안녕' }],
        }),
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      })
      const latency = Date.now() - t0
      if (r.ok) {
        checks.push({
          id: 'claude_api',
          label: 'Claude AI API (AI 답글 생성)',
          category: 'AI 상태',
          status: 'ok',
          message: `정상 응답 (${latency}ms) — claude-3-5-haiku`,
          detail: `API 키: ${anthropicKey.slice(0, 8)}***`,
        })
      } else {
        const errText = await r.text()
        checks.push({
          id: 'claude_api',
          label: 'Claude AI API (AI 답글 생성)',
          category: 'AI 상태',
          status: 'error',
          message: `오류 HTTP ${r.status}`,
          detail: errText.slice(0, 150),
          action_url: 'https://console.anthropic.com/settings/keys',
        })
      }
    } catch (e) {
      checks.push({
        id: 'claude_api',
        label: 'Claude AI API (AI 답글 생성)',
        category: 'AI 상태',
        status: 'error',
        message: `호출 실패: ${e instanceof Error ? e.message : String(e)}`,
        detail: null,
      })
    }
  }

  const summary = { ok: 0, warn: 0, error: 0, skip: 0 }
  for (const c of checks) summary[c.status]++
  const overall: CheckStatus = summary.error > 0 ? 'error' : summary.warn > 0 ? 'warn' : 'ok'

  const report: HealthReport = {
    ok: true,
    overall,
    checked_at: new Date().toISOString(),
    checks,
    summary,
  }
  return NextResponse.json(report)
}
