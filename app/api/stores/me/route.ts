// app/api/stores/me/route.ts
// ============================================================
// 28차-1: 매장 정보 통합 GET
// 32차-4: naverLink.category 자동 보충 — Naver Local Search API
//   naver_link.category 가 null 이고 external_name 이 있으면
//   서버에서 직접 Naver API 호출하여 업종 카테고리를 채워 반환
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

function stripHtml(str: string): string {
  let result = ''
  let inTag = false
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '<') { inTag = true; continue }
    if (str[i] === '>') { inTag = false; continue }
    if (!inTag) result += str[i]
  }
  return result.trim()
}

async function fetchNaverCategory(storeName: string): Promise<string> {
  const clientId     = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret || !storeName) return ''
  try {
    const url = 'https://openapi.naver.com/v1/search/local.json?query=' +
      encodeURIComponent(storeName) + '&display=3&sort=random'
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      cache: 'no-store',
    })
    if (!res.ok) return ''
    const data = await res.json()
    if (!Array.isArray(data.items) || data.items.length === 0) return ''
    // 이름이 가장 유사한 항목 선택
    const stripped = stripHtml(storeName).toLowerCase()
    for (const item of data.items) {
      const title = stripHtml(item.title || '').toLowerCase()
      if (title.includes(stripped) || stripped.includes(title)) {
        return stripHtml(item.category || '')
      }
    }
    // 유사 항목 없으면 첫 번째 결과 사용
    return stripHtml(data.items[0].category || '')
  } catch (_) {
    return ''
  }
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const svc = createServiceClient()
  const userId = auth.userId

  // ── 1) platform_credentials ───────────────────────────────────
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
      .select('platform, account_id, platform_store_id, platform_store_name, updated_at')
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
      }))
    }
  } catch (e) {
    console.warn('[stores/me] platform_credentials threw:', e)
  }

  // ── 2) place_targets ──────────────────────────────────────────
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
          t.url || (t.place_id ? 'https://map.naver.com/p/entry/place/' + t.place_id : null),
        address: t.address ?? null,
        category: t.category ?? null,
      }
    }
  } catch (_) {}

  // platform_credentials fallback
  if (!naverLink) {
    const np = credentials.find((c) => c.platform === 'naver_place')
    if (np && (np.platform_store_id || np.platform_store_name)) {
      naverLink = {
        external_id: np.platform_store_id ?? null,
        external_name: np.platform_store_name ?? null,
        external_url: np.platform_store_id
          ? 'https://map.naver.com/p/entry/place/' + np.platform_store_id
          : null,
        address: null,
        category: null,
      }
    }
  }

  // ── 2-B) category 자동 보충 ───────────────────────────────────
  // naverLink 는 있지만 category 가 null 이면 Naver Local Search API 로 보충
  if (naverLink && !naverLink.category && naverLink.external_name) {
    const fetched = await fetchNaverCategory(naverLink.external_name)
    if (fetched) naverLink.category = fetched
  }

  // ── 3) stores 테이블 ──────────────────────────────────────────
  let store: any = null
  try {
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
  } catch (_) {}

  // ── 3.5) platform_reviews 집계 ────────────────────────────────
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
        connected = true
      }
    }
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
      review_count: agg?.review_count ?? 0,
      rating_avg: agg?.rating_avg ?? null,
      unreplied_count: agg?.unreplied_count ?? 0,
      latest_collected_at: agg?.latest_collected_at ?? null,
    }
  })

  // ── 5) 지도 정보 ───────────────────────────────────────────────
  const mapAddress = store?.address || naverLink?.address || null
  const map = mapAddress ? { address: mapAddress, lat: null as number | null, lng: null as number | null } : null

  return NextResponse.json({
    ok: true,
    user_id: userId,
    store,
    platforms,
    naver_link: naverLink,
    map,
  })
}
