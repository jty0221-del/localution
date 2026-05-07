// app/api/admin/coupang-test-fetch/route.ts
// ============================================================
// 관리자: 특정 storeId 로 쿠팡이츠 리뷰 fetch 테스트 (즉시 결과)
//
// GET ?user_id=<uuid>&store_id=779523&days=30
//   1) 저장된 쿠키로 쿠팡 reviews/search API 호출
//   2) HTTP status + 받은 review 수 즉시 반환
//   3) 워커 큐 거치지 않음 — 디버깅용 빠른 검증
//
// 결과 해석:
//   · status=200 + reviews>0 → storeId 유효, 워커가 같이 fetch 가능해야 함
//   · status=200 + reviews=0 → 그 매장에 실제 리뷰 없음
//   · status=403 → 사장님 권한 없는 매장
//   · status=401 → 쿠키 만료 → [재로그인] 필요
//   · status=404 → 존재하지 않는 storeId
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { proxyFetch } from '@/app/lib/proxy-fetch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const STORE_BASE = 'https://store.coupangeats.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || ''
  const storeId = searchParams.get('store_id') || ''
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 365)

  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })
  if (!/^\d+$/.test(storeId)) return NextResponse.json({ ok: false, error: 'store_id 숫자 필요' }, { status: 400 })

  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('extra_data')
    .eq('user_id', userId).eq('platform', 'coupangeats')
    .maybeSingle()

  if (!cred) return NextResponse.json({ ok: false, error: '연결 안 됨' }, { status: 404 })

  const extra = (cred.extra_data as Record<string, unknown>) || {}
  const cookies = Array.isArray(extra.session_cookies) ? (extra.session_cookies as any[]) : []
  if (cookies.length === 0) {
    return NextResponse.json({ ok: false, step: 'no_cookies', error: '저장된 쿠키 없음 — [재로그인] 필요' }, { status: 400 })
  }

  const cookieStr = cookies.map((c: any) => c.name + '=' + c.value).join('; ')

  // 쿠팡이츠 reviews API 직접 호출
  const endTs = new Date().toISOString().slice(0, 10)
  const startDt = new Date(Date.now() - days * 86400000)
  const startTs = startDt.toISOString().slice(0, 10)

  // 후보 endpoint 들 — 워커가 사용하는 것과 동일 패턴
  const endpoints = [
    `${STORE_BASE}/api/v1/merchant/reviews/search?storeIds=${storeId}&startDate=${startTs}&endDate=${endTs}&page=0&size=20`,
    `${STORE_BASE}/api/v1/merchant/inflow/reviews/search?storeIds=${storeId}&startDate=${startTs}&endDate=${endTs}&page=0&size=20`,
  ]

  const tried: any[] = []
  for (const url of endpoints) {
    const t0 = Date.now()
    try {
      const r = await proxyFetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          Cookie: cookieStr,
          'X-Requested-With': 'XMLHttpRequest',
          Referer: STORE_BASE + '/merchant/management/reviews',
        },
      } as RequestInit)
      const elapsed = Date.now() - t0
      const ct = r.headers.get('content-type') || ''
      const isJson = ct.includes('json')
      const body = isJson ? await r.json().catch(() => null) : await r.text().then(t => t.slice(0, 500))

      // 리뷰 배열 후보 키
      let reviews: any[] = []
      if (body && typeof body === 'object') {
        const data = (body as any).data || body
        reviews = data?.reviews || data?.items || data?.content || data?.list || []
        if (!Array.isArray(reviews)) reviews = []
      }

      tried.push({
        url: url.slice(STORE_BASE.length),
        status: r.status,
        ok: r.ok,
        elapsed_ms: elapsed,
        review_count: reviews.length,
        sample: reviews[0] ? {
          id: reviews[0].orderReviewId || reviews[0].id,
          rating: reviews[0].rating || reviews[0].star,
          comment: (reviews[0].comment || reviews[0].content || '').slice(0, 50),
        } : null,
        body_keys: body && typeof body === 'object' ? Object.keys(body).slice(0, 10) : null,
        error_body: !r.ok ? (typeof body === 'string' ? body : JSON.stringify(body).slice(0, 300)) : null,
      })

      if (r.ok && reviews.length > 0) break  // 첫 성공 endpoint 에서 멈춤
    } catch (e: any) {
      tried.push({ url, error: e?.message || 'fetch error' })
    }
  }

  const best = tried.find(t => t.ok && t.review_count > 0) || tried[0]
  return NextResponse.json({
    ok: !!(best && best.ok),
    user_id: userId,
    store_id: storeId,
    days,
    review_count: best?.review_count || 0,
    status: best?.status,
    sample: best?.sample,
    tried,
    interpretation: best?.review_count > 0
      ? `매장 ${storeId} 에서 리뷰 ${best.review_count}개 확인됨 — 워커 fetch 가능`
      : best?.status === 401
      ? '쿠키 만료 — [재로그인] 필요'
      : best?.status === 403
      ? `매장 ${storeId} 권한 없음 — 다른 사장님 매장이거나 본인 계정 아님`
      : best?.status === 404
      ? `매장 ${storeId} 존재 안 함 — ID 오타 가능성`
      : best?.ok
      ? `매장 ${storeId} 에 ${days}일치 리뷰 0개 — 실제 리뷰 없는 매장`
      : '예상 못한 응답 — tried 배열 확인',
  })
}
