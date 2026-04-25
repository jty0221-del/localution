// app/api/stores/me/route.ts
// ============================================================
// 28차-1: 매장 정보 통합 GET (2026-04-22)
//
//   /review-admin, /settings StoreTab/ConnectTab, /qr-admin, /marketing/place
//   모두가 이 엔드포인트 하나로 같은 매장 정보를 읽도록 단일 진실원.
//
//   소스 우선순위:
//     1) platform_credentials (비번까지 저장된 "진짜" 연결)
//     2) place_targets (순위 추적 등록된 네이버 플레이스)
//     3) stores (/api/stores/register 로 저장된 기본 매장)
//
//   응답:
//     {
//       ok: true,
//       store: { id, slug, name, category, address, phone, main_keyword, sub_keywords, naver_place_id, naver_url, ... } | null,
//       platforms: [{ platform, label, connected, account_id_masked, platform_store_id, platform_store_name }],
//       naver_link: { external_id, external_name, external_url, address, category } | null,
//       map: { address, lat, lng } | null,
//     }
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { VALID_PLATFORMS, PLATFORM_LABELS } from '@/app/lib/platform-credentials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function maskAccountId(id: string | null | undefined): string {
  if (!id) return ''
  const s = String(id)
  if (s.length <= 4) return s[0] + '*'.repeat(Math.max(0, s.length - 1))
  return s.slice(0, 2) + '*'.repeat(Math.max(2, s.length - 4)) + s.slice(-2)
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const svc = createServiceClient()
  const userId = auth.userId

  // ── 1) platform_credentials: 실제 자격증명 연결 ───────────────────
  let credentials: Array<{
    platform: string
    account_id: string | null
    platform_store_id: string | null
    platform_store_name: string | null
    connected_at: string | null
    last_login_status: string | null
    last_login_at: string | null
  }> = []
  try {
    // 30차-14: platform_credentials 테이블엔 created_at 컬럼 없음 → updated_at 만 사용
    //          기존 select 에 created_at 있어서 쿼리 실패 → credentials = [] → 전부 미연결 표시되던 버그
    // 43차-5: last_login_status / last_login_at 추가 노출 — 캡차/실패 배너용
    const { data, error } = await svc
      .from('platform_credentials')
      .select('platform, account_id, platform_store_id, platform_store_name, updated_at, last_login_status, last_login_at')
      .eq('user_id', userId)
    if (error) {
      console.warn('[stores/me] platform_credentials select failed:', error.message)
    }
    if (!error && Array.isArray(data)) {
      credentials = data.map((r: any) => ({
        platform: r.platform,
        account_id: r.account_id ?? null,
        platform_store_id: r.platform_store_id ?? null,
        platform_store_name: r.platform_store_name ?? null,
        connected_at: r.updated_at ?? null,
        last_login_status: r.last_login_status ?? null,
        last_login_at: r.last_login_at ?? null,
      }))
    }
  } catch (e) {
    console.warn('[stores/me] platform_credentials threw:', e)
  }

  // ── 2) place_targets: 네이버 플레이스 순위 추적 등록 ──────────────
  let naverLink: {
    external_id: string | null
    external_name: string | null
    external_url: string | null
    address: string | null
    category: string | null
  } | null = null
  try {
    const { data, error } = await svc
      .from('place_targets')
      .select('place_id, name, url, address, category')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (!error && Array.isArray(data) && data.length > 0) {
      const t: any = data[0]
      naverLink = {
        external_id: t.place_id ?? null,
        external_name: t.name ?? null,
        external_url:
          t.url || (t.place_id ? `https://map.naver.com/p/entry/place/${t.place_id}` : null),
        address: t.address ?? null,
        category: t.category ?? null,
      }
    }
  } catch (_) {
    // graceful degrade
  }

  // platform_credentials 에 naver_place 가 있는데 place_targets 는 비었을 경우 fallback
  if (!naverLink) {
    const np = credentials.find((c) => c.platform === 'naver_place')
    if (np && (np.platform_store_id || np.platform_store_name)) {
      naverLink = {
        external_id: np.platform_store_id ?? null,
        external_name: np.platform_store_name ?? null,
        external_url: np.platform_store_id
          ? `https://map.naver.com/p/entry/place/${np.platform_store_id}`
          : null,
        address: null,
        category: null,
      }
    }
  }

  // ── 3) stores 테이블 ──────────────────────────────────────────
  let store: any = null
  try {
    // 2026-04-22: description 컬럼 추가 (2000자 매장 소개)
    // 마이그레이션 전 환경에서는 description 컬럼이 없어 에러 나므로 2단 select 로 graceful fallback
    const fullSel =
      'id, slug, name, category, location, address, phone, main_keyword, sub_keywords, naver_place_id, naver_url, naver_place_url, naver_blog_url, description, tone, cover_color, reward_type, reward_value, updated_at'
    const liteSel =
      'id, slug, name, category, location, address, phone, main_keyword, sub_keywords, naver_place_id, naver_url, naver_place_url, naver_blog_url, tone, cover_color, reward_type, reward_value, updated_at'
    let { data, error } = await svc
      .from('stores')
      .select(fullSel)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error && /description/i.test(error.message || '')) {
      const retry = await svc
        .from('stores')
        .select(liteSel)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
      data = retry.data as any
      error = retry.error
    }
    if (!error && Array.isArray(data) && data.length > 0) {
      store = data[0]
    }
  } catch (_) {
    // graceful degrade — stores 테이블 컬럼/타입 이슈시 null 반환
    store = null
  }

  // ── 3.5) platform_reviews 집계 (30차-15-B) ─────────────────
  // 대시보드 "플랫폼별 별점·리뷰 현황" 에서 "데이터 수집 중..." 대신 실제 숫자를 뿌리기 위해
  // 플랫폼별 { review_count, rating_avg, unreplied_count, latest_collected_at } 요약.
  // ⚠️ 부차 쿼리 격리 원칙: 실패해도 메인 응답은 정상 반환.
  const reviewAgg: Record<
    string,
    { review_count: number; rating_avg: number | null; unreplied_count: number; latest_collected_at: string | null }
  > = {}
  try {
    const { data: rv, error: rvErr } = await svc
      .from('platform_reviews')
      .select('platform, rating, has_reply, collected_at')
      .eq('user_id', userId)
    if (rvErr) {
      console.warn('[stores/me] platform_reviews agg failed:', rvErr.message)
    } else if (Array.isArray(rv)) {
      for (const r of rv as Array<{ platform: string; rating: number | null; has_reply: boolean; collected_at: string | null }>) {
        const key = r.platform
        if (!reviewAgg[key]) {
          reviewAgg[key] = { review_count: 0, rating_avg: null, unreplied_count: 0, latest_collected_at: null }
        }
        const slot = reviewAgg[key]
        slot.review_count += 1
        if (!r.has_reply) slot.unreplied_count += 1
        if (r.collected_at && (!slot.latest_collected_at || r.collected_at > slot.latest_collected_at)) {
          slot.latest_collected_at = r.collected_at
        }
      }
      // rating 평균은 rating 있는 행만 대상으로 별도 계산
      for (const key of Object.keys(reviewAgg)) {
        const subset = (rv as any[]).filter(
          (r) => r.platform === key && typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5,
        )
        if (subset.length > 0) {
          const sum = subset.reduce((a, b) => a + Number(b.rating), 0)
          reviewAgg[key].rating_avg = Number((sum / subset.length).toFixed(2))
        }
      }
    }
  } catch (e) {
    console.warn('[stores/me] platform_reviews agg threw:', e)
  }

  // ── 4) 플랫폼 통합 배열 ────────────────────────────────────────
  // 30차-18: naver_place 는 "연결 상태" 판단 소스를 확장한다.
  //   · platform_credentials 뿐 아니라 stores.naver_place_id / place_targets(naverLink) /
  //     platform_reviews 존재도 "연결됨" 으로 간주. 사용자 입장에선 어느 경로로 등록했든
  //     "네이버 플레이스 연결 됐음" 이므로 대시보드 카드에 나타나야 함.
  const storesNaverPlaceId: string | null = (store && (store as any).naver_place_id) || null
  const storesName: string | null = (store && (store as any).name) || null
  const platforms = (VALID_PLATFORMS as readonly string[]).map((p) => {
    const c = credentials.find((x) => x.platform === p)
    const agg = reviewAgg[p] ?? null
    let connected = !!c
    let platform_store_id: string | null = c?.platform_store_id ?? null
    let platform_store_name: string | null = c?.platform_store_name ?? null
    if (p === 'naver_place' && !connected) {
      if (naverLink && (naverLink.external_id || naverLink.external_name)) {
        connected = true
        platform_store_id = platform_store_id ?? naverLink.external_id ?? null
        platform_store_name = platform_store_name ?? naverLink.external_name ?? null
      } else if (storesNaverPlaceId) {
        connected = true
        platform_store_id = platform_store_id ?? storesNaverPlaceId
        platform_store_name = platform_store_name ?? storesName
      } else if ((agg?.review_count ?? 0) > 0) {
        // 리뷰만 남아 있는 예외 상태 — 사용자 입장에선 "이미 사용 중"
        connected = true
      }
    }
    // 41차-8: 모든 플랫폼 — 리뷰가 1건이라도 있으면 "연결됨" 표시 (시드 포함)
    if (!connected && (agg?.review_count ?? 0) > 0) {
      connected = true
    }
    return {
      platform: p,
      label: (PLATFORM_LABELS as Record<string, string>)[p] ?? p,
      connected,
      account_id_masked: c ? maskAccountId(c.account_id) : '',
      platform_store_id,
      platform_store_name,
      connected_at: c?.connected_at ?? null,
      // 30차-15-B: 리뷰 집계
      review_count: agg?.review_count ?? 0,
      rating_avg: agg?.rating_avg ?? null,
      unreplied_count: agg?.unreplied_count ?? 0,
      latest_collected_at: agg?.latest_collected_at ?? null,
      // 43차-5: 워커 로그인 상태 (캡차/실패 배너 표시용)
      last_login_status: c?.last_login_status ?? null,
      last_login_at: c?.last_login_at ?? null,
    }
  })

  // ── 5) 지도 정보 ───────────────────────────────────────────────
  const mapAddress = store?.address || naverLink?.address || null
  const map = mapAddress
    ? {
        address: mapAddress,
        lat: null as number | null,
        lng: null as number | null,
      }
    : null

  // 플랫폼 레이블이 매장명으로 잘못 저장된 경우 null 처리
  const PLATFORM_LABEL_SET = new Set(['네이버 플레이스', '배달의민족', '요기요', '쿠팡이츠', '카카오맵'])
  if (store && PLATFORM_LABEL_SET.has(store.name)) {
    store = { ...store, name: null }
  }
  if (naverLink && naverLink.external_name && PLATFORM_LABEL_SET.has(naverLink.external_name)) {
    naverLink = { ...naverLink, external_name: null }
  }

  return NextResponse.json({
    ok: true,
    user_id: userId,
    store,
    platforms,
    naver_link: naverLink,
    map,
  })
}
