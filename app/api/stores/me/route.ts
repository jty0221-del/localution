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
  }> = []
  try {
    const { data, error } = await svc
      .from('platform_credentials')
      .select('platform, account_id, platform_store_id, platform_store_name, updated_at, created_at')
      .eq('user_id', userId)
    if (!error && Array.isArray(data)) {
      credentials = data.map((r: any) => ({
        platform: r.platform,
        account_id: r.account_id ?? null,
        platform_store_id: r.platform_store_id ?? null,
        platform_store_name: r.platform_store_name ?? null,
        connected_at: r.updated_at ?? r.created_at ?? null,
      }))
    }
  } catch (_) {
    // graceful degrade
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

  // ── 4) 플랫폼 통합 배열 ────────────────────────────────────────
  const platforms = (VALID_PLATFORMS as readonly string[]).map((p) => {
    const c = credentials.find((x) => x.platform === p)
    return {
      platform: p,
      label: (PLATFORM_LABELS as Record<string, string>)[p] ?? p,
      connected: !!c,
      account_id_masked: c ? maskAccountId(c.account_id) : '',
      platform_store_id: c?.platform_store_id ?? null,
      platform_store_name: c?.platform_store_name ?? null,
      connected_at: c?.connected_at ?? null,
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

  return NextResponse.json({
    ok: true,
    user_id: userId,
    store,
    platforms,
    naver_link: naverLink,
    map,
  })
}
